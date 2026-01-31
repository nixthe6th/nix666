#!/usr/bin/env node
/**
 * review.js - Daily/weekly progress review
 * Usage: review [today|week]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
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

function color(name, text) {
  return `${COLORS[name]}${text}${COLORS.reset}`;
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch {
    return null;
  }
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function getWeekDates() {
  const dates = [];
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function reviewToday() {
  console.log(color('bold', '\n📋 DAILY REVIEW\n'));
  
  // Todos
  const todos = loadJson('todos.json') || [];
  const today = todayISO();
  const todayTodos = todos.filter(t => t.created?.startsWith(today) || t.updated?.startsWith(today));
  const done = todayTodos.filter(t => t.done).length;
  const pending = todayTodos.filter(t => !t.done).length;
  
  console.log(color('cyan', 'Tasks'));
  console.log(`  ${color('green', '✓')} Done: ${done}  |  ${color('yellow', '○')} Pending: ${pending}`);
  if (pending > 0) {
    console.log(color('dim', '  Pending:'));
    todos.filter(t => !t.done && t.created?.startsWith(today))
      .forEach(t => console.log(color('dim', `    • ${t.text}`)));
  }
  
  // Habits
  const habits = loadJson('habits.json') || {};
  const checked = Object.values(habits).filter(h => h.log?.includes(today)).length;
  const total = Object.keys(habits).length;
  console.log(`\n${color('magenta', 'Habits')}  ${checked}/${total} checked today`);
  
  // Mood
  const mood = loadJson('mood.json') || {};
  const todayMood = mood[today];
  if (todayMood) {
    const emojis = { great: '😄', good: '🙂', okay: '😐', bad: '😕', awful: '😫' };
    console.log(`\n${color('yellow', 'Mood')}  ${emojis[todayMood] || ''} ${todayMood}`);
  }
  
  console.log();
}

function reviewWeek() {
  console.log(color('bold', '\n📊 WEEKLY REVIEW\n'));
  
  const weekDates = getWeekDates();
  const todos = loadJson('todos.json') || [];
  const habits = loadJson('habits.json') || {};
  const mood = loadJson('mood.json') || {};
  
  // Tasks completed per day
  let totalDone = 0;
  weekDates.forEach(date => {
    const dayDone = todos.filter(t => t.done && t.updated?.startsWith(date)).length;
    totalDone += dayDone;
    const dayLabel = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    const bar = '█'.repeat(dayDone) + color('dim', '░'.repeat(Math.max(0, 5 - dayDone)));
    console.log(`${dayLabel} ${bar} ${dayDone || ''}`);
  });
  console.log(`\nTotal completed: ${color('green', totalDone.toString())}`);
  
  // Habit streaks
  console.log(`\n${color('magenta', 'Habit Streaks')}`);
  Object.entries(habits).forEach(([name, h]) => {
    const streak = h.streak || 0;
    console.log(`  ${streak >= 7 ? '🔥' : '•'} ${name}: ${streak} days`);
  });
  
  // Mood summary
  const weekMoods = weekDates.map(d => mood[d]).filter(Boolean);
  if (weekMoods.length) {
    const avg = weekMoods.reduce((a, m) => {
      const scores = { great: 5, good: 4, okay: 3, bad: 2, awful: 1 };
      return a + (scores[m] || 3);
    }, 0) / weekMoods.length;
    console.log(`\n${color('yellow', 'Avg Mood')} ${avg.toFixed(1)}/5 (${weekMoods.length} days tracked)`);
  }
  
  console.log();
}

// Main
const cmd = process.argv[2] || 'today';
if (cmd === 'week') reviewWeek();
else reviewToday();
