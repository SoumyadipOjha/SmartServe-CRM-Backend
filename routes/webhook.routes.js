'use strict';

const express = require('express');
const router = express.Router();
const { handleResendWebhook } = require('../controllers/webhook.controller');

// POST /api/webhooks/resend — called by Resend for email.opened / email.clicked / email.bounced
router.post('/resend', handleResendWebhook);

module.exports = router;
