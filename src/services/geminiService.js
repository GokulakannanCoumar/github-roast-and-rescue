// src/services/geminiService.js - Google Gemini 2.5 Flash client with resilient fallback handling
const config = require('../config');
const { buildSystemPrompt, buildUserPrompt } = require('../prompts/masterPrompts');
const { generateSmartAnalysis } = require('./fallbackEngine');

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
 * @param {object} profileData
 * @param {'mild'|'medium'|'nuclear'} spiciness
 * @param {string} [clientApiKey]
 * @returns {Promise<{ result: object, source: string, model?: string, notice?: string }>}
 */
async function generateAnalysis(profileData, spiciness = 'medium', clientApiKey = '') {
  const activeKey = clientApiKey || config.geminiApiKey;

  // If no API key is provided, execute Smart Heuristic Engine immediately
  if (!activeKey) {
    const fallbackResult = generateSmartAnalysis(profileData, spiciness);
    return {
      result: fallbackResult,
      source: 'smart-heuristic-engine',
      notice: 'Evaluated with Smart Heuristic Engine. Add a Google Gemini API Key for live AI inference.'
    };
  }

  const systemPrompt = buildSystemPrompt(spiciness);
  const userPrompt = buildUserPrompt(profileData);
  const modelName = config.geminiModel;

  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(activeKey)}`;

  const temperature = spiciness === 'nuclear' ? 1.0 : spiciness === 'mild' ? 0.35 : 0.7;

  const payload = {
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
      temperature,
      topP: 0.95
    }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds max for Gemini

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
        notice: `Gemini API returned status ${response.status}. Evaluated with Smart Heuristic Engine.`
      };
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini API returned empty candidate content');
    }

    const parsedJson = cleanAndParseJson(candidateText);

    return {
      result: parsedJson,
      source: 'gemini-ai',
      model: modelName
    };
  } catch (err) {
    console.warn('[GeminiService] Inference error, engaging fallback:', err.message);
    const fallbackResult = generateSmartAnalysis(profileData, spiciness);
    return {
      result: fallbackResult,
      source: 'smart-heuristic-engine',
      notice: `Fallback engaged (${err.message}). Evaluated with Smart Heuristic Engine.`
    };
  }
}

module.exports = {
  generateAnalysis,
  cleanAndParseJson
};
