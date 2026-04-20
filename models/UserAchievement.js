const mongoose = require('mongoose');

const UserAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    achievementKey: {
      type: String,
      required: true
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

UserAchievementSchema.index({ userId: 1, achievementKey: 1 }, { unique: true });

module.exports = mongoose.model('UserAchievement', UserAchievementSchema);

