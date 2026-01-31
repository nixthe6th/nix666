#!/usr/bin/env node
/**
 * log.js — Quick daily logger
 * Timestamped entries for thoughts, notes, standups
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'data', 'daily-log.json');

function loadLogs() {
  if (!fs.existsSync(LOG_FILE)) return [];
  return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
}

function saveLogs(logs) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function addEntry(text) {
  const logs = loadLogs();
  const today = getToday();
  const now = new Date().toISOString();
  
  let dayLog = logs.find(l => l.date === today);
  if (!dayLog) {
    dayLog = { date: today, entries: [] };
    logs.unshift(dayLog);
  }
  
  dayLog.entries.unshift({
    time: now,
    text: text
  });
  
  saveLogs(logs);
  console.log(`✓ Logged to ${today}`);
}

function showRecent(days = 3) {
  const logs = loadLogs();
  if (logs.length === 0) {
    console.log('No logs yet.');
    return;
  }
  
  logs.slice(0, days).forEach(day => {
    console.log(`\n📅 ${day.date}`);
    day.entries.slice(0, 5).forEach(e => {
      const time = new Date(e.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      console.log(`  ${time} — ${e.text}`);
    });
  });
}

function searchLogs(query) {
  const logs = loadLogs();
  const results = [];
  
  logs.forEach(day => {
    day.entries.forEach(e => {
      if (e.text.toLowerCase().includes(query.toLowerCase())) {
        results.push({ date: day.date, ...e });
      }
    });
  });
  
  if (results.length === 0) {
    console.log(`No matches for "${query}"`);
    return;
  }
  
  console.log(`\n${results.length} matches:`);
  results.slice(0, 10).forEach(r => {
    console.log(`  ${r.date}: ${r.text}`);
  });
}

// CLI
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'add':
  case 'a':
    if (!args.length) {
      console.log('Usage: nix log add <text>');
      process.exit(1);
    }
    addEntry(args.join(' '));
    break;
    
  case 'show':
  case 's':
    showRecent(parseInt(args[0]) || 3);
    break;
    
  case 'search':
    if (!args.length) {
      console.log('Usage: nix log search <query>');
      process.exit(1);
    }
    searchLogs(args.join(' '));
    break;
    
  default:
    console.log(`
⚡ Daily Logger — Quick timestamped notes

Usage:
  nix log add <text>     Add entry
  nix log show [days]    Show recent (default 3 days)
  nix log search <text>  Search logs

Examples:
  nix log add "Shipped the new feature"
  nix log show 7
  nix log search "meeting"
`);
}
