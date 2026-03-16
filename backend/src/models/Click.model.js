const mongoose = require('mongoose');

/**
 * Click — records each redirect event
 * Written asynchronously via Bull queue to avoid blocking redirects
 */
const clickSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Url',
    required: true,
    index: true,
  },
  shortCode: {
    type: String,
    required: true,
    index: true,
  },
  // Geo & device info parsed from request
  ip: String,
  country: String,
  city: String,
  browser: String,
  os: String,
  device: String,
  referrer: String,
  userAgent: String,
}, {
  timestamps: true,
});

// TTL: Keep analytics for 90 days to save storage
clickSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('Click', clickSchema);
