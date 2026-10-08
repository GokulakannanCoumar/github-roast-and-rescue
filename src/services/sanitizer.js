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

/**
 * Normalizes a client-supplied GitHub profile payload at the API boundary.
 * The UI never needs the full GitHub object, so we deliberately keep a small,
 * bounded telemetry contract to prevent prompt/token abuse and schema drift.
 * @param {object} profileData
 * @returns {{valid:boolean, error?:string, profile?:object}}
 */
function normalizeProfileData(profileData) {
  if (!profileData || typeof profileData !== 'object' || Array.isArray(profileData)) {
    return { valid: false, error: 'profileData must be an object.' };
  }

  const usernameResult = validateGitHubUsername(profileData.username);
  if (!usernameResult.valid) {
    return { valid: false, error: usernameResult.error };
  }

  const clampNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(Math.max(number, min), max);
  };

  const clampText = (value, maxLength, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    return sanitizeForPrompt(value, maxLength);
  };

  const rawRepos = Array.isArray(profileData.repos) ? profileData.repos : [];
  const repos = rawRepos.slice(0, 15).map((repo) => ({
    name: clampText(repo?.name, 80, 'unnamed-repository'),
    description: clampText(repo?.description, 240),
    language: clampText(repo?.language, 40, 'Unknown'),
    stars: clampNumber(repo?.stars, 0, 1000000000),
    forks: clampNumber(repo?.forks, 0, 1000000000),
    isFork: Boolean(repo?.isFork),
    homepage: clampText(repo?.homepage, 200),
    updatedAt: clampText(repo?.updatedAt, 20, 'Unknown'),
    hasReadme: Boolean(repo?.hasReadme)
  }));

  const commits = (Array.isArray(profileData.recentCommits) ? profileData.recentCommits : [])
    .slice(0, 15)
    .map(commit => clampText(commit, 160))
    .filter(Boolean);

  return {
    valid: true,
    profile: {
      username: usernameResult.sanitized,
      name: clampText(profileData.name, 100, usernameResult.sanitized),
      bio: clampText(profileData.bio, 320),
      publicRepos: clampNumber(profileData.publicRepos, 0, 1000000),
      followers: clampNumber(profileData.followers, 0, 100000000),
      following: clampNumber(profileData.following, 0, 100000000),
      originalReposCount: clampNumber(profileData.originalReposCount, 0, 1000000),
      forkedReposCount: clampNumber(profileData.forkedReposCount, 0, 1000000),
      reposWithDemoCount: clampNumber(profileData.reposWithDemoCount, 0, 1000000),
      reposAnalyzedCount: clampNumber(profileData.reposAnalyzedCount, 0, 1000000),
      topLanguages: (Array.isArray(profileData.topLanguages) ? profileData.topLanguages : [])
        .slice(0, 5)
        .map(language => clampText(language, 40))
        .filter(Boolean),
      createdAt: clampText(profileData.createdAt, 20, 'Unknown'),
      repos,
      recentCommits: commits
    }
  };
}

module.exports = {
  validateGitHubUsername,
  sanitizeForPrompt,
  wrapUntrustedData,
  normalizeProfileData
};
