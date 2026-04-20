const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['none', 'active', 'canceled', 'past_due', 'trialing'],
      default: 'none'
    },
    currentPeriodEnd: {
      type: Date
    },
    providerCustomerId: {
      type: String,
      default: null
    },
    providerSubscriptionId: {
      type: String,
      default: null
    },
    renewalPlan: {
      type: String,
      enum: ['free', 'pro_monthly', 'pro_yearly'],
      default: 'free'
    },
    trialEnd: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const OnboardingSchema = new mongoose.Schema(
  {
    completed: {
      type: Boolean,
      default: false
    },
    skipped: {
      type: Boolean,
      default: false
    },
    currentStep: {
      type: Number,
      default: 1
    },
    primaryGoal: {
      type: String,
      default: null
    },
    selectedTemplateIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OnboardingTemplate'
      }
    ],
    joinedChallengeId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  { _id: false }
);

const PublicProfileSchema = new mongoose.Schema(
  {
    isPublic: {
      type: Boolean,
      default: true
    },
    displayName: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      default: ''
    },
    avatarUrl: {
      type: String,
      default: null
    },
    showStats: {
      type: Boolean,
      default: true
    },
    showChallenges: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  subscription: {
    type: SubscriptionSchema,
    default: () => ({})
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  rank: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'diamond'],
    default: 'bronze'
  },
  streakFreezes: {
    type: Number,
    default: 0
  },
  referralCredits: {
    type: Number,
    default: 0
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  onboarding: {
    type: OnboardingSchema,
    default: () => ({})
  },
  publicProfile: {
    type: PublicProfileSchema,
    default: () => ({})
  }
});

module.exports = mongoose.model('User', UserSchema);
