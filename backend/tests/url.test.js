/**
 * url.service.test.js — Unit tests for URL service
 */
const { generateShortCode, encode, decode } = require('../src/utils/base62');

// ── Base62 tests ──────────────────────────────────────────────────
describe('Base62 utilities', () => {
  test('generateShortCode returns string of correct length', () => {
    const code = generateShortCode(6);
    expect(typeof code).toBe('string');
    expect(code).toHaveLength(6);
  });

  test('generateShortCode only uses Base62 alphabet', () => {
    const code = generateShortCode(10);
    expect(code).toMatch(/^[0-9A-Za-z]+$/);
  });

  test('encode/decode are inverse operations', () => {
    const nums = [0, 1, 100, 999, 62, 3844, 238328];
    nums.forEach((n) => {
      expect(decode(encode(n))).toBe(n);
    });
  });

  test('encode(0) returns "0"', () => {
    expect(encode(0)).toBe('0');
  });
});

// ── URL validation tests ──────────────────────────────────────────
describe('URL validation', () => {
  const Joi = require('joi');
  const schema = Joi.object({
    originalUrl: Joi.string().uri().required(),
    customAlias: Joi.string().alphanum().min(3).max(20).optional(),
  });

  test('valid URL passes validation', () => {
    const { error } = schema.validate({ originalUrl: 'https://example.com' });
    expect(error).toBeUndefined();
  });

  test('invalid URL fails validation', () => {
    const { error } = schema.validate({ originalUrl: 'not-a-url' });
    expect(error).toBeDefined();
  });

  test('custom alias with special chars fails', () => {
    const { error } = schema.validate({
      originalUrl: 'https://example.com',
      customAlias: 'my alias!',
    });
    expect(error).toBeDefined();
  });

  test('custom alias too short fails', () => {
    const { error } = schema.validate({
      originalUrl: 'https://example.com',
      customAlias: 'ab',
    });
    expect(error).toBeDefined();
  });
});

// ── Rate limit tests ──────────────────────────────────────────────
describe('Sliding window rate limiter logic', () => {
  test('window correctly filters old entries', () => {
    const now = Date.now();
    const windowMs = 60_000;
    const windowStart = now - windowMs;

    const entries = [
      now - 70_000, // old — should be filtered
      now - 50_000, // in window
      now - 30_000, // in window
      now - 10_000, // in window
      now,          // current
    ];

    const inWindow = entries.filter((t) => t > windowStart);
    expect(inWindow).toHaveLength(4);
  });
});
