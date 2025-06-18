const { body, validationResult } = require('express-validator');

// Enhanced middleware to handle validation errors with more detailed information
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({ 
            message: 'Validation failed',
            errors: errors.array(),
            requestBody: Object.keys(req.body) // Log keys to help debug missing fields
        });
    }
    next();
};

// Customer validation rules
const validateCustomer = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    handleValidationErrors
];

// Order validation rules
const validateOrder = [
    body('customer').notEmpty().withMessage('Customer ID is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('products').isArray().withMessage('Products must be an array'),
    body('products.*.name').notEmpty().withMessage('Product name is required'),
    body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('products.*.price').isNumeric().withMessage('Price must be a number'),
    handleValidationErrors
];

// Campaign validation rules with improved flexibility
const validateCampaign = [
    body('name').notEmpty().withMessage('Campaign name is required'),
    body('message').notEmpty().withMessage('Campaign message is required')
        .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters'),
    
    // Make rules validation more flexible and handle possible formats
    body('rules').isObject().withMessage('Rules must be an object'),
    body('rules.condition').isIn(['AND', 'OR']).withMessage('Condition must be AND or OR'),
    body('rules.conditions').isArray().withMessage('Rules conditions must be an array'),
    
    // Optional validation for empty arrays (e.g., when just starting to build a campaign)
    body('rules.conditions').custom((conditions, { req }) => {
        // Allow empty conditions array for drafts or initial saves
        if (conditions.length === 0) {
            return true;
        }
        
        // For non-empty arrays, validate each condition
        for (const condition of conditions) {
            if (!condition.field || !condition.operator) {
                throw new Error('All conditions must have field and operator properties');
            }
            
            // Validate value property based on field type
            if (condition.value === undefined || condition.value === null) {
                throw new Error('All conditions must have a value property');
            }
        }
        
        return true;
    }),
    
    handleValidationErrors
];

module.exports = {
    validateCustomer,
    validateOrder,
    validateCampaign
};