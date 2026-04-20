const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const Referral = require('../models/Referral');
const gamificationService = require('../services/gamificationService');

function generateCode() {
  return Math.random().toString(36).slice(2, 8);
}

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.referralCode) {
      let code = generateCode();
      let exists = await Referral.findOne({ code });
      while (exists) {
        code = generateCode();
        exists = await Referral.findOne({ code });
      }
      await Referral.create({
        code,
        referrerUserId: user.id
      });
      user.referralCode = code;
      await user.save();
    }
    res.json({ code: user.referralCode });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/redeem', auth, async (req, res) => {
  const { code } = req.body;
  try {
    const ref = await Referral.findOne({ code });
    if (!ref) return res.status(404).json({ message: 'Invalid code' });
    if (ref.referrerUserId.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot redeem own code' });
    }
    ref.referredUserId = req.user.id;
    ref.status = 'signed_up';
    await ref.save();

    const referrer = await User.findById(ref.referrerUserId);
    const referred = await User.findById(req.user.id);
    referrer.referralCredits += 1;
    referred.referralCredits += 1;
    await referrer.save();
    await referred.save();
    await gamificationService.recordEvent(referrer.id, 'referral_redeemed', { referredUserId: referred.id });
    await gamificationService.recordEvent(referred.id, 'referral_redeemed', { referrerUserId: referrer.id });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

