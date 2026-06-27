'use strict';

const crypto = require('crypto');
const CommunicationLog = require('../../models/communication-log.model');
const Campaign = require('../../models/campaign.model');
const logger = require('../../utils/logger');

function verifyResendSignature(rawBody, headers) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return true; // skip verification if not configured

    const msgId        = headers['svix-id'];
    const msgTimestamp = headers['svix-timestamp'];
    const msgSignature = headers['svix-signature'];
    if (!msgId || !msgTimestamp || !msgSignature) return false;

    // Prevent replay attacks — reject timestamps older than 5 minutes
    const ts = parseInt(msgTimestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

    const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
    const candidates = msgSignature.split(' ');
    return candidates.some(sig => sig.startsWith('v1,') && sig.slice(3) === expected);
}

exports.handleResendWebhook = async (req, res) => {
    const rawBody = JSON.stringify(req.body);

    if (!verifyResendSignature(rawBody, req.headers)) {
        logger.warn('Resend webhook signature verification failed');
        return res.status(400).json({ message: 'Invalid signature' });
    }

    const { type, data } = req.body;
    const resendEmailId = data?.email_id;

    if (!resendEmailId) return res.status(200).json({ message: 'Ignored' });

    try {
        const log = await CommunicationLog.findOne({ resendId: resendEmailId });
        if (!log) {
            logger.info({ resendEmailId, type }, 'Webhook: no matching log');
            return res.status(200).json({ message: 'No matching log' });
        }

        if (type === 'email.opened' || type === 'email.clicked') {
            const updates = {};
            if (log.status !== 'opened') {
                updates.status   = 'opened';
                updates.openedAt = new Date();
                await Campaign.findByIdAndUpdate(log.campaign, { $inc: { 'deliveryStats.opened': 1 } });
            }
            if (type === 'email.clicked' && !log.clickedAt) {
                updates.clickedAt = new Date();
            }
            if (Object.keys(updates).length) await CommunicationLog.findByIdAndUpdate(log._id, updates);
            logger.info({ resendEmailId, type }, 'Email engagement tracked');
        } else if (type === 'email.bounced' || type === 'email.complained') {
            await CommunicationLog.findByIdAndUpdate(log._id, {
                status: 'failed',
                failureReason: type === 'email.bounced' ? 'Email bounced' : 'Spam complaint',
            });
        }

        res.status(200).json({ message: 'Processed' });
    } catch (err) {
        logger.error({ err: err.message, type }, 'Webhook processing error');
        res.status(500).json({ message: 'Processing error' });
    }
};
