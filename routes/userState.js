const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const planMiddleware = require('../middleware/planMiddleware');
const User = require('../models/User');

router.get('/', auth, planMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      subscriptionPlan: user.subscriptionPlan,
      subscription: user.subscription,
      role: user.role,
      xp: user.xp,
      level: user.level,
      rank: user.rank,
      streakFreezes: user.streakFreezes,
      referralCredits: user.referralCredits,
      onboarding: user.onboarding,
      publicProfile: user.publicProfile,
      planFeatures: req.planFeatures || {}
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

