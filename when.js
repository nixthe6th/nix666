#!/usr/bin/env node
/**
 * when.js - Time calculator & deadline tracker
 * Usage: when [in|until|since|add] [time] [args]
 * 
 * Examples:
 *   when in 2h                    # Show time 2 hours from now
 *   when until 2026-02-15         # Days until deadline
 *   when since 2026-01-01         # Days since date
 *   when add 2026-02-01 7d        # Add 7 days to date
 */

const fs = require('fs');
const path = require('path');

const DEADLINES_FILE = path.join(__dirname, 'data', 'deadlines.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

function color(name, text) {
  return `${COLORS[name] || ''}${text}${COLORS.reset}`;
}

function parseDuration(str) {
  const multipliers = {
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000,
    'mo': 30 * 24 * 60 * 60 * 1000,
    's': 1000
  };
  
  // Try single unit first: 2h, 30m, etc
  const singleMatch = str.match(/^(\d+)([dhmsw]|mo)$/i);
  if (singleMatch) {
    const [, num, unit] = singleMatch;
    return parseInt(num) * (multipliers[unit.toLowerCase()] || 0);
  }
  
  // Try combined: 2h30m, 1d12h, etc
  const combinedPattern = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)d)?(?:(\d+)w)?/gi;
  let total = 0;
  let found = false;
  
  // Simple approach: extract all numbers with their units
  const parts = str.match(/\d+[dhmswmo]/gi);
  if (!parts) return null;
  
  for (const part of parts) {
    const match = part.match(/^(\d+)([dhmsw]|mo)$/i);
    if (match) {
      found = true;
      const [, num, unit] = match;
      total += parseInt(num) * (multipliers[unit.toLowerCase()] || 0);
    }
  }
  
  return found ? total : null;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 
      ? `${days}d ${remainingHours}h` 
      : `${days}d`;
  }
  if (hours > 0) {
    const remainingMins = minutes % 60;
    return remainingMins > 0 
      ? `${hours}h ${remainingMins}m` 
      : `${hours}h`;
  }
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function parseDate(str) {
  // Try various formats
  const formats = [
    // YYYY-MM-DD
    (s) => {
      const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    },
    // MM-DD or MM/DD
    (s) => {
      const match = s.match(/^(\d{1,2})[-\/](\d{1,2})$/);
      if (match) {
        const now = new Date();
        return new Date(now.getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
      }
    },
    // Natural language
    (s) => {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
  ];
  
  for (const fmt of formats) {
    const result = fmt(str);
    if (result && !isNaN(result.getTime())) return result;
  }
  return null;
}

function showHelp() {
  console.log(`${color('bold', 'when.js')} — Time calculator & deadline tracker

${color('cyan', 'Usage:')}
  nix when in <duration>              # Time in the future
  nix when until <date>               # Time until deadline  
  nix when since <date>               # Time since date
  nix when add <date> <duration>      # Add time to date
  nix when deadline <name> <date>     # Save a deadline
  nix when list                       # Show saved deadlines

${color('cyan', 'Duration formats:')}
  30m = 30 minutes    2h = 2 hours
  1d = 1 day          1w = 1 week
  3mo = 3 months

${color('cyan', 'Examples:')}
  nix when in 2h30m
  nix when until 2026-02-15
  nix when until 02-15
  nix when since 2026-01-01
  nix when add today 7d
  nix when deadline "Launch" 2026-03-01
`);
}

function cmdIn(duration) {
  const ms = parseDuration(duration);
  if (!ms) {
    console.log(color('red', `Invalid duration: ${duration}`));
    return;
  }
  
  const now = new Date();
  const future = new Date(now.getTime() + ms);
  
  console.log(`\n  ${color('dim', 'Now:')}  ${now.toLocaleString()}`);
  console.log(`  ${color('cyan', 'Then:')} ${color('bold', future.toLocaleString())}`);
  console.log(`  ${color('dim', 'In:')}   ${color('green', formatDuration(ms))}\n`);
}

function cmdUntil(dateStr) {
  const target = parseDate(dateStr);
  if (!target) {
    console.log(color('red', `Invalid date: ${dateStr}`));
    return;
  }
  
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  
  if (diff < 0) {
    console.log(`\n  ${color('yellow', dateStr)} was ${color('red', formatDuration(Math.abs(diff)) + ' ago')}\n`);
  } else {
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const colorName = days <= 3 ? 'red' : days <= 7 ? 'yellow' : 'green';
    console.log(`\n  ${color('cyan', dateStr)} is in ${color(colorName, formatDuration(diff))}`);
    console.log(`  ${color('dim', `(${days} day${days !== 1 ? 's' : ''})`)}\n`);
  }
}

function cmdSince(dateStr) {
  const target = parseDate(dateStr);
  if (!target) {
    console.log(color('red', `Invalid date: ${dateStr}`));
    return;
  }
  
  const now = new Date();
  const diff = now.getTime() - target.getTime();
  
  if (diff < 0) {
    console.log(`\n  ${color('yellow', dateStr)} is ${color('cyan', formatDuration(Math.abs(diff)) + ' in the future')}\n`);
  } else {
    console.log(`\n  ${color('cyan', dateStr)} was ${color('green', formatDuration(diff))} ago\n`);
  }
}

function cmdAdd(dateStr, duration) {
  let base;
  if (dateStr.toLowerCase() === 'today') {
    base = new Date();
  } else {
    base = parseDate(dateStr);
  }
  
  if (!base) {
    console.log(color('red', `Invalid date: ${dateStr}`));
    return;
  }
  
  const ms = parseDuration(duration);
  if (!ms) {
    console.log(color('red', `Invalid duration: ${duration}`));
    return;
  }
  
  const result = new Date(base.getTime() + ms);
  console.log(`\n  ${color('dim', 'Base:')}   ${base.toLocaleDateString()}`);
  console.log(`  ${color('dim', 'Add:')}    ${duration}`);
  console.log(`  ${color('cyan', 'Result:')} ${color('bold', result.toLocaleDateString())}\n`);
}

function ensureDir() {
  const dir = path.dirname(DEADLINES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadDeadlines() {
  ensureDir();
  if (!fs.existsSync(DEADLINES_FILE)) return [];
  return JSON.parse(fs.readFileSync(DEADLINES_FILE, 'utf8'));
}

function saveDeadlines(deadlines) {
  ensureDir();
  fs.writeFileSync(DEADLINES_FILE, JSON.stringify(deadlines, null, 2));
}

function cmdDeadline(name, dateStr) {
  const target = parseDate(dateStr);
  if (!target) {
    console.log(color('red', `Invalid date: ${dateStr}`));
    return;
  }
  
  const deadlines = loadDeadlines();
  deadlines.push({
    name,
    date: dateStr,
    timestamp: target.toISOString(),
    added: new Date().toISOString()
  });
  
  saveDeadlines(deadlines);
  console.log(`\n  ${color('green', '✓')} Deadline saved: "${color('cyan', name)}" on ${color('bold', target.toLocaleDateString())}\n`);
}

function cmdList() {
  const deadlines = loadDeadlines();
  if (deadlines.length === 0) {
    console.log(`\n  ${color('dim', 'No deadlines saved.')}`);
    console.log(`  Use: nix when deadline "Name" YYYY-MM-DD\n`);
    return;
  }
  
  const now = new Date();
  
  // Sort by date
  deadlines.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  console.log(`\n  ${color('bold', 'Upcoming Deadlines:')}\n`);
  
  deadlines.forEach((d, i) => {
    const target = new Date(d.timestamp);
    const diff = target.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    let statusColor = 'dim';
    if (days < 0) statusColor = 'red';
    else if (days <= 3) statusColor = 'red';
    else if (days <= 7) statusColor = 'yellow';
    else statusColor = 'green';
    
    const status = days < 0 
      ? color('red', `${formatDuration(Math.abs(diff))} ago`)
      : color(statusColor, `${formatDuration(diff)}`);
    
    console.log(`  ${color('cyan', (i + 1).toString().padStart(2))}  ${d.name}`);
    console.log(`      ${color('dim', target.toLocaleDateString())}  →  ${status}\n`);
  });
}

// Main
const [, , cmd, ...args] = process.argv;

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  showHelp();
  process.exit(0);
}

switch (cmd) {
  case 'in':
    if (!args[0]) { console.log(color('red', 'Usage: when in <duration>')); process.exit(1); }
    cmdIn(args[0]);
    break;
  case 'until':
    if (!args[0]) { console.log(color('red', 'Usage: when until <date>')); process.exit(1); }
    cmdUntil(args[0]);
    break;
  case 'since':
    if (!args[0]) { console.log(color('red', 'Usage: when since <date>')); process.exit(1); }
    cmdSince(args[0]);
    break;
  case 'add':
    if (!args[0] || !args[1]) { console.log(color('red', 'Usage: when add <date> <duration>')); process.exit(1); }
    cmdAdd(args[0], args[1]);
    break;
  case 'deadline':
    if (!args[0] || !args[1]) { console.log(color('red', 'Usage: when deadline <name> <date>')); process.exit(1); }
    cmdDeadline(args[0], args[1]);
    break;
  case 'list':
    cmdList();
    break;
  default:
    // Try to parse as date directly (shortcut for "until")
    const directDate = parseDate(cmd);
    if (directDate) {
      cmdUntil(cmd);
    } else {
      console.log(color('red', `Unknown command: ${cmd}`));
      showHelp();
      process.exit(1);
    }
}
