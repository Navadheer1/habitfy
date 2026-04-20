const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['streak_warning', 'rank_drop', 'friend_overtook', 'upgrade_prompt'],
      required: true
    },
    channel: {
      type: String,
      enum: ['in_app', 'email'],
      default: 'in_app'
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

module.exports = mongoose.model('Notification', NotificationSchema);

