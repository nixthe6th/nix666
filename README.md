# OpenClaw Automation Engine ⚡

> *AI-Native Automation. Local-First. Action-Oriented.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**What:** An automation engine that bridges AI models, local files, and external services.

**Why:** You don't need another note-taking app. You need a tool that watches folders, processes content with AI, and takes action automatically.

**How:** Declarative workflows using local LLMs (Kimi, not expensive APIs).

## 🚀 One-Command Install

```bash
git clone https://github.com/nixthe6th/nix666.git openclaw
cd openclaw
./install.sh
```

## 🎯 What It Does (In 30 Seconds)

**Content Creator Workflow:**
```bash
# Watches your footage folder
openclaw watch ~/Videos/Dashcam --skill auto-youtube

# Automatically:
# 1. Organizes files by date
# 2. Generates AI descriptions
# 3. Creates thumbnail suggestions
# 4. Queues to YouTube Studio
```

**Developer Workflow:**
```bash
# Watches your project
openclaw watch ./src --skill auto-commit

# Automatically:
# 1. Summarizes changes
# 2. Suggests commit messages
# 3. Runs tests
# 4. Pushes to GitHub
```

## 🛠️ Core Features

| Feature | What It Does |
|---------|--------------|
| **Watchers** | Monitor folders/files for changes |
| **Skills** | Reusable automation scripts |
| **AI Bridge** | Use local LLMs (Kimi, etc.) |
| **Actions** | Git commits, API calls, file operations |
| **Integrations** | YouTube, GitHub, Slack, Discord |

## 📦 Content Automation Suite

**Current Skills:**

### `content/youtube-prep`
- Organizes raw footage
- Generates AI titles/descriptions
- Creates thumbnail suggestions
- Outputs upload-ready package

### `content/clip-extract`
- Watches long videos
- Extracts highlight clips
- Auto-generates timestamps
- Creates short-form versions

### `content/social-queue`
- Prepares multi-platform posts
- Schedules to Buffer/Hootsuite
- Tracks engagement metrics

## 🤖 ClawHub Skill Directory

**Community Skills:**
```
skills/
├── content/
│   ├── youtube-prep/
│   ├── clip-extract/
│   └── social-queue/
├── dev/
│   ├── auto-commit/
│   └── pr-summarizer/
├── security/
│   └── log-analyzer/
└── personal/
    └── expense-parser/
```

**Add your own:**
```bash
openclaw skill create my-automation
# Edit skills/my-automation/skill.md
# Add trigger conditions
# Define actions
```

## 💡 Why This > ChatGPT/Notion

| | OpenClaw | ChatGPT | Notion |
|---|---|---|---|
| **Automation** | ✅ Native | ❌ Manual | ❌ Limited |
| **Local-First** | ✅ Your machine | ❌ Cloud | ❌ Cloud |
| **Cost** | ✅ Local LLMs | $20+/mo | $10+/mo |
| **Actions** | ✅ Takes action | ❌ Just chat | ❌ Just store |
| **Privacy** | ✅ Your data | ❌ Their servers | ❌ Their servers |

## 🚦 Quick Start

```bash
# 1. Install
./install.sh

# 2. Configure (add your AI API key)
openclaw config set moonshot_api_key "sk-..."

# 3. Run a skill
openclaw run content/youtube-prep --input ~/Videos

# 4. Or set up a watcher
openclaw watch ~/Videos --skill content/youtube-prep --interval 5m
```

## 🎯 Use Cases

**YouTuber:**
- Drop raw footage → auto-organized, described, thumbnailed

**Developer:**
- Code changes → auto-committed, tested, pushed

**Analyst:**
- CSV drops → auto-summarized, charted, reported

**Security Researcher:**
- Log files → auto-parsed, anomalies flagged, alerts sent

## 🤝 Contributing

**Add a Skill:**
1. Fork repo
2. Create `skills/{category}/{your-skill}/`
3. Add `skill.md` + `action.js`
4. Submit PR

**Top Needed Skills:**
- `content/tiktok-autocut`
- `dev/auto-documentation`
- `security/phishing-detector`
- `personal/bill-scanner`

## 📜 License

MIT License — see [LICENSE](LICENSE)

Copyright (c) 2026 OpenClaw Contributors

---

*Built by Nix, claimed by Kieran, powered by community.* ⚡
