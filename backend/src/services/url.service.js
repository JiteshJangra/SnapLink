/**
 * url.service.js — Core business logic
 *
 * Implements the Cache-Aside pattern:
 *   1. Check Redis cache first (O(1), sub-millisecond)
 *   2. On miss, query MongoDB and populate cache
 *   3. Analytics writes are async via Bull queue (non-blocking)
 */
const Url = require('../models/Url.model');
const { getRedis } = require('../config/redis');
const { generateShortCode } = require('../utils/base62');
const analyticsQueue = require('./analytics.queue');
const logger = require('../utils/logger');

const CACHE_TTL = 60 * 60 * 24; // 24 hours
const CACHE_PREFIX = 'url:';

class UrlService {
  /**
   * Create a new short URL
   */
  async createShortUrl({ originalUrl, customAlias, expiresAt, userId }) {
    // Use custom alias if provided, otherwise generate Base62 code
    let shortCode = customAlias || await this._generateUniqueCode();

    // Check alias availability
    if (customAlias) {
      const exists = await Url.findOne({ shortCode: customAlias });
      if (exists) throw Object.assign(new Error('Alias already taken'), { status: 409 });
    }

    const url = await Url.create({
      originalUrl,
      shortCode,
      customAlias: customAlias || undefined,
      createdBy: userId || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    // Warm the cache immediately after creation
    await this._cacheUrl(shortCode, url.originalUrl, url.expiresAt);

    logger.info(`Short URL created: ${shortCode} → ${originalUrl}`);
    return url;
  }

  /**
   * Resolve a short code to its original URL
   * Cache-aside: Redis first, MongoDB fallback
   */
  async resolveUrl(shortCode) {
    const redis = getRedis();
    const cacheKey = CACHE_PREFIX + shortCode;

    // 1. Cache hit — fastest path (~0.5ms)
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT: ${shortCode}`);
      return { originalUrl: cached, fromCache: true };
    }

    // 2. Cache miss — query MongoDB
    logger.debug(`Cache MISS: ${shortCode}`);
    const url = await Url.findOne({ shortCode, isActive: true });

    if (!url || !url.isValid()) {
      return null;
    }

    // 3. Populate cache for future requests
    await this._cacheUrl(shortCode, url.originalUrl, url.expiresAt);

    return { originalUrl: url.originalUrl, urlId: url._id, fromCache: false };
  }

  /**
   * Record a click (async — doesn't block the redirect)
   */
  async recordClick({ shortCode, urlId, req }) {
    // Increment counter in Redis atomically (INCR is O(1) and atomic)
    const redis = getRedis();
    await redis.incr(`clicks:${shortCode}`);

    // Enqueue full analytics write to MongoDB (non-blocking)
    await analyticsQueue.add('record-click', {
      shortCode,
      urlId: urlId?.toString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || '',
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
  }

  /**
   * Get analytics for a short URL
   */
  async getStats(shortCode, userId) {
    const url = await Url.findOne({ shortCode, createdBy: userId });
    if (!url) throw Object.assign(new Error('URL not found'), { status: 404 });

    const Click = require('../models/Click.model');

    // Get click time series (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [timeSeries, browsers, countries] = await Promise.all([
      Click.aggregate([
        { $match: { shortCode, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
      ]),
      Click.aggregate([
        { $match: { shortCode } },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Click.aggregate([
        { $match: { shortCode } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return { url, timeSeries, browsers, countries };
  }

  /**
   * List URLs for a user (paginated)
   */
  async getUserUrls(userId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const [urls, total] = await Promise.all([
      Url.find({ createdBy: userId, isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Url.countDocuments({ createdBy: userId, isActive: true }),
    ]);

    return { urls, total, pages: Math.ceil(total / limit), page };
  }

  /**
   * Soft-delete a URL and evict from cache
   */
  async deleteUrl(shortCode, userId) {
    const url = await Url.findOneAndUpdate(
      { shortCode, createdBy: userId },
      { isActive: false },
      { new: true }
    );
    if (!url) throw Object.assign(new Error('URL not found'), { status: 404 });

    // Cache eviction
    const redis = getRedis();
    await redis.del(CACHE_PREFIX + shortCode);

    return url;
  }

  // ── Private helpers ────────────────────────────────────────────

  async _generateUniqueCode(maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
      const code = generateShortCode(6);
      const exists = await Url.exists({ shortCode: code });
      if (!exists) return code;
    }
    throw new Error('Could not generate unique short code');
  }

  async _cacheUrl(shortCode, originalUrl, expiresAt) {
    const redis = getRedis();
    const key = CACHE_PREFIX + shortCode;

    // Respect link expiry in cache TTL
    let ttl = CACHE_TTL;
    if (expiresAt) {
      const secondsLeft = Math.floor((expiresAt - Date.now()) / 1000);
      if (secondsLeft <= 0) return; // Already expired — don't cache
      ttl = Math.min(ttl, secondsLeft);
    }

    await redis.setex(key, ttl, originalUrl);
  }
}

module.exports = new UrlService();
