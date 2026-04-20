const mongoose = require('mongoose');

const MetricSnapshotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: Number, required: true }
  },
  { timestamps: true }
);

MetricSnapshotSchema.index({ date: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('MetricSnapshot', MetricSnapshotSchema);

