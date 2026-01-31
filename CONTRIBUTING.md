# Contributing to nix666

> "The best tools are the ones you actually use." — NIX

This guide shows you how to add new CLI tools that fit the nix666 ecosystem.

## Philosophy

- **No config files** — tools just work
- **Zero dependencies** — pure Node.js/bash only
- **Self-documenting** — run without args for help
- **Fast** — optimized for muscle memory
- **Colorful** — terminal should feel alive

## Tool Patterns

### Node.js Tools (Root Level)

Location: repository root (`*.js`)

**Template:**

```javascript
#!/usr/bin/env node
/**
 * toolname.js - One-line description
 * Usage: toolname [command] [args]
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'toolname.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

// Data helpers
function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ID generation (short, readable)
function generateId() {
  return Date.now().toString(36).slice(-4);
}

// Age formatting
function getAge(iso) {
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours/24)}d ago`;
}

// Help text
function showHelp() {
  console.log(`
${COLORS.bold}toolname.js${COLORS.reset} - Description

${COLORS.bold}Usage:${COLORS.reset}
  nix toolname <command> [args]

${COLORS.bold}Commands:${COLORS.reset}
  add <text>        Add something
  list              Show all items
  remove <id>       Delete item by ID

${COLORS.bold}Examples:${COLORS.reset}
  nix toolname add "something important"
  nix toolname list
  nix toolname remove a3f7
`);
}

// Main entry
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const cmd = args[0];
  
  // Implement commands here
}

main();
```

**Integration steps:**

1. Create `toolname.js` in repo root
2. Make executable: `chmod +x toolname.js`
3. Add to `scripts/nix` dispatcher
4. Update `projects.json` with metadata
5. Update `scripts/README.md`

### Bash Tools (scripts/ directory)

Location: `scripts/*.sh`

**Template:**

```bash
#!/bin/bash
#
# toolname.sh - One-line description
#

set -e

# Colors
BOLD='\033[1m'
RESET='\033[0m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'

# Help
show_help() {
    cat << EOF
${BOLD}toolname.sh${RESET} - Description

${BOLD}Usage:${RESET}
    nix toolname [command]

${BOLD}Commands:${RESET}
    status    Check something
    update    Do something

${BOLD}Examples:${RESET}
    nix toolname status
EOF
}

# Main
case "${1:-}" in
    --help|-h|"")
        show_help
        ;;
    status)
        echo -e "${GREEN}✓${RESET} Status check passed"
        ;;
    *)
        echo -e "${RED}✗${RESET} Unknown command: $1"
        show_help
        exit 1
        ;;
esac
```

## Adding to the `nix` Dispatcher

Edit `scripts/nix` and add your command:

```bash
toolname)
    exec "${WORKSPACE}/toolname.js" "$@"
    ;;
```

Follow the existing case statement pattern.

## Data Storage

All data lives in `data/` directory:

- `data/todos.json` — Task items
- `data/habits.json` — Habit tracking
- `data/mood.json` — Mood entries
- `data/sessions.json` — Work sessions

**Schema guidelines:**

```json
{
  "id": "short-id",
  "text": "Human readable",
  "created": "2026-01-31T09:57:00Z",
  "updated": "2026-01-31T10:00:00Z",
  "tags": ["optional"]
}
```

## UI Conventions

### Icons by Meaning

| Icon | Meaning |
|------|---------|
| ✓ | Success/added |
| ✗ | Error/deleted |
| ⚡ | Active/current |
| 🔴 | High priority |
| 🟡 | Medium priority |
| 🔵 | Low priority |
| 📊 | Stats/data |
| 💡 | Ideas |
| 📝 | Notes |
| 🎯 | Focus/tasks |

### Output Format

```
Header (bold + color)

  Item with icon
     metadata (dim)

Footer (dim)
```

## Projects.json Entry

When adding a tool, document it:

```json
{
  "name": "toolname",
  "description": "What it does",
  "url": "./toolname.js",
  "status": "active",
  "tags": ["tool", "node", "cli", "category"],
  "updated": "2026-01-31",
  "tech": ["node"]
}
```

## Testing Your Tool

```bash
# Make executable
chmod +x toolname.js

# Test directly
./toolname.js

# Test via dispatcher
nix toolname

# Check integration
nix tools
```

## Sprint Workflow

When adding a new tool:

1. **Create sprint** (optional): `nixsprint start "Tool Name"`
2. **Build tool**: Follow patterns above
3. **Update docs**: README.md, projects.json
4. **Test**: Run through dispatcher
5. **Commit**: `nix sprint "Add toolname.js - description"`
6. **Mark done**: `nix done "Shipped toolname"`

## Code Review Checklist

- [ ] Executable permissions set
- [ ] Help text included
- [ ] Added to `scripts/nix` dispatcher
- [ ] Added to `projects.json`
- [ ] Follows color/icon conventions
- [ ] Self-documenting (no args = help)
- [ ] Data in `data/` directory

## Quick Reference

```bash
# See all tools
ls *.js scripts/*.sh

# Check dispatcher
scripts/nix

# View recent additions
git log --oneline -10

# Test current sprint
nix today
```

---

Build something useful. Ship it fast. ⚡
