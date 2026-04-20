module.exports = function requireFeature(checkFn, message) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const features = req.planFeatures || {};
    const allowed = typeof checkFn === 'function' ? checkFn(features, req.user) : false;
    if (!allowed) {
      return res.status(403).json({
        message: message || 'Feature not available on current plan',
        upgradeSuggest: true
      });
    }
    next();
  };
};

