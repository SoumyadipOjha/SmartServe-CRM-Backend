const aiService = require('../services/ai.service');

/**
 * Controller for AI-related features
 */
exports.convertNaturalLanguageToRules = async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ message: 'Description is required' });
        }
        
        const rules = await aiService.naturalLanguageToRules(description);
        
        res.status(200).json({ 
            description,
            rules
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error converting description to rules', 
            error: error.message 
        });
    }
};

exports.generatePromotionalMessage = async (req, res) => {
    try {
        const { goal } = req.body;
        
        if (!goal) {
            return res.status(400).json({ message: 'Campaign goal is required' });
        }
        
        const message = await aiService.generatePromotionalMessage(goal);
        
        res.status(200).json({ 
            goal,
            message
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error generating promotional message', 
            error: error.message 
        });
    }
};