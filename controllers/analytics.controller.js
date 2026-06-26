'use strict';

const jwt = require('jsonwebtoken');
const Customer = require('../models/customer.model');
const Order = require('../models/order.model');
const Campaign = require('../models/campaign.model');
const CommunicationLog = require('../models/communication-log.model');
const analyticsSSE = require('../services/analytics-sse.service');
const logger = require('../utils/logger');

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

module.exports = { getSummary, streamAnalytics, buildSummary };
