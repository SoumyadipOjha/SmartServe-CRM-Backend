const mongoose = require('mongoose');
const crypto   = require('crypto');

const fieldSchema = new mongoose.Schema({
  label:     { type: String, required: true },
  fieldKey:  { type: String, required: true },
  fieldType: { type: String, enum: ['text','email','phone','textarea'], default: 'text' },
  required:  { type: Boolean, default: false },
}, { _id: false });

const leadFormSchema = new mongoose.Schema({
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:             { type: String, required: true, trim: true },
  token:            { type: String, unique: true },
  fields:           { type: [fieldSchema], default: [
    { label: 'Full Name',     fieldKey: 'name',    fieldType: 'text',     required: true  },
    { label: 'Email Address', fieldKey: 'email',   fieldType: 'email',    required: true  },
    { label: 'Phone Number',  fieldKey: 'phone',   fieldType: 'phone',    required: false },
    { label: 'Message',       fieldKey: 'message', fieldType: 'textarea', required: false },
  ]},
  submitMessage:    { type: String, default: "Thank you! We'll be in touch soon." },
  active:           { type: Boolean, default: true },
  submissionsCount: { type: Number,  default: 0 },
}, { timestamps: true });

leadFormSchema.index({ createdBy: 1, createdAt: -1 });

leadFormSchema.pre('save', function (next) {
  if (!this.token) this.token = crypto.randomBytes(16).toString('hex');
  next();
});

module.exports = mongoose.model('LeadForm', leadFormSchema);
