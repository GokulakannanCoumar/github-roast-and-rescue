// test/analysisSchema.test.js - Contract tests for structured AI output
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { ANALYSIS_RESPONSE_SCHEMA, validateAnalysis } = require('../src/services/analysisSchema');

function validAnalysis() {
  return {
    archetype: 'The Production Builder',
    grade: 'A-',
    recruiterScore: 8.8,
    oneLiner: 'Strong project signal with room for tighter curation.',
    roast: {
      repoSins: ['repo-one needs a clearer demo.', 'repo-two has a vague description.'],
      commitConfessions: 'Commit history is readable but could be more descriptive.',
      profileIllusions: 'The bio is stronger when the repositories visibly prove it.'
    },
    recruiterRealityCheck: {
      thirtySecondScan: 'Clear stack and credible projects are visible quickly.',
      verdict: 'Good signal · portfolio needs sharper positioning',
      redFlags: ['No demo on one project.', 'Several repositories are low-signal.'],
      greenFlags: ['Original work is present.', 'Recent public commits are available.']
    },
    rescue: {
      pinRepos: ['repo-one'],
      archiveRepos: ['repo-three'],
      upgradePlan: {
        targetRepo: 'repo-one',
        rationale: 'It has the strongest shipping signal.',
        actionSteps: ['Deploy it.', 'Document it.', 'Add tests.']
      },
      optimizedBio: 'Software developer building reliable applications.',
      readmeTemplate: '# repo-one'
    }
  };
}

describe('Analysis response contract', () => {
  it('exposes a strict JSON schema for Gemini structured output', () => {
    assert.strictEqual(ANALYSIS_RESPONSE_SCHEMA.type, 'object');
    assert.ok(ANALYSIS_RESPONSE_SCHEMA.required.includes('rescue'));
    assert.ok(ANALYSIS_RESPONSE_SCHEMA.properties.recruiterRealityCheck);
  });

  it('accepts a complete analysis referencing supplied repositories', () => {
    const result = validateAnalysis(validAnalysis(), {
      repos: [{ name: 'repo-one' }, { name: 'repo-three' }]
    });
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it('rejects malformed scores and missing rescue steps', () => {
    const analysis = validAnalysis();
    analysis.recruiterScore = 14;
    analysis.rescue.upgradePlan.actionSteps = ['one'];

    const result = validateAnalysis(analysis);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('recruiterScore')));
    assert.ok(result.errors.some(error => error.includes('actionSteps')));
  });

  it('rejects AI-selected repository names that were not in telemetry', () => {
    const analysis = validAnalysis();
    analysis.rescue.pinRepos = ['secret-repo'];

    const result = validateAnalysis(analysis, {
      repos: [{ name: 'repo-one' }, { name: 'repo-three' }]
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('unknown repository')));
  });
});
