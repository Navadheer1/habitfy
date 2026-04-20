const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }
  },
  { _id: true }
);

const StepSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, default: null },
    linkedHabitName: { type: String, default: '' }
  },
  { _id: true }
);

const FeatureLimitsSchema = new mongoose.Schema(
  {
    habitLimit: { type: Number, default: 5 },
    analyticsDepthDays: { type: Number, default: 7 },
    canCreateChallenges: { type: Boolean, default: false },
    canAccessFriendsLeaderboard: { type: Boolean, default: true },
    exportEnabled: { type: Boolean, default: false },
    referralBonusMultiplier: { type: Number, default: 1 }
  },
  { _id: false }
);

const PlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    shortDescription: { type: String, default: '' },
    category: { type: String, enum: ['Startup', 'Personal', 'Career', 'Study', 'Fitness', 'Other'], default: 'Other' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Active', 'Completed', 'Archived'], default: 'Active' },
    startDate: { type: String, default: '' },
    targetDate: { type: String, default: '' },
    tags: { type: [String], default: [] },
    contentHtml: { type: String, default: '' },
    milestones: { type: [MilestoneSchema], default: [] },
    steps: { type: [StepSchema], default: [] },
    isSubscriptionPlan: { type: Boolean, default: false },
    billingInterval: { type: String, enum: ['none', 'monthly', 'yearly'], default: 'none' },
    priceCents: { type: Number, default: 0 },
    features: { type: FeatureLimitsSchema, default: () => ({}) }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', PlanSchema);
