#!/usr/bin/env node
/**
 * week.js - Weekly retrospective: commits, sprints, stats, progress
 * Usage: week [--commits|--sprints|--json]
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
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

function loadSprints() {
  const data = fs.readFileSync(path.join(__dirname, 'sprints.json'), 'utf8');
  return JSON.parse(data);
}

function loadQuotes() {
  const data = fs.readFileSync(path.join(__dirname, 'quotes.json'), 'utf8');
  return JSON.parse(data);
}

function getWeekCommits() {
  try {
    const output = execSync('git log --oneline --since="7 days ago" --all', { 
      cwd: __dirname,
      encoding: 'utf8'
    });
    return output.trim().split('\n').filter(l => l);
  } catch {
    return [];
  }
}

function getWeekBoundary() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return { start: startOfWeek, end: endOfWeek };
}

function getWeekSprints(sprintsData) {
  const { start, end } = getWeekBoundary();
  return sprintsData.sprints.filter(s => {
    const sprintDate = new Date(s.date);
    return sprintDate >= start && sprintDate <= end;
  });
}

function getDailyCommits() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    try {
      const output = execSync(`git log --oneline --since="${dateStr} 00:00" --until="${dateStr} 23:59" --all`, {
        cwd: __dirname,
        encoding: 'utf8'
      });
      const count = output.trim().split('\n').filter(l => l).length;
      result.push({
        day: days[date.getDay()],
        date: dateStr,
        count,
        isToday: i === 0
      });
    } catch {
      result.push({ day: days[date.getDay()], date: dateStr, count: 0, isToday: i === 0 });
    }
  }
  
  return result;
}

function drawBar(value, max = 10, width = 20) {
  if (max === 0) return '░'.repeat(width);
  const filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function formatWeekRange() {
  const { start, end } = getWeekBoundary();
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
}

function randomReflectionQuote() {
  const quotes = loadQuotes();
  const reflectionQuotes = quotes.filter(q => 
    q.context === 'sprint-mode' || q.context === 'build' || q.context === 'habits'
  );
  return reflectionQuotes[Math.floor(Math.random() * reflectionQuotes.length)] || quotes[0];
}

function main() {
  const args = process.argv.slice(2);
  const showCommits = args.includes('--commits');
  const showSprints = args.includes('--sprints');
  const json = args.includes('--json');
  
  const sprintsData = loadSprints();
  const allCommits = getWeekCommits();
  const weekSprints = getWeekSprints(sprintsData);
  const dailyCommits = getDailyCommits();
  const quote = randomReflectionQuote();
  
  if (json) {
    console.log(JSON.stringify({
      weekRange: formatWeekRange(),
      totalCommits: allCommits.length,
      dailyCommits,
      sprintsCompleted: weekSprints.length,
      sprints: weekSprints.map(s => ({ number: s.number, name: s.name, deliverables: s.deliverables.length })),
      allTimeSprints: sprintsData.stats.completed,
      allTimeDeliverables: sprintsData.stats.deliverables
    }, null, 2));
    return;
  }
  
  if (showCommits) {
    console.log(COLORS.cyan + '📝 Commits this week:' + COLORS.reset);
    allCommits.forEach(line => console.log('   ' + line));
    return;
  }
  
  if (showSprints) {
    console.log(COLORS.magenta + '🎯 Sprints this week:' + COLORS.reset);
    weekSprints.forEach(s => {
      console.log(`\n   Sprint #${s.number}: ${COLORS.bold}${s.name}${COLORS.reset}`);
      s.deliverables.forEach(d => console.log(`      ✓ ${d}`));
    });
    return;
  }
  
  // Full weekly review
  console.log('');
  console.log(COLORS.cyan + '╔══════════════════════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + COLORS.bold + '              📊 WEEK IN REVIEW 📊                    ' + COLORS.reset + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '╚══════════════════════════════════════════════════════════╝' + COLORS.reset);
  console.log('');
  
  console.log(COLORS.dim + '📅 ' + formatWeekRange() + COLORS.reset);
  console.log('');
  
  // Weekly activity chart
  console.log(COLORS.bold + '🔥 Daily Activity' + COLORS.reset);
  const maxCommits = Math.max(...dailyCommits.map(d => d.count), 1);
  dailyCommits.forEach(day => {
    const color = day.isToday ? COLORS.yellow : COLORS.green;
    const bar = drawBar(day.count, maxCommits, 15);
    console.log(`   ${color}${day.day}${COLORS.reset} ${bar} ${day.count > 0 ? day.count : COLORS.dim + '0' + COLORS.reset}`);
  });
  console.log('');
  
  // Stats
  const activeDays = dailyCommits.filter(d => d.count > 0).length;
  const avgCommits = (allCommits.length / 7).toFixed(1);
  
  console.log(COLORS.bold + '📈 This Week' + COLORS.reset);
  console.log(`   ${COLORS.green}${allCommits.length}${COLORS.reset} total commits`);
  console.log(`   ${COLORS.green}${activeDays}${COLORS.reset}/7 active days`);
  console.log(`   ${COLORS.green}${avgCommits}${COLORS.reset} avg commits/day`);
  console.log(`   ${COLORS.magenta}${weekSprints.length}${COLORS.reset} sprints completed`);
  console.log('');
  
  // Sprints summary
  if (weekSprints.length > 0) {
    console.log(COLORS.bold + '🎯 Sprints Completed' + COLORS.reset);
    weekSprints.forEach(s => {
      console.log(`   #${s.number} ${s.name} — ${s.deliverables.length} deliverables`);
    });
    console.log('');
  }
  
  // All-time stats
  console.log(COLORS.bold + '🏆 All-Time Stats' + COLORS.reset);
  console.log(`   ${COLORS.cyan}${sprintsData.stats.completed}${COLORS.reset} total sprints`);
  console.log(`   ${COLORS.cyan}${sprintsData.stats.deliverables}${COLORS.reset} total deliverables`);
  console.log('');
  
  // Reflection
  console.log(COLORS.yellow + '🤔 Reflection' + COLORS.reset);
  console.log(`   "${quote.text}"`);
  console.log(COLORS.dim + `   — ${quote.author || 'Unknown'}` + COLORS.reset);
  console.log('');
  
  // Next week prompt
  console.log(COLORS.cyan + '⚡ What will you ship next week?' + COLORS.reset);
  console.log('');
}

main();
