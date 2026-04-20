const User = require('../models/User');
const GamificationEvent = require('../models/GamificationEvent');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const config = require('../config/gamification');
const eventBus = require('./eventBus');

async function recordEvent(userId, type, metadata) {
  const baseXp = config.xpByEventType[type] || 0;

  if (!baseXp) {
    return null;
  }

  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const xpDelta = baseXp;
  const newXp = user.xp + xpDelta;
  const newLevel = calculateLevel(newXp);
  const newRank = calculateRank(newXp);

  user.xp = newXp;
  user.level = newLevel;
  user.rank = newRank;
  await user.save();

  const event = await GamificationEvent.create({
    userId,
    type,
    xpDelta,
    metadata: metadata || {}
  });

  await maybeUnlockAchievements(user);

  eventBus.emit('xp:changed', {
    userId,
    xpDelta,
    xp: newXp,
    level: newLevel,
    rank: newRank,
    type
  });

  return event;
}

function calculateLevel(xp) {
  const thresholds = config.levelThresholds || [];
  let level = 1;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (xp >= thresholds[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

function calculateRank(xp) {
  const thresholds = config.rankThresholds || {};
  if (xp >= thresholds.diamond) return 'diamond';
  if (xp >= thresholds.gold) return 'gold';
  if (xp >= thresholds.silver) return 'silver';
  return 'bronze';
}

async function maybeUnlockAchievements(user) {
  const achievements = await Achievement.find({});
  const unlocked = await UserAchievement.find({ userId: user.id });
  const unlockedKeys = new Set(unlocked.map(a => a.achievementKey));

  const toUnlock = [];

  achievements.forEach(a => {
    if (unlockedKeys.has(a.key)) {
      return;
    }
    if (a.criteria === 'xp>=100' && user.xp >= 100) {
      toUnlock.push(a);
    }
    if (a.criteria === 'xp>=1000' && user.xp >= 1000) {
      toUnlock.push(a);
    }
  });

  if (!toUnlock.length) {
    return;
  }

  for (const a of toUnlock) {
    await UserAchievement.create({
      userId: user.id,
      achievementKey: a.key
    });
    user.xp += a.rewardXp || 0;
    user.streakFreezes += a.rewardStreakFreezes || 0;
    eventBus.emit('achievement:unlocked', {
      userId: user.id,
      achievementKey: a.key
    });
  }

  await user.save();
}

module.exports = {
  recordEvent
};

