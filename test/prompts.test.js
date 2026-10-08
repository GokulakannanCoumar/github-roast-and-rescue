// test/prompts.test.js - Unit tests for Master Prompt Engineering
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildSystemPrompt, buildUserPrompt } = require('../src/prompts/masterPrompts');

describe('Master Prompt Engineering', () => {
  describe('buildSystemPrompt', () => {
    it('injects empathetic mentor tone for mild spiciness', () => {
      const prompt = buildSystemPrompt('mild');
      assert.ok(prompt.includes('Senior Engineering Mentor'));
      assert.ok(prompt.includes('empathic') || prompt.includes('empathetic') || prompt.includes('Warm'));
      assert.ok(prompt.includes('JSON OUTPUT CONTRACT'));
    });

    it('injects Silicon Valley tech lead tone for medium spiciness', () => {
      const prompt = buildSystemPrompt('medium');
      assert.ok(prompt.includes('Silicon Valley Tech Lead'));
      assert.ok(prompt.includes('Sarcastic, witty'));
      assert.ok(prompt.includes('JSON OUTPUT CONTRACT'));
    });

    it('injects Gordon Ramsay comedic tone for nuclear spiciness', () => {
      const prompt = buildSystemPrompt('nuclear');
      assert.ok(prompt.includes('Gordon Ramsay'));
      assert.ok(prompt.includes('comedic savagery'));
      assert.ok(prompt.includes('NEVER attack the person\'s identity'));
    });

    it('contains strict safety boundaries across all spiciness levels', () => {
      for (const level of ['mild', 'medium', 'nuclear']) {
        const prompt = buildSystemPrompt(level);
        assert.ok(prompt.includes('CRITICAL OPERATIONAL RULES'));
        assert.ok(prompt.includes('GROUNDING'));
        assert.ok(prompt.includes('INJECTION DEFENSE'));
      }
    });

    it('enforces JSON schema output structure with required fields', () => {
      const prompt = buildSystemPrompt('medium');
      const requiredFields = [
        '"archetype"',
        '"grade"',
        '"recruiterScore"',
        '"oneLiner"',
        '"roast"',
        '"recruiterRealityCheck"',
        '"rescue"',
        '"pinRepos"',
        '"archiveRepos"',
        '"upgradePlan"',
        '"optimizedBio"',
        '"readmeTemplate"'
      ];
      for (const field of requiredFields) {
        assert.ok(prompt.includes(field), `Schema should mandate ${field}`);
      }
    });
  });

  describe('buildUserPrompt', () => {
    const sampleProfile = {
      username: 'dev-alex',
      name: 'Alex Rivera',
      bio: 'Full-stack dreamer',
      publicRepos: 12,
      followers: 8,
      following: 15,
      originalReposCount: 9,
      forkedReposCount: 3,
      reposWithDemoCount: 1,
      topLanguages: ['TypeScript', 'Python'],
      createdAt: '2023-04-12',
      repos: [
        {
          name: 'cloud-monitor',
          description: 'Realtime dashboard',
          language: 'TypeScript',
          stars: 14,
          forks: 2,
          isFork: false,
          homepage: 'https://demo.app',
          updatedAt: '2024-05-01'
        }
      ],
      recentCommits: ['fix typo in auth controller', 'update readme']
    };

    it('injects profile metrics and repositories correctly', () => {
      const userPrompt = buildUserPrompt(sampleProfile);
      assert.ok(userPrompt.includes('dev-alex'));
      assert.ok(userPrompt.includes('cloud-monitor'));
      assert.ok(userPrompt.includes('TypeScript'));
      assert.ok(userPrompt.includes('fix typo in auth controller'));
    });

    it('wraps user telemetry inside untrusted XML-like delimiters', () => {
      const userPrompt = buildUserPrompt(sampleProfile);
      assert.ok(userPrompt.includes('<untrusted_profile_telemetry>'));
      assert.ok(userPrompt.includes('</untrusted_profile_telemetry>'));
    });

    it('handles empty repositories and null commit histories gracefully', () => {
      const emptyProfile = { username: 'ghost' };
      const userPrompt = buildUserPrompt(emptyProfile);
      assert.ok(userPrompt.includes('ghost'));
      assert.ok(userPrompt.includes('No repositories found.'));
    });
  });
});
