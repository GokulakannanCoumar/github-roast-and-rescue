// app.js - GitHub Roast & Rescue client
document.addEventListener('DOMContentLoaded', () => {
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

  const spiceButtons = document.querySelectorAll('.spice-btn');
  let currentSpiciness = 'medium';

  const apiKeyBtn = document.getElementById('apiKeyBtn');
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  const apiKeyModal = document.getElementById('apiKeyModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const clearKeyBtn = document.getElementById('clearKeyBtn');

  const resAvatar = document.getElementById('resAvatar');
  const resName = document.getElementById('resName');
  const resUsernameLink = document.getElementById('resUsernameLink');
  const resArchetype = document.getElementById('resArchetype');
  const resEngineBadge = document.getElementById('resEngineBadge');
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

  const resRepoSins = document.getElementById('resRepoSins');
  const resCommitRoast = document.getElementById('resCommitRoast');
  const resProfileIllusions = document.getElementById('resProfileIllusions');
  const resVerdict = document.getElementById('resVerdict');
  const resRecruiterScan = document.getElementById('resRecruiterScan');
  const resRedFlags = document.getElementById('resRedFlags');
  const resGreenFlags = document.getElementById('resGreenFlags');
  const resPinRepos = document.getElementById('resPinRepos');
  const resArchiveRepos = document.getElementById('resArchiveRepos');
  const resUpgradeTitle = document.getElementById('resUpgradeTitle');
  const resUpgradeRationale = document.getElementById('resUpgradeRationale');
  const resUpgradeSteps = document.getElementById('resUpgradeSteps');
  const resOptimizedBio = document.getElementById('resOptimizedBio');
  const resReadmeCode = document.getElementById('resReadmeCode');
  const resProfileReadmeCode = document.getElementById('resProfileReadmeCode');
  const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
  const tabPanels = document.querySelectorAll('.tab-panel');
  const copyBioBtn = document.getElementById('copyBioBtn');
  const copyReadmeBtn = document.getElementById('copyReadmeBtn');
  const copyProfileReadmeBtn = document.getElementById('copyProfileReadmeBtn');
  const copyShareBtn = document.getElementById('copyShareBtn');
  const toast = document.getElementById('toast');

  let currentRoastData = null;
  let currentProfileData = null;

  function updateApiKeyLabel() {
    const savedKey = localStorage.getItem('gemini_api_key');
    apiKeyLabel.textContent = savedKey ? 'Gemini Key: Active' : 'Gemini API Key';
  }
  updateApiKeyLabel();

  spiceButtons.forEach(btn => btn.addEventListener('click', () => {
    spiceButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    currentSpiciness = btn.dataset.spice;
  }));

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
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !apiKeyModal.classList.contains('hidden')) closeApiKeyModal();
  });

  saveKeyBtn.addEventListener('click', () => {
    const val = apiKeyInput.value.trim();
    if (val) localStorage.setItem('gemini_api_key', val);
    else localStorage.removeItem('gemini_api_key');
    updateApiKeyLabel();
    closeApiKeyModal();
    showToast(val ? 'Gemini API Key saved!' : 'Gemini API Key cleared.');
  });

  clearKeyBtn.addEventListener('click', () => {
    localStorage.removeItem('gemini_api_key');
    apiKeyInput.value = '';
    updateApiKeyLabel();
    closeApiKeyModal();
    showToast('Gemini API Key cleared.');
  });

  closeErrorBtn.addEventListener('click', () => errorBanner.classList.add('hidden'));

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
    const panel = document.getElementById(targetBtn.dataset.tab);
    if (panel) panel.classList.add('active');
  }

  tabButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => switchTab(btn));
    btn.addEventListener('keydown', e => {
      let targetIndex = null;
      if (e.key === 'ArrowRight') targetIndex = (index + 1) % tabButtons.length;
      if (e.key === 'ArrowLeft') targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      if (e.key === 'Home') targetIndex = 0;
      if (e.key === 'End') targetIndex = tabButtons.length - 1;
      if (targetIndex !== null) {
        e.preventDefault();
        switchTab(tabButtons[targetIndex]);
      }
    });
  });

  function findDemoProfile(username) {
    const profiles = window.DEMO_PROFILES || {};
    const key = Object.keys(profiles).find(name => profiles[name]?.username?.toLowerCase() === username.toLowerCase());
    return key ? profiles[key] : null;
  }

  document.querySelectorAll('.preset-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.preset) {
        const profile = window.DEMO_PROFILES?.[btn.dataset.preset];
        if (profile) {
          usernameInput.value = profile.username;
          executeRoast(profile.username, profile);
        }
      } else if (btn.dataset.username) {
        const demo = findDemoProfile(btn.dataset.username);
        usernameInput.value = btn.dataset.username;
        executeRoast(btn.dataset.username, demo || null);
      }
    });
  });

  roastForm.addEventListener('submit', e => {
    e.preventDefault();
    const rawVal = usernameInput.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/^@/, '');
    const cleanUsername = rawVal.split('/')[0].trim();
    if (!cleanUsername) return;

    const demo = findDemoProfile(cleanUsername);
    executeRoast(cleanUsername, demo || null);
  });

  const loadingSteps = [
    { text: 'Fetching repositories & profile signals...', sub: 'Checking public portfolio data...', progress: '25%' },
    { text: 'Analyzing commit hygiene...', sub: 'Looking for useful patterns in your public activity...', progress: '50%' },
    { text: 'Running recruiter simulation...', sub: 'Checking live demos, clarity, and project focus...', progress: '75%' },
    { text: 'Building your rescue plan...', sub: 'Turning the strongest signals into practical next steps...', progress: '90%' }
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
    setTimeout(() => toast.classList.add('hidden'), 2500);
  }

  async function executeRoast(username, preloadedData = null) {
    startLoading();
    try {
      let profileData = preloadedData;

      if (!profileData) {
        const ghRes = await fetch('/api/github/' + encodeURIComponent(username));
        if (!ghRes.ok) {
          const err = await ghRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to fetch GitHub profile');
        }
        profileData = await ghRes.json();
      }

      currentProfileData = profileData;

      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const roastRes = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData, spiciness: currentSpiciness, apiKey })
      });

      if (!roastRes.ok) {
        const err = await roastRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate roast');
      }

      const responsePayload = await roastRes.json();
      currentRoastData = responsePayload.result;
      renderResults(profileData, currentRoastData, responsePayload.source);
      stopLoading();
      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      resultsSection.focus();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Something went wrong during evaluation.');
    }
  }

  function generateProfileReadme(profile, roast) {
    const username = profile.username || 'developer';
    const name = profile.name || username;
    const topLangs = profile.topLanguages || ['JavaScript', 'TypeScript'];
    const pinned = roast.rescue?.pinRepos || [];
    const bio = roast.rescue?.optimizedBio || profile.bio || 'Building reliable software systems.';
    const techBadges = topLangs.map(l => {
      const slug = encodeURIComponent(l.toLowerCase());
      return \`![\${l}](https://img.shields.io/badge/-\${encodeURIComponent(l)}-333333?style=flat-square&logo=\${slug})\`;
    }).join(' ');
    return \`# Hi there, I'm \${name} 👋

> \${bio}

---

### 🚀 Highlights & Pinned Work
\${pinned.map(p => \`- ⭐️ [**\${p}**](https://github.com/\${username}/\${p}) — Featured flagship project with production demo.\`).join('\\n')}

### 🛠️ Tech Stack & Languages
\${techBadges || '![Tech](https://img.shields.io/badge/-Modern_Web_Stack-blue?style=flat-square)'}

### 📊 GitHub Telemetry
<p align="left">
  <img src="https://github-readme-stats.vercel.app/api?username=\${username}&show_icons=true&theme=tokyonight&hide_border=true" alt="\${username}'s GitHub stats" height="150" />
  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=\${username}&layout=compact&theme=tokyonight&hide_border=true" alt="Top Languages" height="150" />
</p>

---
📫 **Connect with me:** [GitHub Profile](https://github.com/\${username})
\`;
  }

  function renderResults(profile, roast, source = 'smart-heuristic-engine') {
    if (source === 'gemini-ai') {
      resEngineBadge.textContent = '✨ Gemini 2.5 Flash';
      resEngineBadge.className = 'engine-badge engine-gemini';
    } else {
      resEngineBadge.textContent = '⚡ Heuristic Engine';
      resEngineBadge.className = 'engine-badge engine-offline';
    }

    resAvatar.src = profile.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
    resName.textContent = profile.name || profile.username;
    resUsernameLink.textContent = '@' + profile.username;
    resUsernameLink.href = profile.profileUrl || ('https://github.com/' + profile.username);
    resArchetype.textContent = roast.archetype || 'The Codebase Explorer';
    resBio.textContent = profile.bio ? '"' + profile.bio + '"' : 'No bio provided.';
    statRepos.textContent = profile.publicRepos || profile.repos?.length || 0;
    statForks.textContent = profile.forkedReposCount || 0;
    statDemos.textContent = profile.reposWithDemoCount || 0;
    statFollowers.textContent = profile.followers || 0;
    statLangTag.textContent = profile.topLanguages?.length ? 'Top: ' + profile.topLanguages.slice(0,3).join(', ') : 'No language data';

    const grade = roast.grade || 'C';
    resGrade.textContent = grade;
    resGrade.className = 'grade-circle ' + (grade.startsWith('A') ? 'grade-a' : grade.startsWith('B') ? 'grade-b' : grade.startsWith('C') ? 'grade-c' : 'grade-d');

    const score = Number(roast.recruiterScore || 4).toFixed(1);
    resScore.textContent = score;
    resScoreBar.style.width = Math.min(Math.max(score * 10, 5), 100) + '%';
    resOneLiner.textContent = roast.oneLiner || 'A developer profile in need of immediate salvation.';

    resRepoSins.innerHTML = '';
    (roast.roast?.repoSins || ['Too many repos, not enough commits.']).forEach(item => {
      const li = document.createElement('li'); li.textContent = item; resRepoSins.appendChild(li);
    });
    resCommitRoast.textContent = roast.roast?.commitConfessions || 'Commits are mysterious and sparse.';
    resProfileIllusions.textContent = roast.roast?.profileIllusions || 'Profile has high confidence, low deployment.';

    resVerdict.textContent = roast.recruiterRealityCheck?.verdict || 'Needs polish';
    resRecruiterScan.textContent = roast.recruiterRealityCheck?.thirtySecondScan || 'Recruiters scan for live links and clean READMEs first.';
    resRedFlags.innerHTML = '';
    (roast.recruiterRealityCheck?.redFlags || []).forEach(item => { const li = document.createElement('li'); li.textContent = item; resRedFlags.appendChild(li); });
    resGreenFlags.innerHTML = '';
    (roast.recruiterRealityCheck?.greenFlags || []).forEach(item => { const li = document.createElement('li'); li.textContent = item; resGreenFlags.appendChild(li); });

    resPinRepos.innerHTML = '';
    (roast.rescue?.pinRepos || []).forEach(repo => { const span = document.createElement('span'); span.className = 'repo-badge pin'; span.textContent = '★ ' + repo; resPinRepos.appendChild(span); });
    resArchiveRepos.innerHTML = '';
    (roast.rescue?.archiveRepos || []).forEach(repo => { const span = document.createElement('span'); span.className = 'repo-badge archive'; span.textContent = '✕ ' + repo; resArchiveRepos.appendChild(span); });

    const targetRepo = roast.rescue?.upgradePlan?.targetRepo || 'portfolio-project';
    resUpgradeTitle.textContent = 'Flagship Project Upgrade: "' + targetRepo + '"';
    resUpgradeRationale.textContent = roast.rescue?.upgradePlan?.rationale || 'This project has the greatest potential to win interview callbacks.';
    resUpgradeSteps.innerHTML = '';
    (roast.rescue?.upgradePlan?.actionSteps || []).forEach(step => { const li = document.createElement('li'); li.textContent = step; resUpgradeSteps.appendChild(li); });
    resOptimizedBio.textContent = roast.rescue?.optimizedBio || 'Passionate software engineer building production-grade systems.';
    resReadmeCode.textContent = roast.rescue?.readmeTemplate || ('# ' + targetRepo + '\n\nProject documentation and live setup.');
    resProfileReadmeCode.textContent = generateProfileReadme(profile, roast);
  }

  const copy = (textValue, message) => navigator.clipboard.writeText(textValue).then(() => showToast(message));
  copyBioBtn.addEventListener('click', () => currentRoastData?.rescue?.optimizedBio && copy(currentRoastData.rescue.optimizedBio, 'Optimized bio copied!'));
  copyReadmeBtn.addEventListener('click', () => currentRoastData?.rescue?.readmeTemplate && copy(currentRoastData.rescue.readmeTemplate, 'README copied!'));
  copyProfileReadmeBtn.addEventListener('click', () => resProfileReadmeCode?.textContent && copy(resProfileReadmeCode.textContent, 'Profile README copied!'));
  copyShareBtn.addEventListener('click', () => {
    if (!currentRoastData || !currentProfileData) return;
    const text = 'My GitHub @' + currentProfileData.username + ' just got roasted and rescued. Grade: ' + currentRoastData.grade + ' | Recruiter score: ' + currentRoastData.recruiterScore + '/10';
    copy(text, 'Share summary copied!');
  });
});