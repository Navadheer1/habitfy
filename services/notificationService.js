const Notification = require('../models/Notification');
const eventBus = require('./eventBus');

async function createNotification(userId, type, payload) {
  const titleMap = {
    streak_warning: 'Your streak is at risk',
    rank_drop: 'Rank changed',
    friend_overtook: 'A friend overtook you',
    upgrade_prompt: 'Unlock more with Pro'
  };
  const title = titleMap[type] || 'Notification';
  const body = payload && payload.body ? payload.body : '';
  return Notification.create({
    userId,
    type,
    title,
    body,
    channel: 'in_app'
  });
}

function startListeners() {
  eventBus.on('xp:changed', async ({ userId, type }) => {
    if (type === 'habit_completed') {
      // milestone prompts could go here
      // For now, do nothing
    }
  });
  eventBus.on('achievement:unlocked', async ({ userId, achievementKey }) => {
    await createNotification(userId, 'upgrade_prompt', {
      body: 'Congrats! Consider Pro to boost progress.'
    });
  });
}

module.exports = {
  createNotification,
  startListeners
};

