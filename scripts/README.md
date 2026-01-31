# Scripts Directory

Quick tools for the Nix ecosystem. All scripts are self-contained and just work.

## Available Tools

| Script | Purpose | Usage |
|--------|---------|-------|
| `nixdo` | Task tracker with priorities | `nixdo add "task" [priority]` |
| `nixnote` | Structured idea capture | `nixnote "my idea"` |
| `nixdump` | Raw brain dump (no structure) | `nixdump` |
| `nixtrack` | Fiverr income/orders tracker | `nixtrack income <amount>` |
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
