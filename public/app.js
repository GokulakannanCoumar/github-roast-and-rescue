// app.js - Frontend application logic for GitHub Roast & Rescue
// Enhanced with full keyboard accessibility (a11y), Profile README generator, and resilient fallback handling

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const roastForm = document.getElementById('roastForm');
  const usernameInput = document.getElementById('usernameInput');
  const submitBtn = document.getElementById('submitBtn');
  const loadingSection = document.getElementById('loadingSection');
  const loadingStatusText = document.getElementById('loadingStatusText');
  const loadingSubtext = document.getElementById('loadingSubtext');
  const progressBarFill = document.getElementById('progressBarFill');
  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');
  const closeErrorBtn = document.getElementById('closeErrorBtn');
  const resultsSection = document.getElementById('resultsSection');

  // Spiciness buttons
  const spiceButtons = document.querySelectorAll('.spice-btn');
  let currentSpiciness = 'medium';

  // API Key Modal elements
  const apiKeyBtn = document.getElementById('apiKeyBtn');
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  const apiKeyModal = document.getElementById('apiKeyModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const clearKeyBtn = document.getElementById('clearKeyBtn');

  // Result Elements
  const resAvatar = document.getElementById('resAvatar');
  const resName = document.getElementById('resName');
  const resUsernameLink = document.getElementById('resUsernameLink');
  const resArchetype = document.getElementById('resArchetype');
  const resBio = document.getElementById('resBio');
  const statRepos = document.getElementById('statRepos');
  const statForks = document.getElementById('statForks');
  const statDemos = document.getElementById('statDemos');
  const statFollowers = document.getElementById('statFollowers');
  const statLangTag = document.getElementById('statLangTag');
  const resGrade = document.getElementById('resGrade');
  const resScore = document.getElementById('resScore');
  const resScoreBar = document.getElementById('resScoreBar');
  const resOneLiner = document.getElementById('resOneLiner');

  // Tab 1: Roast
  const resRepoSins = document.getElementById('resRepoSins');
  const resCommitRoast = document.getElementById('resCommitRoast');
  const resProfileIllusions = document.getElementById('resProfileIllusions');

  // Tab 2: Recruiter Check
  const resVerdict = document.getElementById('resVerdict');
  const resRecruiterScan = document.getElementById('resRecruiterScan');
  const resRedFlags = document.getElementById('resRedFlags');
  const resGreenFlags = document.getElementById('resGreenFlags');

  // Tab 3: Rescue Blueprint
  const resPinRepos = document.getElementById('resPinRepos');
  const resArchiveRepos = document.getElementById('resArchiveRepos');
  const resUpgradeTitle = document.getElementById('resUpgradeTitle');
  const resUpgradeRationale = document.getElementById('resUpgradeRationale');
  const resUpgradeSteps = document.getElementById('resUpgradeSteps');
  const resOptimizedBio = document.getElementById('resOptimizedBio');

  // Tab 4: Flagship README
  const resReadmeCode = document.getElementById('resReadmeCode');

  // Tab 5: Profile README
  const resProfileReadmeCode = document.getElementById('resProfileReadmeCode');

  // Tabs & Navigation
  const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Copy buttons & Toast
  const copyBioBtn = document.getElementById('copyBioBtn');
  const copyReadmeBtn = document.getElementById('copyReadmeBtn');
  const copyProfileReadmeBtn = document.getElementById('copyProfileReadmeBtn');
  const copyShareBtn = document.getElementById('copyShareBtn');
  const toast = document.getElementById('toast');

  // Global state for current roast
  let currentRoastData = null;
  let currentProfileData = null;

  // Initialize API Key state
  function updateApiKeyLabel() {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      apiKeyLabel.textContent = 'Gemini Key: Active';
      apiKeyBtn.style.borderColor = 'rgba(63, 185, 80, 0.5)';
      apiKeyBtn.style.color = '#7ee787';
    } else {
      apiKeyLabel.textContent = 'Gemini API Key';
      apiKeyBtn.style.borderColor = '';
      apiKeyBtn.style.color = '';
    }
  }
  updateApiKeyLabel();

  // Spiciness toggle with a11y aria-pressed update
  spiceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      spiceButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentSpiciness = btn.dataset.spice;
    });
  });

  // Modal Handlers & Focus Management
  function openApiKeyModal() {
    apiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
    apiKeyModal.classList.remove('hidden');
    apiKeyInput.focus();
  }

  function closeApiKeyModal() {
    apiKeyModal.classList.add('hidden');
    apiKeyBtn.focus();
  }

  apiKeyBtn.addEventListener('click', openApiKeyModal);
  closeModalBtn.addEventListener('click', closeApiKeyModal);

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !apiKeyModal.classList.contains('hidden')) {
      closeApiKeyModal();
    }
  });

  saveKeyBtn.addEventListener('click', () => {
    const val = apiKeyInput.value.trim();
    if (val) {
      localStorage.setItem('gemini_api_key', val);
      showToast('Gemini API Key saved!');
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    updateApiKeyLabel();
    closeApiKeyModal();
  });

  clearKeyBtn.addEventListener('click', () => {
    localStorage.removeItem('gemini_api_key');
    apiKeyInput.value = '';
    updateApiKeyLabel();
    showToast('Gemini API Key cleared.');
    closeApiKeyModal();
  });

  // Close Error Banner
  closeErrorBtn.addEventListener('click', () => {
    errorBanner.classList.add('hidden');
  });

  // Tab switching with WCAG ARIA attributes & keyboard arrow navigation
  function switchTab(targetBtn) {
    tabButtons.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('tabindex', '-1');
    });
    tabPanels.forEach(p => p.classList.remove('active'));

    targetBtn.classList.add('active');
    targetBtn.setAttribute('aria-selected', 'true');
    targetBtn.setAttribute('tabindex', '0');
    targetBtn.focus();

    const targetPanel = document.getElementById(targetBtn.dataset.tab);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }
  }

  tabButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => switchTab(btn));

    btn.addEventListener('keydown', (e) => {
      let targetIndex = null;
      if (e.key === 'ArrowRight') {
        targetIndex = (index + 1) % tabButtons.length;
      } else if (e.key === 'ArrowLeft') {
        targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      } else if (e.key === 'Home') {
        targetIndex = 0;
      } else if (e.key === 'End') {
        targetIndex = tabButtons.length - 1;
      }

      if (targetIndex !== null) {
        e.preventDefault();
        switchTab(tabButtons[targetIndex]);
      }
    });
  });

  // Preset buttons
  document.querySelectorAll('.preset-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.preset) {
        const presetKey = btn.dataset.preset;
        const profile = window.DEMO_PROFILES && window.DEMO_PROFILES[presetKey];
        if (profile) {
          usernameInput.value = profile.username;
          executeRoast(profile.username, profile);
        }
      } else if (btn.dataset.username) {
        usernameInput.value = btn.dataset.username;
        executeRoast(btn.dataset.username);
      }
    });
  });

  // Form submit
  roastForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawVal = usernameInput.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/^@/, '');
    const cleanUsername = rawVal.split('/')[0].trim();
    if (!cleanUsername) return;
    executeRoast(cleanUsername);
  });

  // Dynamic loading messages
  const loadingSteps = [
    { text: 'Fetching repositories & public events...', sub: 'Counting how many repos have 0 commits after initialization...', progress: '25%' },
    { text: 'Analyzing commit message hygiene...', sub: 'Scanning for "update", "fixed bug", "wip", and keyboard smashes...', progress: '50%' },
    { text: 'Simulating 30-Second Recruiter ATS scan...', sub: 'Checking if any repo has a working live demo link...', progress: '75%' },
    { text: 'Gemini generating Rescue blueprint...', sub: 'Selecting salvageable projects and writing custom README.md...', progress: '90%' }
  ];

  let loadingInterval = null;

  function startLoading() {
    resultsSection.classList.add('hidden');
    errorBanner.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    submitBtn.disabled = true;

    let stepIndex = 0;
    loadingStatusText.textContent = loadingSteps[0].text;
    loadingSubtext.textContent = loadingSteps[0].sub;
    progressBarFill.style.width = loadingSteps[0].progress;

    loadingInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % loadingSteps.length;
      loadingStatusText.textContent = loadingSteps[stepIndex].text;
      loadingSubtext.textContent = loadingSteps[stepIndex].sub;
      progressBarFill.style.width = loadingSteps[stepIndex].progress;
    }, 1800);
  }

  function stopLoading() {
    if (loadingInterval) clearInterval(loadingInterval);
    loadingSection.classList.add('hidden');
    submitBtn.disabled = false;
  }

  function showError(msg) {
    stopLoading();
    errorMessage.textContent = msg;
    errorBanner.classList.remove('hidden');
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }

  // Execute Roast & Rescue
  async function executeRoast(username, preloadedData = null) {
    startLoading();

    try {
      let profileData = preloadedData;

      // If not preloaded, fetch profile from backend
      if (!profileData) {
        const ghRes = await fetch(`/api/github/${encodeURIComponent(username)}`);
        if (!ghRes.ok) {
          const err = await ghRes.json();
          throw new Error(err.error || 'Failed to fetch GitHub profile');
        }
        profileData = await ghRes.json();
      }

      currentProfileData = profileData;

      // Call Roast endpoint
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const roastRes = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileData,
          spiciness: currentSpiciness,
          apiKey
        })
      });

      if (!roastRes.ok) {
        const err = await roastRes.json();
        throw new Error(err.error || 'Failed to generate roast');
      }

      const responsePayload = await roastRes.json();
      currentRoastData = responsePayload.result;

      renderResults(profileData, currentRoastData);
      stopLoading();
      resultsSection.classList.remove('hidden');

      // Scroll to results smoothly
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      resultsSection.focus();

    } catch (err) {
      console.error(err);
      showError(err.message || 'Something went wrong during evaluation.');
    }
  }

  // Generates a complete GitHub Profile README (username/username)
  function generateProfileReadme(profile, roast) {
    const username = profile.username || 'developer';
    const name = profile.name || username;
    const topLangs = profile.topLanguages || ['JavaScript', 'TypeScript'];
    const pinned = roast.rescue?.pinRepos || [];
    const bio = roast.rescue?.optimizedBio || profile.bio || 'Building reliable software systems.';

    const techBadges = topLangs.map(l => {
      const slug = encodeURIComponent(l.toLowerCase());
      return `![${l}](https://img.shields.io/badge/-${encodeURIComponent(l)}-333333?style=flat-square&logo=${slug})`;
    }).join(' ');

    return `# Hi there, I'm ${name} 👋

> ${bio}

---

### 🚀 Highlights & Pinned Work
${pinned.map(p => `- ⭐️ [**${p}**](https://github.com/${username}/${p}) — Featured flagship project with production demo.`).join('\n')}

### 🛠️ Tech Stack & Languages
${techBadges || '![Tech](https://img.shields.io/badge/-Modern_Web_Stack-blue?style=flat-square)'}

### 📊 GitHub Telemetry
<p align="left">
  <img src="https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&theme=tokyonight&hide_border=true" alt="${username}'s GitHub stats" height="150" />
  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=tokyonight&hide_border=true" alt="Top Languages" height="150" />
</p>

---
📫 **Connect with me:** [GitHub Profile](https://github.com/${username})
`;
  }

  // Render Result Dossier
  function renderResults(profile, roast) {
    // Profile info
    resAvatar.src = profile.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
    resName.textContent = profile.name || profile.username;
    resUsernameLink.textContent = `@${profile.username}`;
    resUsernameLink.href = profile.profileUrl || `https://github.com/${profile.username}`;
    resArchetype.textContent = roast.archetype || 'The Codebase Explorer';
    resBio.textContent = profile.bio ? `"${profile.bio}"` : 'No bio provided.';

    // Stats
    statRepos.textContent = profile.publicRepos || profile.repos?.length || 0;
    statForks.textContent = profile.forkedReposCount || 0;
    statDemos.textContent = profile.reposWithDemoCount || 0;
    statFollowers.textContent = profile.followers || 0;
    statLangTag.textContent = profile.topLanguages?.length ? `Top: ${profile.topLanguages.slice(0, 3).join(', ')}` : 'No language data';

    // Grade & Score
    const grade = roast.grade || 'C';
    resGrade.textContent = grade;
    resGrade.className = 'grade-circle';
    if (grade.startsWith('A')) resGrade.classList.add('grade-a');
    else if (grade.startsWith('B')) resGrade.classList.add('grade-b');
    else if (grade.startsWith('C')) resGrade.classList.add('grade-c');
    else resGrade.classList.add('grade-d');

    const score = Number(roast.recruiterScore || 4.0).toFixed(1);
    resScore.textContent = score;
    resScoreBar.style.width = `${Math.min(Math.max(score * 10, 5), 100)}%`;

    // One liner
    resOneLiner.textContent = roast.oneLiner || 'A developer profile in need of immediate salvation.';

    // Tab 1: Roast
    resRepoSins.innerHTML = '';
    const repoSins = roast.roast?.repoSins || ['Too many repos, not enough commits.'];
    repoSins.forEach(sin => {
      const li = document.createElement('li');
      li.textContent = sin;
      resRepoSins.appendChild(li);
    });

    resCommitRoast.textContent = roast.roast?.commitConfessions || 'Commits are mysterious and sparse.';
    resProfileIllusions.textContent = roast.roast?.profileIllusions || 'Profile has high confidence, low deployment.';

    // Tab 2: Recruiter Check
    resVerdict.textContent = roast.recruiterRealityCheck?.verdict || 'Passes ATS, dies at senior review';
    resRecruiterScan.textContent = roast.recruiterRealityCheck?.thirtySecondScan || 'Recruiters scan for live links and clean READMEs first.';

    resRedFlags.innerHTML = '';
    (roast.recruiterRealityCheck?.redFlags || []).forEach(flag => {
      const li = document.createElement('li');
      li.textContent = flag;
      resRedFlags.appendChild(li);
    });

    resGreenFlags.innerHTML = '';
    (roast.recruiterRealityCheck?.greenFlags || []).forEach(gem => {
      const li = document.createElement('li');
      li.textContent = gem;
      resGreenFlags.appendChild(li);
    });

    // Tab 3: Rescue Blueprint
    resPinRepos.innerHTML = '';
    (roast.rescue?.pinRepos || []).forEach(repo => {
      const span = document.createElement('span');
      span.className = 'repo-badge pin';
      span.textContent = `★ ${repo}`;
      resPinRepos.appendChild(span);
    });

    resArchiveRepos.innerHTML = '';
    (roast.rescue?.archiveRepos || []).forEach(repo => {
      const span = document.createElement('span');
      span.className = 'repo-badge archive';
      span.textContent = `✕ ${repo}`;
      resArchiveRepos.appendChild(span);
    });

    const targetRepo = roast.rescue?.upgradePlan?.targetRepo || 'portfolio-project';
    resUpgradeTitle.textContent = `Flagship Project Upgrade: "${targetRepo}"`;
    resUpgradeRationale.textContent = roast.rescue?.upgradePlan?.rationale || 'This project has the greatest potential to win interview callbacks.';

    resUpgradeSteps.innerHTML = '';
    (roast.rescue?.upgradePlan?.actionSteps || []).forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      resUpgradeSteps.appendChild(li);
    });

    resOptimizedBio.textContent = roast.rescue?.optimizedBio || 'Passionate software engineer building production-grade web systems.';

    // Tab 4: Flagship README template
    resReadmeCode.textContent = roast.rescue?.readmeTemplate || `# ${targetRepo}\n\nProject documentation and live setup.`;

    // Tab 5: Profile README template
    if (resProfileReadmeCode) {
      resProfileReadmeCode.textContent = generateProfileReadme(profile, roast);
    }
  }

  // Copy handlers
  copyBioBtn.addEventListener('click', () => {
    if (!currentRoastData?.rescue?.optimizedBio) return;
    navigator.clipboard.writeText(currentRoastData.rescue.optimizedBio).then(() => {
      showToast('Optimized Bio copied to clipboard!');
    });
  });

  copyReadmeBtn.addEventListener('click', () => {
    if (!currentRoastData?.rescue?.readmeTemplate) return;
    navigator.clipboard.writeText(currentRoastData.rescue.readmeTemplate).then(() => {
      showToast('Rescue README.md copied to clipboard!');
    });
  });

  if (copyProfileReadmeBtn) {
    copyProfileReadmeBtn.addEventListener('click', () => {
      if (!resProfileReadmeCode?.textContent) return;
      navigator.clipboard.writeText(resProfileReadmeCode.textContent).then(() => {
        showToast('Profile README.md copied to clipboard!');
      });
    });
  }

  copyShareBtn.addEventListener('click', () => {
    if (!currentRoastData || !currentProfileData) return;
    const text = `🔥 My GitHub (@${currentProfileData.username}) just got Roasted & Rescued by Google Build with AI!
    
🎭 Archetype: ${currentRoastData.archetype}
📊 Grade: ${currentRoastData.grade} | Recruiter 30s Score: ${currentRoastData.recruiterScore}/10
💬 "${currentRoastData.oneLiner}"

Check your own GitHub roast: #GoogleBuildWithAI #PromptWars`;
    
    navigator.clipboard.writeText(text).then(() => {
      showToast('Share summary copied to clipboard! Ready to post on LinkedIn/X 🚀');
    });
  });

});
