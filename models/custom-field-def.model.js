'use strict';

const mongoose = require('mongoose');

// Defines the schema for a custom field — what fields exist and their type
const customFieldDefSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 60,
    },
    key: {
        // slug used as the key in customer.customFields map, e.g. "contract_value"
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: /^[a-z0-9_]+$/,
    },
    fieldType: {
        type: String,
        enum: ['text', 'number', 'date', 'boolean'],
        default: 'text',
    },
}, { timestamps: true });

customFieldDefSchema.index({ createdBy: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('CustomFieldDef', customFieldDefSchema);
