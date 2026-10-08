// src/services/githubService.js - Resilient GitHub data client
const config = require('../config');
const { validateGitHubUsername } = require('./sanitizer');

class GitHubService {
  constructor() {
    this.cache = new Map();
    this.cacheStats = { hits: 0, misses: 0, webFallbacks: 0 };
  }

  pruneCache() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > config.cacheTtlMs) this.cache.delete(key);
    }
  }

  async _fetchWithTimeout(url, customHeaders = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.githubFetchTimeoutMs);
    const headers = {
      'User-Agent': 'GitHub-Roast-And-Rescue-App/3.0',
      'Accept': 'application/vnd.github+json',
      ...customHeaders
    };

    if (config.githubToken) headers.Authorization = 'Bearer ' + config.githubToken;

    try {
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('GitHub request timed out after ' + config.githubFetchTimeoutMs + 'ms');
      }
      throw err;
    }
  }

  _isRateLimited(response) {
    return Boolean(
      response &&
      response.status === 403 &&
      response.headers.get('x-ratelimit-remaining') === '0'
    );
  }

  _rateLimitError(response, username) {
    const reset = Number(response && response.headers.get('x-ratelimit-reset')) || 0;
    const resetAt = reset ? new Date(reset * 1000).toISOString() : null;
    const err = new Error(
      'GitHub API rate limit reached while checking @' + username +
      (resetAt
        ? '. Try again after ' + resetAt + '.'
        : '. Configure GITHUB_TOKEN on the server for a higher limit.')
    );
    err.statusCode = 429;
    err.code = 'GITHUB_RATE_LIMIT';
    err.resetAt = resetAt;
    return err;
  }

  async _fetchPublicHtmlFallback(username) {
    const htmlHeaders = {
      'User-Agent': 'Mozilla/5.0 (compatible; GitHub-Roast-Rescue/3.0)',
      'Accept': 'text/html,application/xhtml+xml'
    };

    const results = await Promise.allSettled([
      this._fetchWithTimeout(
        'https://github.com/' + encodeURIComponent(username),
        htmlHeaders
      ),
      this._fetchWithTimeout(
        'https://github.com/' + encodeURIComponent(username) + '?tab=repositories',
        htmlHeaders
      )
    ]);

    if (results[0].status !== 'fulfilled' || !results[0].value.ok) return null;

    const profileHtml = await results[0].value.text();
    if (!profileHtml || /Page not found/i.test(profileHtml)) return null;

    let reposHtml = profileHtml;
    if (results[1].status === 'fulfilled' && results[1].value.ok) {
      reposHtml = await results[1].value.text();
    }

    const profile = this._parseProfileHtml(username, profileHtml);
    if (!profile) return null;

    const repos = this._parseReposHtml(username, reposHtml).slice(0, 15);
    const languageCounts = {};

    for (const repo of repos) {
      if (repo.language && repo.language !== 'Unknown') {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    }

    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 5);

    return {
      ...profile,
      publicRepos: profile.publicRepos || repos.length,
      repos,
      originalReposCount: repos.filter(repo => !repo.isFork).length,
      forkedReposCount: repos.filter(repo => repo.isFork).length,
      reposWithDemoCount: repos.filter(repo => Boolean(repo.homepage)).length,
      topLanguages,
      recentCommits: [],
      dataSource: 'github-public-page-fallback'
    };
  }

  _stripHtml(value) {
    return String(value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  _metricToNumber(value) {
    if (!value) return 0;
    const cleaned = String(value).toLowerCase().replace(/,/g, '').trim();
    if (cleaned.endsWith('k')) return Math.round(parseFloat(cleaned) * 1000);
    if (cleaned.endsWith('m')) return Math.round(parseFloat(cleaned) * 1000000);
    return Number(cleaned) || 0;
  }

  _parseProfileHtml(username, html) {
    const text = this._stripHtml(html);
    const titleMatch = html.match(/<title[^>]*>\s*([^<]+?)\s*· GitHub<\/title>/i);
    const nameMatch = html.match(/class="[^"]*p-name[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const avatarMatch =
      html.match(/<img[^>]+src="([^"]+)"[^>]+alt="[^"]*@"[^"]*/i) ||
      html.match(/<img[^>]+alt="[^"]*@"[^>]+src="([^"]+)"/i);
    const followersMatch = text.match(/([\d,.]+k?)\s+followers/i);
    const followingMatch = text.match(/([\d,.]+k?)\s+following/i);
    const locationMatch = html.match(/itemprop="homeLocation"[\s\S]*?<span[^>]*>([^<]+)<\/span>/i);
    const bioMatch = html.match(/class="[^"]*p-note[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    const cleanName = this._stripHtml(nameMatch && nameMatch[1]);
    const titleName = this._stripHtml(titleMatch && titleMatch[1]);

    return {
      username,
      name: cleanName || titleName || username,
      bio: this._stripHtml(bioMatch && bioMatch[1]),
      avatarUrl: (avatarMatch && avatarMatch[1]) ||
        ('https://github.com/' + encodeURIComponent(username) + '.png?size=160'),
      profileUrl: 'https://github.com/' + encodeURIComponent(username),
      publicRepos: 0,
      followers: this._metricToNumber(followersMatch && followersMatch[1]),
      following: this._metricToNumber(followingMatch && followingMatch[1]),
      blog: '',
      company: '',
      location: this._stripHtml(locationMatch && locationMatch[1]),
      createdAt: 'Unknown'
    };
  }

  _parseReposHtml(username, html) {
    if (!html) return [];

    const escapedUser = username.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const linkRegex = new RegExp(
      "href=[\"']/" + escapedUser + "/([^/\"'?#]+)[\"']",
      "gi"
    );

    const seen = new Set();
    const repos = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null && repos.length < 30) {
      const name = match[1];
      if (!name || seen.has(name)) continue;

      seen.add(name);

      const chunk = html.slice(
        Math.max(0, match.index - 500),
        Math.min(html.length, match.index + 2200)
      );
      const plain = this._stripHtml(chunk);
      const languageMatch = plain.match(
        /\b(HTML|CSS|JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|Ruby|PHP|Swift|Kotlin)\b/
      );

      repos.push({
        name,
        description: '',
        language: languageMatch ? languageMatch[1] : 'Unknown',
        stars: 0,
        forks: 0,
        isFork: /Forked from/i.test(plain),
        homepage: '',
        updatedAt: 'Unknown',
        hasReadme: true
      });
    }

    return repos;
  }

  async getUserData(rawUsername) {
    const validation = validateGitHubUsername(rawUsername);
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.statusCode = 400;
      throw err;
    }

    const username = validation.sanitized;
    const cacheKey = 'gh_' + username.toLowerCase();
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < config.cacheTtlMs) {
      this.cacheStats.hits++;
      return cached.data;
    }

    this.cacheStats.misses++;
    this.pruneCache();

    const encodedUser = encodeURIComponent(username);
    let userRes;

    try {
      userRes = await this._fetchWithTimeout(
        'https://api.github.com/users/' + encodedUser
      );
    } catch (err) {
      const fallback = await this._fetchPublicHtmlFallback(username);
      if (fallback) {
        this.cacheStats.webFallbacks++;
        this.cache.set(cacheKey, { timestamp: Date.now(), data: fallback });
        return fallback;
      }
      err.statusCode = 502;
      throw err;
    }

    if (userRes.status === 404) {
      const err = new Error('GitHub user "' + username + '" was not found.');
      err.statusCode = 404;
      throw err;
    }

    if (this._isRateLimited(userRes)) {
      const fallback = await this._fetchPublicHtmlFallback(username);
      if (fallback) {
        this.cacheStats.webFallbacks++;
        this.cache.set(cacheKey, { timestamp: Date.now(), data: fallback });
        return fallback;
      }
      throw this._rateLimitError(userRes, username);
    }

    if (!userRes.ok) {
      const err = new Error(
        'GitHub API error: ' + userRes.status + ' ' + userRes.statusText
      );
      err.statusCode = userRes.status;
      throw err;
    }

    const user = await userRes.json();
    let reposData = [];
    let recentCommits = [];

    if (!config.githubToken) {
      // Unauthenticated mode: only two API calls maximum.
      const reposRes = await this._fetchWithTimeout(
        'https://api.github.com/users/' + encodedUser + '/repos?sort=updated&per_page=30'
      );

      if (this._isRateLimited(reposRes)) {
        const fallback = await this._fetchPublicHtmlFallback(username);
        if (fallback) {
          this.cacheStats.webFallbacks++;
          this.cache.set(cacheKey, { timestamp: Date.now(), data: fallback });
          return fallback;
        }
      } else if (reposRes.ok) {
        reposData = await reposRes.json().catch(() => []);
      }
    } else {
      const results = await Promise.allSettled([
        this._fetchWithTimeout(
          'https://api.github.com/users/' + encodedUser + '/repos?sort=updated&per_page=30'
        ),
        this._fetchWithTimeout(
          'https://api.github.com/users/' + encodedUser + '/events/public?per_page=30'
        )
      ]);

      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        reposData = await results[0].value.json().catch(() => []);
      }

      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        const eventsData = await results[1].value.json().catch(() => []);
        if (Array.isArray(eventsData)) {
          for (const event of eventsData) {
            if (event.type !== 'PushEvent' || !Array.isArray(event.payload && event.payload.commits)) continue;

            for (const commit of event.payload.commits) {
              const firstLine = commit && commit.message
                ? commit.message.trim().split('\n')[0]
                : '';

              if (firstLine && !recentCommits.includes(firstLine)) {
                recentCommits.push(firstLine);
              }
            }
          }
        }
      }
    }

    const allRepos = (Array.isArray(reposData) ? reposData : []).map(repo => ({
      name: repo.name,
      description: repo.description || '',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      isFork: Boolean(repo.fork),
      homepage: repo.homepage || '',
      updatedAt: repo.updated_at ? repo.updated_at.split('T')[0] : 'Unknown',
      hasReadme: true
    }));

    const repos = allRepos.slice(0, 15);
    const languageCounts = {};
    for (const repo of allRepos) {
      if (repo.language && repo.language !== 'Unknown') {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    }

    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 5);

    const profileSummary = {
      username: user.login,
      name: user.name || user.login,
      bio: user.bio || '',
      avatarUrl: user.avatar_url ||
        ('https://github.com/' + encodeURIComponent(user.login) + '.png?size=160'),
      profileUrl: user.html_url ||
        ('https://github.com/' + encodeURIComponent(user.login)),
      publicRepos: user.public_repos || allRepos.length,
      followers: user.followers || 0,
      following: user.following || 0,
      blog: user.blog || '',
      company: user.company || '',
      location: user.location || '',
      createdAt: user.created_at ? user.created_at.split('T')[0] : 'Unknown',
      repos,
      reposAnalyzedCount: allRepos.length,
      originalReposCount: allRepos.filter(repo => !repo.isFork).length,
      forkedReposCount: allRepos.filter(repo => repo.isFork).length,
      reposWithDemoCount: allRepos.filter(repo => Boolean(repo.homepage)).length,
      topLanguages,
      recentCommits: recentCommits.slice(0, 15),
      dataSource: config.githubToken ? 'github-api-authenticated' : 'github-api-unauthenticated'
    };

    this.cache.set(cacheKey, { timestamp: Date.now(), data: profileSummary });
    return profileSummary;
  }

  clearCache() {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, webFallbacks: 0 };
  }
}

module.exports = new GitHubService();
