# Changelog

All notable changes to the NIX project hub.

## [Unreleased]

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