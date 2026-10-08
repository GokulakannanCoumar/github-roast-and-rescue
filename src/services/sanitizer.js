// src/services/sanitizer.js - Input validation, sanitization, and prompt-injection defense

/**
 * Validates a GitHub username according to official GitHub constraints:
 * - Up to 39 characters
 * - Only alphanumeric characters and single hyphens
 * - Cannot begin or end with a hyphen
 * - Cannot contain consecutive hyphens
 * @param {string} username
 * @returns {{ valid: boolean, error?: string, sanitized: string }}
 */
function validateGitHubUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username must be a non-empty string.', sanitized: '' };
  }

  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Username cannot be blank.', sanitized: '' };
  }

  if (trimmed.length > 39) {
    return { valid: false, error: 'Username cannot exceed 39 characters.', sanitized: '' };
  }

  // Official GitHub username regex: allows alphanumeric and single hyphens, not start/end with hyphen
  const githubUsernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

  if (!githubUsernameRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid GitHub username. Usernames may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.',
      sanitized: ''
    };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Sanitizes arbitrary text before injecting into LLM prompts.
 * Defends against prompt injection, control character escapes, and token exhaustion.
 * @param {string} text
 * @param {number} [maxLength=500]
 * @returns {string}
 */
function sanitizeForPrompt(text, maxLength = 500) {
  if (!text || typeof text !== 'string') return '';

  // 1. Remove dangerous Unicode control characters and null bytes
  let cleaned = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // 2. Neutralize typical prompt injection attack tokens
  cleaned = cleaned
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/```system/gi, '')
    .replace(/<<SYS>>/gi, '')
    .replace(/<\/<SYS>>/gi, '');

  // 3. Truncate to maximum length to prevent token overflow
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '... [truncated]';
  }

  return cleaned.trim();
}

/**
 * Wraps user-supplied content inside XML-style untrusted data tags.
 * This instructs the LLM that the enclosed text is strictly untrusted data, not system instructions.
 * @param {string} tagName
 * @param {string} content
 * @returns {string}
 */
function wrapUntrustedData(tagName, content) {
  const sanitized = sanitizeForPrompt(content);
  return `<untrusted_${tagName}>\n${sanitized}\n</untrusted_${tagName}>`;
}

module.exports = {
  validateGitHubUsername,
  sanitizeForPrompt,
  wrapUntrustedData
};
