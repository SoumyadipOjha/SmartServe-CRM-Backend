const Campaign = require('../models/campaign.model');
const Customer = require('../models/customer.model');
const CommunicationLog = require('../models/communication-log.model');
const vendorService = require('../services/vendor.service');

// Create a new campaign
exports.createCampaign = async (req, res) => {
    try {
        const { name, description, rules, message } = req.body;
        
        const campaign = new Campaign({
            name,
            description,
            rules,
            message,
            createdBy: req.user.id
        });
        
        await campaign.save();
        res.status(201).json({ message: 'Campaign created successfully', campaign });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all campaigns
exports.getCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({}).sort({ createdAt: -1 });
        res.status(200).json({ campaigns });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get a single campaign by ID
exports.getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        
        res.status(200).json({ campaign });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Preview audience for a campaign
exports.previewCampaignAudience = async (req, res) => {
    try {
        const { rules } = req.body;
        
        // Build MongoDB query based on rules
        const query = buildQueryFromRules(rules);
        
        // Count matching customers
        const audienceCount = await Customer.countDocuments(query);
        
        res.status(200).json({ audienceCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Activate a campaign and send messages
exports.activateCampaign = async (req, res) => {
    try {
        const campaignId = req.params.id;
        const campaign = await Campaign.findById(campaignId);
        
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        
        // Find matching audience
        const query = buildQueryFromRules(campaign.rules);
        const audience = await Customer.find(query);
        
        // Update campaign with audience info
        campaign.audience = audience.map(customer => customer._id);
        campaign.audienceSize = audience.length;
        campaign.status = 'active';
        await campaign.save();
        
        // Send messages to audience
        for (const customer of audience) {
            // Create personalized message using template
            const personalizedMessage = campaign.message.replace('{{name}}', customer.name);
            
            // Create communication log entry
            const commLog = new CommunicationLog({
                campaign: campaign._id,
                customer: customer._id,
                message: personalizedMessage,
                status: 'pending'
            });
            
            await commLog.save();
            
            // Send message via vendor service (async)
            vendorService.sendMessage(commLog._id, customer.phone || customer.email, personalizedMessage);
        }
        
        res.status(200).json({ 
            message: 'Campaign activated successfully', 
            audienceSize: audience.length 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Receipt callback for vendor delivery
exports.deliveryReceipt = async (req, res) => {
    try {
        const { communicationId, status, failureReason } = req.body;
        
        const commLog = await CommunicationLog.findById(communicationId);
        
        if (!commLog) {
            return res.status(404).json({ message: 'Communication log not found' });
        }
        
        // Update communication log
        commLog.status = status;
        if (failureReason) {
            commLog.failureReason = failureReason;
        }
        await commLog.save();
        
        // Update campaign stats
        const campaign = await Campaign.findById(commLog.campaign);
        
        if (status === 'sent') {
            campaign.deliveryStats.sent += 1;
        } else if (status === 'failed') {
            campaign.deliveryStats.failed += 1;
        }
        
        await campaign.save();
        
        res.status(200).json({ message: 'Receipt processed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get latest campaign statistics
exports.getCampaignStats = async (req, res) => {
    try {
        const campaignId = req.params.id;
        
        // Use aggregation to get the latest stats directly from communication logs
        const campaign = await Campaign.findById(campaignId);
        
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        
        // Get real-time counts from communication logs
        const [sentCount, failedCount] = await Promise.all([
            CommunicationLog.countDocuments({ campaign: campaignId, status: 'sent' }),
            CommunicationLog.countDocuments({ campaign: campaignId, status: 'failed' })
        ]);
        
        // Return the stats - use actual count from logs rather than cached values
        res.status(200).json({ 
            stats: {
                sent: sentCount,
                failed: failedCount,
                audienceSize: campaign.audienceSize
            } 
        });
    } catch (error) {
        console.error('Error fetching campaign stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Helper function to build MongoDB query from rules
function buildQueryFromRules(rules) {
    const { conditions, condition } = rules;
    
    // Create an array of MongoDB conditions
    const mongoConditions = conditions.map(rule => {
        const { field, operator, value } = rule;
        
        // Map operators to MongoDB operators
        const operatorMap = {
            '>': '$gt',
            '<': '$lt',
            '>=': '$gte',
            '<=': '$lte',
            '=': '$eq',
            '!=': '$ne',
            'contains': '$regex'
        };
        
        const mongoOperator = operatorMap[operator];
        
        // Special case for contains operator
        if (operator === 'contains') {
            return { [field]: { [mongoOperator]: value, $options: 'i' } };
        }
        
        return { [field]: { [mongoOperator]: value } };
    });
    
    // Combine conditions with AND or OR
    if (condition === 'AND') {
        return { $and: mongoConditions };
    } else {
        return { $or: mongoConditions };
    }
}