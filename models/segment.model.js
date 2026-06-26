const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
    field:    { type: String, required: true },
    operator: { type: String, enum: ['>', '<', '>=', '<=', '=', '!=', 'contains'], required: true },
    value:    { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const segmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    tags: [{ type: String }],
    rules: {
        conditions: [conditionSchema],
        condition:  { type: String, enum: ['AND', 'OR'], default: 'AND' },
    },
    exclusions: [conditionSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

module.exports = mongoose.model('Segment', segmentSchema);
