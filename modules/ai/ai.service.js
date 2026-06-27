const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');

const aiService = {

    tryWithFallbackModels: async function(genAI, prompt, modelOptions) {
        let lastError = null;

        for (const modelName of modelOptions) {
            try {
                logger.debug({ model: modelName }, 'Trying AI model');
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text().trim();
            } catch (error) {
                logger.debug({ model: modelName, err: error.message }, 'AI model attempt failed');
                lastError = error;
            }
        }

        throw lastError;
    },

    naturalLanguageToRules: async function(description) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

            const prompt = `
                Convert the following customer segment description into a JSON rules object for a CRM system.
                The rules object should include "conditions" (array of objects with field, operator, and value)
                and a "condition" property (either "AND" or "OR").

                Valid fields: name, email, totalSpend, visits, lastActivity
                Valid operators: >, <, >=, <=, =, !=, contains

                Example input: "Customers who spent more than $1000 and visited less than 3 times"
                Example output:
                {
                  "conditions": [
                    { "field": "totalSpend", "operator": ">", "value": 1000 },
                    { "field": "visits", "operator": "<", "value": 3 }
                  ],
                  "condition": "AND"
                }

                Customer description: "${description}"

                Return ONLY the JSON object, nothing else.
            `;

            const modelOptions = [
                "gemini-2.0-flash-lite",
                "gemini-1.5-flash",
                "gemini-1.5-pro"
            ];

            const text = await this.tryWithFallbackModels(genAI, prompt, modelOptions);

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error("Could not parse JSON from AI response");
        } catch (error) {
            logger.error({ err: error.message }, 'AI naturalLanguageToRules error');
            throw new Error(`AI conversion failed: ${error.message}`);
        }
    },

    generatePromotionalMessage: async function(goal, customerName = "{{name}}") {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

            const prompt = `
                Generate a compelling marketing message for an email or SMS campaign.

                Campaign information: "${goal}"

                Requirements:
                - Include the customer name placeholder exactly as: ${customerName}
                - Write a message between 250-450 characters
                - Be specific, persuasive, and personalized
                - Include a clear call-to-action
                ${goal.toLowerCase().includes('high value') || goal.toLowerCase().includes('total spend') ?
                  '- This is for high-value customers who have spent over $100, so make it feel exclusive and premium' : ''}
                - Format it appropriately for marketing (not too casual, not too formal)
                - You can include simple markdown like [Link] to represent where links would go

                Return ONLY the final message text, nothing else.
            `;

            const modelOptions = [
                "gemini-1.5-pro",
                "gemini-1.5-flash",
                "gemini-2.0-flash-lite"
            ];

            const message = await this.tryWithFallbackModels(genAI, prompt, modelOptions);

            if (message.length < 120) {
                throw new Error("Generated message is too short, needs to be more comprehensive");
            }

            return message;
        } catch (error) {
            logger.warn({ err: error.message }, 'AI message generation failed, using fallback');

            const fallbacks = [
                `Hello ${customerName}, thank you for being a valued customer! We're excited to offer you exclusive access to our special promotion. Enjoy significant discounts on our most popular products and services, designed specifically for loyal customers like you. Don't miss this limited-time opportunity — visit us today to learn more! [Shop Now]`,
                `Hi ${customerName}! We've been thinking about you and wanted to share something special. As one of our most appreciated customers, you've unlocked an exclusive deal just for you. Incredible savings are waiting — but only for a limited time. Click here before it's gone! [Claim Offer]`,
                `Dear ${customerName}, your loyalty means everything to us! To show our gratitude, we're giving you early access to our biggest deals of the season. Premium discounts on everything you love, reserved exclusively for customers like you. Act now — this offer won't last! [View Deals]`,
                `${customerName}, you deserve the best! We've put together something special just for our most valued customers. Unlock exclusive savings and premium perks tailored to you. Your satisfaction is our top priority — let us show you how much we appreciate you. [Get Your Offer]`,
                `Hello ${customerName}! As a cherished member of our community, you're first to hear about this exciting opportunity. We've prepared an exclusive package of offers and benefits just for you. Don't miss this limited-time chance to enjoy fantastic savings. [Discover More]`,
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
    }
};

module.exports = aiService;
