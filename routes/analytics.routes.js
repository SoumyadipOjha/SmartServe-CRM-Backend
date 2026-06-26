'use strict';

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');
const { getSummary, streamAnalytics, getForecast } = require('../controllers/analytics.controller');

// REST summary — standard JWT header auth
router.get('/summary',  authenticateJWT, getSummary);
router.get('/forecast', authenticateJWT, getForecast);

// SSE stream — handles its own auth via query param (EventSource can't set headers)
router.get('/stream', streamAnalytics);

module.exports = router;
