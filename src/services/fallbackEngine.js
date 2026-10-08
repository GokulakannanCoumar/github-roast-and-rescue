// src/services/fallbackEngine.js - Smart Heuristic Engine ensuring 100% uptime & zero demo failures

/**
 * Generates an intelligent, context-aware Roast and Rescue analysis
 * directly from GitHub profile metrics without external LLM dependencies.
 * @param {object} profileData
 * @param {'mild'|'medium'|'nuclear'} spiciness
 * @returns {object}
 */
function generateSmartAnalysis(profileData, spiciness = 'medium') {
  const original = profileData.originalReposCount || 0;
  const forked = profileData.forkedReposCount || 0;
  const reposWithDemo = profileData.reposWithDemoCount || 0;
  const topRepo = (profileData.repos && profileData.repos[0]) ? profileData.repos[0].name : 'portfolio-showcase';
  const repoNames = (profileData.repos || []).map(r => r.name);
  const commits = profileData.recentCommits || [];
  const languages = profileData.topLanguages || ['JavaScript'];
  const hasBio = Boolean(profileData.bio && profileData.bio.trim());

  // Archetype determination based on real telemetry
  let archetype = 'The Tutorial Graveyard Architect';
  let grade = 'C+';
  let recruiterScore = 4.2;
  let oneLiner = `A sprawling cemetery of half-baked tutorial repos where Git commits go to be forgotten.`;

  if (forked > original && forked > 3) {
    archetype = 'The Professional Forker';
    grade = 'D';
    recruiterScore = 2.8;
    oneLiner = `Has more forks in their profile than an Italian bistro, but zero original creations.`;
  } else if (commits.length === 0) {
    archetype = 'The Ghost Committer';
    grade = 'C-';
    recruiterScore = 3.4;
    oneLiner = `GitHub contribution graph looking like a desert during a multi-year drought.`;
  } else if (languages.length >= 4) {
    archetype = 'The Framework Hopper';
    grade = 'B-';
    recruiterScore = 5.2;
    oneLiner = `Tried 7 different frontend frameworks in 3 months; mastered none, deployed zero.`;
  } else if (reposWithDemo >= 3) {
    archetype = 'The Diamond in the Rough';
    grade = 'B+';
    recruiterScore = 7.4;
    oneLiner = `Actually deploys real software, but buries their masterpieces under 12 unarchived homework repos.`;
  }

  // Adjust tone intensity based on spiciness
  let repoSin1 = `Looking at repositories like "${repoNames.slice(0, 2).join('", "') || 'unnamed projects'}": you spin up new repositories with intense optimism, then abandon them the moment CSS flexbox becomes difficult.`;
  let commitRoast = commits.length > 0
    ? `Commit history highlights like "${commits[0]}" prove you treat Git like an autosave key in a frantic video game.`
    : `No recent public commits found. Your Git graph has fewer green squares than a lunar surface photograph.`;

  if (spiciness === 'nuclear') {
    repoSin1 = `Looking at "${repoNames.slice(0, 2).join('", "') || 'these repos'}": it is an absolute technical crime scene. You start projects faster than a microwave meal, yet finish them at the glacial pace of continental drift.`;
    commitRoast = commits.length > 0
      ? `Commit messages like "${commits[0]}": Absolutely scandalous! No tickets, no descriptions, just pure chaos pushed straight to main.`
      : `Zero public commit pulse. A digital ghost town with cobwebs on the push button.`;
  } else if (spiciness === 'mild') {
    repoSin1 = `You have clearly built exciting experiments like "${repoNames.slice(0, 2).join('", "') || 'your projects'}", but keeping them all uncurated dilutes your genuine technical talent.`;
    commitRoast = commits.length > 0
      ? `Recent commit notes like "${commits[0]}" are common during quick prototyping, but standardizing on Conventional Commits will instantly impress hiring leads.`
      : `Activity is quiet recently; a regular weekly contribution rhythm will boost visibility.`;
  }

  return {
    archetype,
    grade,
    recruiterScore,
    oneLiner,
    roast: {
      repoSins: [
        repoSin1,
        `Out of ${profileData.publicRepos || 0} repositories, exactly ${reposWithDemo} have live demo URLs. Tech recruiters will never clone your repository, fight with your Node version, and pray your local database seeds.`
      ],
      commitConfessions: commitRoast,
      profileIllusions: hasBio
        ? `Bio proclaims: "${profileData.bio}" — bold claims for a profile where half the repos consist of default template code and zero test suites.`
        : `Empty bio detected. You are treating your primary public developer storefront like an anonymous burner account.`
    },
    recruiterRealityCheck: {
      thirtySecondScan: `A senior engineering recruiter reviews your profile for roughly 15 seconds. If they don't see a live link or clear architecture within two clicks, they immediately move to the next applicant.`,
      verdict: recruiterScore >= 6.0
        ? 'High Potential - Immediately Viable With Portfolio Triage'
        : 'Immediate Candidate Pass - Requires Urgent Portfolio Cleanup',
      redFlags: [
        `Demo Deficiency: ${reposWithDemo === 0 ? 'Zero live application URLs across all repositories.' : 'Only ' + reposWithDemo + ' projects have clickable live demonstrations.'}`,
        `Repository Clutter: ${profileData.publicRepos || 0} total repos creates noise; recruiters cannot discern which projects reflect your true capability.`,
        `Documentation Void: Lack of interactive GIFs, architecture diagrams, or quickstart benchmarks in repository READMEs.`
      ],
      greenFlags: [
        `Stack Focus: Clear interest in ${languages.join(', ') || 'modern software engineering'}.`,
        `Curiosity & Persistence: Demonstrates hands-on coding trial across multiple project iterations.`
      ]
    },
    rescue: {
      pinRepos: repoNames.slice(0, 2).length > 0 ? repoNames.slice(0, 2) : ['flagship-project'],
      archiveRepos: repoNames.slice(2, 5).length > 0 ? repoNames.slice(2, 5) : ['old-coursework-1', 'tutorial-clone-2'],
      upgradePlan: {
        targetRepo: topRepo,
        rationale: `This repository showcases your highest domain relevance and has the foundation to become an interview-winning portfolio piece.`,
        actionSteps: [
          `Deploy a production live demo on Vercel, Render, or Fly.io and paste the live URL into the repository 'About' metadata right now.`,
          `Record a 10-second demo GIF or capture high-resolution feature screenshots to anchor the top of your README.md.`,
          `Add an 'Architecture & Key Engineering Decisions' section detailing why you picked your stack, how state is managed, and performance optimizations.`
        ]
      },
      optimizedBio: `Software Engineer specializing in ${languages.slice(0, 2).join(' & ') || 'Full-Stack Systems'}. Building production-ready, performant web applications with clean architecture and live demos below 🚀`,
      readmeTemplate: `# ${topRepo} 🚀

> High-performance, full-stack application built to solve real-world problems.

🔗 **Live Production Demo:** [https://${topRepo.toLowerCase().replace(/[^a-z0-9]/g, '-')}.demo.app](https://${topRepo.toLowerCase().replace(/[^a-z0-9]/g, '-')}.demo.app)

---

## ⚡ Key Highlights & Architecture
- **Production Architecture:** Modular design with strict separation of concerns.
- **Modern Tech Stack:** Engineered with ${languages.join(', ') || 'modern TypeScript and cloud services'}.
- **Performance & Testing:** Automated test coverage, sub-second latency, and responsive design.

## 🛠️ Tech Stack
- **Core:** ${languages[0] || 'Modern JavaScript/TypeScript'}
- **Data & APIs:** RESTful JSON Services
- **CI/CD & Hosting:** Containerized, cloud-deployed

## 🚀 Quick Start
\`\`\`bash
# 1. Clone the repository
git clone https://github.com/${profileData.username}/${topRepo}.git

# 2. Install dependencies
cd ${topRepo}
npm install

# 3. Launch development server
npm run dev
\`\`\`
`
    }
  };
}

module.exports = {
  generateSmartAnalysis
};
