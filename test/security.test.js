// test/security.test.js - Unit tests for security headers & rate limiter
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { securityHeaders, rateLimiter, _resetRateLimiter } = require('../src/middleware/security');

describe('Security Middleware', () => {
  beforeEach(() => {
    _resetRateLimiter();
  });

  describe('securityHeaders', () => {
    it('sets standard security protection headers', () => {
      const headers = {};
      const req = {};
      const res = {
        setHeader(name, val) {
          headers[name.toLowerCase()] = val;
        }
      };
      let nextCalled = false;

      securityHeaders(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(headers['x-content-type-options'], 'nosniff');
      assert.strictEqual(headers['x-frame-options'], 'DENY');
      assert.strictEqual(headers['referrer-policy'], 'strict-origin-when-cross-origin');
      assert.ok(headers['content-security-policy']);
      assert.strictEqual(headers['cross-origin-opener-policy'], 'same-origin');
      assert.strictEqual(headers['cross-origin-resource-policy'], 'same-origin');
    });
  });

  describe('rateLimiter', () => {
    it('allows requests within rate limits and populates headers', () => {
      const headers = {};
      const req = { path: '/api/roast', ip: '127.0.0.1' };
      const res = {
        setHeader(name, val) {
          headers[name] = val;
        }
      };
      let nextCalled = false;

      rateLimiter(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.ok(headers['X-RateLimit-Limit']);
      assert.ok(headers['X-RateLimit-Remaining'] !== undefined);
    });

    it('blocks excessive requests with HTTP 429 status', () => {
      const req = { path: '/api/roast', ip: '192.168.1.100' };
      let lastStatusCode = 200;
      let lastJsonBody = null;

      const res = {
        setHeader() {},
        status(code) {
          lastStatusCode = code;
          return {
            json(body) {
              lastJsonBody = body;
            }
          };
        }
      };

      // Exceed configured rate limit
      for (let i = 0; i < 50; i++) {
        rateLimiter(req, res, () => {});
      }

      assert.strictEqual(lastStatusCode, 429);
      assert.strictEqual(lastJsonBody.success, false);
      assert.ok(lastJsonBody.error.includes('Too many requests'));
    });
  });
});
