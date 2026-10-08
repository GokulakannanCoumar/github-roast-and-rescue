// src/services/demoProfiles.js - deterministic offline demo profiles
const DEMO_PROFILES = {
  'alex-codes-tutorials': {
    username: 'alex-codes-tutorials',
    name: 'Alex Rivera',
    bio: 'Aspiring Full Stack Engineer | Learning React, Node, Web3, AI, Rust, Go | Open to Work!',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    profileUrl: 'https://github.com',
    publicRepos: 28,
    followers: 12,
    following: 148,
    blog: '',
    company: 'Self-Employed',
    location: 'San Francisco, CA',
    createdAt: '2023-01-15',
    originalReposCount: 8,
    forkedReposCount: 20,
    reposWithDemoCount: 0,
    topLanguages: ['JavaScript', 'HTML', 'CSS', 'Python'],
    recentCommits: ['fixed bug', 'final commit', 'final commit v2', 'update index.html', 'asdfghjk', 'clean code', 'pushing to test'],
    repos: [
      { name: 'todo-app-react', description: 'Simple todo app from YouTube tutorial', language: 'JavaScript', stars: 0, forks: 0, isFork: false, homepage: '', hasReadme: true },
      { name: 'netflix-clone-css', description: 'Netflix landing page clone', language: 'HTML', stars: 1, forks: 0, isFork: false, homepage: '', hasReadme: false },
      { name: 'weather-app-v1', description: '', language: 'JavaScript', stars: 0, forks: 0, isFork: false, homepage: '', hasReadme: true },
      { name: 'freeCodeCamp-exercises', description: 'My solutions to FCC', language: 'JavaScript', stars: 0, forks: 0, isFork: false, homepage: '', hasReadme: false },
      { name: 'create-react-app-fork', description: 'Forked CRA', language: 'JavaScript', stars: 0, forks: 0, isFork: true, homepage: '', hasReadme: true },
      { name: 'ai-saas-platform-fullstack', description: 'Next.js 14 AI SaaS tutorial (unfinished)', language: 'TypeScript', stars: 0, forks: 0, isFork: false, homepage: '', hasReadme: true }
    ]
  },
  'samantha-stealth-dev': {
    username: 'samantha-stealth-dev',
    name: 'Samantha Vance',
    bio: 'Software Architect & Visionary Builder',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
    profileUrl: 'https://github.com',
    publicRepos: 14,
    followers: 6,
    following: 11,
    blog: 'https://medium.com',
    company: 'Stealth Startup',
    location: 'Remote',
    createdAt: '2022-04-10',
    originalReposCount: 14,
    forkedReposCount: 0,
    reposWithDemoCount: 1,
    topLanguages: ['Python', 'Rust', 'Go'],
    recentCommits: [],
    repos: [
      { name: 'quantum-distributed-ledger', description: 'High throughput consensus algorithm', language: 'Rust', stars: 2, forks: 0, isFork: false, homepage: '', hasReadme: true },
      { name: 'autonomous-agent-swarm', description: 'Multi-agent orchestration framework', language: 'Python', stars: 1, forks: 0, isFork: false, homepage: '', hasReadme: false },
      { name: 'cloud-native-microservice-template', description: 'Zero boilerplate k8s scaffolding', language: 'Go', stars: 0, forks: 0, isFork: false, homepage: 'https://example.com', hasReadme: true }
    ]
  },
  'dev-jordan-hype': {
    username: 'dev-jordan-hype',
    name: 'Jordan Lee',
    bio: 'Building with Svelte, Next, Remix, Nuxt, Astro, HTMX, Bun, Zig',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    profileUrl: 'https://github.com',
    publicRepos: 22,
    followers: 45,
    following: 300,
    blog: 'https://twitter.com',
    company: '',
    location: 'Austin, TX',
    createdAt: '2021-08-20',
    originalReposCount: 19,
    forkedReposCount: 3,
    reposWithDemoCount: 1,
    topLanguages: ['TypeScript', 'JavaScript', 'Rust', 'Vue'],
    recentCommits: ['migrated to bun', 'switched to sveltekit', 'rewrite in rust', 'wip'],
    repos: [
      { name: 'personal-blog-astro', description: 'My blog rebuilt for the 7th time in Astro', language: 'TypeScript', stars: 3, forks: 0, isFork: false, homepage: 'https://jordan.dev', hasReadme: true },
      { name: 'chat-app-remix', description: 'Realtime chat in Remix', language: 'TypeScript', stars: 0, forks: 0, isFork: false, homepage: '', hasReadme: false },
      { name: 'ecommerce-nuxt3', description: 'Shopify storefront in Nuxt', language: 'Vue', stars: 1, forks: 0, isFork: false, homepage: '', hasReadme: true },
      { name: 'htmx-go-experiment', description: 'Hypermedia driven architecture POC', language: 'Go', stars: 2, forks: 0, isFork: false, homepage: '', hasReadme: true }
    ]
  }
};

function getDemoProfile(username) {
  if (!username) return null;
  const key = String(username).trim().toLowerCase();
  return DEMO_PROFILES[key] || null;
}

module.exports = { DEMO_PROFILES, getDemoProfile };
