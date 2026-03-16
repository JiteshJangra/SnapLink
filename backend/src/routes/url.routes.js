// ── url.routes.js ─────────────────────────────────────────────────
const router = require('express').Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { createUrl, getStats, getUserUrls, deleteUrl } = require('../controllers/url.controller');

router.post('/', optionalAuth, createUrl);
router.get('/', authenticate, getUserUrls);
router.get('/:code/stats', authenticate, getStats);
router.delete('/:code', authenticate, deleteUrl);

module.exports = router;
