const Joi = require('joi');
const urlService = require('../services/url.service');

const createSchema = Joi.object({
  originalUrl: Joi.string().uri().required(),
  customAlias: Joi.string().alphanum().min(3).max(20).optional(),
  expiresAt: Joi.date().greater('now').optional(),
});

async function createUrl(req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const url = await urlService.createShortUrl({
      ...value,
      userId: req.user?.id,
    });

    const shortUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/${url.shortCode}`;

    res.status(201).json({
      shortUrl,
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      expiresAt: url.expiresAt,
      createdAt: url.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await urlService.getStats(req.params.code, req.user.id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

async function getUserUrls(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await urlService.getUserUrls(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteUrl(req, res, next) {
  try {
    await urlService.deleteUrl(req.params.code, req.user.id);
    res.json({ message: 'URL deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUrl, getStats, getUserUrls, deleteUrl };
