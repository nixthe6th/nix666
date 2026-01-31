#!/usr/bin/env node
/**
 * timeblock.js - Daily time blocking planner
 * Usage: timeblock [command] [options]
 *   timeblock                    # Show today's schedule
 *   timeblock add 9:00 11:00 "Deep work"  # Add block
 *   timeblock clear              # Clear today's schedule
 *   timeblock template           # Use default template
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

const DATA_FILE = path.join(__dirname, 'data', 'timeblock.json');

const TEMPLATES = {
  default: [
    { start: '06:00', end: '07:00', activity: '🌅 Morning routine', type: 'routine' },
    { start: '07:00', end: '09:00', activity: '💻 Deep work #1', type: 'deep' },
    { start: '09:00', end: '09:15', activity: '☕ Break', type: 'break' },
    { start: '09:15', end: '11:00', activity: '💻 Deep work #2', type: 'deep' },
    { start: '11:00', end: '12:00', activity: '📧 Email & admin', type: 'shallow' },
    { start: '12:00', end: '13:00', activity: '🍽️ Lunch', type: 'break' },
    { start: '13:00', end: '15:00', activity: '💻 Deep work #3', type: 'deep' },
    { start: '15:00', end: '15:15', activity: '☕ Break', type: 'break' },
    { start: '15:15', end: '17:00', activity: '📊 Meetings & calls', type: 'shallow' },
    { start: '17:00', end: '18:00', activity: '📝 Review & plan', type: 'shallow' },
    { start: '18:00', end: '22:00', activity: '🌙 Evening', type: 'routine' }
  ],
  creative: [
    { start: '06:00', end: '07:00', activity: '🌅 Morning routine', type: 'routine' },
    { start: '07:00', end: '10:00', activity: '🎨 Creative work', type: 'deep' },
    { start: '10:00', end: '10:30', activity: '☕ Break', type: 'break' },
    { start: '10:30', end: '12:00', activity: '🎨 Creative work', type: 'deep' },
    { start: '12:00', end: '13:00', activity: '🍽️ Lunch', type: 'break' },
    { start: '13:00', end: '14:00', activity: '📧 Admin tasks', type: 'shallow' },
    { start: '14:00', end: '15:30', activity: '🎨 Creative work', type: 'deep' },
    { start: '15:30', end: '17:00', activity: '📊 Review & feedback', type: 'shallow' },
    { start: '17:00', end: '22:00', activity: '🌙 Evening', type: 'routine' }
  ],
  admin: [
    { start: '06:00', end: '07:00', activity: '🌅 Morning routine', type: 'routine' },
    { start: '07:00', end: '08:00', activity: '📧 Email processing', type: 'shallow' },
    { start: '08:00', end: '10:00', activity: '📊 Admin tasks', type: 'shallow' },
    { start: '10:00', end: '10:15', activity: '☕ Break', type: 'break' },
    { start: '10:15', end: '12:00', activity: '📊 Admin tasks', type: 'shallow' },
    { start: '12:00', end: '13:00', activity: '🍽️ Lunch', type: 'break' },
    { start: '13:00', end: '15:00', activity: '📞 Calls & meetings', type: 'shallow' },
    { start: '15:00', end: '15:15', activity: '☕ Break', type: 'break' },
    { start: '15:15', end: '17:00', activity: '📊 Admin tasks', type: 'shallow' },
    { start: '17:00', end: '18:00', activity: '📝 Review & plan', type: 'shallow' },
    { start: '18:00', end: '22:00', activity: '🌙 Evening', type: 'routine' }
  ]
};

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { schedules: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getTypeColor(type) {
  switch (type) {
    case 'deep': return COLORS.magenta;
    case 'shallow': return COLORS.yellow;
    case 'break': return COLORS.green;
    case 'routine': return COLORS.blue;
    default: return COLORS.cyan;
  }
}

function getTypeIcon(type) {
  switch (type) {
    case 'deep': return '🔥';
    case 'shallow': return '🌊';
    case 'break': return '☕';
    case 'routine': return '📋';
    default: return '⏱️';
  }
}

function showSchedule(date = getTodayKey()) {
  const data = loadData();
  const schedule = data.schedules[date] || [];

  console.log('');
  console.log(COLORS.bold + COLORS.cyan + '⏰ TIMEBLOCK SCHEDULE' + COLORS.reset);
  console.log(COLORS.dim + `   ${date}${date === getTodayKey() ? ' (today)' : ''}` + COLORS.reset);
  console.log('');

  if (schedule.length === 0) {
    console.log(COLORS.dim + '   No blocks scheduled.' + COLORS.reset);
    console.log(COLORS.dim + '   Run: nix timeblock template' + COLORS.reset);
    console.log('');
    return;
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let currentBlock = null;
  let deepWorkMinutes = 0;
  let totalMinutes = 0;

  schedule.forEach((block, i) => {
    const startMins = parseTime(block.start);
    const endMins = parseTime(block.end);
    const duration = endMins - startMins;
    totalMinutes += duration;

    if (block.type === 'deep') {
      deepWorkMinutes += duration;
    }

    const isCurrent = nowMinutes >= startMins && nowMinutes < endMins;
    const isPast = nowMinutes >= endMins;

    if (isCurrent) currentBlock = block;

    const typeColor = getTypeColor(block.type);
    const icon = getTypeIcon(block.type);
    const status = isCurrent ? COLORS.green + '▶' : (isPast ? COLORS.dim + '✓' : COLORS.dim + '○');
    const dimIfPast = isPast ? COLORS.dim : '';

    console.log(`  ${status} ${dimIfPast}${typeColor}${block.start}-${block.end}${COLORS.reset} ${dimIfPast}${icon} ${block.activity}${COLORS.reset}`);
  });

  console.log('');

  // Stats
  const deepHours = (deepWorkMinutes / 60).toFixed(1);
  const totalHours = (totalMinutes / 60).toFixed(1);
  console.log(COLORS.dim + `   Deep work: ${COLORS.magenta}${deepHours}h${COLORS.dim} | Total: ${totalHours}h` + COLORS.reset);

  if (currentBlock) {
    const endMins = parseTime(currentBlock.end);
    const remaining = endMins - nowMinutes;
    console.log(COLORS.green + `   Current: ${currentBlock.activity} (${remaining}m remaining)` + COLORS.reset);
  }

  console.log('');
}

function addBlock(start, end, activity, type = 'shallow') {
  const data = loadData();
  const date = getTodayKey();

  if (!data.schedules[date]) {
    data.schedules[date] = [];
  }

  data.schedules[date].push({
    start,
    end,
    activity,
    type,
    added: new Date().toISOString()
  });

  // Sort by start time
  data.schedules[date].sort((a, b) => parseTime(a.start) - parseTime(b.start));

  saveData(data);
  console.log(COLORS.green + `✓ Added: ${start}-${end} ${activity}` + COLORS.reset);
}

function clearDay(date = getTodayKey()) {
  const data = loadData();
  delete data.schedules[date];
  saveData(data);
  console.log(COLORS.yellow + `✓ Cleared schedule for ${date}` + COLORS.reset);
}

function applyTemplate(templateName = 'default') {
  const template = TEMPLATES[templateName];
  if (!template) {
    console.log(COLORS.red + `✗ Unknown template: ${templateName}` + COLORS.reset);
    console.log('Available: ' + Object.keys(TEMPLATES).join(', '));
    return;
  }

  const data = loadData();
  const date = getTodayKey();
  data.schedules[date] = template.map(b => ({ ...b, added: new Date().toISOString() }));
  saveData(data);

  console.log(COLORS.green + `✓ Applied '${templateName}' template` + COLORS.reset);
  showSchedule(date);
}

function showHelp() {
  console.log(`
${COLORS.cyan}⏰ TIMEBLOCK - Daily Time Blocking Planner${COLORS.reset}

Usage:
  nix timeblock                     Show today's schedule
  nix timeblock add <start> <end> "activity" [type]  Add time block
  nix timeblock template [name]     Apply template (default/creative/admin)
  nix timeblock clear               Clear today's schedule
  nix timeblock stats               Show weekly stats

Types: deep, shallow, break, routine

Examples:
  nix timeblock add 9:00 11:00 "Deep work" deep
  nix timeblock add 14:00 14:30 "Lunch" break
  nix timeblock template creative
`);
}

function showStats() {
  const data = loadData();
  const dates = Object.keys(data.schedules).slice(-7);

  console.log('');
  console.log(COLORS.bold + COLORS.cyan + '📊 TIMEBLOCK STATS (Last 7 days)' + COLORS.reset);
  console.log('');

  let totalDeep = 0;
  let totalBlocks = 0;

  dates.forEach(date => {
    const schedule = data.schedules[date];
    const deep = schedule.filter(b => b.type === 'deep').reduce((sum, b) => {
      return sum + (parseTime(b.end) - parseTime(b.start));
    }, 0);
    totalDeep += deep;
    totalBlocks += schedule.length;
    const deepHours = (deep / 60).toFixed(1);
    console.log(`  ${date}: ${COLORS.magenta}${deepHours}h${COLORS.reset} deep work, ${schedule.length} blocks`);
  });

  console.log('');
  console.log(COLORS.dim + `  Total: ${(totalDeep / 60).toFixed(1)}h deep work across ${dates.length} days` + COLORS.reset);
  console.log('');
}

// Main
const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case 'add':
    if (args.length < 4) {
      console.log(COLORS.red + 'Usage: timeblock add <start> <end> "activity" [type]' + COLORS.reset);
      process.exit(1);
    }
    addBlock(args[1], args[2], args[3], args[4] || 'shallow');
    break;

  case 'template':
    applyTemplate(args[1]);
    break;

  case 'clear':
    clearDay(args[1]);
    break;

  case 'stats':
    showStats();
    break;

  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;

  case undefined:
  default:
    if (cmd && cmd.match(/^\d{4}-\d{2}-\d{2}$/)) {
      showSchedule(cmd);
    } else {
      showSchedule();
    }
    break;
}
