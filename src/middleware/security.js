// src/middleware/security.js - Security headers and Rate Limiting middleware
const config = require('../config');

// In-memory sliding window rate limiter
const ipRequests = new Map();

// Periodic cleanup of rate limiter map every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequests.entries()) {
    if (now - data.startTime > config.rateLimitWindowMs) {
      ipRequests.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Middleware: Applies strict HTTP security headers
 */
function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Legacy XSS filter activation
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://generativelanguage.googleapis.com https://api.github.com;"
  );

  next();
}

/**
 * Middleware: Rate limiter for API routes
 * Handles reverse proxy IP resolution (Cloud Run / load balancers)
 */
function rateLimiter(req, res, next) {
  // Do not rate-limit health check or static files
  if (req.path === '/api/health' || !req.path.startsWith('/api')) {
    return next();
  }

  // Safe client IP resolution behind Cloud Run / reverse proxies
  const headers = req.headers || {};
  const xForwardedFor = headers['x-forwarded-for'];
  const clientIp = req.ip ||
    (typeof xForwardedFor === 'string' ? xForwardedFor.split(',')[0].trim() : null) ||
    (req.socket ? req.socket.remoteAddress : null) ||
    'unknown-ip';

  const now = Date.now();
  const record = ipRequests.get(clientIp);

  if (!record || now - record.startTime > config.rateLimitWindowMs) {
    ipRequests.set(clientIp, { count: 1, startTime: now });
    res.setHeader('X-RateLimit-Limit', config.rateLimitMaxRequests);
    res.setHeader('X-RateLimit-Remaining', config.rateLimitMaxRequests - 1);
    return next();
  }

  record.count += 1;
  const remaining = Math.max(0, config.rateLimitMaxRequests - record.count);
  res.setHeader('X-RateLimit-Limit', config.rateLimitMaxRequests);
  res.setHeader('X-RateLimit-Remaining', remaining);

  if (record.count > config.rateLimitMaxRequests) {
    const retryAfterSeconds = Math.ceil((record.startTime + config.rateLimitWindowMs - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please slow down and try again shortly.',
      retryAfterSeconds
    });
  }

  next();
}

module.exports = {
  securityHeaders,
  rateLimiter,
  _resetRateLimiter: () => ipRequests.clear() // Exported for test suites
};
