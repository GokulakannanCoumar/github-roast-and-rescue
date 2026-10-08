// src/services/fallbackEngine.js - Deterministic, telemetry-grounded offline analysis

const LEVELS = {
  mild: {
    label: 'Mild',
    archetypeSuffix: ' · Mentor Review',
    intro: 'Constructive reality check: ',
    repoLine: repos => 'Projects such as "' + repos + '" show useful experimentation. A tighter portfolio and clearer proof of what ships would make that work easier to trust.',
    commitLine: commit => commit
      ? '"' + commit + '" is a useful signal, but a more descriptive commit message would make the engineering history easier to follow.'
      : 'Recent public commit messages were not available. A consistent public shipping rhythm would strengthen the profile signal.',
    bioLine: bio => bio
      ? 'Your bio says "' + bio + '". The strongest improvement now is making the repositories visibly prove that positioning.'
      : 'There is no public bio yet. Two focused sentences about what you build would improve the first impression.',
    scan: 'The strongest opportunity is to reduce portfolio noise and make the best evidence easy to verify in a quick recruiter scan.',
    verdict: score => score >= 7.5 ? 'Strong profile · polish the presentation' : score >= 5.5 ? 'Promising profile · needs sharper positioning' : 'Worth a second look after portfolio cleanup',
    rationale: 'Use the strongest existing repository as the portfolio anchor, then make the rest of the profile support that story.',
    steps: [
      'Choose one flagship project and give it a clear live demo, screenshots, and a concise README.',
      'Archive repetitive tutorials or abandoned experiments so the strongest repositories are immediately visible.',
      'Standardize commit messages and document the key architecture and engineering decisions.'
    ]
  },
  medium: {
    label: 'Medium',
    archetypeSuffix: ' · Tech Lead Review',
    intro: 'No sugar-coating: ',
    repoLine: repos => '"' + repos + '" show enthusiasm, but a recruiter should not need to perform repository archaeology to find the strongest work.',
    commitLine: commit => commit
      ? '"' + commit + '" reads like a save point rather than an engineering milestone. Make the history explain what changed and why.'
      : 'The available public activity is quiet. Consistent shipping beats a profile full of promises.',
    bioLine: bio => bio
      ? 'Your bio says "' + bio + '". Good pitch. Now the repositories need to provide receipts instead of vibes.'
      : 'No bio means you are giving away one of the few places where you can explain your engineering direction before a recruiter starts clicking.',
    scan: 'A recruiter is scanning for a clear stack, credible projects, and evidence that something actually ships. The signal is there, but portfolio noise can hide it.',
    verdict: score => score >= 7.5 ? 'Good signal · portfolio needs sharper positioning' : score >= 5.5 ? 'Promising signal · evidence needs stronger presentation' : 'Likely passed over until the portfolio signal is clearer',
    rationale: 'Turn the strongest repository into proof of engineering ability and aggressively reduce portfolio noise around it.',
    steps: [
      'Deploy the flagship project and place the live URL in the repository metadata and README header.',
      'Archive obvious coursework, clones, and abandoned experiments that dilute the first impression.',
      'Add architecture notes, tests, screenshots, and measurable outcomes so the project reads like production work.'
    ]
  },
  nuclear: {
    label: 'Nuclear',
    archetypeSuffix: ' · Brutal Roast',
    intro: 'Nuclear verdict: ',
    repoLine: repos => '"' + repos + '" looks like a repository disaster movie. The problem is not project count; it is finishing, curating, and deleting with intent.',
    commitLine: commit => commit
      ? '"' + commit + '" is not a commit message; it is a cry for help from the timeline. Document the change, not the panic-push.'
      : 'The contribution signal is quiet enough to make the profile look abandoned. Ship something public and let the graph speak.',
    bioLine: bio => bio
      ? 'Your bio claims "' + bio + '" while the repository signal is doing too little to prove it. Finish and curate before adding another framework.'
      : 'No bio, no positioning, and a pile of repositories is a recruiter scavenger hunt. Give the profile a clear technical story.',
    scan: 'A recruiter will not excavate a noisy profile looking for hidden talent. If the best project is buried, the next candidate gets the click.',
    verdict: score => score >= 7.5 ? 'Strong raw material · brutally under-presented' : score >= 5.5 ? 'Decent signal · painfully under-curated' : 'Hard pass right now · rebuild the portfolio signal first',
    rationale: 'Perform a portfolio hard reset: keep the best work, remove noise, and make the flagship project impossible to misunderstand.',
    steps: [
      'Archive the weakest noise and pin only the repositories you would defend in an interview today.',
      'Ship a real production demo with screenshots, tests, and a concise architecture explanation.',
      'Rewrite the README around outcomes, trade-offs, engineering decisions, and proof rather than generic feature lists.'
    ]
  }
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizedRepos(profileData) {
  return Array.isArray(profileData.repos)
    ? profileData.repos.filter(repo => repo && typeof repo.name === 'string' && repo.name.trim())
    : [];
}

function repoScore(repo) {
  const stars = Number(repo.stars) || 0;
  const forks = Number(repo.forks) || 0;
  const demo = repo.homepage ? 3 : 0;
  const original = repo.isFork ? 0 : 2;
  const readme = repo.hasReadme ? 0.5 : 0;
  const freshness = repo.updatedAt && repo.updatedAt !== 'Unknown' ? 0.5 : 0;
  return demo + original + Math.min(Math.log10(stars + 1), 2) + Math.min(Math.log10(forks + 1), 1) + readme + freshness;
}

function rankRepos(repos) {
  return repos
    .map((repo, index) => ({ repo, index, score: repoScore(repo) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.repo);
}

function calculateRecruiterScore(profileData, repos) {
  const publicRepos = Number(profileData.publicRepos) || repos.length;
  const original = Number(profileData.originalReposCount) || 0;
  const forked = Number(profileData.forkedReposCount) || 0;
  const demos = Number(profileData.reposWithDemoCount) || 0;
  const followers = Number(profileData.followers) || 0;
  const commits = Array.isArray(profileData.recentCommits) ? profileData.recentCommits.length : 0;
  const analyzedCount = Math.max(Number(profileData.reposAnalyzedCount) || repos.length, 1);
  const originalRatio = clamp(original / analyzedCount, 0, 1);
  const demoRatio = clamp(demos / analyzedCount, 0, 1);
  const forkRatio = clamp(forked / analyzedCount, 0, 1);

  let score = 4.0;
  score += originalRatio * 2.5;
  score += demoRatio * 3.0;
  score += demos > 0 ? 0.5 : 0;
  score += Math.min(commits / 10, 1) * 0.8;
  score += profileData.bio && profileData.bio.trim() ? 0.35 : 0;
  score += Math.min(Math.log10(followers + 1), 2) * 0.3;
  score -= forkRatio * 1.1;
  score -= publicRepos > 40 ? 0.4 : publicRepos > 20 ? 0.2 : 0;

  return Number(clamp(score, 1, 10).toFixed(1));
}

function gradeForScore(score) {
  if (score >= 9.5) return 'A+';
  if (score >= 9.0) return 'A';
  if (score >= 8.5) return 'A-';
  if (score >= 8.0) return 'B+';
  if (score >= 7.5) return 'B';
  if (score >= 7.0) return 'B-';
  if (score >= 6.0) return 'C+';
  if (score >= 5.0) return 'C';
  if (score >= 4.0) return 'C-';
  if (score >= 3.0) return 'D';
  return 'F';
}

function determineArchetype(profileData, repos, score) {
  const original = Number(profileData.originalReposCount) || 0;
  const forked = Number(profileData.forkedReposCount) || 0;
  const demos = Number(profileData.reposWithDemoCount) || 0;
  const commits = Array.isArray(profileData.recentCommits) ? profileData.recentCommits : [];
  const languages = profileData.topLanguages || [];

  if (forked > original && forked > 3) return 'The Professional Forker';
  if (commits.length === 0) return 'The Ghost Committer';
  if (demos >= 3 && original >= forked) return 'The Diamond in the Rough';
  if (languages.length >= 4) return 'The Framework Hopper';
  if (score >= 8.5) return 'The Production Builder';
  return 'The Tutorial Graveyard Architect';
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

/**
 * Generates a deterministic analysis when no Gemini key is available or
 * when an LLM response fails validation. Every factual statement is derived
 * from bounded telemetry supplied by the server.
 * @param {object} profileData
 * @param {'mild'|'medium'|'nuclear'} spiciness
 * @returns {object}
 */
function generateSmartAnalysis(profileData, spiciness = 'medium') {
  const level = LEVELS[spiciness] || LEVELS.medium;
  const repos = normalizedRepos(profileData);
  const ranked = rankRepos(repos);
  const languages = (profileData.topLanguages || []).slice(0, 5);
  const commits = Array.isArray(profileData.recentCommits) ? profileData.recentCommits : [];
  const score = calculateRecruiterScore(profileData, repos);
  const grade = gradeForScore(score);
  const archetype = determineArchetype(profileData, repos, score);

  const topNames = ranked.slice(0, 2).map(repo => repo.name);
  const pinRepos = ranked.slice(0, Math.min(3, ranked.length)).map(repo => repo.name);
  const archiveRepos = ranked.slice(3).reverse().slice(0, Math.min(3, Math.max(0, ranked.length - 3))).map(repo => repo.name);

  const firstRepo = repos[0]?.name || 'your strongest project';
  const strongestRepo = ranked[0]?.name || firstRepo;
  const firstCommit = commits[0] || '';
  const demoCount = Number(profileData.reposWithDemoCount) || 0;
  const analyzedCount = Number(profileData.reposAnalyzedCount) || repos.length;
  const forked = Number(profileData.forkedReposCount) || 0;
  const original = Number(profileData.originalReposCount) || 0;

  const demoText = analyzedCount
    ? demoCount + ' of ' + analyzedCount + ' analyzed repositories expose a live demo URL.'
    : 'No repository telemetry was available for live-demo analysis.';

  const greenFlags = [
    original > 0 ? original + ' analyzed repositories are not forks, providing original work to evaluate.' : '',
    languages.length ? 'The visible stack includes ' + languages.join(', ') + '.' : '',
    demoCount > 0 ? demoCount + ' analyzed repositories expose live demos, giving recruiters something concrete to click.' : '',
    commits.length > 0 ? commits.length + ' recent public commit messages were available for review.' : ''
  ];

  const redFlags = [
    demoText,
    forked > 0 ? forked + ' analyzed repositories are forks; distinguish learning material from original work.' : '',
    !profileData.bio?.trim() ? 'The GitHub profile has no public bio, so the first-impression positioning is underused.' : '',
    ranked.length > 3 ? ranked.length + ' repositories were analyzed; curation matters because the strongest project should be obvious immediately.' : ''
  ];

  const normalizedGreenFlags = dedupe(greenFlags);
  if (normalizedGreenFlags.length === 0) {
    normalizedGreenFlags.push('The available telemetry is limited; add a clear original project and recent public activity to create stronger evidence.');
  }

  const liveDemo = ranked.find(repo => repo.homepage)?.homepage || '';
  const readmeDemoLine = liveDemo ? '🔗 **Live Demo:** ' + liveDemo : '🔗 **Live Demo:** Add the production URL here.';
  const actionSteps = level.steps.map(step => step.replace('flagship project', '"' + strongestRepo + '"'));

  return {
    mode: level.label,
    archetype: archetype + level.archetypeSuffix,
    grade,
    recruiterScore: score,
    oneLiner: level.intro + (
      score >= 8
        ? 'The profile has credible shipping signals; the remaining job is to make the strongest evidence impossible to miss.'
        : score >= 6
          ? 'There is real potential here, but the strongest proof is competing with portfolio noise.'
          : 'The profile has enough raw material to improve, but the evidence currently needs stronger curation.'
    ),
    roast: {
      repoSins: [
        level.repoLine(topNames.join('", "') || firstRepo),
        demoText
      ],
      commitConfessions: level.commitLine(firstCommit),
      profileIllusions: level.bioLine(profileData.bio || '')
    },
    recruiterRealityCheck: {
      thirtySecondScan: level.scan,
      verdict: level.verdict(score),
      redFlags: dedupe(redFlags).slice(0, 4),
      greenFlags: dedupe(greenFlags).slice(0, 4)
    },
    rescue: {
      pinRepos: pinRepos.length ? pinRepos : [strongestRepo],
      archiveRepos,
      upgradePlan: {
        targetRepo: strongestRepo,
        rationale: level.rationale,
        actionSteps: actionSteps.slice(0, 3)
      },
      optimizedBio: 'Software developer focused on ' + (languages.slice(0, 2).join(' and ') || 'building reliable software systems') + '. Turning practical ideas into tested, deployed projects with clear technical documentation.',
      readmeTemplate:
        '# ' + strongestRepo + '\n\n' +
        '> A production-focused project with a clear problem, implementation, and measurable outcome.\n\n' +
        readmeDemoLine + '\n\n' +
        '## Why this project matters\nExplain the user problem, the approach taken, and the result in 3-5 concise sentences.\n\n' +
        '## Architecture\n- **Application:** ' + (languages[0] || 'Modern web stack') + '\n- **API and integration:** Document the public interfaces and external services.\n- **Quality:** Add automated tests and explain the most important engineering trade-offs.\n\n' +
        '## Quick Start\n\n~~~bash\n' +
        'git clone https://github.com/' + profileData.username + '/' + strongestRepo + '.git\n' +
        'cd ' + strongestRepo + '\n' +
        'npm install\n' +
        'npm run dev\n' +
        '~~~\n\n' +
        '## Evidence\nInclude screenshots, test results, deployment details, and links to the most important implementation decisions.\n'
    }
  };
}

module.exports = {
  generateSmartAnalysis,
  calculateRecruiterScore,
  gradeForScore,
  determineArchetype,
  rankRepos
};
