const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * AI service to convert natural language to segment rules using Google's Gemini API
 * with fallback model support
 */
const aiService = {
    /**
     * Try to generate content with multiple model options if the primary one fails
     * @param {GoogleGenerativeAI} genAI - Google AI instance
     * @param {string} prompt - The prompt to send
     * @param {string[]} modelOptions - Array of models to try in order
     * @returns {Promise<string>} - Generated text response
     */
    tryWithFallbackModels: async function(genAI, prompt, modelOptions) {
        let lastError = null;
        
        // Try each model in order until one works
        for (const modelName of modelOptions) {
            try {
                console.log(`Trying to generate content with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text().trim();
            } catch (error) {
                console.log(`Model ${modelName} failed: ${error.message}`);
                lastError = error;
                // Continue to the next model option
            }
        }
        
        // If all models failed, throw the last error
        throw lastError;
    },

    /**
     * Convert natural language description to segment rules
     * @param {string} description - Natural language description of the segment
     * @returns {Promise<object>} - JSON rules object
     */
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
            
            // Define models to try in order of preference
            const modelOptions = [
                "gemini-2.0-flash-lite", 
                "gemini-1.5-flash",
                "gemini-1.5-pro"
            ];
            
            const text = await this.tryWithFallbackModels(genAI, prompt, modelOptions);
            
            // Parse the JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            throw new Error("Could not parse JSON from AI response");
        } catch (error) {
            console.error("Error in AI service:", error);
            throw new Error(`AI conversion failed: ${error.message}`);
        }
    },
    
    /**
     * Generate promotional message based on campaign goal
     * @param {string} goal - Campaign goal description
     * @param {string} customerName - Customer name for personalization
     * @returns {Promise<string>} - Generated promotional message
     */
    generatePromotionalMessage: async function(goal, customerName = "{{name}}") {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            
            // Completely revised prompt to generate longer, compelling messages
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
            
            // Define models to try in order of preference
            const modelOptions = [
                "gemini-1.5-pro", // Use Pro model first for better quality
                "gemini-1.5-flash",
                "gemini-2.0-flash-lite" 
            ];
            
            const message = await this.tryWithFallbackModels(genAI, prompt, modelOptions);
            
            // Ensure we haven't gotten a message that's too short
            if (message.length < 120) {
                throw new Error("Generated message is too short, needs to be more comprehensive");
            }
            
            return message;
        } catch (error) {
            console.error("Error in AI message generation:", error);
            
            // Fallback to a template message if AI generation fails
            return `Hello ${customerName}, thank you for being a valued customer! We're excited to offer you exclusive access to our special Spring Sale promotion. Enjoy significant discounts on our most popular products and services, designed specifically for loyal customers like you. Don't miss this limited-time opportunity - visit our website or contact us today to learn more! [Link]`;
        }
    }
};

module.exports = aiService;