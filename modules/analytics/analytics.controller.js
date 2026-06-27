'use strict';

const jwt = require('jsonwebtoken');
const Customer = require('../../models/customer.model');
const Order = require('../../models/order.model');
const Campaign = require('../../models/campaign.model');
const CommunicationLog = require('../../models/communication-log.model');
const Deal = require('../../models/deal.model');
const analyticsSSE = require('./analytics-sse.service');
const logger = require('../../utils/logger');

// Stage-based win probability weights for weighted pipeline value
const STAGE_PROBABILITY = {
    lead: 0.10, contacted: 0.25, proposal: 0.50,
    negotiation: 0.75, won: 1.0, lost: 0,
};

// ── Build aggregated summary ─────────────────────────────────────────────────

async function buildSummary() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo  = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
        customerTotal,
        customerHealth,
        orderStats,
        revenueByDayRaw,
        campaignsByStatus,
        recentCampaigns,
        deliveryStats,
    ] = await Promise.all([
        Customer.countDocuments(),

        Customer.aggregate([
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $gte: ['$lastActivity', thirtyDaysAgo] }, then: 'active' },
                                { case: { $gte: ['$lastActivity', sixtyDaysAgo] },  then: 'at_risk' },
                            ],
                            default: 'dormant',
                        },
                    },
                    count: { $sum: 1 },
                },
            },
        ]),

        Order.aggregate([
            { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$amount' } } },
        ]),

        Order.aggregate([
            { $match: { orderDate: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
                    revenue: { $sum: '$amount' },
                    count:   { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),

        Campaign.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        Campaign.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name status audienceSize deliveryStats isAbTest createdAt')
            .lean(),

        CommunicationLog.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
    ]);

    const health = { active: 0, at_risk: 0, dormant: 0 };
    for (const row of customerHealth) {
        if (row._id in health) health[row._id] = row.count;
    }

    const totalOrders  = orderStats[0]?.total   || 0;
    const totalRevenue = orderStats[0]?.revenue  || 0;

    const revenueMap = {};
    for (const row of revenueByDayRaw) revenueMap[row._id] = row;
    const revenueByDay = Array.from({ length: 30 }, (_, i) => {
        const d   = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split('T')[0];
        return {
            date:    key,
            revenue: revenueMap[key]?.revenue || 0,
            count:   revenueMap[key]?.count   || 0,
        };
    });

    const statusMap = {};
    for (const row of campaignsByStatus) statusMap[row._id] = row.count;
    const campaignTotal  = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const activeCampaigns = (statusMap['active'] || 0) + (statusMap['queued'] || 0);

    const delivery = { sent: 0, failed: 0 };
    for (const row of deliveryStats) {
        if (row._id === 'sent')   delivery.sent   = row.count;
        if (row._id === 'failed') delivery.failed = row.count;
    }
    const deliveryTotal = delivery.sent + delivery.failed;
    const deliveryRate  = deliveryTotal > 0
        ? Math.round((delivery.sent / deliveryTotal) * 100)
        : 0;

    return {
        customers: { total: customerTotal, health },
        orders: {
            total: totalOrders,
            revenue: totalRevenue,
            avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
            revenueByDay,
        },
        campaigns: {
            total: campaignTotal,
            active: activeCampaigns,
            byStatus: statusMap,
            delivery,
            deliveryRate,
            recent: recentCampaigns,
        },
        generatedAt: now.toISOString(),
    };
}

// ── REST: GET /api/analytics/summary ────────────────────────────────────────

const getSummary = async (req, res) => {
    try {
        const summary = await buildSummary();
        res.json({ summary });
    } catch (err) {
        logger.error({ err: err.message }, 'Analytics summary error');
        res.status(500).json({ message: 'Failed to compute analytics summary' });
    }
};

// ── SSE: GET /api/analytics/stream ──────────────────────────────────────────

const streamAnalytics = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (!token) return res.status(401).json({ message: 'No token provided' });
    try {
        jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {
        return res.status(401).json({ message: 'Invalid token' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const clientId = analyticsSSE.add(res);
    logger.info({ clientId, total: analyticsSSE.size }, 'SSE client connected');

    try {
        const summary = await buildSummary();
        res.write(`event: summary\ndata: ${JSON.stringify(summary)}\n\n`);
    } catch (err) {
        logger.error({ err: err.message }, 'SSE initial summary error');
    }

    req.on('close', () => {
        analyticsSSE.remove(clientId);
        logger.info({ clientId, remaining: analyticsSSE.size }, 'SSE client disconnected');
    });
};

// Periodic full-summary broadcast every 30 s
setInterval(async () => {
    if (analyticsSSE.size === 0) return;
    try {
        const summary = await buildSummary();
        analyticsSSE.push('summary', summary);
    } catch (err) {
        logger.error({ err: err.message }, 'SSE periodic push error');
    }
}, 30000);

// ── GET /api/analytics/forecast ─────────────────────────────────────────────

const getForecast = async (req, res) => {
    try {
        const userId = req.user.id;
        const now    = new Date();

        // Last 12 months of order revenue, grouped by month
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const [monthlyRevenue, dealsByStage, wonLostByMonth] = await Promise.all([
            Order.aggregate([
                { $match: { orderDate: { $gte: twelveMonthsAgo } } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
                    revenue: { $sum: '$amount' },
                    orders:  { $sum: 1 },
                }},
                { $sort: { _id: 1 } },
            ]),

            Deal.aggregate([
                { $match: { createdBy: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
                { $group: {
                    _id:   '$stage',
                    count: { $sum: 1 },
                    value: { $sum: '$value' },
                }},
            ]),

            Deal.aggregate([
                { $match: {
                    createdBy: require('mongoose').Types.ObjectId.createFromHexString(userId),
                    stage:     { $in: ['won', 'lost'] },
                    updatedAt: { $gte: twelveMonthsAgo },
                }},
                { $group: {
                    _id: {
                        month: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } },
                        stage: '$stage',
                    },
                    count: { $sum: 1 },
                    value: { $sum: '$value' },
                }},
                { $sort: { '_id.month': 1 } },
            ]),
        ]);

        // Fill all 12 months even if no orders that month
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            months.push(d.toISOString().slice(0, 7)); // YYYY-MM
        }
        const revenueMap = Object.fromEntries(monthlyRevenue.map(r => [r._id, r]));
        const monthlyData = months.map(m => ({
            month:   m,
            revenue: revenueMap[m]?.revenue || 0,
            orders:  revenueMap[m]?.orders  || 0,
        }));

        // Pipeline summary by stage
        const stageMap = Object.fromEntries(
            Object.keys(STAGE_PROBABILITY).map(s => [s, { count: 0, value: 0 }])
        );
        for (const row of dealsByStage) {
            if (stageMap[row._id]) stageMap[row._id] = { count: row.count, value: row.value };
        }

        // Weighted pipeline value (excludes lost)
        const weightedPipeline = Object.entries(stageMap)
            .filter(([s]) => s !== 'lost')
            .reduce((sum, [s, { value }]) => sum + value * STAGE_PROBABILITY[s], 0);

        // Won/lost by month
        const wonLostMap = {};
        for (const row of wonLostByMonth) {
            const m = row._id.month;
            if (!wonLostMap[m]) wonLostMap[m] = { won: 0, lost: 0, wonValue: 0, lostValue: 0 };
            wonLostMap[m][row._id.stage]                                         = row.count;
            wonLostMap[m][row._id.stage === 'won' ? 'wonValue' : 'lostValue']    = row.value;
        }
        const wonLostData = months.map(m => ({
            month:     m,
            won:       wonLostMap[m]?.won       || 0,
            lost:      wonLostMap[m]?.lost      || 0,
            wonValue:  wonLostMap[m]?.wonValue  || 0,
            lostValue: wonLostMap[m]?.lostValue || 0,
        }));

        // Simple 3-month moving average forecast for next 3 months
        const last3 = monthlyData.slice(-3).map(m => m.revenue);
        const avgLast3 = last3.reduce((a, b) => a + b, 0) / 3;
        const forecast = [1, 2, 3].map(i => {
            const d = new Date(now);
            d.setMonth(d.getMonth() + i);
            return { month: d.toISOString().slice(0, 7), projected: Math.round(avgLast3) };
        });

        // Win rate
        const totalWon  = dealsByStage.find(d => d._id === 'won')?.count  || 0;
        const totalLost = dealsByStage.find(d => d._id === 'lost')?.count || 0;
        const winRate   = (totalWon + totalLost) > 0
            ? Math.round((totalWon / (totalWon + totalLost)) * 100) : null;

        res.json({
            monthlyRevenue:  monthlyData,
            forecast,
            pipeline: {
                byStage:          stageMap,
                weightedValue:    Math.round(weightedPipeline),
                totalActiveValue: Object.entries(stageMap)
                    .filter(([s]) => !['won','lost'].includes(s))
                    .reduce((sum, [, { value }]) => sum + value, 0),
            },
            wonLost: { byMonth: wonLostData, winRate, totalWon, totalLost },
        });
    } catch (err) {
        logger.error({ err: err.message }, 'Forecast error');
        res.status(500).json({ message: 'Failed to compute forecast' });
    }
};

module.exports = { getSummary, streamAnalytics, buildSummary, getForecast };
