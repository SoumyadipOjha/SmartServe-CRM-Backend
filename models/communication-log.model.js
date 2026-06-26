const mongoose = require('mongoose');

const communicationLogSchema = new mongoose.Schema({
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed', 'pending', 'opened'],
        default: 'pending'
    },
    failureReason: {
        type: String
    },
    variant: {
        type: String,
        enum: ['A', 'B'],
        default: null
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    openedAt: {
        type: Date
    },
    clickedAt: {
        type: Date
    },
    resendId: {
        type: String,
        index: true,
    },
}, {
    timestamps: true
});

communicationLogSchema.index({ campaign: 1 });
communicationLogSchema.index({ customer: 1 });
communicationLogSchema.index({ campaign: 1, status: 1 });
communicationLogSchema.index({ sentAt: -1 });

const CommunicationLog = mongoose.model('CommunicationLog', communicationLogSchema);

module.exports = CommunicationLog;
