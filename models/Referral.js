const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    referrerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['generated', 'signed_up', 'rewarded'], default: 'generated' },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

module.exports = mongoose.model('Referral', ReferralSchema);

