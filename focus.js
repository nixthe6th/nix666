#!/usr/bin/env node
/**
 * focus.js - Pomodoro focus timer with motivation
 * Usage: focus [minutes] [--quote]
 *   focus         # 25 min default session
 *   focus 15      # 15 minute session
 *   focus --quote # Show quote only
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
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

function loadQuotes() {
  const data = fs.readFileSync(path.join(__dirname, 'quotes.json'), 'utf8');
  return JSON.parse(data);
}

function randomQuote() {
  const quotes = loadQuotes();
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function drawProgress(percent, width = 30) {
  const filled = Math.floor(width * percent);
  const empty = width - filled;
  return COLORS.green + '█'.repeat(filled) + COLORS.dim + '░'.repeat(empty) + COLORS.reset;
}

function showQuoteOnly() {
  const q = randomQuote();
  console.log('');
  console.log(COLORS.cyan + '⚡ ' + COLORS.reset + COLORS.bold + 'FOCUS QUOTE' + COLORS.reset);
  console.log('');
  console.log('  "' + q.text + '"');
  if (q.author) {
    console.log(COLORS.dim + '  — ' + q.author + COLORS.reset);
  }
  console.log('');
}

function startTimer(minutes) {
  const seconds = minutes * 60;
  const endTime = Date.now() + (seconds * 1000);
  const q = randomQuote();
  
  console.log('');
  console.log(COLORS.cyan + '╔══════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + COLORS.bold + '           ⚡ FOCUS MODE ⚡              ' + COLORS.reset + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '╚══════════════════════════════════════════╝' + COLORS.reset);
  console.log('');
  console.log(COLORS.yellow + '  Duration: ' + COLORS.reset + minutes + ' minutes');
  console.log('');
  console.log(COLORS.dim + '  "' + q.text + '"' + COLORS.reset);
  if (q.author) {
    console.log(COLORS.dim + '   — ' + q.author + COLORS.reset);
  }
  console.log('');
  console.log(COLORS.dim + '  Press Ctrl+C to cancel' + COLORS.reset);
  console.log('');
  
  const interval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    const elapsed = seconds - remaining;
    const percent = elapsed / seconds;
    
    process.stdout.write('\r' + COLORS.bold + formatTime(remaining) + COLORS.reset + ' ' + drawProgress(percent));
    
    if (remaining <= 0) {
      clearInterval(interval);
      console.log('');
      console.log('');
      console.log(COLORS.green + '  ✅ Focus session complete!' + COLORS.reset);
      console.log(COLORS.cyan + '  ⚡ Take a break. Then do it again.' + COLORS.reset);
      console.log('');
      process.exit(0);
    }
  }, 1000);
  
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('');
    console.log('');
    console.log(COLORS.yellow + '  ⏹️  Focus session cancelled' + COLORS.reset);
    console.log('');
    process.exit(0);
  });
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('');
    console.log('focus - Pomodoro timer with motivation');
    console.log('');
    console.log('Usage:');
    console.log('  focus           # 25 min session');
    console.log('  focus 15        # 15 min session');
    console.log('  focus --quote   # Show random quote');
    console.log('');
    return;
  }
  
  if (args.includes('--quote')) {
    showQuoteOnly();
    return;
  }
  
  const minutes = parseInt(args.find(a => /^\d+$/.test(a))) || 25;
  startTimer(minutes);
}

main();
