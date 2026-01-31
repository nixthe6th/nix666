#!/usr/bin/env node
/**
 * done.js - Sprint completion tracker
 * Usage: done ["what you accomplished"] or just "done" for stats + motivation
 * 
 * Logs accomplishments with timestamps to daily log file
 * Shows sprint stats and celebrates wins
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

const LOG_DIR = path.join(__dirname, 'logs');

function getTodayFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `${date}.md`);
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getGitStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const commits = execSync(`git log --oneline --since="${today}T00:00:00" --until="${today}T23:59:59" 2>/dev/null | wc -l`, { encoding: 'utf8' }).trim();
    const filesChanged = execSync('git diff --shortstat HEAD~1 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
    return { commits: parseInt(commits) || 0, filesChanged };
  } catch {
    return { commits: 0, filesChanged: '' };
  }
}

function loadQuotes() {
  const file = path.join(__dirname, 'quotes.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function randomCompletionQuote() {
  const quotes = loadQuotes();
  const contexts = ['sprint-mode', 'finish', 'build', 'habits'];
  const filtered = quotes.filter(q => contexts.includes(q.context));
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

function showBanner() {
  console.log('');
  console.log(COLORS.cyan + '╔══════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + COLORS.bold + '  ⚡ SPRINT COMPLETE ⚡  ' + COLORS.reset + COLORS.cyan + '                 ║' + COLORS.reset);
  console.log(COLORS.cyan + '╚══════════════════════════════════════════╝' + COLORS.reset);
  console.log('');
}

function showStats() {
  const stats = getGitStats();
  
  console.log(COLORS.yellow + '📊 Today\'s Sprint Stats:' + COLORS.reset);
  console.log(COLORS.gray + '   ─────────────────────' + COLORS.reset);
  console.log(`   Commits:     ${COLORS.cyan}${stats.commits}${COLORS.reset}`);
  
  if (stats.filesChanged) {
    const match = stats.filesChanged.match(/(\d+) file[^,]*, (\d+) insert[^,]*, (\d+) delet/);
    if (match) {
      console.log(`   Files:       ${COLORS.cyan}${match[1]}${COLORS.reset}`);
      console.log(`   Lines:       ${COLORS.green}+${match[2]}${COLORS.reset} / ${COLORS.magenta}-${match[3]}${COLORS.reset}`);
    }
  }
  console.log('');
}

function showQuote() {
  const q = randomCompletionQuote();
  console.log(COLORS.green + '💬 ' + q.text + COLORS.reset);
  console.log(COLORS.gray + '   — ' + q.author + COLORS.reset);
  console.log('');
}

function logAccomplishment(text) {
  ensureLogDir();
  const logFile = getTodayFile();
  const time = formatTime();
  const entry = `- [${time}] ${text}\n`;
  
  // Create file with header if doesn't exist
  if (!fs.existsSync(logFile)) {
    const date = new Date().toISOString().split('T')[0];
    fs.writeFileSync(logFile, `# Sprint Log — ${date}\n\n## Accomplishments\n\n`);
  }
  
  fs.appendFileSync(logFile, entry);
  console.log(COLORS.green + `✅ Logged: ${text}` + COLORS.reset);
  console.log(COLORS.gray + `   Saved to: logs/${path.basename(logFile)}` + COLORS.reset);
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  const accomplishment = args.join(' ');
  
  showBanner();
  
  if (accomplishment) {
    logAccomplishment(accomplishment);
  }
  
  showStats();
  showQuote();
  
  console.log(COLORS.cyan + '🚀 Volume creates luck. See you tomorrow.' + COLORS.reset);
  console.log('');
}

main();
