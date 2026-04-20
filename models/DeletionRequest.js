const mongoose = require('mongoose');

const DeletionRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'processed'], default: 'pending' }
  },
  { timestamps: false }
);

module.exports = mongoose.model('DeletionRequest', DeletionRequestSchema);

