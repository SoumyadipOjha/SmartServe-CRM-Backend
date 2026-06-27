const Campaign = require('../../models/campaign.model');
const Customer = require('../../models/customer.model');
const CommunicationLog = require('../../models/communication-log.model');
const vendorService = require('../../services/vendor.service');
const { buildQueryFromRules } = require('../../services/query-builder.service');
const logger = require('../../utils/logger');

const BATCH_SIZE = 10;
const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour

const jobStore = new Map();
const campaignJobIndex = new Map();

let counter = 0;
function makeJobId() {
    return `job_${Date.now()}_${++counter}`;
}

async function sendToCustomer(job, campaign, customer, message, variant) {
    try {
        const personalizedMessage = message.replace('{{name}}', customer.name);
        const commLog = new CommunicationLog({
            campaign: campaign._id,
            customer: customer._id,
            message: personalizedMessage,
            status: 'pending',
            variant: variant || null,
        });
        await commLog.save();
        await vendorService.sendMessage(commLog._id, customer, personalizedMessage, campaign.name);
    } catch (err) {
        logger.error({ customerId: customer._id.toString(), err: err.message }, 'Queue send error');
    } finally {
        job.processed++;
    }
}

async function sendBatched(job, campaign, audience, message, variant) {
    for (let i = 0; i < audience.length; i += BATCH_SIZE) {
        if (job.cancelled) return;
        const batch = audience.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(c => sendToCustomer(job, campaign, c, message, variant)));
    }
}

async function processJob(jobId) {
    const job = jobStore.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.startedAt = new Date();

    try {
        const campaign = await Campaign.findById(job.campaignId);
        if (!campaign) throw new Error('Campaign not found');

        const query = buildQueryFromRules(campaign.rules);
        // Exclude opted-out customers
        const audience = await Customer.find({ ...query, emailOptOut: { $ne: true } });

        campaign.audience = audience.map(c => c._id);
        campaign.audienceSize = audience.length;
        campaign.status = 'active';

        job.total = audience.length;
        job.processed = 0;

        if (campaign.isAbTest && campaign.variants && campaign.variants.length >= 2) {
            const half = Math.ceil(audience.length / 2);
            const groupA = audience.slice(0, half);
            const groupB = audience.slice(half);

            campaign.variants[0].audienceSize = groupA.length;
            campaign.variants[1].audienceSize = groupB.length;
            await campaign.save();

            await sendBatched(job, campaign, groupA, campaign.variants[0].message, 'A');
            if (!job.cancelled) {
                await sendBatched(job, campaign, groupB, campaign.variants[1].message, 'B');
            }

            const rows = await CommunicationLog.aggregate([
                { $match: { campaign: campaign._id, variant: { $in: ['A', 'B'] } } },
                { $group: { _id: { variant: '$variant', status: '$status' }, n: { $sum: 1 } } },
            ]);

            const vStats = { A: { sent: 0, failed: 0 }, B: { sent: 0, failed: 0 } };
            for (const r of rows) {
                const v = r._id.variant;
                if ((r._id.status === 'sent' || r._id.status === 'failed') && vStats[v]) {
                    vStats[v][r._id.status] = r.n;
                }
            }

            const fresh = await Campaign.findById(campaign._id);
            if (fresh) {
                for (const v of fresh.variants) {
                    const s = vStats[v.label];
                    if (s) { v.deliveryStats.sent = s.sent; v.deliveryStats.failed = s.failed; }
                }
                if (fresh.status === 'active') fresh.status = 'completed';
                await fresh.save();
            }
        } else {
            await campaign.save();
            await sendBatched(job, campaign, audience, campaign.message, null);

            const fresh = await Campaign.findById(campaign._id);
            if (fresh && fresh.status === 'active') {
                fresh.status = 'completed';
                await fresh.save();
            }
        }

        job.status = 'completed';
        job.completedAt = new Date();
        logger.info({ jobId, processed: job.processed, total: job.total }, 'Campaign job completed');

        setImmediate(async () => {
            try {
                const analyticsSSE = require('../analytics/analytics-sse.service');
                if (analyticsSSE.size > 0) {
                    const { buildSummary } = require('../analytics/analytics.controller');
                    const summary = await buildSummary();
                    analyticsSSE.push('summary', summary);
                }
            } catch (_) {}
        });
    } catch (err) {
        logger.error({ jobId, err: err.message }, 'Campaign job failed');
        job.status = 'failed';
        job.error = err.message;
        job.completedAt = new Date();
        try { await Campaign.findByIdAndUpdate(job.campaignId, { status: 'cancelled' }); } catch (_) {}
    }
}

// Prune old finished jobs every 30 min
setInterval(() => {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of jobStore) {
        if (job.status !== 'processing' && job.createdAt.getTime() < cutoff) {
            jobStore.delete(id);
            campaignJobIndex.delete(job.campaignId);
        }
    }
}, 30 * 60 * 1000);

const campaignQueue = {
    enqueue(campaignId) {
        const cidStr = campaignId.toString();

        const existingId = campaignJobIndex.get(cidStr);
        if (existingId) {
            const existing = jobStore.get(existingId);
            if (existing && existing.status === 'processing') existing.cancelled = true;
        }

        const jobId = makeJobId();
        const job = {
            jobId,
            campaignId: cidStr,
            status: 'queued',
            processed: 0,
            total: 0,
            error: null,
            cancelled: false,
            createdAt: new Date(),
            startedAt: null,
            completedAt: null,
        };

        jobStore.set(jobId, job);
        campaignJobIndex.set(cidStr, jobId);

        setImmediate(() => processJob(jobId));
        logger.info({ jobId, campaignId: cidStr }, 'Campaign job enqueued');
        return jobId;
    },

    getJobByCampaignId(campaignId) {
        const jobId = campaignJobIndex.get(campaignId.toString());
        return jobId ? (jobStore.get(jobId) ?? null) : null;
    },

    getJob(jobId) {
        return jobStore.get(jobId) ?? null;
    },
};

module.exports = campaignQueue;
