const mongoose = require('mongoose');

const OnboardingTemplateSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['habit', 'challenge'],
      required: true
    },
    goalCategory: {
      type: String,
      enum: ['discipline', 'fitness', 'weight_loss', 'study'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    frequency: {
      type: String,
      default: 'daily'
    },
    defaultSchedule: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    durationDays: {
      type: Number,
      default: 30
    },
    minParticipants: {
      type: Number,
      default: 1
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('OnboardingTemplate', OnboardingTemplateSchema);

