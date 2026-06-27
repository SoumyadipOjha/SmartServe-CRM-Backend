'use strict';

const CommunicationLog = require('../models/communication-log.model');
const Campaign         = require('../models/campaign.model');
const emailService     = require('../modules/email/email.service');
const { makeUnsubToken } = require('../modules/email/email.controller');
const logger           = require('../utils/logger');

const vendorService = {
    async sendMessage(communicationId, customer, message, campaignName = 'Flayx Campaign') {
        let status = 'failed';
        let failureReason = null;

        try {
            const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
            const unsubscribeUrl = `${BASE_URL}/api/email/unsubscribe/${customer._id}/${makeUnsubToken(customer._id)}`;

            const result = await emailService.sendCampaignEmail({
                to:           customer.email,
                customerName: customer.name,
                campaignName,
                message,
                logId:        communicationId,
                unsubscribeUrl,
            });

            status = 'sent';
            // Store Resend's email ID so webhooks can look up this log
            if (result.messageId) {
                await CommunicationLog.findByIdAndUpdate(communicationId, { resendId: result.messageId });
            }
            logger.info({ to: customer.email, messageId: result.messageId }, 'Email sent');
        } catch (err) {
            failureReason = err.message;
            logger.warn({ to: customer.email, err: err.message }, 'Email delivery failed');
        }

        try {
            const commLog = await CommunicationLog.findById(communicationId);
            if (commLog) {
                commLog.status = status;
                if (failureReason) commLog.failureReason = failureReason;
                await commLog.save();

                const campaign = await Campaign.findById(commLog.campaign);
                if (campaign) {
                    if (status === 'sent')   campaign.deliveryStats.sent   += 1;
                    if (status === 'failed') campaign.deliveryStats.failed += 1;
                    await campaign.save();
                }
            }
        } catch (dbErr) {
            logger.error({ err: dbErr.message }, 'DB update error after send');
        }

        return { success: status === 'sent' };
    },
};

module.exports = vendorService;
