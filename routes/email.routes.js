'use strict';

const express = require('express');
const router  = express.Router();
const { authenticateJWT }                   = require('../middleware/auth.middleware');
const { sendTestEmail, trackOpen, unsubscribe } = require('../controllers/email.controller');

router.post('/test',                            authenticateJWT, sendTestEmail);
// Public — called by email clients loading the tracking pixel
router.get('/track/:logId',                     trackOpen);
// Public — linked from email footer (HMAC-verified, no account needed)
router.get('/unsubscribe/:customerId/:token',   unsubscribe);

module.exports = router;
