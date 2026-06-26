'use strict';

const mongoose = require('mongoose');

const STAGES = ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];

const dealSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    stage: {
        type: String,
        enum: STAGES,
        default: 'lead',
    },
    value: {
        type: Number,
        default: 0,
        min: 0,
    },
    expectedCloseDate: {
        type: Date,
        default: null,
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    // order within the stage column for kanban sorting
    order: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

dealSchema.index({ createdBy: 1, stage: 1, order: 1 });

module.exports = mongoose.model('Deal', dealSchema);
