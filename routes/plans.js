const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Plan = require('../models/Plan');
const { check, validationResult } = require('express-validator');

const isOwner = (plan, userId) => plan?.userId?.toString?.() === userId;

router.get('/', auth, async (req, res) => {
  try {
    const plans = await Plan.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(plans);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post(
  '/',
  [auth, [check('title', 'Title is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      title,
      shortDescription,
      category,
      priority,
      status,
      startDate,
      targetDate,
      tags,
      contentHtml
    } = req.body;

    try {
      const plan = new Plan({
        userId: req.user.id,
        title,
        shortDescription: shortDescription || '',
        category,
        priority,
        status,
        startDate: startDate || '',
        targetDate: targetDate || '',
        tags: Array.isArray(tags) ? tags : [],
        contentHtml: contentHtml || '',
        milestones: [],
        steps: []
      });

      const saved = await plan.save();
      res.json(saved);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

router.get('/:id', auth, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    if (!isOwner(plan, req.user.id)) return res.status(401).json({ msg: 'Not authorized' });
    res.json(plan);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    let plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    if (!isOwner(plan, req.user.id)) return res.status(401).json({ msg: 'Not authorized' });

    const allowed = [
      'title',
      'shortDescription',
      'category',
      'priority',
      'status',
      'startDate',
      'targetDate',
      'tags',
      'contentHtml'
    ];

    allowed.forEach((k) => {
      if (k in req.body) plan[k] = req.body[k];
    });

    if (!Array.isArray(plan.tags)) plan.tags = [];
    plan.tags = plan.tags.map((t) => (t || '').toString()).filter(Boolean).slice(0, 50);

    plan = await plan.save();
    res.json(plan);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    if (!isOwner(plan, req.user.id)) return res.status(401).json({ msg: 'Not authorized' });

    await Plan.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Plan removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post(
  '/:id/steps',
  [auth, [check('title', 'Step title is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const plan = await Plan.findById(req.params.id);
      if (!plan) return res.status(404).json({ msg: 'Plan not found' });
      if (!isOwner(plan, req.user.id)) return res.status(401).json({ msg: 'Not authorized' });

      const { title, notes, status, milestoneId, linkedHabitName } = req.body;
      plan.steps.push({
        title,
        notes: notes || '',
        status: status || 'Pending',
        milestoneId: milestoneId || null,
        linkedHabitName: linkedHabitName || ''
      });

      const saved = await plan.save();
      res.json(saved);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

router.put('/:id/steps/:stepId', auth, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    if (!isOwner(plan, req.user.id)) return res.status(401).json({ msg: 'Not authorized' });

    const step = plan.steps.id(req.params.stepId);
    if (!step) return res.status(404).json({ msg: 'Step not found' });

    ['title', 'notes', 'status', 'milestoneId', 'linkedHabitName'].forEach((k) => {
      if (k in req.body) step[k] = req.body[k];
    });

    const saved = await plan.save();
    res.json(saved);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.delete('/:id/steps/:stepId', auth, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    if (!isOwner(plan, req.user.id)) return res.status(401).json({ msg: 'Not authorized' });

    const step = plan.steps.id(req.params.stepId);
    if (!step) return res.status(404).json({ msg: 'Step not found' });
    step.deleteOne();

    const saved = await plan.save();
    res.json(saved);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/:id/reorderSteps', auth, async (req, res) => {
  const orderedStepIds = Array.isArray(req.body?.orderedStepIds) ? req.body.orderedStepIds : [];
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    if (!isOwner(plan, req.user.id)) return res.status(401).json({ msg: 'Not authorized' });

    const map = new Map(plan.steps.map((s) => [s._id.toString(), s]));
    const reordered = [];
    orderedStepIds.forEach((id) => {
      const key = (id || '').toString();
      const step = map.get(key);
      if (step) reordered.push(step);
      map.delete(key);
    });
    map.forEach((step) => reordered.push(step));
    plan.steps = reordered;

    const saved = await plan.save();
    res.json(saved);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post(
  '/:id/milestones',
  [auth, [check('title', 'Milestone title is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const plan = await Plan.findById(req.params.id);
      if (!plan) return res.status(404).json({ msg: 'Plan not found' });
      if (!isOwner(plan, req.user.id)) return res.status(401).json({ msg: 'Not authorized' });

      plan.milestones.push({ title: req.body.title });
      const saved = await plan.save();
      res.json(saved);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

router.delete('/:id/milestones/:milestoneId', auth, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    if (!isOwner(plan, req.user.id)) return res.status(401).json({ msg: 'Not authorized' });

    const milestone = plan.milestones.id(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ msg: 'Milestone not found' });
    milestone.deleteOne();

    plan.steps = (plan.steps || []).map((s) => {
      if (s?.milestoneId?.toString?.() === req.params.milestoneId) s.milestoneId = null;
      return s;
    });

    const saved = await plan.save();
    res.json(saved);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
