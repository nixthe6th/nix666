#!/usr/bin/env node
/**
 * note.js - Quick capture for thoughts, ideas, and tasks
 * Usage: note [text] [--list|--today|--grep pattern]
 * Without args: opens quick interactive prompt
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NOTES_DIR = path.join(__dirname, 'notes');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

function ensureDir() {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

function getTodayFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(NOTES_DIR, `${date}.md`);
}

function getTimestamp() {
  const now = new Date();
  return now.toTimeString().slice(0, 5); // HH:MM
}

function formatDateHeader() {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `# ${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

function addNote(text) {
  ensureDir();
  const file = getTodayFile();
  const timestamp = getTimestamp();
  const entry = `- **${timestamp}** ${text}\n`;

  let content = '';
  if (fs.existsSync(file)) {
    content = fs.readFileSync(file, 'utf8');
  } else {
    content = formatDateHeader() + '\n\n';
  }

  content += entry;
  fs.writeFileSync(file, content);

  console.log(COLORS.green + '✓ Note saved' + COLORS.reset);
  console.log(COLORS.dim + `  → ${file}` + COLORS.reset);
}

function listRecent(days = 7) {
  ensureDir();
  const files = fs.readdirSync(NOTES_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, days);

  if (files.length === 0) {
    console.log(COLORS.yellow + 'No notes found.' + COLORS.reset);
    return;
  }

  console.log(COLORS.cyan + COLORS.bold + '📝 Recent Notes\n' + COLORS.reset);

  files.forEach(file => {
    const content = fs.readFileSync(path.join(NOTES_DIR, file), 'utf8');
    const date = file.replace('.md', '');
    const lines = content.split('\n').filter(l => l.startsWith('- **'));

    console.log(COLORS.bold + date + COLORS.reset + COLORS.dim + ` (${lines.length} entries)` + COLORS.reset);
    lines.slice(0, 3).forEach(line => {
      console.log('  ' + line.substring(0, 60) + (line.length > 60 ? '...' : ''));
    });
    if (lines.length > 3) {
      console.log(COLORS.dim + `  ... and ${lines.length - 3} more` + COLORS.reset);
    }
    console.log('');
  });
}

function showToday() {
  const file = getTodayFile();
  if (!fs.existsSync(file)) {
    console.log(COLORS.yellow + 'No notes for today yet.' + COLORS.reset);
    return;
  }

  const content = fs.readFileSync(file, 'utf8');
  console.log(COLORS.cyan + COLORS.bold + "📝 Today's Notes\n" + COLORS.reset);
  console.log(content);
}

function searchNotes(pattern) {
  ensureDir();
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'));
  const regex = new RegExp(pattern, 'i');
  const matches = [];

  files.forEach(file => {
    const content = fs.readFileSync(path.join(NOTES_DIR, file), 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
      if (regex.test(line) && line.startsWith('- **')) {
        matches.push({ file, line });
      }
    });
  });

  if (matches.length === 0) {
    console.log(COLORS.yellow + `No matches for "${pattern}"` + COLORS.reset);
    return;
  }

  console.log(COLORS.cyan + COLORS.bold + `🔍 Found ${matches.length} match${matches.length !== 1 ? 'es' : ''} for "${pattern}"\n` + COLORS.reset);

  matches.slice(0, 20).forEach(m => {
    const date = m.file.replace('.md', '');
    console.log(COLORS.dim + date + COLORS.reset + ' ' + m.line.substring(0, 70));
  });

  if (matches.length > 20) {
    console.log(COLORS.dim + `\n... and ${matches.length - 20} more` + COLORS.reset);
  }
}

function interactivePrompt() {
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(COLORS.cyan + '✏️  Quick Note (empty line to quit)' + COLORS.reset);
  console.log(COLORS.dim + 'Type your note and hit Enter:\n' + COLORS.reset);

  function ask() {
    rl.question('> ', (input) => {
      if (!input.trim()) {
        rl.close();
        console.log(COLORS.dim + '\nGoodbye!' + COLORS.reset);
        return;
      }
      addNote(input.trim());
      console.log('');
      ask();
    });
  }

  ask();
}

function showStats() {
  ensureDir();
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'));

  let totalEntries = 0;
  let totalWords = 0;

  files.forEach(file => {
    const content = fs.readFileSync(path.join(NOTES_DIR, file), 'utf8');
    const lines = content.split('\n').filter(l => l.startsWith('- **'));
    totalEntries += lines.length;
    totalWords += content.split(/\s+/).length;
  });

  console.log(COLORS.cyan + COLORS.bold + '📊 Note Stats\n' + COLORS.reset);
  console.log(`Total days: ${files.length}`);
  console.log(`Total entries: ${totalEntries}`);
  console.log(`Total words: ~${totalWords}`);
  if (files.length > 0) {
    console.log(`Avg entries/day: ${(totalEntries / files.length).toFixed(1)}`);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    interactivePrompt();
    return;
  }

  const arg = args[0];

  if (arg === '--list' || arg === '-l') {
    listRecent(args[1] ? parseInt(args[1]) : 7);
    return;
  }

  if (arg === '--today' || arg === '-t') {
    showToday();
    return;
  }

  if (arg === '--stats' || arg === '-s') {
    showStats();
    return;
  }

  if ((arg === '--grep' || arg === '-g') && args[1]) {
    searchNotes(args[1]);
    return;
  }

  if (arg === '--help' || arg === '-h') {
    console.log(`
${COLORS.bold}note.js${COLORS.reset} - Quick capture for thoughts and ideas

${COLORS.bold}Usage:${COLORS.reset}
  note [text]           Add a new note
  note --list [days]    List recent notes (default: 7 days)
  note --today          Show today's notes
  note --stats          Show note statistics
  note --grep pattern   Search notes for pattern

${COLORS.bold}Examples:${COLORS.reset}
  note "Call John about project"
  note Great idea for the app -- check competitor
  note -l 3
  note -g "sprint"
`);
    return;
  }

  // Add note from args
  addNote(args.join(' '));
}

main();
