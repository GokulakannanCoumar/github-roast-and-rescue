// test_verify.js - Automated Verification Script
const { buildSystemPrompt, buildUserPrompt } = require('./prompts');

async function runTests() {
  console.log('Testing prompt builders...');
  const sysPrompt = buildSystemPrompt('nuclear');
  if (!sysPrompt.includes('Gordon Ramsay')) {
    throw new Error('System prompt missing nuclear personality');
  }

  const sampleProfile = {
    username: 'test-user',
    name: 'Test Dev',
    bio: 'Coding day and night',
    publicRepos: 10,
    followers: 5,
    following: 20,
    repos: [
      { name: 'todo-app', description: 'Just a todo app', language: 'JavaScript', stars: 0, forks: 0, isFork: false, homepage: '', hasReadme: true, updatedAt: '2024-01-01' }
    ],
    recentCommits: ['fixed bug', 'update'],
    originalReposCount: 8,
    forkedReposCount: 2,
    reposWithDemoCount: 0,
    topLanguages: ['JavaScript']
  };

  const userPrompt = buildUserPrompt(sampleProfile);
  if (!userPrompt.includes('todo-app')) {
    throw new Error('User prompt missing repo information');
  }

  console.log('Prompt builder tests passed! ✅');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
