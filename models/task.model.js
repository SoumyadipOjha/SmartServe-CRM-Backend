'use strict';

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    dueDate: {
        type: Date,
        default: null,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
    },
}, {
    timestamps: true,
});

taskSchema.index({ createdBy: 1, completed: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
