# Scripts Directory

Quick tools for the Nix ecosystem. All scripts are self-contained and just work.

## 🚀 Quick Start (use the `nix` dispatcher)

```bash
# Add to PATH (in ~/.bashrc)
export PATH="$PATH:/home/ec2-user/.openclaw/workspace/scripts"

# Then use the unified CLI
nix do "my task" high      # Add task
nix note "my idea"          # Capture idea
nix track income 150        # Log income
nix sprint "commit msg"     # Git push
nix status                  # System check
nix tools                   # List all tools
```

## Available Tools

| Script | Purpose | Usage |
|--------|---------|-------|
| `nixsprint` | Sprint tracker (integrates with sprints.json) | `nixsprint start "Sprint Name"` |
| `nixwhen` | Time calculator & deadlines | `nixwhen in 2h` / `nixwhen until 02-15` |
| `nixtimer` | Focus timer with session logging | `nixtimer 25 "deep work"` |
| `nixdo` | Task tracker with priorities | `nixdo add "task" [priority]` |
| `nixnote` | Structured idea capture | `nixnote "my idea"` |
| `nixdump` | Raw brain dump (no structure) | `nixdump` |
| `nixtrack` | Fiverr income/orders tracker | `nixtrack income <amount>` |
| `nixscan` | Workspace health scanner | `nixscan` or `nixscan todos` |
| `dailylog.sh` | Daily memory template | `dailylog.sh` |
| `sprint.sh` | Git commit & push | `sprint.sh "message"` |
| `status.sh` | System check | `status.sh` |
| `wordcount` | Count words in files | `wordcount <file>` |
| `wcc` | Word count with goal check | `wcc <file> <goal>` |
| `fiverr` | Fiverr business commands | `fiverr status` |
| `nixweather` | Weather checker | `nixweather [location]` |
| `nixdecide` | Decision log | `nixdecide add "Switch to TS"` |
| `nixwater` | Hydration tracker | `nixwater 500` / `nixwater week` |

### Root-Level Tools (via `nix` command)

| Tool | Purpose | Example |
|------|---------|---------|
| `quote.js` | Random motivation quotes | `nix quote` |
| `focus.js` | Pomodoro timer | `nix focus 25` |
| `done.js` | Sprint completion tracker | `nix done "shipped feature"` |
| `streak.js` | Git activity streak | `nix streak` |
| `today.js` | Daily briefing | `nix today` |
| `week.js` | Weekly retrospective | `nix week` |
| `ideas.js` | Idea backlog & pipeline | `nix ideas "my idea" high` |
| `note.js` | Quick timestamped notes | `nix note "remember this"` |
| `projstats.js` | Project stats dashboard | `nix stats` |
| `apicheck.js` | API health checker | `nix check` |
| `calc.js` | Quick calculator | `nix calc 25 * 4` |
| `pass.js` | Password generator | `nix pass -l 20` |
| `server.js` | Quick HTTP server | `nix server 8080` |
| `find.js` | Universal search | `nix find "query"` |
| `convert.js` | Data format converter | `nix convert b64e "text"` |
| `backup.js` | Data backup and export | `nix backup` |
| `tag.js` | Universal tag manager | `nix tag work` |
| `water.js` | Hydration tracker | `nix water 500` |

## Quick Start

```bash
# See all commands
ls scripts/

# Add to PATH (in ~/.bashrc)
export PATH="$PATH:/home/ec2-user/.openclaw/workspace/scripts"

# Or use directly
./scripts/nixdo add "new task" high
```

## Philosophy

- **No config files** (except data storage)
- **No dependencies** beyond standard tools
- **Self-documenting** — run without args for help
- **Fast** — optimized for muscle memory
