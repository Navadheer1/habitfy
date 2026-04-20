const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const Habit = require('../models/Habit');
const OnboardingTemplate = require('../models/OnboardingTemplate');
const gamificationService = require('../services/gamificationService');

const GOALS = ['discipline', 'fitness', 'weight_loss', 'study'];

router.get('/goals', (req, res) => {
  res.json(GOALS);
});

router.post('/goal', auth, async (req, res) => {
  const { goal } = req.body;
  if (!GOALS.includes(goal)) {
    return res.status(400).json({ message: 'Invalid goal' });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.onboarding.primaryGoal = goal;
    user.onboarding.currentStep = 2;
    await user.save();
    res.json({ ok: true, onboarding: user.onboarding });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/templates', auth, async (req, res) => {
  const { goal } = req.query;
  try {
    const templates = await OnboardingTemplate.find({
      goalCategory: goal || 'discipline',
      active: true,
      type: 'habit'
    })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(templates);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/habits', auth, async (req, res) => {
  const { templateIds = [] } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const templates = await OnboardingTemplate.find({
      _id: { $in: templateIds },
      type: 'habit'
    });
    const created = [];
    const today = new Date();
    const isoDate = today.toISOString().slice(0, 10);
    for (const t of templates) {
      const h = await Habit.create({
        userId: user.id,
        habitName: t.title,
        date: isoDate,
        status: 'not completed',
        notes: `Template: ${t.description || ''}`
      });
      created.push(h);
    }
    user.onboarding.selectedTemplateIds = templates.map(t => t._id);
    user.onboarding.currentStep = 3;
    await user.save();
    res.json({ createdCount: created.length, onboarding: user.onboarding });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/join-challenge', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.onboarding.joinedChallengeId = null;
    user.onboarding.currentStep = 4;
    await user.save();
    await gamificationService.recordEvent(user.id, 'challenge_joined', {});
    res.json({ ok: true, onboarding: user.onboarding });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/progress-preview', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const currentXp = user.xp || 0;
    const projectedDailyXp = 10 * 5; // assume 5 habits completed daily
    const projected30Days = projectedDailyXp * 30;
    const projectedXp = currentXp + projected30Days;
    res.json({
      currentXp,
      projectedXp30d: projectedXp
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/skip', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.onboarding.completed = true;
    user.onboarding.skipped = true;
    user.onboarding.currentStep = 4;
    await user.save();
    res.json({ ok: true, onboarding: user.onboarding });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/complete', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.onboarding.completed = true;
    user.onboarding.currentStep = 4;
    await user.save();
    res.json({ ok: true, onboarding: user.onboarding });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

