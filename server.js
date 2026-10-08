// server.js - Production-grade GitHub Roast and Rescue backend
const express = require('express');
const cors = require('cors');
const path = require('path');

const config = require('./src/config');
const { securityHeaders, rateLimiter } = require('./src/middleware/security');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const githubService = require('./src/services/githubService');
const geminiService = require('./src/services/geminiService');
const { validateGitHubUsername } = require('./src/services/sanitizer');
const { getDemoProfile } = require('./src/services/demoProfiles');

const app = express();

// Enable trust proxy for Cloud Run and reverse proxies (Issue 5)
app.set('trust proxy', 1);

// 1. Security & Core Middleware
app.use(securityHeaders);
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '512kb' }));

// 2. Static Assets with Caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true
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
    version: '2.0.0',
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
    if (demoProfile) return res.json(demoProfile);

    const data = await githubService.getUserData(validation.sanitized);
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
    const { profileData, spiciness = 'medium', apiKey: clientKey } = req.body;

    if (!profileData || typeof profileData !== 'object' || !profileData.username) {
      return res.status(400).json({
        success: false,
        error: 'Valid profileData object containing username is required.'
      });
    }

    // Validate spiciness
    const validSpiciness = ['mild', 'medium', 'nuclear'].includes(spiciness) ? spiciness : 'medium';

    const analysis = await geminiService.generateAnalysis(profileData, validSpiciness, clientKey);

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
