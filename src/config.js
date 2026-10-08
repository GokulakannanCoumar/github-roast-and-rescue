// src/config.js - Centralized configuration and environment validation
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  githubToken: process.env.GITHUB_TOKEN || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  cacheTtlMs: parseInt(process.env.CACHE_TTL_MS, 10) || 1000 * 60 * 60,
  rateLimitWindowMs: 60 * 1000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX, 10) || 30,
  githubFetchTimeoutMs: 8000,
  corsOrigin: process.env.CORS_ORIGIN || ''
};

module.exports = config;
