const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  delayDays: { type: Number, default: 0, min: 0 },
  subject:   { type: String, required: true, trim: true },
  body:      { type: String, required: true },
}, { _id: true });

const sequenceSchema = new mongoose.Schema({
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  steps:       [stepSchema],
  active:      { type: Boolean, default: true },
}, { timestamps: true });

sequenceSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Sequence', sequenceSchema);
