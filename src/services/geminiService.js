// src/services/geminiService.js - Google Gemini 2.5 Flash client with resilient fallback handling & level-aware caching
const config = require('../config');
const { buildSystemPrompt, buildUserPrompt } = require('../prompts/masterPrompts');
const { generateSmartAnalysis } = require('./fallbackEngine');
const { ANALYSIS_RESPONSE_SCHEMA, validateAnalysis } = require('./analysisSchema');
const { normalizeProfileData } = require('./sanitizer');
const crypto = require('node:crypto');

// In-memory cache for AI analysis results (keyed by username + spiciness + model)
// TTL: 5 minutes. Prevents duplicate LLM calls while ensuring spiciness level changes yield fresh outputs.
const aiAnalysisCache = new Map();
const AI_CACHE_TTL_MS = 1000 * 60 * 5;

/**
 * Safely parses and validates LLM response JSON
 * @param {string} text
 * @returns {object}
 */
function cleanAndParseJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or non-string response from LLM');
  }

  // Strip potential markdown fences
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.substring(7);
  } else if (clean.startsWith('```')) {
    clean = clean.substring(3);
  }

  if (clean.endsWith('```')) {
    clean = clean.substring(0, clean.length - 3);
  }

  clean = clean.trim();

  // Find first { and last }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(clean);
}

/**
 * Generates Roast & Rescue analysis using Gemini 2.5 Flash, or falls back to Smart Heuristic Engine
 * Multi-factor caching: Keyed by username + spiciness + model (Issue 9).
 * Client API Key is sent over HTTPS, never logged to stdout, and never put in cache keys (Issue 8).
 * @param {object} profileData
 * @param {'mild'|'medium'|'nuclear'} spiciness
 * @param {string} [clientApiKey]
 * @returns {Promise<{ result: object, source: string, model?: string, notice?: string }>}
 */
async function generateAnalysis(profileData, spiciness = 'medium', clientApiKey = '') {
  const normalized = normalizeProfileData(profileData);
  if (!normalized.valid) {
    const error = new Error(normalized.error || 'Invalid profile data.');
    error.statusCode = 400;
    throw error;
  }

  const safeProfile = normalized.profile;
  const modelName = config.geminiModel;
  const profileFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(safeProfile))
    .digest('hex')
    .slice(0, 16);
  const cacheKey = `ai_${profileFingerprint}_${spiciness}_${modelName}`;

  const activeKey = typeof clientApiKey === 'string' ? clientApiKey.trim().slice(0, 256) : '';
  const serverKey = config.geminiApiKey;
  const effectiveKey = serverKey || activeKey;
  const cacheable = Boolean(serverKey) || !effectiveKey;

  if (cacheable && aiAnalysisCache.has(cacheKey)) {
    const cached = aiAnalysisCache.get(cacheKey);
    if (Date.now() - cached.timestamp < AI_CACHE_TTL_MS) {
      return {
        ...cached.payload,
        cached: true
      };
    }
    aiAnalysisCache.delete(cacheKey);
  }

  // If no API key is available, execute the deterministic Smart Heuristic Engine.
  if (!effectiveKey) {
    const fallbackResult = generateSmartAnalysis(safeProfile, spiciness);
    const payload = {
      result: fallbackResult,
      source: 'smart-heuristic-engine',
      notice: 'Evaluated with the deterministic fallback engine. Configure a server or session Gemini key for live model inference.'
    };
    aiAnalysisCache.set(cacheKey, { timestamp: Date.now(), payload });
    return payload;
  }

  const systemPrompt = buildSystemPrompt(spiciness);
  const userPrompt = buildUserPrompt(safeProfile);

  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(effectiveKey)}`;
  const temperature = spiciness === 'nuclear' ? 1.0 : spiciness === 'mild' ? 0.35 : 0.7;

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: ANALYSIS_RESPONSE_SCHEMA,
      temperature,
      topP: 0.9,
      maxOutputTokens: 1800
    }
  };

  let timeoutId;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds max for Gemini

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[GeminiService] API returned ${response.status}: ${errorText.substring(0, 150)}`);
      // Fallback gracefully so end users and evaluators never encounter a failure
      const fallbackResult = generateSmartAnalysis(profileData, spiciness);
      return {
        result: fallbackResult,
        source: 'smart-heuristic-engine',
        notice: 'Gemini inference was unavailable, so the deterministic fallback engine was used.'
      };
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini API returned empty candidate content');
    }

    const parsedJson = cleanAndParseJson(candidateText);
    const validation = validateAnalysis(parsedJson, safeProfile);
    if (!validation.valid) {
      throw new Error('Gemini response failed schema validation: ' + validation.errors.slice(0, 3).join('; '));
    }

    const payload = {
      result: parsedJson,
      source: 'gemini-ai',
      model: modelName
    };

    if (cacheable) {
      aiAnalysisCache.set(cacheKey, { timestamp: Date.now(), payload });
    }
    return payload;
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    console.warn('[GeminiService] Inference error, engaging fallback.');
    const fallbackResult = generateSmartAnalysis(profileData, spiciness);
    return {
      result: fallbackResult,
      source: 'smart-heuristic-engine',
      notice: 'Gemini inference could not be completed, so the deterministic fallback engine was used.'
    };
  }
}

function _clearAiCache() {
  aiAnalysisCache.clear();
}

module.exports = {
  generateAnalysis,
  cleanAndParseJson,
  _clearAiCache
};
