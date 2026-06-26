'use strict';

const Campaign         = require('../models/campaign.model');
const Customer         = require('../models/customer.model');
const CommunicationLog = require('../models/communication-log.model');
const { buildQueryFromRules } = require('../services/query-builder.service');
const campaignQueue    = require('../services/campaign-queue.service');
const logger           = require('../utils/logger');

function serverError(res, err, label = 'Server error') {
    logger.error({ err: err.message }, `[campaign] ${label}`);
    return res.status(500).json({ message: 'Internal server error' });
}

exports.createCampaign = async (req, res) => {
    try {
        const { name, description, rules, message, isAbTest, variantBMessage, scheduledAt } = req.body;

        const campaign = new Campaign({
            name,
            description,
            rules,
            message,
            isAbTest: !!isAbTest,
            createdBy: req.user.id,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        });

        if (isAbTest && variantBMessage) {
            campaign.variants = [
                { label: 'A', message, audienceSize: 0, deliveryStats: { sent: 0, failed: 0 } },
                { label: 'B', message: variantBMessage, audienceSize: 0, deliveryStats: { sent: 0, failed: 0 } },
            ];
        }

        await campaign.save();
        res.status(201).json({ message: 'Campaign created successfully', campaign });
    } catch (err) {
        return serverError(res, err, 'createCampaign');
    }
};

exports.getCampaigns = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip  = (page - 1) * limit;

        const [campaigns, total] = await Promise.all([
            Campaign.find({ createdBy: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Campaign.countDocuments({ createdBy: req.user.id }),
        ]);

        res.status(200).json({
            campaigns,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        return serverError(res, err, 'getCampaigns');
    }
};

exports.getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user.id });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        res.status(200).json({ campaign });
    } catch (err) {
        return serverError(res, err, 'getCampaignById');
    }
};

exports.previewCampaignAudience = async (req, res) => {
    try {
        const { rules } = req.body;

        const query = buildQueryFromRules(rules);

        const [audienceCount, audience] = await Promise.all([
            Customer.countDocuments(query),
            Customer.find(query, { name: 1, email: 1 }).limit(100).lean(),
        ]);

        res.status(200).json({ audienceCount, audience });
    } catch (err) {
        return serverError(res, err, 'previewCampaignAudience');
    }
};

exports.activateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user.id });

        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        if (campaign.status !== 'draft') {
            return res.status(400).json({ message: `Campaign is already ${campaign.status}` });
        }

        // If scheduledAt is in the future, don't queue yet — scheduler will pick it up
        if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
            return res.status(202).json({
                message: 'Campaign scheduled',
                scheduledAt: campaign.scheduledAt,
                campaignId: campaign._id,
            });
        }

        campaign.status = 'queued';
        await campaign.save();

        const jobId = campaignQueue.enqueue(req.params.id);
        res.status(202).json({ message: 'Campaign queued for delivery', jobId, campaignId: req.params.id });
    } catch (err) {
        return serverError(res, err, 'activateCampaign');
    }
};

exports.getCampaignJobStatus = async (req, res) => {
    try {
        const job = campaignQueue.getJobByCampaignId(req.params.id);
        if (!job) return res.status(404).json({ message: 'No active job found for this campaign' });
        res.json({ job });
    } catch (err) {
        return serverError(res, err, 'getCampaignJobStatus');
    }
};

exports.getCampaignStats = async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user.id });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        const [sentCount, openedCount, failedCount] = await Promise.all([
            CommunicationLog.countDocuments({ campaign: req.params.id, status: 'sent'   }),
            CommunicationLog.countDocuments({ campaign: req.params.id, status: 'opened' }),
            CommunicationLog.countDocuments({ campaign: req.params.id, status: 'failed' }),
        ]);

        let variantStats = null;
        if (campaign.isAbTest) {
            const rows = await CommunicationLog.aggregate([
                { $match: { campaign: campaign._id, variant: { $in: ['A', 'B'] } } },
                { $group: { _id: { variant: '$variant', status: '$status' }, n: { $sum: 1 } } },
            ]);
            const vMap = {
                A: { sent: 0, opened: 0, failed: 0 },
                B: { sent: 0, opened: 0, failed: 0 },
            };
            for (const r of rows) {
                const v = r._id.variant;
                if (['sent', 'opened', 'failed'].includes(r._id.status) && vMap[v]) {
                    vMap[v][r._id.status] = r.n;
                }
            }
            variantStats = [
                { label: 'A', audienceSize: campaign.variants?.[0]?.audienceSize ?? 0, ...vMap.A },
                { label: 'B', audienceSize: campaign.variants?.[1]?.audienceSize ?? 0, ...vMap.B },
            ];
        }

        res.status(200).json({
            stats: {
                sent: sentCount,
                opened: openedCount,
                failed: failedCount,
                audienceSize: campaign.audienceSize,
                isAbTest: campaign.isAbTest,
                variants: variantStats,
            },
        });
    } catch (err) {
        return serverError(res, err, 'getCampaignStats');
    }
};
