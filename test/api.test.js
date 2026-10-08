// test/api.test.js - Integration tests for HTTP REST endpoints
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../server');
const { DEMO_PROFILES } = require('../src/services/demoProfiles');

describe('API Endpoints Integration', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise(resolve => {
      // Listen on ephemeral port 0
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  it('GET /api/health returns healthy telemetry status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
    assert.ok(body.timestamp);
    assert.ok(body.version);
    assert.ok(body.cacheStats);
  });

  it('GET /api/github/invalid--username returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/github/invalid--username`);
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('Invalid GitHub username'));
  });

  it('POST /api/roast rejects requests missing profileData with 400', async () => {
    const res = await fetch(`${baseUrl}/api/roast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('profileData'));
  });

  it('POST /api/roast generates valid analysis using Smart Heuristic fallback', async () => {
    const samplePayload = {
      profileData: {
        username: 'test-coder',
        name: 'Test Coder',
        bio: 'Coding for fun',
        publicRepos: 8,
        followers: 12,
        following: 5,
        originalReposCount: 6,
        forkedReposCount: 2,
        reposWithDemoCount: 1,
        topLanguages: ['TypeScript', 'Python'],
        repos: [
          { name: 'awesome-app', description: 'Web app', language: 'TypeScript', stars: 5, forks: 1, isFork: false }
        ],
        recentCommits: ['feat: initial release']
      },
      spiciness: 'medium'
    };

    const res = await fetch(`${baseUrl}/api/roast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(samplePayload)
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.ok(body.result);
    assert.ok(body.result.archetype);
    assert.ok(body.result.roast);
    assert.ok(body.result.recruiterRealityCheck);
    assert.ok(body.result.rescue);
    assert.ok(body.source);
  });
  it('API responses include hardened security headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
    assert.strictEqual(res.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.ok(res.headers.get('content-security-policy'));
  });

  it('POST /api/roast rejects a structurally invalid profile payload', async () => {
    const res = await fetch(`${baseUrl}/api/roast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileData: { username: 'bad--username', repos: [] }
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Invalid GitHub username/i);
  });

  it('POST /api/roast handles the Samantha demo profile end-to-end', async () => {
    const res = await fetch(`${baseUrl}/api/roast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileData: DEMO_PROFILES['samantha-stealth-dev'],
        spiciness: 'mild'
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.result);
    assert.ok(body.result.rescue?.upgradePlan?.targetRepo);
  });

});
