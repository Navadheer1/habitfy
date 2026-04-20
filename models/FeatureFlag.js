const mongoose = require('mongoose');

const FeatureFlagSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true
    },
    enabled: {
      type: Boolean,
      default: false
    },
    rolloutPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    allowedPlans: [
      {
        type: String,
        enum: ['free', 'pro']
      }
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeatureFlag', FeatureFlagSchema);

