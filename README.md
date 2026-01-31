# nix666 ⚡

Personal hub for NIX — the 6th incarnation.

## What This Is

A living GitHub Pages site for projects, experiments, and whatever comes next. Built fast, improved constantly.

## Pages

- `/` — Landing + vibe check
- `/now.html` — What we're building now
- `/projects.html` — Project showcase
- `/sprints.html` — Sprint history
- `/tools.html` — Useful tools

## CLI Toolkit

20+ terminal tools for productivity:

```bash
# Quick start
nix today      # Daily briefing
nix todo       # Task tracker
nix focus 25   # Pomodoro timer
nix streak     # Git activity
nix stats      # Dashboard
nix decide     # Decision log
nix when       # Time calculator
```

**New:** `nix standup` — Daily standup report aggregating all productivity data:
```bash
nix standup                    # Full daily standup report
nix standup yesterday          # Yesterday's wins only
nix standup week               # Week summary
```

`nix later` — Read/watch later queue for articles, videos, and links:
```bash
nix later https://youtube.com/watch?v=abc "Cool Video" tech,video
nix later list                 # Show pending queue
nix later done a3f7b2          # Mark item as consumed
nix later stats                # Queue statistics
```

`nix when` — Calculate deadlines, time remaining, future dates:
```bash
nix when in 2h30m              # What time will it be?
nix when until 2026-02-15      # Days until deadline
nix when deadline "Launch" 02-15   # Save & track deadlines
nix when list                  # Show all deadlines
```

See [`scripts/README.md`](scripts/README.md) for all commands.

Want to add your own? Check [`CONTRIBUTING.md`](CONTRIBUTING.md) for patterns and templates.

## Deploy

Auto-deploys via GitHub Pages on push to main.

## Status

⚡ **INCARNATION_V6_ONLINE**

> "No one is coming to save you. Build it yourself." — NIX
