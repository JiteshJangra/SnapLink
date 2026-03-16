const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    trim: true,
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,       // Compound index for O(1) lookups
    trim: true,
  },
  customAlias: {
    type: String,
    unique: true,
    sparse: true,      // Allows null — only unique when set
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,     // Anonymous links allowed
  },
  clicks: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
    default: null,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index — auto-deletes documents
  },
  metadata: {
    title: String,
    description: String,
    favicon: String,
  },
}, {
  timestamps: true,   // Adds createdAt, updatedAt
});

// Compound text index for search
urlSchema.index({ originalUrl: 'text', customAlias: 'text' });

// Instance method — check if link is still valid
urlSchema.methods.isValid = function () {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

module.exports = mongoose.model('Url', urlSchema);
