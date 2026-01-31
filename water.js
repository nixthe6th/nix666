#!/usr/bin/env node
/**
 * water.js — Hydration tracker
 * Quick water logging with daily goals & streaks
 * 
 * Usage: nix water [command] [amount]
 * 
 * Commands:
 *   (none)       Show today's progress
 *   <amount>     Add water (e.g., 500, 16oz)
 *   glass        Add 250ml (one glass)
 *   bottle       Add 500ml (one bottle)
 *   goal <amt>   Set daily goal (default: 2500ml)
 *   undo         Remove last entry
 *   week         Show last 7 days
 *   reset        Clear today's entries
 */

const fs = require('fs');
const path = require('path');

const WATER_FILE = path.join(__dirname, 'data', 'water.json');
const DEFAULT_GOAL = 2500; // ml

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

const ICONS = ['💧', '🌊', '💦', '🚰', '🥤', '🧊'];

function c(name, text) {
  return `${COLORS[name] || ''}${text}${COLORS.reset}`;
}

function loadData() {
  if (!fs.existsSync(WATER_FILE)) {
    return { goal: DEFAULT_GOAL, history: {} };
  }
  return JSON.parse(fs.readFileSync(WATER_FILE, 'utf8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(WATER_FILE), { recursive: true });
  fs.writeFileSync(WATER_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function parseAmount(input) {
  if (!input) return 0;
  const str = input.toString().toLowerCase().trim();
  
  // Handle oz
  if (str.endsWith('oz')) {
    const num = parseFloat(str);
    return Math.round(num * 29.5735); // oz to ml
  }
  
  // Handle ml
  if (str.endsWith('ml')) {
    return parseInt(str);
  }
  
  // Plain number = ml
  const num = parseInt(str);
  return isNaN(num) ? 0 : num;
}

function formatAmount(ml) {
  const oz = Math.round(ml / 29.5735 * 10) / 10;
  return `${c('cyan', ml + 'ml')} ${c('dim', `(${oz}oz)`)}`;
}

function drawBar(current, goal) {
  const width = 30;
  const pct = Math.min(current / goal, 1);
  const filled = Math.round(width * pct);
  const empty = width - filled;
  
  const color = pct >= 1 ? 'green' : pct >= 0.5 ? 'blue' : 'yellow';
  const bar = c(color, '█'.repeat(filled)) + c('dim', '░'.repeat(empty));
  const percent = Math.round(pct * 100);
  
  return `[${bar}] ${c('bold', percent + '%')}`;
}

function getMotivation(pct) {
  if (pct >= 100) return c('green', 'Goal crushed! 🎉');
  if (pct >= 75) return c('cyan', 'So close! Keep sipping');
  if (pct >= 50) return c('blue', 'Halfway there 💪');
  if (pct >= 25) return c('yellow', 'Good start, keep going');
  return c('magenta', 'Time to hydrate! 🚰');
}

function showStatus() {
  const data = loadData();
  const today = getToday();
  const entries = data.history[today] || [];
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const pct = (total / data.goal) * 100;
  
  console.log();
  console.log(c('bold', '  💧 HYDRATION TRACKER'));
  console.log(c('dim', '  ─────────────────────'));
  console.log();
  
  console.log(`  Today's intake: ${formatAmount(total)}`);
  console.log(`  Daily goal:     ${c('cyan', data.goal + 'ml')}`);
  console.log();
  console.log('  ' + drawBar(total, data.goal));
  console.log();
  console.log('  ' + getMotivation(pct));
  
  if (entries.length > 0) {
    console.log();
    console.log(c('dim', '  Today\'s log:'));
    entries.slice(-5).forEach(e => {
      const time = e.time.substring(0, 5);
      console.log(`    ${c('dim', time)}  +${formatAmount(e.amount)}`);
    });
    if (entries.length > 5) {
      console.log(c('dim', `    ... and ${entries.length - 5} more`));
    }
  }
  
  console.log();
  console.log(c('dim', '  Quick add: nix water 500 | nix water glass | nix water bottle'));
  console.log();
}

function addWater(amount, label = '') {
  const data = loadData();
  const today = getToday();
  const now = new Date();
  const time = now.toTimeString().split(' ')[0];
  
  if (!data.history[today]) {
    data.history[today] = [];
  }
  
  const entry = {
    amount: amount,
    time: time,
    label: label
  };
  
  data.history[today].push(entry);
  saveData(data);
  
  const total = data.history[today].reduce((sum, e) => sum + e.amount, 0);
  const icon = ICONS[Math.floor(Math.random() * ICONS.length)];
  
  console.log();
  console.log(`  ${icon}  Added ${formatAmount(amount)}`);
  console.log(`  Total today: ${formatAmount(total)} / ${c('cyan', data.goal + 'ml')}`);
  
  if (total >= data.goal) {
    console.log();
    console.log(c('green', '  🎉 Daily goal reached! Great job!'));
  }
  console.log();
}

function setGoal(amount) {
  const ml = parseAmount(amount);
  if (ml < 500 || ml > 5000) {
    console.log(c('red', '  Goal must be between 500ml and 5000ml'));
    return;
  }
  
  const data = loadData();
  data.goal = ml;
  saveData(data);
  
  console.log();
  console.log(`  🎯 Daily goal set to ${c('cyan', ml + 'ml')}`);
  console.log();
}

function undoLast() {
  const data = loadData();
  const today = getToday();
  const entries = data.history[today] || [];
  
  if (entries.length === 0) {
    console.log(c('yellow', '  Nothing to undo'));
    return;
  }
  
  const removed = entries.pop();
  saveData(data);
  
  console.log();
  console.log(`  ↩️  Removed ${formatAmount(removed.amount)}`);
  console.log();
}

function showWeek() {
  const data = loadData();
  const dates = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  console.log();
  console.log(c('bold', '  💧 Last 7 Days'));
  console.log(c('dim', '  ──────────────'));
  console.log();
  
  dates.forEach(date => {
    const entries = data.history[date] || [];
    const total = entries.reduce((sum, e) => sum + e.amount, 0);
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = date.substring(5);
    const bar = total >= data.goal ? c('green', '█') : c('blue', '▓');
    const pct = Math.min(Math.round((total / data.goal) * 10), 10);
    const miniBar = bar.repeat(pct) + c('dim', '░'.repeat(10 - pct));
    
    console.log(`  ${dayName} ${dateStr}  ${miniBar}  ${formatAmount(total)}`);
  });
  
  console.log();
}

function resetToday() {
  const data = loadData();
  const today = getToday();
  
  if (!data.history[today] || data.history[today].length === 0) {
    console.log(c('yellow', '  No entries to reset'));
    return;
  }
  
  data.history[today] = [];
  saveData(data);
  
  console.log();
  console.log(c('dim', '  Today\'s water log cleared'));
  console.log();
}

// Main
const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd) {
  showStatus();
} else if (cmd === 'glass') {
  addWater(250, 'glass');
} else if (cmd === 'bottle') {
  addWater(500, 'bottle');
} else if (cmd === 'goal') {
  setGoal(args[1]);
} else if (cmd === 'undo') {
  undoLast();
} else if (cmd === 'week') {
  showWeek();
} else if (cmd === 'reset') {
  resetToday();
} else if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
  console.log(`
  ${c('bold', '💧 Water Tracker')}
  
  ${c('dim', 'Usage:')} nix water [command] [amount]
  
  ${c('bold', 'Commands:')}
    (none)       Show today's hydration status
    <amount>     Add water in ml (e.g., 500, 16oz)
    glass        Add 250ml (one glass)
    bottle       Add 500ml (one bottle)
    goal <amt>   Set daily goal (default: 2500ml)
    undo         Remove last entry
    week         Show last 7 days
    reset        Clear today's entries
    help         Show this help
  
  ${c('bold', 'Examples:')}
    nix water          # Status
    nix water 500      # Add 500ml
    nix water 16oz     # Add 16oz (converts to ~473ml)
    nix water bottle   # Add 500ml
    nix water glass    # Add 250ml
    nix water goal 3000
  `);
} else {
  // Assume it's an amount
  const amount = parseAmount(cmd);
  if (amount > 0) {
    addWater(amount);
  } else {
    console.log(c('red', '  Invalid amount. Try: nix water 500'));
  }
}
