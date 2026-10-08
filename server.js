// server.js - GitHub Roast and Rescue backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { buildSystemPrompt, buildUserPrompt } = require('./prompts');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory cache to respect GitHub API rate limits
const cache = new Map();

// Helper to fetch GitHub data
async function fetchGitHubData(username) {
  const cacheKey = `gh_${username.toLowerCase()}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 1000 * 60 * 5) {
      return cached.data;
    }
  }

  const headers = {
    'User-Agent': 'GitHub-Roast-Rescue-App/1.0',
    'Accept': 'application/vnd.github.v3+json'
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  // 1. Fetch user profile
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
  if (!userRes.ok) {
    if (userRes.status === 404) {
      throw new Error(`GitHub user "${username}" was not found.`);
    }
    if (userRes.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again in a few minutes or provide demo profile.');
    }
    throw new Error(`GitHub API error: ${userRes.statusText}`);
  }
  const user = await userRes.json();

  // 2. Fetch recent repositories
  const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`, { headers });
  const reposData = reposRes.ok ? await reposRes.json() : [];

  // 3. Fetch recent public events for commit message inspection
  const eventsRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=30`, { headers });
  const eventsData = eventsRes.ok ? await eventsRes.json() : [];

  // Extract commit messages from PushEvents
  const recentCommits = [];
  if (Array.isArray(eventsData)) {
    for (const evt of eventsData) {
      if (evt.type === 'PushEvent' && evt.payload && Array.isArray(evt.payload.commits)) {
        for (const c of evt.payload.commits) {
          if (c.message) {
            recentCommits.push(c.message.trim().split('\n')[0]);
          }
        }
      }
    }
  }

  // Process repositories
  const repos = (Array.isArray(reposData) ? reposData : []).map(r => ({
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    isFork: r.fork,
    homepage: r.homepage,
    updatedAt: r.updated_at ? r.updated_at.split('T')[0] : 'Unknown',
    hasReadme: true
  }));

  const langCounts = {};
  repos.forEach(r => {
    if (r.language) {
      langCounts[r.language] = (langCounts[r.language] || 0) + 1;
    }
  });
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)
    .slice(0, 5);

  const profileSummary = {
    username: user.login,
    name: user.name || user.login,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    profileUrl: user.html_url,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
    blog: user.blog,
    company: user.company,
    location: user.location,
    createdAt: user.created_at ? user.created_at.split('T')[0] : 'Unknown',
    repos: repos.slice(0, 15),
    originalReposCount: repos.filter(r => !r.isFork).length,
    forkedReposCount: repos.filter(r => r.isFork).length,
    reposWithDemoCount: repos.filter(r => !!r.homepage).length,
    topLanguages,
    recentCommits: recentCommits.slice(0, 15)
  };

  cache.set(cacheKey, { timestamp: Date.now(), data: profileSummary });
  return profileSummary;
}

// Fallback intelligent evaluation when Gemini API Key is missing or rate-limited
function generateSmartFallback(profileData, spiciness = 'medium') {
  const original = profileData.originalReposCount || 0;
  const forked = profileData.forkedReposCount || 0;
  const hasBio = !!profileData.bio;
  const reposWithDemo = profileData.reposWithDemoCount || 0;
  const topRepo = (profileData.repos && profileData.repos[0]) ? profileData.repos[0].name : 'portfolio-v1';
  const repoNames = (profileData.repos || []).map(r => r.name);
  const commits = profileData.recentCommits || [];

  // Determine Archetype
  let archetype = 'The Tutorial Hoarder';
  let grade = 'C+';
  let recruiterScore = 4.2;
  let oneLiner = `A cemetery of half-baked tutorial repos where Git commits go to be forgotten.`;

  if (forked > original) {
    archetype = 'The Professional Forker';
    grade = 'D';
    recruiterScore = 2.8;
    oneLiner = `Has more forks in their GitHub than an Olive Garden restaurant.`;
  } else if (reposWithDemo > 2) {
    archetype = 'The Deployed Optimist';
    grade = 'B';
    recruiterScore = 6.8;
    oneLiner = `Actually has live URLs, but nobody has clicked them since the final exam in 2024.`;
  } else if (commits.length === 0) {
    archetype = 'The Ghost Committer';
    grade = 'C-';
    recruiterScore = 3.5;
    oneLiner = `GitHub contribution graph looking like a desert during a multi-year drought.`;
  }

  const sampleRepoRoast = repoNames.slice(0, 3).join(', ') || 'unnamed experiments';
  const sampleCommit = commits[0] || 'fixed bug';

  return {
    archetype,
    grade,
    recruiterScore,
    oneLiner,
    roast: {
      repoSins: [
        `Looking at projects like "${sampleRepoRoast}": you start repositories faster than your coffee cools down, but finish them at the speed of government paperwork.`,
        `Out of ${profileData.repos?.length || 0} repositories, exactly ${reposWithDemo} have live demos. Recruiters aren't going to clone your repo, configure .env, run npm install, and pray your MongoDB connection works.`
      ],
      commitConfessions: commits.length > 0
        ? `Commit messages like "${sampleCommit}" tell a thrilling emotional story of frustration, confusion, and zero adherence to Conventional Commits.`
        : `Zero recent public commits detected. Your contribution graph has fewer green squares than a Sahara satellite map.`,
      profileIllusions: hasBio
        ? `Bio says: "${profileData.bio}" — bold claims for a profile where 40% of the code was generated by Create-React-App and never edited.`
        : `No bio provided at all. You're treating your public developer storefront like an abandoned Craigslist listing.`
    },
    recruiterRealityCheck: {
      thirtySecondScan: `A hiring manager will look at this for 12 seconds, search for a live portfolio URL, see 0 deployed demos, and immediately tab back to their LinkedIn applicant queue.`,
      verdict: recruiterScore > 5 ? 'Borderline - Potential exists if polished' : 'Instant Pass in 30 seconds',
      redFlags: [
        `Missing deployed URLs: ${reposWithDemo === 0 ? 'Not a single project has a live link.' : 'Only ' + reposWithDemo + ' projects can be viewed without local setup.'}`,
        `Repo bloat: ${profileData.publicRepos} public repos, but most look like course assignments or unmaintained boilerplate.`,
        `Lack of documentation: Recruiters cannot understand what business problem your projects solve in 10 seconds.`
      ],
      greenFlags: [
        `Technology consistency: Clear focus on ${profileData.topLanguages?.join(', ') || 'modern stacks'}.`,
        `Curiosity: Willingness to experiment with multiple frameworks and tools.`
      ]
    },
    rescue: {
      pinRepos: repoNames.slice(0, 2),
      archiveRepos: repoNames.slice(2, 5),
      upgradePlan: {
        targetRepo: topRepo,
        rationale: `This repository has the strongest foundations and clear relevance to practical industry roles.`,
        actionSteps: [
          `Deploy a production build on Vercel/Render and put the live URL in the repo's 'About' section immediately.`,
          `Record a 15-second animated GIF or embed high-res screenshots right at the top of the README.`,
          `Add an Architecture & Key Technical Decisions section explaining trade-offs, state management, and performance.`
        ]
      },
      optimizedBio: `Full-Stack Developer specializing in ${profileData.topLanguages?.slice(0, 2).join(' & ') || 'Modern Web'}. Building production-ready applications with clean architecture and live demos below 🚀`,
      readmeTemplate: `# ${topRepo} 🚀

> A high-performance, full-stack application built to solve real-world problems.

🔗 **Live Demo:** [https://${topRepo.toLowerCase()}.demo.app](https://${topRepo.toLowerCase()}.demo.app)

---

## ⚡ Highlights
- **Engineered for Scale:** Clean separation of concerns with modular architecture.
- **Modern Stack:** Built using ${profileData.topLanguages?.join(', ') || 'TypeScript, Node.js'}.
- **Production Ready:** Automated CI/CD, responsive UI, and secure API handling.

## 🛠️ Architecture & Tech Stack
- **Frontend / Core:** ${profileData.topLanguages?.[0] || 'Modern UI'}
- **Data / Services:** RESTful APIs, Clean State Management
- **Deployment:** Containerized / Cloud-hosted

## 🚀 Quick Start
\`\`\`bash
git clone https://github.com/${profileData.username}/${topRepo}.git
cd ${topRepo}
npm install
npm run dev
\`\`\`
`
    }
  };
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/github/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const data = await fetchGitHubData(username);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
  }
});

app.post('/api/roast', async (req, res) => {
  try {
    const { profileData, spiciness = 'medium', apiKey: clientKey } = req.body;

    if (!profileData || !profileData.username) {
      return res.status(400).json({ error: 'profileData is required' });
    }

    const apiKey = clientKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Use intelligent heuristic fallback engine
      const fallbackResult = generateSmartFallback(profileData, spiciness);
      return res.json({
        result: fallbackResult,
        source: 'smart-heuristic-engine',
        notice: 'Generated with Smart Evaluation Engine. Add a Gemini API Key to use Gemini 2.5 Flash live inference.'
      });
    }

    // Call Google Gemini API
    const systemPrompt = buildSystemPrompt(spiciness);
    const userPrompt = buildUserPrompt(profileData);

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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
        temperature: spiciness === 'nuclear' ? 1.0 : spiciness === 'mild' ? 0.4 : 0.7
      }
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Gemini API error (${response.status}):`, errText);
      // Fallback gracefully so the user always receives a response
      const fallbackResult = generateSmartFallback(profileData, spiciness);
      return res.json({
        result: fallbackResult,
        source: 'smart-heuristic-engine',
        notice: `Gemini API returned status ${response.status}. Fallback critique provided.`
      });
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Empty response from Gemini API');
    }

    // Parse JSON safely
    let parsedResult;
    try {
      parsedResult = JSON.parse(candidateText);
    } catch (parseErr) {
      // If there are backticks or formatting
      const cleanJson = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    }

    res.json({
      result: parsedResult,
      source: 'gemini-ai',
      model: modelName
    });

  } catch (err) {
    console.error('Error during roast generation:', err);
    // Even on error, provide fallback response
    try {
      const fallbackResult = generateSmartFallback(req.body.profileData, req.body.spiciness);
      return res.json({
        result: fallbackResult,
        source: 'smart-heuristic-engine',
        notice: `Encountered error (${err.message}). Evaluated with Smart Heuristic Engine.`
      });
    } catch (innerErr) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🔥 GitHub Roast & Rescue server running at http://localhost:${PORT}`);
});
