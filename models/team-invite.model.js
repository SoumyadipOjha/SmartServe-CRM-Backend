const mongoose = require('mongoose');
const crypto   = require('crypto');

const teamInviteSchema = new mongoose.Schema({
  invitedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email:      { type: String, required: true, lowercase: true, trim: true },
  teamRole:   { type: String, enum: ['admin','member'], default: 'member' },
  token:      { type: String, unique: true },
  accepted:   { type: Boolean, default: false },
  expiresAt:  { type: Date },
}, { timestamps: true });

teamInviteSchema.index({ invitedBy: 1 });
teamInviteSchema.index({ token: 1 });

teamInviteSchema.pre('save', function (next) {
  if (!this.token) this.token = crypto.randomBytes(24).toString('hex');
  if (!this.expiresAt) {
    const exp = new Date();
    exp.setDate(exp.getDate() + 7); // 7-day invite expiry
    this.expiresAt = exp;
  }
  next();
});

module.exports = mongoose.model('TeamInvite', teamInviteSchema);
