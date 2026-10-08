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

  // Each roast level intentionally changes the copy strategy so the result is clearly different.
  const level = spiciness === 'mild' ? 'mild' : spiciness === 'nuclear' ? 'nuclear' : 'medium';
  const levelConfig = {
    mild: {
      suffix: ' · Mentor Review',
      prefix: 'Constructive reality check: ',
      repo: `There is good experimentation in "${repoNames.slice(0, 2).join('", "') || 'your projects'}", but the profile would look stronger with tighter curation and clearer proof of what you can ship.`,
      commit: commits.length > 0
        ? `"${commits[0]}" is a normal quick-build commit, but clearer Conventional Commit messages would make the history easier for other engineers to trust.`
        : `Your recent public activity is quiet. A small, consistent shipping rhythm would make the profile feel more current.`,
      profile: hasBio
        ? `Your bio says "${profileData.bio}" — now let the repositories underneath it clearly prove those claims.`
        : `Your profile has no bio yet. Two focused sentences about what you build would immediately improve the first impression.`,
      verdict: recruiterScore => recruiterScore >= 6 ? 'Promising profile · polish the presentation' : 'Worth a second look after portfolio cleanup',
      scan: 'The biggest win is reducing noise and making your best work easier to verify quickly.',
      rationale: 'Use the strongest existing project as a polished portfolio anchor, then remove distractions around it.',
      steps: [
        'Choose one flagship project and give it a clear live demo, screenshots, and a concise README.',
        'Archive or hide repetitive tutorial work so the strongest repositories become immediately visible.',
        'Standardize commit messages and add a short architecture section explaining the important technical choices.'
      ]
    },
    medium: {
      suffix: ' · Tech Lead Review',
      prefix: 'No sugar-coating: ',
      repo: `Repositories like "${repoNames.slice(0, 2).join('", "') || 'your projects'}" show plenty of enthusiasm, but not enough ruthless curation. The recruiter should not have to do archaeology to find the good work.`,
      commit: commits.length > 0
        ? `"${commits[0]}" reads less like engineering history and more like a save button with feelings. Make your Git history tell a clearer story.`
        : `Your contribution history is giving abandoned-side-project energy. Consistent shipping beats a profile full of promises.`,
      profile: hasBio
        ? `Your bio says "${profileData.bio}" — bold pitch. Now the repos need to provide receipts instead of vibes.`
        : `No bio means you are wasting one of the few places where you can explain your engineering direction before a recruiter starts clicking.`,
      verdict: recruiterScore => recruiterScore >= 6 ? 'Good signal · portfolio needs sharper positioning' : 'Likely passed over until the portfolio is cleaned up',
      scan: 'A recruiter is scanning for a clear stack, credible projects, and evidence that something actually ships. The signal is there, but the noise is louder than it should be.',
      rationale: 'Turn the strongest repository into a proof-of-work project and aggressively remove portfolio noise.',
      steps: [
        'Deploy the flagship project and put the live URL directly in the repo metadata and README header.',
        'Archive obvious coursework, clones, and abandoned experiments that dilute the first impression.',
        'Add architecture, tests, screenshots, and measurable outcomes so the project reads like production work.'
      ]
    },
    nuclear: {
      suffix: ' · Brutal Roast',
      prefix: 'Nuclear verdict: ',
      repo: `"${repoNames.slice(0, 2).join('", "') || 'these repos'}" looks like the opening scene of a repository disaster movie. You do not have a project-count problem; you have a finishing-and-deleting problem.`,
      commit: commits.length > 0
        ? `"${commits[0]}" is not a commit message; it is a cry for help from the timeline. Stop documenting panic-pushes and start documenting engineering decisions.`
        : `No recent public commits. The contribution graph is so quiet it looks like GitHub forgot to send the memo that you exist.`,
      profile: hasBio
        ? `Your bio claims "${profileData.bio}" while the portfolio underneath it is doing its best impression of unfinished homework. You need finishing and deleting, not another framework.`
        : `No bio, no positioning, and a pile of repositories. Right now the profile is making recruiters do unpaid investigative journalism.`,
      verdict: recruiterScore => recruiterScore >= 6 ? 'Strong raw material · brutally under-presented' : 'Hard pass right now · rebuild the portfolio signal first',
      scan: 'A recruiter will not excavate a noisy profile looking for hidden talent. If the best project is buried, the next candidate gets the click.',
      rationale: 'Perform a portfolio hard reset: keep the best work, aggressively remove noise, then make the flagship project impossible to misunderstand.',
      steps: [
        'Archive the weakest noise and pin only the two repositories you would defend in an interview today.',
        'Ship a real production demo with screenshots, CI, tests, and a clear architecture explanation.',
        'Rewrite the README around outcomes, trade-offs, engineering decisions, and proof — not generic feature lists.'
      ]
    }
  }[level];

  let repoSin1 = levelConfig.repo;
  let commitRoast = levelConfig.commit;

  return {
    mode: levelConfig.suffix.replace(' · Mentor Review','').replace(' · Tech Lead Review','').replace(' · Brutal Roast',''),
    archetype: archetype + levelConfig.suffix,
    grade,
    recruiterScore,
    oneLiner: levelConfig.prefix + oneLiner,
    roast: {
      repoSins: [
        repoSin1,
        `Out of ${profileData.publicRepos || 0} repositories, exactly ${reposWithDemo} have live demo URLs. Tech recruiters will never clone your repository, fight with your Node version, and pray your local database seeds.`
      ],
      commitConfessions: commitRoast,
      profileIllusions: levelConfig.profile
    },
    recruiterRealityCheck: {
      thirtySecondScan: levelConfig.scan,
      verdict: levelConfig.verdict(recruiterScore),
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
        rationale: levelConfig.rationale,
        actionSteps: levelConfig.steps
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
