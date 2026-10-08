// server.js - Production-grade GitHub Roast and Rescue backend
const express = require('express');
const cors = require('cors');
const path = require('path');

const config = require('./src/config');
const { securityHeaders, rateLimiter } = require('./src/middleware/security');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const githubService = require('./src/services/githubService');
const geminiService = require('./src/services/geminiService');
const { validateGitHubUsername, normalizeProfileData } = require('./src/services/sanitizer');
const { getDemoProfile } = require('./src/services/demoProfiles');

const app = express();
app.disable('x-powered-by');

// Enable trust proxy for Cloud Run and reverse proxies.
app.set('trust proxy', 1);

// 1. Security & Core Middleware
app.use(securityHeaders);
app.use(cors({
  // The app is same-origin by default. Set CORS_ORIGIN only when a separate
  // frontend origin is intentionally deployed.
  origin: config.corsOrigin || false,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));
app.use(express.json({ limit: '128kb', strict: true }));

// 2. Static Assets with safe caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true,
  setHeaders: (res, filePath) => {
    // HTML should always revalidate so deployments appear immediately.
    if (path.extname(filePath).toLowerCase() === '.html') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// 3. API Rate Limiting
app.use('/api', rateLimiter);

// 4. API Endpoints

/**
 * Health & Telemetry check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    model: config.geminiModel,
    cacheStats: githubService.cacheStats
  });
});

/**
 * Fetch GitHub profile data with caching and parallelization
 */
app.get('/api/github/:username', async (req, res, next) => {
  try {
    const { username } = req.params;
    const validation = validateGitHubUsername(username);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const demoProfile = getDemoProfile(validation.sanitized);
    if (demoProfile) {
      res.setHeader('Cache-Control', 'private, no-store');
      return res.json(demoProfile);
    }

    const data = await githubService.getUserData(validation.sanitized);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Generate Roast, Recruiter Check, and Rescue Roadmap
 * Supports level-aware caching & privacy-first API keys (Issues 8 & 9)
 */
app.post('/api/roast', async (req, res, next) => {
  try {
    const {
      profileData,
      spiciness = 'medium',
      apiKey: rawClientKey
    } = req.body;

    const normalized = normalizeProfileData(profileData);
    if (!normalized.valid) {
      return res.status(400).json({
        success: false,
        error: normalized.error
      });
    }

    const validSpiciness = ['mild', 'medium', 'nuclear'].includes(spiciness)
      ? spiciness
      : 'medium';
    const clientKey = typeof rawClientKey === 'string'
      ? rawClientKey.trim().slice(0, 256)
      : '';

    const analysis = await geminiService.generateAnalysis(
      normalized.profile,
      validSpiciness,
      clientKey
    );

    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      success: true,
      ...analysis
    });
  } catch (err) {
    next(err);
  }
});

// 5. 404 & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// 6. Start Server if executed directly
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`🔥 GitHub Roast & Rescue server running at http://localhost:${config.port}`);
  });
}

module.exports = app;
