const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

router.get('/', auth, async (req, res) => {
  try {
    const items = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/read', auth, async (req, res) => {
  try {
    const n = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
    if (!n) return res.status(404).json({ message: 'Not found' });
    n.readAt = new Date();
    await n.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

