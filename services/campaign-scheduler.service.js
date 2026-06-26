'use strict';

const Campaign      = require('../models/campaign.model');
const campaignQueue = require('./campaign-queue.service');
const logger        = require('../utils/logger');

let _timer = null;

async function runScheduledCampaigns() {
    try {
        const due = await Campaign.find({
            status:      'draft',
            scheduledAt: { $lte: new Date(), $ne: null },
        });

        for (const campaign of due) {
            campaign.status = 'queued';
            await campaign.save();
            campaignQueue.enqueue(campaign._id.toString());
            logger.info({ campaignId: campaign._id, name: campaign.name }, 'Scheduled campaign queued');
        }
    } catch (err) {
        logger.error({ err: err.message }, 'Campaign scheduler error');
    }
}

function start() {
    if (_timer) return;
    _timer = setInterval(runScheduledCampaigns, 60_000);
    // Run once immediately on startup in case any campaigns were missed
    runScheduledCampaigns();
    logger.info('Campaign scheduler started (60s interval)');
}

function stop() {
    if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { start, stop };
