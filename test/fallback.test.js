// test/fallback.test.js - Unit tests for Smart Heuristic Engine
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { generateSmartAnalysis } = require('../src/services/fallbackEngine');

describe('Smart Heuristic Fallback Engine', () => {
  it('generates a complete valid analysis schema', () => {
    const profile = {
      username: 'johndoe',
      publicRepos: 10,
      originalReposCount: 8,
      forkedReposCount: 2,
      reposWithDemoCount: 0,
      topLanguages: ['JavaScript'],
      repos: [{ name: 'todo-react' }],
      recentCommits: ['initial commit']
    };

    const res = generateSmartAnalysis(profile, 'medium');

    assert.ok(res.archetype);
    assert.ok(res.grade);
    assert.strictEqual(typeof res.recruiterScore, 'number');
    assert.ok(res.oneLiner);

    // Roast section
    assert.ok(Array.isArray(res.roast.repoSins));
    assert.ok(res.roast.repoSins.length >= 2);
    assert.ok(res.roast.commitConfessions);
    assert.ok(res.roast.profileIllusions);

    // Recruiter section
    assert.ok(res.recruiterRealityCheck.thirtySecondScan);
    assert.ok(res.recruiterRealityCheck.verdict);
    assert.ok(Array.isArray(res.recruiterRealityCheck.redFlags));
    assert.ok(Array.isArray(res.recruiterRealityCheck.greenFlags));

    // Rescue section
    assert.ok(Array.isArray(res.rescue.pinRepos));
    assert.ok(Array.isArray(res.rescue.archiveRepos));
    assert.ok(res.rescue.upgradePlan.targetRepo);
    assert.ok(res.rescue.upgradePlan.actionSteps.length >= 3);
    assert.ok(res.rescue.optimizedBio);
    assert.ok(res.rescue.readmeTemplate.includes('# '));
  });

  it('accurately identifies The Professional Forker', () => {
    const profile = {
      username: 'forkmaster',
      publicRepos: 15,
      originalReposCount: 2,
      forkedReposCount: 13,
      reposAnalyzedCount: 15,
      reposWithDemoCount: 0,
      repos: [{ name: 'linux-fork' }],
      recentCommits: ['sync fork']
    };

    const res = generateSmartAnalysis(profile, 'medium');
    assert.ok(res.archetype.startsWith('The Professional Forker'));
    assert.ok(res.recruiterScore < 4.0);
  });

  it('accurately identifies The Ghost Committer', () => {
    const profile = {
      username: 'ghost-dev',
      publicRepos: 5,
      originalReposCount: 4,
      forkedReposCount: 1,
      reposWithDemoCount: 0,
      repos: [{ name: 'abandoned-web' }],
      recentCommits: []
    };

    const res = generateSmartAnalysis(profile, 'medium');
    assert.ok(res.archetype.startsWith('The Ghost Committer'));
  });

  it('accurately identifies The Diamond in the Rough when demos exist', () => {
    const profile = {
      username: 'builder',
      publicRepos: 12,
      originalReposCount: 10,
      forkedReposCount: 2,
      reposWithDemoCount: 4,
      reposAnalyzedCount: 12,
      repos: [{ name: 'saas-starter' }, { name: 'ai-agent' }],
      recentCommits: ['feat: add stripe checkout']
    };

    const res = generateSmartAnalysis(profile, 'medium');
    assert.ok(res.archetype.startsWith('The Diamond in the Rough'));
    assert.ok(res.recruiterScore >= 7.0);
  });

  it('adjusts tone based on spiciness level', () => {
    const profile = {
      username: 'junior-dev',
      repos: [{ name: 'quiz-app' }],
      recentCommits: ['fixed bug']
    };

    const mild = generateSmartAnalysis(profile, 'mild');
    const medium = generateSmartAnalysis(profile, 'medium');
    const nuclear = generateSmartAnalysis(profile, 'nuclear');

    assert.notStrictEqual(mild.mode, medium.mode);
    assert.notStrictEqual(medium.mode, nuclear.mode);
    assert.ok(mild.archetype.includes('Mentor Review'));
    assert.ok(medium.archetype.includes('Tech Lead Review'));
    assert.ok(nuclear.archetype.includes('Brutal Roast'));
  });
});
