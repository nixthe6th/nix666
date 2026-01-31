#!/usr/bin/env node
/**
 * session.js - Work session tracker
 * Log focused work sessions with project tags and duration
 * 
 * Usage: session.js <command> [args]
 *   start <project> [tag]  - Start a new session
 *   stop [note]            - Stop current session
 *   status                 - Show active session
 *   log [n]                - Show last n sessions (default: 10)
 *   stats [period]         - Stats: today, week, month, all
 *   projects               - List projects with hours
 *   export [path]          - Export to CSV
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const ACTIVE_FILE = path.join(DATA_DIR, '.session-active.json');

// Colors for terminal output
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function loadSessions() {
  if (!fs.existsSync(SESSIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function loadActive() {
  if (!fs.existsSync(ACTIVE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveActive(session) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ACTIVE_FILE, JSON.stringify(session, null, 2));
}

function clearActive() {
  if (fs.existsSync(ACTIVE_FILE)) fs.unlinkSync(ACTIVE_FILE);
}

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function startSession(project, tag = 'general') {
  const active = loadActive();
  if (active) {
    console.log(`${C.yellow}⚠ Session already active:${C.reset} ${active.project} (${formatDuration(Date.now() - active.started)} elapsed)`);
    return;
  }

  const session = {
    id: Date.now().toString(36),
    project: project.toLowerCase(),
    tag: tag.toLowerCase(),
    started: new Date().toISOString()
  };
  
  saveActive(session);
  console.log(`${C.green}▶ Session started${C.reset}`);
  console.log(`  Project: ${C.cyan}${project}${C.reset}`);
  console.log(`  Tag: ${C.dim}${tag}${C.reset}`);
  console.log(`  Time: ${formatTime(session.started)}`);
}

function stopSession(note = '') {
  const active = loadActive();
  if (!active) {
    console.log(`${C.red}✗ No active session${C.reset}`);
    return;
  }

  const ended = new Date();
  const duration = ended - new Date(active.started);
  
  const session = {
    ...active,
    ended: ended.toISOString(),
    duration: duration,
    note: note
  };

  const sessions = loadSessions();
  sessions.push(session);
  saveSessions(sessions);
  clearActive();

  console.log(`${C.green}✓ Session completed${C.reset}`);
  console.log(`  Project: ${C.cyan}${active.project}${C.reset}`);
  console.log(`  Duration: ${C.yellow}${formatDuration(duration)}${C.reset}`);
  if (note) console.log(`  Note: ${note}`);
}

function showStatus() {
  const active = loadActive();
  if (!active) {
    console.log(`${C.dim}No active session${C.reset}`);
    return;
  }

  const duration = Date.now() - new Date(active.started);
  console.log(`${C.green}▶ Active Session${C.reset}`);
  console.log(`  Project: ${C.cyan}${active.project}${C.reset}`);
  console.log(`  Tag: ${C.dim}${active.tag}${C.reset}`);
  console.log(`  Elapsed: ${C.yellow}${formatDuration(duration)}${C.reset}`);
}

function showLog(n = 10) {
  const sessions = loadSessions().slice(-n).reverse();
  if (sessions.length === 0) {
    console.log(`${C.dim}No sessions logged${C.reset}`);
    return;
  }

  console.log(`${C.bright}Recent Sessions${C.reset}\n`);
  console.log(`${C.dim}Date        Time     Duration  Project      Tag${C.reset}`);
  console.log('─'.repeat(65));

  for (const s of sessions) {
    const date = formatDate(s.started);
    const time = formatTime(s.started);
    const dur = formatDuration(s.duration);
    const proj = s.project.substring(0, 12).padEnd(12);
    const tag = s.tag;
    console.log(`${date}  ${time}  ${C.yellow}${dur.padEnd(8)}${C.reset}  ${C.cyan}${proj}${C.reset}  ${C.dim}${tag}${C.reset}`);
  }
}

function showStats(period = 'all') {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    console.log(`${C.dim}No sessions to analyze${C.reset}`);
    return;
  }

  const now = new Date();
  let filtered = sessions;

  if (period === 'today') {
    const today = now.toDateString();
    filtered = sessions.filter(s => new Date(s.started).toDateString() === today);
  } else if (period === 'week') {
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    filtered = sessions.filter(s => new Date(s.started) >= weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    filtered = sessions.filter(s => new Date(s.started) >= monthAgo);
  }

  const totalMs = filtered.reduce((sum, s) => sum + s.duration, 0);
  const totalHours = (totalMs / 3600000).toFixed(1);
  const sessionCount = filtered.length;
  const avgDuration = sessionCount > 0 ? formatDuration(totalMs / sessionCount) : '0m';

  // Project breakdown
  const byProject = {};
  for (const s of filtered) {
    byProject[s.project] = (byProject[s.project] || 0) + s.duration;
  }

  console.log(`${C.bright}Session Stats: ${period}${C.reset}\n`);
  console.log(`  Sessions: ${C.cyan}${sessionCount}${C.reset}`);
  console.log(`  Total Time: ${C.yellow}${totalHours}h${C.reset}`);
  console.log(`  Average: ${C.dim}${avgDuration}${C.reset}`);
  
  if (Object.keys(byProject).length > 0) {
    console.log(`\n${C.dim}By Project:${C.reset}`);
    const sorted = Object.entries(byProject).sort((a, b) => b[1] - a[1]);
    for (const [proj, ms] of sorted.slice(0, 5)) {
      const hours = (ms / 3600000).toFixed(1);
      const bar = '█'.repeat(Math.min(Math.floor(hours), 20));
      console.log(`  ${proj.substring(0, 15).padEnd(15)} ${C.cyan}${hours}h${C.reset} ${bar}`);
    }
  }
}

function showProjects() {
  const sessions = loadSessions();
  const byProject = {};
  
  for (const s of sessions) {
    if (!byProject[s.project]) {
      byProject[s.project] = { time: 0, sessions: 0, last: s.started };
    }
    byProject[s.project].time += s.duration;
    byProject[s.project].sessions++;
    if (new Date(s.started) > new Date(byProject[s.project].last)) {
      byProject[s.project].last = s.started;
    }
  }

  console.log(`${C.bright}Project Hours${C.reset}\n`);
  console.log(`${C.dim}Project          Hours  Sessions  Last Active${C.reset}`);
  console.log('─'.repeat(55));

  const sorted = Object.entries(byProject).sort((a, b) => b[1].time - a[1].time);
  for (const [proj, data] of sorted) {
    const hours = (data.time / 3600000).toFixed(1);
    const last = formatDate(data.last);
    console.log(`${proj.substring(0, 15).padEnd(15)} ${C.yellow}${hours.padStart(5)}h${C.reset}  ${data.sessions.toString().padStart(8)}  ${C.dim}${last}${C.reset}`);
  }
}

function exportCSV(outPath = 'sessions-export.csv') {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    console.log(`${C.red}No sessions to export${C.reset}`);
    return;
  }

  const lines = ['id,project,tag,started,ended,duration_minutes,note'];
  for (const s of sessions) {
    const mins = Math.round(s.duration / 60000);
    const note = (s.note || '').replace(/"/g, '""');
    lines.push(`"${s.id}","${s.project}","${s.tag}","${s.started}","${s.ended || ''}",${mins},"${note}"`);
  }

  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`${C.green}✓ Exported ${sessions.length} sessions to ${outPath}${C.reset}`);
}

// Main command handler
const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'start':
    if (!args[0]) {
      console.log(`${C.red}Usage: session.js start <project> [tag]${C.reset}`);
      process.exit(1);
    }
    startSession(args[0], args[1]);
    break;
  case 'stop':
    stopSession(args.join(' '));
    break;
  case 'status':
    showStatus();
    break;
  case 'log':
    showLog(parseInt(args[0]) || 10);
    break;
  case 'stats':
    showStats(args[0] || 'all');
    break;
  case 'projects':
    showProjects();
    break;
  case 'export':
    exportCSV(args[0]);
    break;
  case 'help':
  case '--help':
  case '-h':
  default:
    console.log(`${C.cyan}session.js - Work Session Tracker${C.reset}\n`);
    console.log('Usage: session.js <command> [args]\n');
    console.log('Commands:');
    console.log(`  ${C.yellow}start${C.reset} <project> [tag]  Start a new session`);
    console.log(`  ${C.yellow}stop${C.reset} [note]            Stop current session`);
    console.log(`  ${C.yellow}status${C.reset}                 Show active session`);
    console.log(`  ${C.yellow}log${C.reset} [n]                Show last n sessions (default: 10)`);
    console.log(`  ${C.yellow}stats${C.reset} [period]         Stats: today, week, month, all`);
    console.log(`  ${C.yellow}projects${C.reset}               List projects with hours`);
    console.log(`  ${C.yellow}export${C.reset} [path]          Export to CSV`);
    console.log('\nExamples:');
    console.log('  session.js start nix666 coding');
    console.log('  session.js stop "Fixed the bug"');
    console.log('  session.js stats week');
    break;
}
