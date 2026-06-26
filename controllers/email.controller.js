'use strict';

const emailService      = require('../services/email.service');
const CommunicationLog  = require('../models/communication-log.model');
const Customer          = require('../models/customer.model');
const logger            = require('../utils/logger');
const crypto            = require('crypto');

const PIXEL_GIF = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

const UNSUB_SECRET = process.env.UNSUB_SECRET || process.env.JWT_SECRET || 'unsub-secret';

function makeUnsubToken(customerId) {
    return crypto
        .createHmac('sha256', UNSUB_SECRET)
        .update(customerId.toString())
        .digest('hex');
}

/**
 * POST /api/email/test
 */
const sendTestEmail = async (req, res) => {
    const {
        to,
        customerName = 'Valued Customer',
        campaignName = 'Flayx Test Campaign',
        message      = 'This is a test email from Flayx CRM. Your campaign emails will look exactly like this!',
    } = req.body;

    if (!to) {
        return res.status(400).json({ message: '"to" email address is required' });
    }

    try {
        const result = await emailService.sendCampaignEmail({ to, customerName, campaignName, message });

        res.json({
            success:    true,
            messageId:  result.messageId,
            previewUrl: result.previewUrl,
            mode:       emailService.isTestMode ? 'ethereal' : 'smtp',
            info:       emailService.isTestMode
                ? 'No SMTP credentials set — email captured by Ethereal. Click previewUrl to see it.'
                : `Email delivered to ${to} via SMTP.`,
        });
    } catch (err) {
        logger.error({ err: err.message }, 'Test email send error');
        res.status(500).json({ success: false, message: 'Failed to send test email' });
    }
};

/**
 * GET /api/email/track/:logId
 * No auth — reachable by external email clients.
 */
const trackOpen = async (req, res) => {
    res.set({
        'Content-Type':  'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma':        'no-cache',
        'Expires':       '0',
    });
    res.end(PIXEL_GIF);

    try {
        const log = await CommunicationLog.findById(req.params.logId);
        if (log && log.status === 'sent') {
            log.status   = 'opened';
            log.openedAt = new Date();
            await log.save();
        }
    } catch (err) {
        logger.error({ err: err.message, logId: req.params.logId }, 'Email track error');
    }
};

/**
 * GET /api/email/unsubscribe/:customerId/:token
 * No auth — linked from email footer.
 */
const unsubscribe = async (req, res) => {
    const { customerId, token } = req.params;
    const expected = makeUnsubToken(customerId);

    if (token !== expected) {
        return res.status(400).send('Invalid unsubscribe link.');
    }

    try {
        await Customer.findByIdAndUpdate(customerId, { emailOptOut: true });
        res.send('You have been unsubscribed. You will no longer receive campaign emails.');
    } catch (err) {
        logger.error({ err: err.message, customerId }, 'Unsubscribe error');
        res.status(500).send('Something went wrong. Please try again later.');
    }
};

module.exports = { sendTestEmail, trackOpen, unsubscribe, makeUnsubToken };
