#!/usr/bin/env node
/**
 * standup.js - Daily standup report aggregator
 * Shows yesterday's wins, today's priorities, and blockers
 * 
 * Usage: node standup.js [today|yesterday|week]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const C = COLORS;

function loadJson(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

function getToday() {
  return formatDate(new Date());
}

function getDateRange(days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function printHeader(title) {
  console.log(`\n${C.bright}${C.cyan}┌─ ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}${C.reset}`);
}

function printLine(content, color = C.reset) {
  console.log(`${C.cyan}│${C.reset} ${color}${content}${C.reset}`);
}

function printFooter() {
  console.log(`${C.cyan}└${'─'.repeat(52)}${C.reset}\n`);
}

function showYesterdayWins() {
  printHeader("YESTERDAY'S WINS");
  
  const yesterday = getYesterday();
  let hasContent = false;
  
  // Check sprints
  const sprints = loadJson('sprints.json');
  if (sprints?.sprints) {
    const yestSprints = sprints.sprints.filter(s => s.completed && s.completed.startsWith(yesterday));
    if (yestSprints.length > 0) {
      yestSprints.forEach(s => {
        printLine(`✓ Sprint: ${s.name}`, C.green);
        s.deliverables?.forEach(d => printLine(`  • ${d}`, C.dim));
      });
      hasContent = true;
    }
  }
  
  // Check sessions
  const sessions = loadJson('sessions.json');
  if (sessions?.sessions) {
    const yestSessions = sessions.sessions.filter(s => s.endTime && s.endTime.startsWith(yesterday));
    const totalMins = yestSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    if (totalMins > 0) {
      printLine(`⏱  Deep work: ${formatDuration(totalMins)}`, C.green);
      const byProject = {};
      yestSessions.forEach(s => {
        byProject[s.project] = (byProject[s.project] || 0) + (s.duration || 0);
      });
      Object.entries(byProject).forEach(([proj, mins]) => {
        printLine(`  • ${proj}: ${formatDuration(mins)}`, C.dim);
      });
      hasContent = true;
    }
  }
  
  // Check completed todos
  const todos = loadJson('todos.json');
  if (todos?.completed) {
    const yestDone = todos.completed.filter(t => t.completedAt?.startsWith(yesterday));
    if (yestDone.length > 0) {
      yestDone.slice(0, 5).forEach(t => {
        printLine(`☑  ${t.text.substring(0, 40)}${t.text.length > 40 ? '...' : ''}`, C.green);
      });
      hasContent = true;
    }
  }
  
  if (!hasContent) {
    printLine("No completed work found for yesterday", C.dim);
  }
  printFooter();
}

function showTodayPriorities() {
  printHeader("TODAY'S PRIORITIES");
  
  // Active session
  const sessions = loadJson('sessions.json');
  if (sessions?.active) {
    const start = new Date(sessions.active.startTime);
    const now = new Date();
    const mins = Math.floor((now - start) / 60000);
    printLine(`▶  Active: ${sessions.active.project} (${formatDuration(mins)})`, C.yellow);
  }
  
  // Open todos by priority
  const todos = loadJson('todos.json');
  if (todos?.todos?.length > 0) {
    const high = todos.todos.filter(t => t.priority === 'high');
    const med = todos.todos.filter(t => t.priority === 'medium');
    
    if (high.length > 0) {
      printLine(`\n🔴 HIGH (${high.length}):`, C.red);
      high.slice(0, 3).forEach(t => {
        printLine(`  • ${t.text.substring(0, 38)}${t.text.length > 38 ? '...' : ''}`, C.bright);
      });
    }
    if (med.length > 0) {
      printLine(`\n🟡 MEDIUM (${med.length}):`, C.yellow);
      med.slice(0, 2).forEach(t => {
        printLine(`  • ${t.text.substring(0, 38)}${t.text.length > 38 ? '...' : ''}`);
      });
    }
  } else {
    printLine("No active todos — capture some with: nix todo", C.dim);
  }
  
  // Current sprint
  const sprints = loadJson('sprints.json');
  if (sprints?.active) {
    printLine(`\n⚡ Active Sprint: ${sprints.active.name}`, C.cyan);
  }
  
  printFooter();
}

function showHabitsStatus() {
  printHeader("HABIT STREAKS");
  
  const habits = loadJson('habits.json');
  if (habits?.habits) {
    const today = getToday();
    habits.habits.forEach(h => {
      const doneToday = h.history?.some(entry => entry.date === today && entry.done);
      const streak = h.streak || 0;
      const icon = doneToday ? '✓' : '○';
      const color = doneToday ? C.green : C.dim;
      printLine(`${icon} ${h.name}: ${streak} day streak`, color);
    });
  } else {
    printLine("No habits tracked yet", C.dim);
  }
  printFooter();
}

function showMoodCheck() {
  printHeader("MOOD CHECK");
  
  const mood = loadJson('mood.json');
  if (mood?.entries?.length > 0) {
    const today = getToday();
    const todayEntry = mood.entries.find(e => e.date === today);
    
    if (todayEntry) {
      const moods = ['😢', '😕', '😐', '🙂', '🤩'];
      printLine(`Today: ${moods[todayEntry.rating - 1] || '😐'} ${todayEntry.note || ''}`, C.green);
    } else {
      printLine("Not logged yet today — nix mood log <1-5>", C.yellow);
    }
    
    // Show last 7 days
    const recent = mood.entries.slice(-7);
    const avg = recent.reduce((s, e) => s + e.rating, 0) / recent.length;
    const trend = avg >= 3.5 ? '📈' : avg <= 2.5 ? '📉' : '➡️';
    printLine(`\n7-day avg: ${avg.toFixed(1)}/5 ${trend}`, C.dim);
  } else {
    printLine("No mood data yet", C.dim);
  }
  printFooter();
}

function showWeekSummary() {
  printHeader("WEEK AT A GLANCE");
  
  const dates = getDateRange(7);
  
  // Aggregate sprints
  const sprints = loadJson('sprints.json');
  const weekSprints = sprints?.sprints?.filter(s => s.completed && dates.includes(s.completed.split('T')[0])) || [];
  
  // Aggregate sessions
  const sessions = loadJson('sessions.json');
  const weekSessions = sessions?.sessions?.filter(s => s.endTime && dates.includes(s.endTime.split('T')[0])) || [];
  const weekMins = weekSessions.reduce((s, sess) => s + (sess.duration || 0), 0);
  
  // Aggregate todos
  const todos = loadJson('todos.json');
  const weekDone = todos?.completed?.filter(t => t.completedAt && dates.includes(t.completedAt.split('T')[0]))?.length || 0;
  
  printLine(`✓ Sprints completed: ${weekSprints.length}`, C.green);
  printLine(`⏱  Total deep work: ${formatDuration(weekMins)}`, C.cyan);
  printLine(`☑  Tasks finished: ${weekDone}`, C.blue);
  
  if (weekSprints.length > 0) {
    printLine(`\nRecent sprints:`, C.bright);
    weekSprints.slice(-3).forEach(s => {
      printLine(`  • ${s.name}`, C.dim);
    });
  }
  
  printFooter();
}

function showHelp() {
  console.log(`
${C.bright}${C.cyan}nix standup${C.reset} - Daily standup report

Usage:
  nix standup              Show today's standup (default)
  nix standup yesterday    Show yesterday's wins
  nix standup week         Show week summary

Aggregates data from todos, sprints, sessions, habits, and mood.
Perfect for morning standups or end-of-day reflection.
`);
}

// Main
function main() {
  const cmd = process.argv[2] || 'today';
  
  console.log(`\n${C.bright}${C.magenta}⚡ NIX DAILY STANDUP ⚡${C.reset}`);
  console.log(`${C.dim}${new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}${C.reset}`);
  
  switch (cmd) {
    case 'yesterday':
      showYesterdayWins();
      break;
    case 'week':
      showWeekSummary();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      showYesterdayWins();
      showTodayPriorities();
      showHabitsStatus();
      showMoodCheck();
  }
}

main();
