# GitHub Roast and Rescue 🔥🛟
> **Built for Google Build with AI: Prompt Wars**

[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run/?git_repo=https://github.com/GokulakannanCoumar/github-roast-and-rescue.git)

Give messy GitHub profiles the honest feedback they deserve! An interactive AI application that analyzes real public GitHub data, provides a hilarious yet respectful roast, conducts a brutal 30-second recruiter reality check, and generates a concrete portfolio rescue roadmap with ready-to-copy bios and project READMEs.

---

## 🌟 Features

1. **Automated GitHub Profiling**:
   - Ingests public repositories, commit patterns, star metrics, fork ratios, and bio information via the GitHub REST API.
2. **Three-Tier Spiciness Slider**:
   - 🌶️ **Mild (Empathetic Mentor)**: Gentle teasing with encouragement.
   - 🌶️🌶️ **Medium (Silicon Valley Tech Lead)**: Sarcastic, realistic insider humor.
   - 🌶️🌶️🌶️ **Nuclear (Gordon Ramsay of Git)**: Maximum comedic savagery focused strictly on code sins and commit hygiene.
3. **Four-Part Actionable Dossier**:
   - 🔥 **The Roast**: Archetype title, viral one-liner, repo sins, commit confessions, and portfolio illusions.
   - ⏱️ **30-Second Recruiter Check**: First impression score (1-10), hiring manager verdict, Red Flags, and Green Flags.
   - 🛟 **The Rescue Blueprint**: Pinned recommendations, repos to archive/delete, 3-step flagship project upgrade roadmap, and a copy-paste recruiter-optimized Bio.
   - 📄 **Rescue README.md**: Production-grade markdown documentation tailored specifically to the user's top repo.
4. **Offline & Demo Ready**:
   - Pre-loaded with realistic developer archetypes (*"The Tutorial Hoarder"*, *"The Ghost Committer"*, *"The Framework Hopper"*).
   - Smart Evaluation Fallback Engine when run without an API key or when rate-limited.
   - Zero-friction Gemini API Key input directly in the UI.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Create a `.env` file in the root directory:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
# Optional: add your GitHub token to raise GitHub API rate limits
GITHUB_TOKEN=
```
*(You can also simply enter your Gemini API key in the web app UI using the "Gemini API Key" button)*

### 3. Start the Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🧠 Master Prompt Design for Prompt Wars

The prompt engineering architecture leverages **Gemini 2.5 Flash** with:
- **Strict Role-Playing and Tone Anchoring**: Dynamic persona injection based on spiciness level.
- **Data Distillation**: Pre-filters raw GitHub JSON to high-signal metrics (fork-to-original ratio, commit message word frequency, live demo deployment status).
- **JSON Schema Enforcing**: Guaranteed structured output with zero parse failures.
