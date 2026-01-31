#!/usr/bin/env node
/**
 * gratitude.js — Daily gratitude practice
 * Log 3 things you're grateful for each day
 * 
 * Usage: nix gratitude [command] [entry]
 */

const fs = require('fs');
const path = require('path');

const GRATITUDE_FILE = path.join(__dirname, 'data', 'gratitude.json');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

function loadData() {
  if (!fs.existsSync(GRATITUDE_FILE)) {
    return { entries: [], streak: 0, lastDate: null };
  }
  return JSON.parse(fs.readFileSync(GRATITUDE_FILE, 'utf8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(GRATITUDE_FILE), { recursive: true });
  fs.writeFileSync(GRATITUDE_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function updateStreak(data) {
  const today = getToday();
  const yesterday = getYesterday();
  
  if (data.lastDate === today) {
    // Already logged today, streak unchanged
  } else if (data.lastDate === yesterday) {
    // Continued streak
    data.streak++;
    data.lastDate = today;
  } else {
    // Streak broken or first entry
    data.streak = 1;
    data.lastDate = today;
  }
}

function add(text) {
  if (!text || text.trim().length === 0) {
    console.log('\n  Usage: nix gratitude add "something you\'re grateful for"');
    console.log();
    return;
  }
  
  const data = loadData();
  const today = getToday();
  
  const entry = {
    date: today,
    text: text.trim(),
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    timestamp: new Date().toISOString()
  };
  
  data.entries.push(entry);
  updateStreak(data);
  saveData(data);
  
  const todaysCount = data.entries.filter(e => e.date === today).length;
  const emoji = ['🌱', '🌿', '🌳'][Math.min(todaysCount - 1, 2)];
  
  console.log();
  console.log(`  ${GREEN}${emoji} Gratitude logged${RESET}`);
  console.log(`  "${text}"`);
  console.log(`  ${DIM}Entry #${todaysCount} today | Streak: ${data.streak} days${RESET}`);
  console.log();
  
  if (todaysCount === 3) {
    console.log(`  ${YELLOW}✨ Daily goal complete! 3 things noted.${RESET}`);
    console.log();
  } else if (todaysCount < 3) {
    console.log(`  ${DIM}${3 - todaysCount} more to reach today's goal${RESET}`);
    console.log();
  }
}

function today() {
  const data = loadData();
  const todayStr = getToday();
  const entries = data.entries.filter(e => e.date === todayStr);
  
  console.log();
  console.log(`  ${BOLD}🙏 Gratitude — ${todayStr}${RESET}`);
  console.log(`  ${DIM}Streak: ${data.streak || 0} days${RESET}`);
  console.log();
  
  if (entries.length === 0) {
    console.log(`  ${DIM}Nothing logged yet today.${RESET}`);
    console.log();
    console.log('  Start with:');
    console.log('  nix gratitude add "the warm sun on my face"');
    console.log('  nix gratitude add "a good cup of coffee"');
    console.log('  nix gratitude add "a message from a friend"');
  } else {
    entries.forEach((e, i) => {
      console.log(`  ${CYAN}${i + 1}.${RESET} ${e.text}`);
    });
    
    if (entries.length >= 3) {
      console.log();
      console.log(`  ${GREEN}✅ Daily practice complete${RESET}`);
    }
  }
  
  console.log();
}

function list(n = 10) {
  const data = loadData();
  const entries = data.entries.slice(-n).reverse();
  
  if (entries.length === 0) {
    console.log('\n  No entries yet. Start with: nix gratitude add "..."\n');
    return;
  }
  
  console.log(`\n  ${BOLD}🙏 Recent Gratitude Entries${RESET}\n`);
  
  let currentDate = '';
  entries.forEach((e, i) => {
    if (e.date !== currentDate) {
      currentDate = e.date;
      console.log(`  ${DIM}${currentDate}${RESET}`);
    }
    console.log(`    ${CYAN}•${RESET} ${e.text}`);
  });
  
  console.log(`\n  ${DIM}Total entries: ${data.entries.length}${RESET}\n`);
}

function random() {
  const data = loadData();
  
  if (data.entries.length === 0) {
    console.log('\n  No entries yet. Add some first!\n');
    return;
  }
  
  const entry = data.entries[Math.floor(Math.random() * data.entries.length)];
  
  console.log();
  console.log(`  ${MAGENTA}✨ Remember this?${RESET}`);
  console.log(`  "${entry.text}"`);
  console.log(`  ${DIM}— ${entry.date}${RESET}`);
  console.log();
}

function stats() {
  const data = loadData();
  
  if (data.entries.length === 0) {
    console.log('\n  No data yet. Start logging!\n');
    return;
  }
  
  // Count unique days
  const days = new Set(data.entries.map(e => e.date)).size;
  const total = data.entries.length;
  const avgPerDay = (total / days).toFixed(1);
  
  // This week
  const weekDates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekDates.push(d.toISOString().split('T')[0]);
  }
  const thisWeek = data.entries.filter(e => weekDates.includes(e.date)).length;
  
  console.log(`\n  ${BOLD}🙏 Gratitude Stats${RESET}\n`);
  console.log(`  Total entries: ${total}`);
  console.log(`  Active days: ${days}`);
  console.log(`  Avg per day: ${avgPerDay}`);
  console.log(`  Current streak: ${data.streak || 0} days`);
  console.log(`  This week: ${thisWeek} entries`);
  console.log();
  
  // Week visualization
  console.log(`  ${DIM}Last 7 days:${RESET}`);
  weekDates.forEach(date => {
    const count = data.entries.filter(e => e.date === date).length;
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    const bars = '█'.repeat(count) + DIM + '░'.repeat(3 - count) + RESET;
    const indicator = count >= 3 ? GREEN + '✓' + RESET : count > 0 ? YELLOW + '◐' + RESET : DIM + '○' + RESET;
    console.log(`    ${dayName} ${bars} ${indicator}`);
  });
  console.log();
}

function prompt() {
  const prompts = [
    "What made you smile today?",
    "Who are you grateful for right now?",
    "What small thing brought you joy?",
    "What privilege do you have that you often overlook?",
    "What challenged you and helped you grow?",
    "What beauty did you notice today?",
    "What comfort are you enjoying?",
    "What opportunity lies ahead?",
    "What memory makes you happy?",
    "What are you looking forward to?"
  ];
  
  const p = prompts[Math.floor(Math.random() * prompts.length)];
  console.log();
  console.log(`  ${YELLOW}💭 ${p}${RESET}`);
  console.log(`  ${DIM}nix gratitude add "..."${RESET}`);
  console.log();
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'add':
  case 'a':
    add(args.slice(1).join(' '));
    break;
    
  case 'list':
  case 'l':
    list(parseInt(args[1]) || 10);
    break;
    
  case 'random':
  case 'r':
    random();
    break;
    
  case 'stats':
  case 's':
    stats();
    break;
    
  case 'prompt':
  case 'p':
    prompt();
    break;
    
  case 'help':
  case '-h':
  case '--help':
    console.log(`
  ${BOLD}gratitude.js${RESET} — Daily gratitude practice

  Commands:
    nix gratitude add "text"    Add a gratitude entry
    nix gratitude today         Show today's entries
    nix gratitude list [n]      Show recent entries (default 10)
    nix gratitude random        Show a random past entry
    nix gratitude stats         View your practice stats
    nix gratitude prompt        Get a writing prompt
    nix gratitude help          Show this help

  Examples:
    nix gratitude add "my supportive friends"
    nix gratitude add "the quiet morning"
    nix gratitude add "solving a hard problem"

  Tip: Aim for 3 entries per day!
`);
    break;
    
  default:
    today();
}
