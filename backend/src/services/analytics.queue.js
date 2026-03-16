/**
 * analytics.queue.js
 *
 * Bull job queue backed by Redis.
 * Analytics writes are decoupled from the redirect path — the redirect
 * responds immediately while click data is persisted asynchronously.
 * This prevents slow MongoDB writes from degrading redirect latency.
 */
const Bull = require('bull');
const UAParser = require('ua-parser-js');
const Click = require('../models/Click.model');
const Url = require('../models/Url.model');
const logger = require('../utils/logger');

const analyticsQueue = new Bull('analytics', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs for debugging
    removeOnFail: 50,
  },
});

// ── Worker — processes queued click events ───────────────────────
analyticsQueue.process('record-click', async (job) => {
  const { shortCode, urlId, ip, userAgent, referrer } = job.data;

  // Parse browser/OS from User-Agent
  const ua = UAParser(userAgent || '');
  const browser = ua.browser.name || 'Unknown';
  const os = ua.os.name || 'Unknown';
  const device = ua.device.type || 'desktop';

  // Write click record
  await Click.create({
    urlId,
    shortCode,
    ip,
    browser,
    os,
    device,
    referrer,
    userAgent,
    country: 'Unknown', // In production: use ip-api or MaxMind GeoIP
    city: 'Unknown',
  });

  // Sync click count from Redis → MongoDB (debounced: every 10th click)
  const totalClicks = await job.queue.client.get(`clicks:${shortCode}`);
  if (totalClicks && parseInt(totalClicks) % 10 === 0) {
    await Url.findOneAndUpdate({ shortCode }, { $set: { clicks: parseInt(totalClicks) } });
  }

  logger.debug(`Analytics recorded for ${shortCode}`);
});

analyticsQueue.on('failed', (job, err) => {
  logger.error(`Analytics job failed for ${job.data.shortCode}:`, err.message);
});

module.exports = analyticsQueue;
