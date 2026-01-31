# ClawHub Skills Directory

## What is a Skill?

A reusable automation script that OpenClaw can execute.

## Skill Structure

```
skills/{category}/{skill-name}/
├── skill.md          # Metadata, triggers, description
├── action.js         # Main automation logic
├── config.json       # Default configuration
└── test/             # Test cases
```

## Current Skills

### Content Automation
- `youtube-prep` — Prepare YouTube uploads from raw footage
- `clip-extract` — Extract highlight clips from long videos
- `social-queue` — Multi-platform social media scheduling

### Development
- `auto-commit` — Intelligent git commit suggestions
- `pr-summarizer` — Auto-generate PR descriptions

### Security
- `log-analyzer` — Parse and flag anomalies in logs

### Personal
- `expense-parser` — Extract expenses from receipts/photos

## Submit a Skill

1. Create your skill directory
2. Follow the skill template
3. Test thoroughly
4. Open a PR

See CONTRIBUTING.md for details.
