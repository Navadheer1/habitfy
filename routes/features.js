const express = require('express');
const router = express.Router();
const FeatureConfig = require('../models/FeatureConfig');
const auth = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/featureGate');

router.get('/', auth, requireRole('admin'), async (req, res) => {
  const configs = await FeatureConfig.find({}).lean();
  res.json(configs);
});

router.put('/:plan', auth, requireRole('admin'), async (req, res) => {
  const plan = req.params.plan;
  const { features, limits } = req.body || {};
  let cfg = await FeatureConfig.findOne({ plan });
  if (!cfg) {
    cfg = new FeatureConfig({ plan, features: features || {}, limits: limits || {} });
  } else {
    if (features && typeof features === 'object') {
      Object.entries(features).forEach(([k, v]) => cfg.features.set(k, !!v));
    }
    if (limits && typeof limits === 'object') {
      Object.entries(limits).forEach(([k, v]) => cfg.limits.set(k, Number(v)));
    }
    cfg.updatedAt = new Date();
  }
  await cfg.save();
  res.json(cfg);
});

module.exports = router;
