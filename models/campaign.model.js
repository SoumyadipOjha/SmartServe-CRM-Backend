const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    rules: {
        conditions: [{
            field: {
                type: String,
                required: true
            },
            operator: {
                type: String,
                enum: ['>', '<', '>=', '<=', '=', '!=', 'contains'],
                required: true
            },
            value: {
                type: mongoose.Schema.Types.Mixed,
                required: true
            }
        }],
        condition: {
            type: String,
            enum: ['AND', 'OR'],
            default: 'AND'
        }
    },
    message: {
        type: String,
        required: true
    },
    audience: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    }],
    audienceSize: {
        type: Number,
        default: 0
    },
    deliveryStats: {
        sent: {
            type: Number,
            default: 0
        },
        failed: {
            type: Number,
            default: 0
        }
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'completed', 'cancelled'],
        default: 'draft'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;