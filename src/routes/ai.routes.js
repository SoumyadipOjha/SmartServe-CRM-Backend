const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');

// All AI routes require authentication
router.use(authenticateJWT);

// POST /api/ai/convert-rules - Convert natural language to segment rules
router.post('/convert-rules', aiController.convertNaturalLanguageToRules);

// POST /api/ai/generate-message - Generate promotional message
router.post('/generate-message', aiController.generatePromotionalMessage);

module.exports = router;