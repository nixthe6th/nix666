#!/usr/bin/env node
/**
 * reflect.js - Structured daily reflection and journaling
 * Usage: nix reflect [command] [args]
 * 
 * Helps you close out the day with intention and track your growth over time.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'reflect.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

// Reflection prompts for different modes
const PROMPTS = {
  daily: [
    "What was today's biggest win?",
    "What challenged you today?",
    "What did you learn?",
    "What are you grateful for?",
    "What will you do differently tomorrow?"
  ],
  quick: [
    "One win today:",
    "One thing to improve:"
  ],
  weekly: [
    "What were your top 3 wins this week?",
    "What patterns did you notice?",
    "How did you grow?",
    "What will you focus on next week?"
  ],
  project: [
    "What did you ship?",
    "What blocked you?",
    "What would you change?"
  ]
};

// Data helpers
function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return { entries: [], streak: { current: 0, lastDate: null, longest: 0 } };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

// Date helpers
function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Streak management
function updateStreak(data) {
  const today = getToday();
  const yesterday = getYesterday();
  
  if (data.streak.lastDate === today) {
    return; // Already reflected today
  }
  
  if (data.streak.lastDate === yesterday) {
    data.streak.current++;
  } else {
    data.streak.current = 1;
  }
  
  data.streak.lastDate = today;
  
  if (data.streak.current > data.streak.longest) {
    data.streak.longest = data.streak.current;
  }
}

// Entry creation
function createEntry(mode, responses) {
  return {
    id: Date.now().toString(36).slice(-6),
    date: getToday(),
    mode: mode,
    responses: responses,
    created: new Date().toISOString()
  };
}

// Display helpers
function showStreak(streak) {
  const fire = streak.current >= 7 ? '🔥🔥🔥' : streak.current >= 3 ? '🔥🔥' : streak.current > 0 ? '🔥' : '💤';
  console.log(`\n  ${fire} ${COLORS.yellow}${streak.current} day${streak.current !== 1 ? 's' : ''}${COLORS.reset} ${COLORS.dim}(longest: ${streak.longest})${COLORS.reset}`);
}

function showEntry(entry) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}${formatDate(entry.date)}${COLORS.reset} ${COLORS.dim}[${entry.mode}]${COLORS.reset}`);
  
  const prompts = PROMPTS[entry.mode] || PROMPTS.daily;
  entry.responses.forEach((resp, i) => {
    if (resp && resp.trim()) {
      const prompt = prompts[i] || `Q${i + 1}`;
      console.log(`  ${COLORS.green}→${COLORS.reset} ${COLORS.bold}${prompt}${COLORS.reset}`);
      console.log(`     ${resp}`);
    }
  });
}

// Commands
function cmdDaily(args) {
  const data = loadData();
  const prompts = PROMPTS.daily;
  const responses = [];
  
  console.log(`\n${COLORS.bold}🌙 Daily Reflection${COLORS.reset}\n`);
  
  // Check if already reflected today
  const todayEntry = data.entries.find(e => e.date === getToday());
  if (todayEntry && !args.includes('--force') && !args.includes('-f')) {
    console.log(`${COLORS.yellow}⚡ You've already reflected today.${COLORS.reset}`);
    console.log(`${COLORS.dim}Use --force to add another entry.${COLORS.reset}`);
    showEntry(todayEntry);
    return;
  }
  
  // Interactive prompts
  prompts.forEach((prompt, i) => {
    console.log(`${COLORS.cyan}${i + 1}.${COLORS.reset} ${prompt}`);
    // In real usage, would use readline. For now, check args or use defaults
    const argIndex = args.findIndex(a => a.startsWith(`--q${i + 1}=`));
    if (argIndex !== -1) {
      responses.push(args[argIndex].split('=')[1]);
    } else {
      responses.push(''); // Empty response
    }
  });
  
  // For non-interactive mode, create from args
  const entry = createEntry('daily', responses.length > 0 ? responses : ['(reflect from terminal)']);
  data.entries.push(entry);
  updateStreak(data);
  saveData(data);
  
  console.log(`\n${COLORS.green}✓${COLORS.reset} Reflection saved. ${COLORS.dim}(${entry.id})${COLORS.reset}`);
  showStreak(data.streak);
}

function cmdQuick(args) {
  const data = loadData();
  const win = args.slice(1).join(' ') || '(quick reflection)';
  
  const entry = createEntry('quick', [win, '']);
  data.entries.push(entry);
  updateStreak(data);
  saveData(data);
  
  console.log(`\n${COLORS.green}✓${COLORS.reset} Quick reflection saved.`);
  showStreak(data.streak);
}

function cmdList(args) {
  const data = loadData();
  const limit = args.includes('--week') ? 7 : args.includes('--month') ? 30 : 10;
  
  if (data.entries.length === 0) {
    console.log(`\n${COLORS.dim}No reflections yet. Start with: nix reflect${COLORS.reset}`);
    return;
  }
  
  console.log(`\n${COLORS.bold}📓 Reflection History${COLORS.reset}`);
  showStreak(data.streak);
  
  const sorted = [...data.entries].reverse().slice(0, limit);
  sorted.forEach(entry => {
    const date = formatDate(entry.date);
    const preview = entry.responses[0]?.substring(0, 40) || '(empty)';
    const truncated = preview.length > 40 ? preview + '...' : preview;
    console.log(`\n  ${COLORS.cyan}${date}${COLORS.reset} ${COLORS.dim}[${entry.mode}]${COLORS.reset}`);
    console.log(`     ${truncated}`);
  });
  
  if (data.entries.length > limit) {
    console.log(`\n  ${COLORS.dim}... and ${data.entries.length - limit} more (use --all to see everything)${COLORS.reset}`);
  }
}

function cmdShow(args) {
  const data = loadData();
  const idOrDate = args[1];
  
  let entry;
  if (idOrDate) {
    entry = data.entries.find(e => e.id === idOrDate || e.date === idOrDate);
  } else {
    // Show most recent
    entry = [...data.entries].pop();
  }
  
  if (!entry) {
    console.log(`${COLORS.red}✗${COLORS.reset} Reflection not found.`);
    return;
  }
  
  showEntry(entry);
}

function cmdStats() {
  const data = loadData();
  
  console.log(`\n${COLORS.bold}📊 Reflection Stats${COLORS.reset}\n`);
  
  const total = data.entries.length;
  const thisWeek = data.entries.filter(e => {
    const days = daysBetween(e.date, getToday());
    return days < 7;
  }).length;
  
  const thisMonth = data.entries.filter(e => {
    const days = daysBetween(e.date, getToday());
    return days < 30;
  }).length;
  
  const modeCounts = {};
  data.entries.forEach(e => {
    modeCounts[e.mode] = (modeCounts[e.mode] || 0) + 1;
  });
  
  console.log(`  ${COLORS.cyan}Total entries:${COLORS.reset}     ${total}`);
  console.log(`  ${COLORS.cyan}This week:${COLORS.reset}       ${thisWeek}`);
  console.log(`  ${COLORS.cyan}This month:${COLORS.reset}      ${thisMonth}`);
  console.log(`  ${COLORS.cyan}Current streak:${COLORS.reset}  ${data.streak.current} days`);
  console.log(`  ${COLORS.cyan}Longest streak:${COLORS.reset}  ${data.streak.longest} days`);
  
  if (Object.keys(modeCounts).length > 0) {
    console.log(`\n  ${COLORS.bold}By mode:${COLORS.reset}`);
    Object.entries(modeCounts).forEach(([mode, count]) => {
      console.log(`    ${mode}: ${count}`);
    });
  }
  
  // Check if reflected today
  const todayEntry = data.entries.find(e => e.date === getToday());
  if (todayEntry) {
    console.log(`\n  ${COLORS.green}✓${COLORS.reset} Reflected today`);
  } else {
    console.log(`\n  ${COLORS.yellow}○${COLORS.reset} Not reflected today — nix reflect`);
  }
}

function cmdPrompt() {
  const categories = ['growth', 'gratitude', 'challenge', 'learning'];
  const prompts = {
    growth: [
      "What's one thing you did today that you're proud of?",
      "How did you step outside your comfort zone?",
      "What would your future self thank you for?"
    ],
    gratitude: [
      "What made you smile today?",
      "Who are you grateful for right now?",
      "What's something small that brought you joy?"
    ],
    challenge: [
      "What felt hard today and why?",
      "When did you feel resistance?",
      "What would you do differently with hindsight?"
    ],
    learning: [
      "What surprised you today?",
      "What did you discover about yourself?",
      "What knowledge do you want to deepen?"
    ]
  };
  
  const category = categories[Math.floor(Math.random() * categories.length)];
  const prompt = prompts[category][Math.floor(Math.random() * prompts[category].length)];
  
  console.log(`\n${COLORS.bold}💭 ${category.charAt(0).toUpperCase() + category.slice(1)} Prompt${COLORS.reset}\n`);
  console.log(`  ${COLORS.cyan}${prompt}${COLORS.reset}\n`);
  console.log(`  ${COLORS.dim}Use: nix reflect quick "your answer"${COLORS.reset}`);
}

function cmdExport(args) {
  const data = loadData();
  const format = args[1] || 'json';
  
  if (format === 'markdown' || format === 'md') {
    let md = '# Reflection Journal\n\n';
    data.entries.forEach(entry => {
      md += `## ${formatDate(entry.date)}\n\n`;
      const prompts = PROMPTS[entry.mode] || PROMPTS.daily;
      entry.responses.forEach((resp, i) => {
        if (resp && resp.trim()) {
          md += `**${prompts[i]}**\n\n${resp}\n\n`;
        }
      });
      md += '---\n\n';
    });
    console.log(md);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Help
function showHelp() {
  console.log(`
${COLORS.bold}reflect.js${COLORS.reset} - Structured daily reflection and journaling

${COLORS.bold}Usage:${COLORS.reset}
  nix reflect [command] [args]

${COLORS.bold}Commands:${COLORS.reset}
  ${COLORS.cyan}daily${COLORS.reset}          Full daily reflection (5 prompts)
  ${COLORS.cyan}quick${COLORS.reset} "text"   One-line reflection
  ${COLORS.cyan}list${COLORS.reset}           Show recent entries (--week, --month, --all)
  ${COLORS.cyan}show${COLORS.reset} [id]     View specific entry (default: most recent)
  ${COLORS.cyan}stats${COLORS.reset}          Reflection statistics and streaks
  ${COLORS.cyan}prompt${COLORS.reset}         Get a random reflection prompt
  ${COLORS.cyan}export${COLORS.reset} [fmt]  Export as json or markdown

${COLORS.bold}Examples:${COLORS.reset}
  nix reflect                    # Start daily reflection
  nix reflect quick "Shipped the feature!"
  nix reflect list --week
  nix reflect stats
  nix reflect export markdown > journal.md

${COLORS.bold}Tips:${COLORS.reset}
  • Run daily for best results — builds reflection streak
  • Quick reflections are great for busy days
  • Export to markdown for long-term archiving
  • Stats show patterns in your thinking over time
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
  
  switch (cmd) {
    case 'daily':
    case 'full':
      cmdDaily(args);
      break;
    case 'quick':
    case 'q':
      cmdQuick(args);
      break;
    case 'list':
    case 'ls':
      cmdList(args);
      break;
    case 'show':
    case 'view':
      cmdShow(args);
      break;
    case 'stats':
    case 'streak':
      cmdStats();
      break;
    case 'prompt':
      cmdPrompt();
      break;
    case 'export':
      cmdExport(args);
      break;
    default:
      // If no command matches, treat as quick reflection
      if (cmd && !cmd.startsWith('-')) {
        args.unshift('quick');
        cmdQuick(args);
      } else {
        console.log(`${COLORS.red}✗${COLORS.reset} Unknown command: ${cmd}`);
        showHelp();
      }
  }
}

main();
