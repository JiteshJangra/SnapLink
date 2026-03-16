/**
 * base62.js — Short code generation
 *
 * Base62 alphabet: 0-9, A-Z, a-z (62 characters)
 * 6-character code = 62^6 = 56 billion unique combinations
 * Collision probability is negligible for typical URL shortener scale.
 */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = ALPHABET.length; // 62

/**
 * Generate a random Base62 string of given length
 * Uses crypto.randomInt for uniform distribution
 */
function generateShortCode(length = 6) {
  const { randomInt } = require('crypto');
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[randomInt(BASE)];
  }
  return result;
}

/**
 * Encode a numeric ID to Base62 (deterministic, for counter-based approach)
 */
function encode(num) {
  if (num === 0) return ALPHABET[0];
  let result = '';
  while (num > 0) {
    result = ALPHABET[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  return result;
}

/**
 * Decode a Base62 string back to integer
 */
function decode(str) {
  return str.split('').reduce((acc, char) => {
    return acc * BASE + ALPHABET.indexOf(char);
  }, 0);
}

module.exports = { generateShortCode, encode, decode };
