const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  sequence:    { type: mongoose.Schema.Types.ObjectId, ref: 'Sequence',  required: true },
  customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer',  required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',      required: true },
  currentStep: { type: Number, default: 0 },
  status:      { type: String, enum: ['active','completed','paused','cancelled'], default: 'active' },
  nextSendAt:  { type: Date },
  completedAt: { type: Date },
  stepsLog: [{
    stepIndex: Number,
    sentAt:    Date,
    subject:   String,
  }],
}, { timestamps: true });

enrollmentSchema.index({ createdBy: 1, status: 1, nextSendAt: 1 });
// prevent double-enrollment
enrollmentSchema.index({ customer: 1, sequence: 1 }, { unique: true });

module.exports = mongoose.model('SequenceEnrollment', enrollmentSchema);
