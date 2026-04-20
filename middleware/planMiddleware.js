const Plan = require('../models/Plan');
const User = require('../models/User');

module.exports = async function attachPlan(req, res, next) {
  if (!req.user) {
    return next();
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user.role = user.role;
    req.user.subscriptionPlan = user.subscriptionPlan;

    const plan = await Plan.findOne({
      isSubscriptionPlan: true,
      title: user.subscriptionPlan
    });

    req.plan = plan;
    req.planFeatures = plan && plan.features ? plan.features : {};
    next();
  } catch (e) {
    next(e);
  }
};

