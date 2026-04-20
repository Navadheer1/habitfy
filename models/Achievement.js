const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    criteria: {
      type: String,
      required: true
    },
    rewardXp: {
      type: Number,
      default: 0
    },
    rewardStreakFreezes: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Achievement', AchievementSchema);

