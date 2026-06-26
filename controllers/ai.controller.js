const aiService = require('../services/ai.service');

const MAX_INPUT_LENGTH = 500;

exports.convertNaturalLanguageToRules = async (req, res) => {
    try {
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ message: 'Description is required' });
        }

        if (description.length > MAX_INPUT_LENGTH) {
            return res.status(400).json({ message: `Description must be ${MAX_INPUT_LENGTH} characters or fewer` });
        }

        const rules = await aiService.naturalLanguageToRules(description);

        res.status(200).json({ description, rules });
    } catch (error) {
        res.status(500).json({ message: 'Error converting description to rules' });
    }
};

exports.generatePromotionalMessage = async (req, res) => {
    try {
        const { goal } = req.body;

        if (!goal) {
            return res.status(400).json({ message: 'Campaign goal is required' });
        }

        if (goal.length > MAX_INPUT_LENGTH) {
            return res.status(400).json({ message: `Goal must be ${MAX_INPUT_LENGTH} characters or fewer` });
        }

        const message = await aiService.generatePromotionalMessage(goal);

        res.status(200).json({ goal, message });
    } catch (error) {
        res.status(500).json({ message: 'Error generating promotional message' });
    }
};
