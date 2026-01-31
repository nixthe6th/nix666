#!/usr/bin/env node
// habits.js - Daily habit tracker with streaks
// Usage: habits.js [check|uncheck|list|add|remove|stats] [habit-id]

const fs = require('fs');
const path = require('path');

const HABITS_FILE = path.join(__dirname, 'data', 'habits.json');
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function color(name, text) {
  return `${COLORS[name] || ''}${text}${COLORS.reset}`;
}

function loadHabits() {
  if (!fs.existsSync(HABITS_FILE)) {
    return { habits: [], history: {} };
  }
  return JSON.parse(fs.readFileSync(HABITS_FILE, 'utf8'));
}

function saveHabits(data) {
  fs.mkdirSync(path.dirname(HABITS_FILE), { recursive: true });
  fs.writeFileSync(HABITS_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function calcStreak(habit, history) {
  const today = getToday();
  const yesterday = getYesterday();
  const dates = Object.keys(history[habit.id] || {});
  
  if (!dates.includes(today) && !dates.includes(yesterday)) {
    return 0;
  }
  
  let streak = 0;
  let checkDate = dates.includes(today) ? today : yesterday;
  
  while (dates.includes(checkDate)) {
    streak++;
    const d = new Date(checkDate);
    d.setDate(d.getDate() - 1);
    checkDate = d.toISOString().split('T')[0];
  }
  
  return streak;
}

function getWeeklyProgress(habit, history) {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  const habitHistory = history[habit.id] || {};
  return dates.map(date => ({
    date,
    done: !!habitHistory[date],
    day: new Date(date).toLocaleDateString('en-US', { weekday: 'narrow' })
  }));
}

function listHabits() {
  const data = loadHabits();
  const today = getToday();
  
  if (data.habits.length === 0) {
    console.log(color('yellow', '⚡ No habits tracked yet.'));
    console.log(color('dim', '   Add one: habits.js add "Read 30 min"'));
    return;
  }
  
  console.log(color('bright', '\n  DAILY HABITS\n'));
  console.log(color('dim', '  ' + '─'.repeat(50)));
  
  data.habits.forEach(habit => {
    const streak = calcStreak(habit, data.history);
    const isDone = !!(data.history[habit.id]?.[today]);
    const weekly = getWeeklyProgress(habit, data.history);
    
    const status = isDone ? color('green', '✓') : color('gray', '○');
    const streakStr = streak > 0 
      ? color('yellow', `🔥 ${streak}`) 
      : color('dim', '·');
    
    const weekBar = weekly.map(d => 
      d.done ? color('green', '█') : color('gray', '░')
    ).join('');
    
    const idStr = color('dim', `[${habit.id.slice(0,4)}]`);
    
    console.log(`  ${status} ${idStr} ${habit.name.padEnd(20)} ${streakStr.padStart(4)}  ${weekBar}`);
  });
  
  const completed = data.habits.filter(h => data.history[h.id]?.[today]).length;
  const pct = Math.round((completed / data.habits.length) * 100);
  
  console.log(color('dim', '  ' + '─'.repeat(50)));
  console.log(`  ${color('bright', `${completed}/${data.habits.length}`)} habits today (${pct}%)`);
  console.log();
}

function checkHabit(idOrPartial) {
  const data = loadHabits();
  const habit = findHabit(data.habits, idOrPartial);
  
  if (!habit) {
    console.log(color('red', `✗ Habit "${idOrPartial}" not found`));
    return;
  }
  
  const today = getToday();
  data.history[habit.id] = data.history[habit.id] || {};
  data.history[habit.id][today] = true;
  saveHabits(data);
  
  const streak = calcStreak(habit, data.history);
  const streakMsg = streak > 1 ? ` 🔥 ${streak} day streak!` : '';
  console.log(color('green', `✓ Checked: ${habit.name}`) + color('yellow', streakMsg));
}

function uncheckHabit(idOrPartial) {
  const data = loadHabits();
  const habit = findHabit(data.habits, idOrPartial);
  
  if (!habit) {
    console.log(color('red', `✗ Habit "${idOrPartial}" not found`));
    return;
  }
  
  const today = getToday();
  if (data.history[habit.id]) {
    delete data.history[habit.id][today];
  }
  saveHabits(data);
  
  console.log(color('yellow', `○ Unchecked: ${habit.name}`));
}

function findHabit(habits, search) {
  const exact = habits.find(h => h.id === search || h.id.startsWith(search));
  if (exact) return exact;
  
  const nameMatch = habits.find(h => 
    h.name.toLowerCase().includes(search.toLowerCase())
  );
  return nameMatch;
}

function addHabit(name) {
  const data = loadHabits();
  const id = Math.random().toString(36).slice(2, 10);
  
  data.habits.push({
    id,
    name,
    created: new Date().toISOString()
  });
  saveHabits(data);
  
  console.log(color('green', `✓ Added habit:`) + ` ${name} ${color('dim', `[${id.slice(0,4)}]`)}`);
}

function removeHabit(idOrPartial) {
  const data = loadHabits();
  const habit = findHabit(data.habits, idOrPartial);
  
  if (!habit) {
    console.log(color('red', `✗ Habit "${idOrPartial}" not found`));
    return;
  }
  
  data.habits = data.habits.filter(h => h.id !== habit.id);
  delete data.history[habit.id];
  saveHabits(data);
  
  console.log(color('red', `✗ Removed:`) + ` ${habit.name}`);
}

function showStats() {
  const data = loadHabits();
  const today = getToday();
  
  if (data.habits.length === 0) {
    console.log(color('yellow', '⚡ No habits to analyze'));
    return;
  }
  
  console.log(color('bright', '\n  HABIT STATS\n'));
  
  const totalChecks = Object.values(data.history).reduce((sum, h) => 
    sum + Object.values(h).filter(Boolean).length, 0
  );
  
  const todayDone = data.habits.filter(h => data.history[h.id]?.[today]).length;
  const completionRate = data.habits.length > 0 
    ? Math.round((todayDone / data.habits.length) * 100) 
    : 0;
  
  console.log(`  ${color('bright', totalChecks.toString())} total check-ins`);
  console.log(`  ${color('bright', data.habits.length.toString())} habits tracked`);
  console.log(`  ${color('bright', `${completionRate}%`)} completion today`);
  
  const streaks = data.habits.map(h => calcStreak(h, data.history));
  const maxStreak = Math.max(0, ...streaks);
  if (maxStreak > 0) {
    console.log(`  ${color('bright', `${maxStreak}`)} best current streak`);
  }
  console.log();
}

function showHelp() {
  console.log(color('bright', '\n  habits.js - Daily Habit Tracker\n'));
  console.log('  Usage:');
  console.log('    habits.js              List habits with status');
  console.log('    habits.js check <id>   Mark habit complete');
  console.log('    habits.js uncheck <id> Unmark habit');
  console.log('    habits.js add <name>   Add new habit');
  console.log('    habits.js remove <id>  Remove habit');
  console.log('    habits.js stats        Show statistics');
  console.log();
  console.log(color('dim', '  Quick start:'));
  console.log('    habits.js add "Read 30 min"');
  console.log('    habits.js add "Exercise"');
  console.log('    habits.js              # See your habits');
  console.log('    habits.js check read   # Check it off!');
  console.log();
}

// Main
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'check':
  case 'c':
    checkHabit(args.join(' '));
    break;
  case 'uncheck':
  case 'u':
    uncheckHabit(args.join(' '));
    break;
  case 'add':
  case 'a':
    addHabit(args.join(' '));
    break;
  case 'remove':
  case 'rm':
    removeHabit(args.join(' '));
    break;
  case 'stats':
  case 's':
    showStats();
    break;
  case 'help':
  case '-h':
  case '--help':
    showHelp();
    break;
  default:
    listHabits();
}
