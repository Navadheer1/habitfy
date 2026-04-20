const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const MetricSnapshot = require('../models/MetricSnapshot');
const FeatureFlag = require('../models/FeatureFlag');

router.get('/metrics/summary', auth, requireRole(['admin']), async (req, res) => {
  try {
    const latest = await MetricSnapshot.find({}).sort({ createdAt: -1 }).limit(50);
    res.json(latest);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/feature-flags', auth, requireRole(['admin']), async (req, res) => {
  try {
    const flags = await FeatureFlag.find({}).sort({ key: 1 });
    res.json(flags);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/feature-flags', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { key, enabled, rolloutPercentage, allowedPlans, metadata } = req.body;
    const updated = await FeatureFlag.findOneAndUpdate(
      { key },
      { $set: { enabled, rolloutPercentage, allowedPlans, metadata } },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

