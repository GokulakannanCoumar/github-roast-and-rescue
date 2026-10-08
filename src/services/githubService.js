// src/services/githubService.js - High-efficiency GitHub API client with parallelization & TTL caching
const config = require('../config');
const { validateGitHubUsername } = require('./sanitizer');

class GitHubService {
  constructor() {
    this.cache = new Map();
    this.cacheStats = { hits: 0, misses: 0 };
  }

  /**
   * Cleans up expired entries from in-memory cache
   */
  pruneCache() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > config.cacheTtlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Internal fetch with timeout & GitHub headers
   */
  async _fetchWithTimeout(url, customHeaders = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.githubFetchTimeoutMs);

    const headers = {
      'User-Agent': 'GitHub-Roast-And-Rescue-App/2.0',
      'Accept': 'application/vnd.github.v3+json',
      ...customHeaders
    };

    if (config.githubToken) {
      headers['Authorization'] = `token ${config.githubToken}`;
    }

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('GitHub API request timed out after ' + config.githubFetchTimeoutMs + 'ms');
      }
      throw err;
    }
  }

  /**
   * Fetches user profile, public repositories, and recent events in parallel
   * @param {string} rawUsername
   * @returns {Promise<object>}
   */
  async getUserData(rawUsername) {
    const validation = validateGitHubUsername(rawUsername);
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.statusCode = 400;
      throw err;
    }

    const username = validation.sanitized;
    const cacheKey = `gh_${username.toLowerCase()}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < config.cacheTtlMs) {
        this.cacheStats.hits++;
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    this.cacheStats.misses++;
    this.pruneCache();

    // Parallel fetch: User Profile, Repositories, Public Events
    const encodedUser = encodeURIComponent(username);
    const [userResult, reposResult, eventsResult] = await Promise.allSettled([
      this._fetchWithTimeout(`https://api.github.com/users/${encodedUser}`),
      this._fetchWithTimeout(`https://api.github.com/users/${encodedUser}/repos?sort=updated&per_page=30`),
      this._fetchWithTimeout(`https://api.github.com/users/${encodedUser}/events/public?per_page=30`)
    ]);

    // Handle User Profile (Primary prerequisite)
    if (userResult.status !== 'fulfilled') {
      const err = new Error(userResult.reason?.message || 'Failed to connect to GitHub API');
      err.statusCode = 502;
      throw err;
    }

    const userRes = userResult.value;
    if (!userRes.ok) {
      if (userRes.status === 404) {
        const err = new Error(`GitHub user "${username}" was not found.`);
        err.statusCode = 404;
        throw err;
      }
      if (userRes.status === 403) {
        const rateLimitRemaining = userRes.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0') {
          const err = new Error('GitHub API unauthenticated rate limit reached (60 req/hr). Please try again shortly or use demo mode.');
          err.statusCode = 429;
          throw err;
        }
      }
      const err = new Error(`GitHub API error: ${userRes.status} ${userRes.statusText}`);
      err.statusCode = userRes.status;
      throw err;
    }

    const user = await userRes.json();

    // Process Repositories safely
    let reposData = [];
    if (reposResult.status === 'fulfilled' && reposResult.value.ok) {
      try {
        reposData = await reposResult.value.json();
      } catch (e) {
        reposData = [];
      }
    }

    // Process Public Events (PushEvents for commits) safely
    const recentCommits = [];
    if (eventsResult.status === 'fulfilled' && eventsResult.value.ok) {
      try {
        const eventsData = await eventsResult.value.json();
        if (Array.isArray(eventsData)) {
          for (const evt of eventsData) {
            if (evt.type === 'PushEvent' && evt.payload && Array.isArray(evt.payload.commits)) {
              for (const c of evt.payload.commits) {
                if (c && c.message) {
                  const firstLine = c.message.trim().split('\n')[0];
                  if (firstLine) recentCommits.push(firstLine);
                }
              }
            }
          }
        }
      } catch (e) {
        // Non-critical; fallback to empty commits
      }
    }

    // Sanitize and structure repos
    const rawRepos = Array.isArray(reposData) ? reposData : [];
    const repos = rawRepos.map(r => ({
      name: r.name,
      description: r.description || '',
      language: r.language || 'Unknown',
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      isFork: Boolean(r.fork),
      homepage: r.homepage || '',
      updatedAt: r.updated_at ? r.updated_at.split('T')[0] : 'Unknown',
      hasReadme: true // GitHub repo default assumption for public profiles
    }));

    // Calculate Top Languages
    const langCounts = {};
    repos.forEach(r => {
      if (r.language && r.language !== 'Unknown') {
        langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang)
      .slice(0, 5);

    const originalRepos = repos.filter(r => !r.isFork);
    const forkedRepos = repos.filter(r => r.isFork);
    const reposWithDemo = repos.filter(r => Boolean(r.homepage));

    const profileSummary = {
      username: user.login,
      name: user.name || user.login,
      bio: user.bio || '',
      avatarUrl: user.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      profileUrl: user.html_url || `https://github.com/${user.login}`,
      publicRepos: user.public_repos || repos.length,
      followers: user.followers || 0,
      following: user.following || 0,
      blog: user.blog || '',
      company: user.company || '',
      location: user.location || '',
      createdAt: user.created_at ? user.created_at.split('T')[0] : 'Unknown',
      repos: repos.slice(0, 15),
      originalReposCount: originalRepos.length,
      forkedReposCount: forkedRepos.length,
      reposWithDemoCount: reposWithDemo.length,
      topLanguages,
      recentCommits: recentCommits.slice(0, 15)
    };

    // Store in cache
    this.cache.set(cacheKey, { timestamp: Date.now(), data: profileSummary });

    return profileSummary;
  }

  /**
   * Reset cache (for test suites)
   */
  clearCache() {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0 };
  }
}

module.exports = new GitHubService();
