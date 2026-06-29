'use strict';

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../../middleware/auth.middleware');
const { getVapidKey, subscribe, unsubscribe } = require('./push.controller');

router.get('/vapid-key', getVapidKey);
router.post('/subscribe',   authenticateJWT, subscribe);
router.post('/unsubscribe', authenticateJWT, unsubscribe);

module.exports = router;
