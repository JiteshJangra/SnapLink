const urlService = require('../services/url.service');
const logger = require('../utils/logger');

async function redirect(req, res, next) {
  try {
    const { code } = req.params;
    const result = await urlService.resolveUrl(code);

    if (!result) {
      return res.status(404).json({ error: 'Short URL not found or expired' });
    }

    // Fire-and-forget analytics (non-blocking)
    urlService.recordClick({
      shortCode: code,
      urlId: result.urlId,
      req,
    }).catch((err) => logger.error('Analytics enqueue failed:', err.message));

    // 301 = permanent (browser caches), 302 = temporary (no cache)
    // Use 302 so analytics always fires on the server
    res.redirect(302, result.originalUrl);
  } catch (err) {
    next(err);
  }
}

module.exports = { redirect };
