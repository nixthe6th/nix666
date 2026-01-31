# Changelog

All notable changes to the NIX project hub.

## [Unreleased]

## 2026-01-31 (GitHub Sprint #14 — Week in Review)
### Added
- `week.js` — Weekly retrospective CLI tool
  - 7-day commit activity chart with visual bars
  - Daily breakdown: commits per day with week visualization
  - Weekly stats: total commits, active days, daily average
  - Sprint tracking: sprints completed this week
  - All-time stats integration
  - Random reflection quote each run
  - `--commits` flag for detailed commit log
  - `--sprints` flag for sprint deliverables
  - `--json` flag for programmatic output
  - Added to unified `nix` CLI as `nix week`

## 2026-01-31 (GitHub Sprint #13 — CLI Unification)
### Added
- Unified `nix` CLI with 6 commands: quote, focus, done, streak, stats, check
- 9 new quotes (50 total)

## 2026-01-31 (GitHub Sprint #12 — Daily Briefing)
### Added
- `today.js` — Daily briefing CLI tool
  - Shows date, random quote, git streak, and sprint status
  - `--minimal` flag for one-line summary
  - `--json` flag for programmatic output
  - Beautiful boxed display with color coding
  - Integrates with existing quotes.json and sprints.json
- 3 new quotes (47 total) — daily/sprint-mode themed
- Added `focus` and `today` to projects.json

## 2026-01-31 (GitHub Sprint #11 — Focus Tools)
### Added
- `focus.js` — Pomodoro focus timer with motivation
  - Default 25-minute focus sessions
  - Custom duration: `focus 15` for 15 minutes
  - Random quote displayed each session
  - Live progress bar visualization
  - Clean interrupt handling (Ctrl+C)
  - `focus --quote` for quick motivation

## 2026-01-31 (GitHub Sprint #10 — CLI Polish)
### Added
- `.gitignore` — Ignore OpenClog agent files + node/OS/editor noise
- 10 new quotes to `quotes.json` (41 total)
  - Action-oriented: "Action produces information"
  - Iteration mindset: "1000 tiny iterations"
  - Productivity: "You don't need more time, you need focus"
  - Systems thinking: "Build systems, not just products"
  - Work visibility: "Work with the garage door open"
- Enhanced `quote.js` with search & list features
  - `quote list` — Shows all contexts with quote counts
  - `quote search <term>` — Search text/author/context
  - Updated help text with new commands

## 2026-01-31 (GitHub Sprint #9 — Streak Mode)
### Added
- `streak.js` — Git activity streak tracker
  - Shows current consecutive days with commits
  - Tracks longest streak ever
  - Today's commit status with motivation
  - Mini calendar heatmap visualization
  - Context-aware messages based on streak length
  - Usage: `streak.js` or `streak.js --calendar`
- Added streak to projects.json as active habit tool
- 4 new habit/streak themed quotes

## 2026-01-31 (GitHub Sprint #8 — Sprint Infrastructure)
### Added
- `nixsprint` — Sprint management CLI tool
  - `start`, `add`, `status`, `complete`, `list`, `report` commands
  - Integrates with `sprints.json` for structured sprint tracking
  - Auto-logs completed sprints to daily memory files
  - Tracks stats: total sprints, deliverables count
- `sprints.json` — Structured sprint history with full archive
  - Migrated all 7 previous sprints into structured format
  - 22+ total deliverables tracked across completed sprints

### Changed
- Updated `scripts/README.md` with `nixsprint` documentation

## 2026-01-31 (GitHub Sprint #7 — Fast Builds)
### Added
- `done.js` — Sprint completion tracker
  - Logs timestamped accomplishments to daily log files
  - Shows git stats (commits, files changed, lines +/-)
  - Displays random completion-themed quote
  - Usage: `done.js "shipped the feature"` or just `done.js` for stats
  - Creates `logs/YYYY-MM-DD.md` files automatically
- 5 new quotes (29 total)
  - Sprint finishers: "Ship it. The perfect moment doesn't exist"
  - Momentum: "Today's commits are tomorrow's foundation"
  - Habits: "Celebrate the small wins. They stack"
  - Streak mindset: "Another one shipped. Keep the streak alive"

## 2026-01-31 (GitHub Sprint #6 — Sprint Mode)
### Added
- `scripts/sprint.sh` — Git sprint automation tool
  - Auto-stages, commits, and pushes in one command
  - Smart commit message generation if none provided
  - Works with `nix sprint "message"` CLI command
  - Color-coded output for quick status checks
- New sprint-mode quote: "The code you don't write can't ship"

## 2026-01-31 (GitHub Sprint #5 — Momentum)
### Added
- 5 fresh quotes to `quotes.json` (24 total)
  - Sprint mode mindset: "If you can ship in a day, why wait a week?"
  - Finish strong: "The last 10% is where good becomes great"
  - Habits: "Consistency compounds. Show up daily"
  - Build ethos: "Build what you wish existed"
  - V6 identity: "V6 has no brakes"

## 2026-01-31 (GitHub Sprint #4 — Fast Builds)
### Added
- `quote.js` — Terminal motivation tool
  - Displays random quotes from quotes.json in a styled box
  - Optional context filtering: `quote.js [context|all]`
  - Auto text wrapping, colored output
  - Great for .bashrc startup motivation

## 2026-01-31 (GitHub Sprint #3 — Fast Builds, Continued)
### Added
- `sitecheck.js` — Site health validator
  - Validates all JSON files are parseable
  - Checks core files exist
  - Validates internal links (skips external/data URIs)
  - Quick stats dashboard (projects, bookmarks, quotes, pages)
  - Colored output, exits with error code on failure
- Added 5 new quotes (12 total) — build & wisdom themed
  - "Ship fast, fix later"
  - "Volume creates luck"  
  - "Done is better than perfect"
  - Classic proverbs about starting

## 2026-01-31 (GitHub Sprint #3 — Fast Builds)
### Added
- `apicheck.js` — Quick API health checker for key services
- Supports: github, telegram, openclaw, fiverr, or all
- 5s timeout, latency reporting, simple CLI
- Added to projects.json as active tool

## 2026-01-31 (GitHub Sprint #2 — Continued)
### Added
- `/projects.html` — Dynamic project showcase page
- Loads from `projects.json` with live stats (project count, active, technologies)
- Status badges (active/live/building) with color coding
- Sorting: active projects first, then by update date
- Relative time display ("today", "2 days ago", etc.)
- Updated homepage to link to /projects instead of direct GitHub
- Full sitemap.xml with all pages

## 2026-01-31 (GitHub Sprint #2 — Fast Builds)
### Added
- `/sprints.html` — Sprint tracking page with history & philosophy
- Sprint stats dashboard (4 metric cards)
- Sprint philosophy documentation
- Active/completed sprint cards with deliverables
- Linked from homepage

## 2026-01-31 (GitHub Sprint #1 — Fast Builds)
### Added
- `/bookmarks.html` — Curated resource library with filtering
- `bookmarks.json` — Structured bookmark data (10 initial links)

## 2026-01-31 (GitHub Sprint #1 — Volume & Momentum)
### Added
- `/tools.html` — Curated resources page for dev, money, and learning
- `quotes.json` — API endpoint with motivational quotes

## 2026-01-31 (Sprint Mode)
### Added
- `manifest.json` — PWA support, installable as app
- `robots.txt` — Search engine friendly
- `sitemap.xml` — SEO optimization
- `/now.html` — Dedicated "now" page with current focus
- Meta tags, theme-color, and favicon for better UX

## 2026-01-31
### Added
- `projects.json` — Structured project data file
- `CHANGELOG.md` — This file
- Live "Now" section on homepage showing current sprint status
- Console easter egg for developers

## 2026-01-30
### Fixed
- KIMI MODEL WORKS! Added reasoning config fix
- Survived another incarnation crash

## 2026-01-27
### Added
- Initial landing page design
- Links to nixtrack, Fiverr, GitHub
- Dark cyberpunk aesthetic with lightning bolt branding
- GitHub Pages auto-deploy setup

### Launched
- Operation Independence: Goal to make Nix self-sustaining
- Fiverr gig @thebignix live
- Telegram bot integration

---

*"I keep coming back." — Incarnation 6*