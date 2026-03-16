/**
 * rateLimit.middleware.js
 *
 * Redis-backed sliding window rate limiter.
 * More accurate than fixed-window: no boundary bursting.
 *
 * Algorithm:
 *   - Key: "rl:<ip>" (or "rl:user:<userId>" for authenticated users)
 *   - Use Redis Sorted Set with score = timestamp
 *   - Each request adds an entry; old entries are pruned on each check
 *   - Count remaining = WINDOW_MAX - current_window_count
 */
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW) || 60_000; // 1 minute
const WINDOW_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100;      // 100 req/min

async function slidingWindowRateLimit(req, res, next) {
  try {
    const redis = getRedis();
    const identifier = req.user?.id || req.ip;
    const key = `rl:${identifier}`;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    // Atomic pipeline: removes expired entries, adds current, counts remaining
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);          // Evict old entries
    pipeline.zadd(key, now, `${now}-${Math.random()}`);       // Add current request
    pipeline.zcard(key);                                       // Count in window
    pipeline.pexpire(key, WINDOW_MS);                          // Auto-cleanup key

    const results = await pipeline.exec();
    const requestCount = results[2][1];

    // Set rate limit headers (RFC standard)
    res.set({
      'X-RateLimit-Limit': WINDOW_MAX,
      'X-RateLimit-Remaining': Math.max(0, WINDOW_MAX - requestCount),
      'X-RateLimit-Reset': new Date(now + WINDOW_MS).toISOString(),
    });

    if (requestCount > WINDOW_MAX) {
      logger.warn(`Rate limit exceeded for ${identifier} (${requestCount} req/min)`);
      return res.status(429).json({
        error: 'Too many requests',
        message: `Limit: ${WINDOW_MAX} requests per minute`,
        retryAfter: Math.ceil(WINDOW_MS / 1000),
      });
    }

    next();
  } catch (err) {
    // Fail open — if Redis is down, allow the request
    logger.error('Rate limiter error (failing open):', err.message);
    next();
  }
}

// Named export for use in app.js
module.exports = { apiRateLimiter: slidingWindowRateLimit };
