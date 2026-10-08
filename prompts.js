// prompts.js - Backward compatibility shim for root references
const masterPrompts = require('./src/prompts/masterPrompts');

module.exports = {
  SPICINESS_PROMPTS: masterPrompts.SPICINESS_PROMPTS,
  buildSystemPrompt: masterPrompts.buildSystemPrompt,
  buildUserPrompt: masterPrompts.buildUserPrompt
};
