#!/usr/bin/env node
/**
 * today.js - Daily briefing: date, quote, streak, sprint status
 * Usage: today [--minimal | --json]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

function loadQuotes() {
  const data = fs.readFileSync(path.join(__dirname, 'quotes.json'), 'utf8');
  return JSON.parse(data);
}

function loadSprints() {
  const data = fs.readFileSync(path.join(__dirname, 'sprints.json'), 'utf8');
  return JSON.parse(data);
}

function getStreak() {
  try {
    const output = execSync('git log --oneline --since="midnight" --all', { cwd: __dirname }).toString();
    const todayCommits = output.trim().split('\n').filter(l => l).length;
    
    // Count consecutive days with commits
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOutput = execSync(`git log --oneline --since="${dateStr} 00:00" --until="${dateStr} 23:59" --all`, { 
        cwd: __dirname,
        encoding: 'utf8'
      });
      if (dayOutput.trim()) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return { streak, todayCommits };
  } catch {
    return { streak: 0, todayCommits: 0 };
  }
}

function randomQuote() {
  const quotes = loadQuotes();
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function formatDate() {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

function getSprintStatus() {
  const sprints = loadSprints();
  if (sprints.current) {
    return { active: true, name: sprints.current.name, number: sprints.current.number };
  }
  return { active: false, total: sprints.sprints.length, completed: sprints.stats.completed };
}

function drawBox(title, content, color = 'cyan') {
  const c = COLORS[color];
  const lines = content.split('\n');
  const width = Math.max(title.length + 4, ...lines.map(l => l.length)) + 4;
  
  console.log(c + '╔' + '═'.repeat(width - 2) + '╗' + COLORS.reset);
  console.log(c + '║' + COLORS.reset + COLORS.bold + ' ' + title.padEnd(width - 3) + ' ' + COLORS.reset + c + '║' + COLORS.reset);
  console.log(c + '╠' + '═'.repeat(width - 2) + '╣' + COLORS.reset);
  lines.forEach(line => {
    console.log(c + '║' + COLORS.reset + ' ' + line.padEnd(width - 3) + ' ' + c + '║' + COLORS.reset);
  });
  console.log(c + '╚' + '═'.repeat(width - 2) + '╝' + COLORS.reset);
}

function main() {
  const args = process.argv.slice(2);
  const minimal = args.includes('--minimal');
  const json = args.includes('--json');
  
  const date = formatDate();
  const quote = randomQuote();
  const streak = getStreak();
  const sprint = getSprintStatus();
  
  if (json) {
    console.log(JSON.stringify({ date, quote, streak, sprint }, null, 2));
    return;
  }
  
  if (minimal) {
    console.log(`${date} | 🔥 ${streak.streak}d streak | ${sprint.active ? `Sprint #${sprint.number}` : 'No active sprint'}`);
    console.log(`"${quote.text}" —${quote.author || 'Unknown'}`);
    return;
  }
  
  // Full display
  console.log('');
  console.log(COLORS.cyan + '╔══════════════════════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + COLORS.bold + '              ⚡ DAILY BRIEFING ⚡                     ' + COLORS.reset + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '╚══════════════════════════════════════════════════════════╝' + COLORS.reset);
  console.log('');
  
  console.log(COLORS.bold + '📅 ' + date + COLORS.reset);
  console.log('');
  
  // Quote
  console.log(COLORS.yellow + '💬 Quote of the Day' + COLORS.reset);
  console.log('   "' + quote.text + '"');
  if (quote.author) {
    console.log(COLORS.dim + '   — ' + quote.author + COLORS.reset);
  }
  console.log('');
  
  // Streak
  const streakEmoji = streak.streak >= 7 ? '🔥' : streak.streak >= 3 ? '⚡' : '✨';
  console.log(COLORS.green + `${streakEmoji} Git Streak: ${streak.streak} day${streak.streak !== 1 ? 's' : ''}` + COLORS.reset);
  if (streak.todayCommits === 0) {
    console.log(COLORS.yellow + '   ⚠️  No commits yet today' + COLORS.reset);
  } else {
    console.log(COLORS.green + `   ✅ ${streak.todayCommits} commit${streak.todayCommits !== 1 ? 's' : ''} today` + COLORS.reset);
  }
  console.log('');
  
  // Sprint
  if (sprint.active) {
    console.log(COLORS.magenta + `🎯 Active Sprint #${sprint.number}: ${sprint.name}` + COLORS.reset);
  } else {
    console.log(COLORS.dim + `📊 ${sprint.completed}/${sprint.total} sprints completed` + COLORS.reset);
  }
  console.log('');
  
  // Action prompt
  console.log(COLORS.cyan + '⚡ What will you build today?' + COLORS.reset);
  console.log('');
}

main();
