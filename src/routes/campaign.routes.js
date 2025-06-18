const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign.controller');
const { validateCampaign } = require('../middleware/validation.middleware');
const { authenticateJWT } = require('../middleware/auth.middleware');

// All campaign routes require authentication
router.use(authenticateJWT);

// POST /api/campaigns - Create a new campaign
router.post('/', validateCampaign, campaignController.createCampaign);

// GET /api/campaigns - Get all campaigns
router.get('/', campaignController.getCampaigns);

// POST /api/campaigns/preview - Preview audience size for campaign
router.post('/preview', campaignController.previewCampaignAudience);

// GET /api/campaigns/:id/stats - Get latest campaign statistics (must be before /:id pattern)
router.get('/:id/stats', campaignController.getCampaignStats);

// POST /api/campaigns/:id/activate - Activate a campaign and send messages
router.post('/:id/activate', campaignController.activateCampaign);

// GET /api/campaigns/:id - Get a single campaign by ID
router.get('/:id', campaignController.getCampaignById);

module.exports = router;