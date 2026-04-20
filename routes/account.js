const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const DeletionRequest = require('../models/DeletionRequest');
const AuditLog = require('../models/AuditLog');
const exportService = require('../services/exportService');

router.get('/export', auth, async (req, res) => {
  const format = (req.query.format || 'csv').toLowerCase();
  try {
    if (format !== 'csv') {
      return res.status(400).json({ message: 'Only CSV export supported currently' });
    }
    const csv = await exportService.exportUserDataToCsv(req.user.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="habitify_export.csv"');
    res.send(csv);
    await AuditLog.create({ userId: req.user.id, action: 'export_requested' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/delete', auth, async (req, res) => {
  try {
    const existing = await DeletionRequest.findOne({ userId: req.user.id, status: 'pending' });
    if (existing) {
      return res.json({ ok: true, status: 'pending' });
    }
    await DeletionRequest.create({ userId: req.user.id });
    await AuditLog.create({ userId: req.user.id, action: 'deletion_requested' });
    res.json({ ok: true, status: 'pending' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

