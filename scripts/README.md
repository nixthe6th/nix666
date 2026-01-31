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
