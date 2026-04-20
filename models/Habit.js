const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  habitName: {
    type: String,
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'not completed', 'skipped'],
    default: 'not completed'
  },
  notes: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('Habit', HabitSchema);
