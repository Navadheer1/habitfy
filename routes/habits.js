const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const planMiddleware = require('../middleware/planMiddleware');
const requireFeature = require('../middleware/featureGate');
const Habit = require('../models/Habit');
const { check, validationResult } = require('express-validator');
const gamificationService = require('../services/gamificationService');

router.get('/', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(habits);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post(
  '/',
  [
    auth,
    planMiddleware,
    requireFeature(
      () => true,
      'Habit creation restricted'
    ),
    [
      check('habitName', 'Habit name is required').not().isEmpty(),
      check('date', 'Date is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { habitName, date, status, notes } = req.body;

    try {
      const count = await Habit.countDocuments({ userId: req.user.id });
      const limit = req.planFeatures && req.planFeatures.habitLimit ? req.planFeatures.habitLimit : 5;
      if (count >= limit) {
        return res.status(403).json({
          message: 'Habit limit reached for your plan',
          upgradeSuggest: true
        });
      }

      const newHabit = new Habit({
        habitName,
        date,
        status,
        notes,
        userId: req.user.id
      });

      const habit = await newHabit.save();
      if (status === 'completed') {
        await gamificationService.recordEvent(req.user.id, 'habit_completed', {
          habitId: habit._id,
          date
        });
      }
      res.json(habit);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

router.put('/:id', auth, async (req, res) => {
  const { habitName, date, status, notes } = req.body;

  const habitFields = {};
  if (habitName) habitFields.habitName = habitName;
  if (date) habitFields.date = date;
  if (status) habitFields.status = status;
  if (notes) habitFields.notes = notes;

  try {
    let habit = await Habit.findById(req.params.id);

    if (!habit) return res.status(404).json({ msg: 'Habit not found' });

    if (habit.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const previousStatus = habit.status;

    habit = await Habit.findByIdAndUpdate(
      req.params.id,
      { $set: habitFields },
      { new: true }
    );

    if (previousStatus !== 'completed' && habit.status === 'completed') {
      await gamificationService.recordEvent(req.user.id, 'habit_completed', {
        habitId: habit._id,
        date: habit.date
      });
    }

    res.json(habit);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    let habit = await Habit.findById(req.params.id);

    if (!habit) return res.status(404).json({ msg: 'Habit not found' });

    if (habit.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Habit.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Habit removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
