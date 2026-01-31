#!/usr/bin/env node
/**
 * mood.js — Daily mood & emotion tracker
 * Quick emotional check-ins with trend visualization
 * 
 * Usage: mood.js [command] [options]
 */

const fs = require('fs');
const path = require('path');

const MOOD_FILE = path.join(__dirname, 'data', 'mood.json');
const MOODS = {
  1: { emoji: '😢', label: 'Rough', color: '\x1b[31m' },
  2: { emoji: '😕', label: 'Low', color: '\x1b[33m' },
  3: { emoji: '😐', label: 'Okay', color: '\x1b[90m' },
  4: { emoji: '🙂', label: 'Good', color: '\x1b[32m' },
  5: { emoji: '🤩', label: 'Great', color: '\x1b[35m' }
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function loadData() {
  if (!fs.existsSync(MOOD_FILE)) {
    return { entries: [] };
  }
  return JSON.parse(fs.readFileSync(MOOD_FILE, 'utf8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(MOOD_FILE), { recursive: true });
  fs.writeFileSync(MOOD_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function log(moodLevel, note = '') {
  const data = loadData();
  const today = getToday();
  
  // Remove any existing entry for today
  data.entries = data.entries.filter(e => e.date !== today);
  
  const entry = {
    date: today,
    mood: parseInt(moodLevel),
    note: note,
    timestamp: new Date().toISOString()
  };
  
  data.entries.push(entry);
  saveData(data);
  
  const mood = MOODS[moodLevel];
  console.log(`\n  ${mood.color}${mood.emoji} Logged: ${mood.label}${RESET}`);
  if (note) console.log(`  📝 ${note}`);
  console.log(`  📅 ${today}\n`);
}

function show() {
  const data = loadData();
  const today = getToday();
  
  if (data.entries.length === 0) {
    console.log('\n  No mood entries yet.');
    console.log('  Usage: mood.js log <1-5> [note]\n');
    return;
  }
  
  console.log(`\n  ${BOLD}📊 Mood History (Last 14 days)${RESET}\n`);
  
  // Show last 14 days
  const entries = data.entries.slice(-14).reverse();
  
  entries.forEach(entry => {
    const mood = MOODS[entry.mood];
    const isToday = entry.date === today;
    const prefix = isToday ? '→' : ' ';
    console.log(`  ${prefix} ${mood.color}${mood.emoji}${RESET} ${entry.date} — ${mood.color}${mood.label}${RESET}`);
    if (entry.note) console.log(`      "${entry.note}"`);
  });
  
  // Stats
  const avg = (data.entries.reduce((a, e) => a + e.mood, 0) / data.entries.length).toFixed(1);
  const recent = data.entries.slice(-7);
  const recentAvg = (recent.reduce((a, e) => a + e.mood, 0) / recent.length).toFixed(1);
  
  console.log(`\n  ${BOLD}📈 Stats:${RESET}`);
  console.log(`     Total entries: ${data.entries.length}`);
  console.log(`     All-time avg: ${avg}/5`);
  console.log(`     7-day avg: ${recentAvg}/5`);
  console.log();
}

function stats() {
  const data = loadData();
  
  if (data.entries.length === 0) {
    console.log('\n  No data to analyze.\n');
    return;
  }
  
  const total = data.entries.length;
  const avg = (data.entries.reduce((a, e) => a + e.mood, 0) / total).toFixed(2);
  
  // Distribution
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  data.entries.forEach(e => dist[e.mood]++);
  
  // Best/worst streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let currentType = null;
  
  const sorted = [...data.entries].sort((a, b) => a.date.localeCompare(b.date));
  sorted.forEach(e => {
    const type = e.mood >= 4 ? 'good' : e.mood <= 2 ? 'bad' : 'neutral';
    if (type === currentType) {
      currentStreak++;
    } else {
      currentStreak = 1;
      currentType = type;
    }
    if (type === 'good' && currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }
  });
  
  // Recent trend
  const recent = data.entries.slice(-7);
  const recentAvg = (recent.reduce((a, e) => a + e.mood, 0) / recent.length).toFixed(2);
  const older = data.entries.slice(-14, -7);
  const olderAvg = older.length ? (older.reduce((a, e) => a + e.mood, 0) / older.length).toFixed(2) : recentAvg;
  const trend = recentAvg > olderAvg ? '📈 Improving' : recentAvg < olderAvg ? '📉 Declining' : '➡️ Stable';
  
  console.log(`\n  ${BOLD}🧠 Mood Analytics${RESET}\n`);
  console.log(`  Total check-ins: ${total}`);
  console.log(`  Overall average: ${avg}/5`);
  console.log(`  Current trend: ${trend}`);
  console.log(`  Best good streak: ${bestStreak} days`);
  
  console.log(`\n  ${BOLD}Distribution:${RESET}`);
  Object.entries(dist).forEach(([level, count]) => {
    if (count > 0) {
      const pct = Math.round((count / total) * 100);
      const bar = '█'.repeat(Math.round(pct / 5));
      const m = MOODS[level];
      console.log(`  ${m.emoji} ${m.label.padEnd(6)} ${bar} ${pct}% (${count})`);
    }
  });
  console.log();
}

function todayStatus() {
  const data = loadData();
  const today = getToday();
  const entry = data.entries.find(e => e.date === today);
  
  if (entry) {
    const mood = MOODS[entry.mood];
    console.log(`\n  ${mood.color}${mood.emoji} Today: ${mood.label}${RESET}`);
    if (entry.note) console.log(`  "${entry.note}"`);
    console.log();
  } else {
    console.log('\n  No mood logged today.');
    console.log('  Run: mood.js log <1-5> [note]\n');
  }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'log':
  case 'l':
    const level = args[1];
    if (!level || !MOODS[level]) {
      console.log('\n  Usage: mood.js log <1-5> [note]');
      console.log('  1 = 😢 Rough  |  2 = 😕 Low  |  3 = 😐 Okay  |  4 = 🙂 Good  |  5 = 🤩 Great\n');
      process.exit(1);
    }
    log(level, args.slice(2).join(' '));
    break;
    
  case 'stats':
  case 's':
    stats();
    break;
    
  case 'today':
  case 't':
    todayStatus();
    break;
    
  case 'help':
  case '-h':
  case '--help':
    console.log(`
  ${BOLD}mood.js${RESET} — Daily mood tracker

  Commands:
    mood.js log <1-5> [note]  Log today's mood (1=rough, 5=great)
    mood.js show              Show last 14 days
    mood.js stats             Show analytics & distribution
    mood.js today             Check today's entry
    mood.js help              Show this help

  Examples:
    mood.js log 4 "Shipped a feature"
    mood.js log 3
    mood.js l 5 "Amazing day!"
`);
    break;
    
  default:
    show();
}
