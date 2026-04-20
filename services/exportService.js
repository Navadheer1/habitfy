const Habit = require('../models/Habit');
const Plan = require('../models/Plan');

async function exportUserDataToCsv(userId) {
  const habits = await Habit.find({ userId });
  const plans = await Plan.find({ userId });
  const lines = [];
  lines.push(['type', 'id', 'name', 'date', 'status', 'notes'].join(','));
  habits.forEach(h => {
    lines.push(['habit', h._id, h.habitName, h.date, h.status, escapeCsv(h.notes || '')].join(','));
  });
  plans.forEach(p => {
    lines.push(['plan', p._id, p.title, '', p.status, escapeCsv(p.shortDescription || '')].join(','));
  });
  return lines.join('\n');
}

function escapeCsv(text) {
  const s = String(text || '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

module.exports = {
  exportUserDataToCsv
};

