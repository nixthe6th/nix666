# Roadmap

The future of NIX — what's planned, what's cooking, what's possible.

> "The best time to plant a tree was 20 years ago. The second best time is now."

---

## 🚧 In Progress

### Sprint #35 — Knowledge System
- [x] `learn.js` — Learning tracker with spaced repetition
- [x] `nix flashcard` — CLI flashcard system for memorization
- [x] `nix clip` — Save and tag code snippets
- [x] `nix summarize` — Auto-summarize long text/articles

### Sprint #36 — Health & Wellness
- [x] `nix sleep` — Sleep quality tracker
- [x] `nix workout` — Quick workout logger
- [x] `nix meditate` — Guided breathing timer

### Sprint #37 — Knowledge Capture
- [x] `nix read` — Reading list with progress tracking (books, articles, papers)
- [x] `nix zettel` — Zettelkasten note system
- [x] `nix connect` — Find connections between notes

---

## 📋 Planned Features

### Core CLI Enhancements
| Feature | Description | Priority |
|---------|-------------|----------|
| `nix sync` | Sync data to cloud (Git-based or S3) | High |
| `nix export` | JSON/CSV data portability | High ✓ |
| `nix import` | Import data from exports | High ✓ |
| `nix config` | User preferences and settings | Medium |
| `nix alias` | Custom command shortcuts | Medium |
| `nix plugin` | Plugin system for external tools | Low |

### New Tools

#### Productivity
- `nix pomodoro` — Enhanced focus with task integration
- `nix timeblock` — Daily time blocking planner
- `nix distraction` — Track and log distractions
- [x] `nix energy` — Energy level tracking throughout day

#### Knowledge Management
- [x] `nix read` — Reading list with progress tracking
- [x] `nix zettel` — Zettelkasten note system
- [x] `nix connect` — Find connections between notes
- [x] `nix outline` — Quick outlining for writing

#### Finance
- `nix invest` — Investment portfolio tracker
- [x] `nix subscription` — Track recurring expenses
- [x] `nix goal` — Savings goal visualizer

#### Social
- `nix network` — Contact/relationship tracker
- `nix birthday` — Birthday reminders
- [x] `nix gratitude` — Daily gratitude log

### Web Interface
- [ ] Interactive dashboard with charts
- [ ] Calendar view for all tracked data
- [ ] Mobile-responsive layout improvements
- [ ] PWA support for offline access
- [ ] Dark mode toggle

---

## 🧪 Experimental Ideas

These may or may not happen — ideas worth exploring:

### AI Integration
- **Smart suggestions**: "Based on your patterns, you usually focus best at 9am"
- **Auto-categorization**: Automatically tag expenses, notes
- **Sentiment analysis**: Track mood trends from journal entries
- **Goal recommendations**: Suggest goals based on tracked habits

### Hardware Integration
- **Keyboard shortcuts**: Physical key for "quick capture"
- **E-ink display**: Show today's priorities on a small screen
- **LED indicators**: Visual streak status on desk

### Community Features
- **Public profiles**: Share learning progress, reading lists
- **Challenges**: 30-day habit challenges with friends
- **Templates**: Community-contributed workflow templates

---

## 🐛 Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| No data encryption | Medium | Files are plaintext JSON |
| No cloud sync | Medium | Device-bound currently |
| Large JSON files | Low | May slow down over months |
| Mobile CLI | Low | Not optimized for mobile SSH |

---

## 🎯 Long-term Vision

### V7 — The Connected System
- End-to-end encrypted sync across devices
- Mobile apps (iOS/Android)
- Browser extension for quick capture
- Integration with popular tools (Notion, Todoist, GitHub)

### V8 — The Intelligent System
- Local LLM for private insights
- Predictive task suggestions
- Automatic time tracking
- Health correlations (sleep vs productivity)

### V9 — The Ecosystem
- Plugin marketplace
- Community themes
- Custom data types
- Open API for third-party tools

---

## 💡 Feature Requests

Want something? Add it here:

1. **vim keybindings** for interactive prompts
2. **telegram bot** integration for mobile capture
3. **calendar export** (.ics generation for sprints)
4. **voice notes** transcription
5. **photo receipts** for expenses
6. **location tracking** for context awareness
7. **weather correlation** with mood/productivity
8. **music tracking** — what you listened to while working

---

## 📊 Success Metrics

How we'll know NIX is working:

- [ ] 30+ CLI tools working harmoniously
- [ ] <100ms response time for all commands
- [ ] Zero external dependencies for core tools
- [ ] Daily active use (by creator at minimum)
- [ ] Community contributions (PRs, issues)

---

## 📝 Contributing to the Roadmap

1. **Try it**: Use NIX daily, find friction points
2. **Suggest**: Open an issue with the `idea` label
3. **Prototype**: Build it in a branch, test it
4. **Ship**: PR with docs and changelog entry

See [CONTRIBUTING.md](CONTRIBUTING.md) for patterns and templates.

---

*Last updated: 2026-01-31*
*Next review: 2026-02-15*
