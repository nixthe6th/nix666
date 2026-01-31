#!/usr/bin/env node
/**
 * read.js — Reading list with progress tracking
 * Track books, articles, papers with completion % and notes
 * 
 * Usage: nix read <command> [args]
 * 
 * Commands:
 *   add <title> [type]       Add item to reading list
 *   list [status]            Show reading list (all|reading|done|later)
 *   progress <id> <percent>  Update reading progress
 *   note <id> <text>         Add note to item
 *   done <id>                Mark as finished
 *   current                  Show currently reading
 *   stats                    Reading statistics
 * 
 * Types: book, article, paper, blog, doc
 * 
 * Examples:
 *   nix read add "Deep Work" book
 *   nix read add "RFC 2616" doc
 *   nix read progress rq7 45
 *   nix read done rq7
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'reading.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

const TYPE_ICONS = {
  book: '📚',
  article: '📄',
  paper: '📑',
  blog: '📝',
  doc: '📋',
  default: '📖'
};

const STATUS_COLORS = {
  reading: COLORS.cyan,
  later: COLORS.yellow,
  done: COLORS.green,
  abandoned: COLORS.red
};

function c(name, text) {
  return `${COLORS[name] || ''}${text}${COLORS.reset}`;
}

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadData() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    return { items: [], lastId: 0 };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId(num) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  let n = num;
  do {
    id = chars[n % chars.length] + id;
    n = Math.floor(n / chars.length);
  } while (n > 0);
  return id.slice(-3);
}

function getIcon(type) {
  return TYPE_ICONS[type] || TYPE_ICONS.default;
}

function drawProgress(percent, width = 20) {
  const filled = Math.floor(width * percent / 100);
  const color = percent === 100 ? COLORS.green : percent > 50 ? COLORS.cyan : COLORS.yellow;
  return color + '█'.repeat(filled) + COLORS.dim + '░'.repeat(width - filled) + COLORS.reset;
}

function addItem(title, type = 'article') {
  const data = loadData();
  data.lastId++;
  const id = generateId(data.lastId);
  
  const item = {
    id,
    title,
    type,
    status: 'later',
    progress: 0,
    notes: [],
    added: new Date().toISOString().split('T')[0],
    started: null,
    finished: null
  };
  
  data.items.push(item);
  saveData(data);
  
  console.log();
  console.log(`  ${getIcon(type)} Added: ${c('bold', title)}`);
  console.log(`  ${c('dim', `ID: ${id} | Type: ${type}`)}`);
  console.log();
}

function listItems(filter = 'all') {
  const data = loadData();
  
  let items = data.items;
  if (filter !== 'all') {
    items = items.filter(i => i.status === filter);
  }
  
  if (items.length === 0) {
    console.log();
    console.log(c('dim', '  No items found.'));
    console.log();
    return;
  }
  
  // Sort: reading first, then by progress
  items.sort((a, b) => {
    if (a.status === 'reading' && b.status !== 'reading') return -1;
    if (a.status !== 'reading' && b.status === 'reading') return 1;
    return b.progress - a.progress;
  });
  
  console.log();
  console.log(c('bold', `  📚 Reading List (${filter})`));
  console.log(c('dim', '  ' + '─'.repeat(50)));
  console.log();
  
  items.forEach(item => {
    const color = STATUS_COLORS[item.status] || COLORS.reset;
    const statusIcon = item.status === 'done' ? '✅' : 
                       item.status === 'reading' ? '👁️ ' : 
                       item.status === 'abandoned' ? '❌' : '⏳';
    
    console.log(`  ${getIcon(item.type)} ${c('bold', item.title)} ${c('dim', `[${item.id}]`)}`);
    console.log(`     ${statusIcon} ${color}${item.status}${COLORS.reset} ${drawProgress(item.progress)} ${item.progress}%`);
    
    if (item.notes.length > 0) {
      console.log(`     ${c('dim', `💭 ${item.notes.length} note(s)`)}`);
    }
    console.log();
  });
}

function updateProgress(id, percent) {
  const data = loadData();
  const item = data.items.find(i => i.id === id);
  
  if (!item) {
    console.log(c('red', `  Item not found: ${id}`));
    return;
  }
  
  const oldProgress = item.progress;
  item.progress = Math.min(100, Math.max(0, parseInt(percent)));
  
  if (oldProgress === 0 && item.progress > 0 && item.status === 'later') {
    item.status = 'reading';
    item.started = new Date().toISOString().split('T')[0];
  }
  
  if (item.progress === 100 && item.status !== 'done') {
    item.status = 'done';
    item.finished = new Date().toISOString().split('T')[0];
    console.log();
    console.log(c('green', '  🎉 Finished! Great job!'));
  }
  
  saveData(data);
  
  console.log();
  console.log(`  ${getIcon(item.type)} ${c('bold', item.title)}`);
  console.log(`  ${drawProgress(item.progress)} ${item.progress}%`);
  console.log();
}

function markDone(id) {
  updateProgress(id, 100);
}

function addNote(id, noteText) {
  const data = loadData();
  const item = data.items.find(i => i.id === id);
  
  if (!item) {
    console.log(c('red', `  Item not found: ${id}`));
    return;
  }
  
  item.notes.push({
    text: noteText,
    date: new Date().toISOString()
  });
  
  saveData(data);
  
  console.log();
  console.log(`  ${getIcon(item.type)} ${c('bold', item.title)}`);
  console.log(`  💭 Note added`);
  console.log(`  ${c('dim', `"${noteText}"`)}`);
  console.log();
}

function showCurrent() {
  const data = loadData();
  const reading = data.items.filter(i => i.status === 'reading');
  
  if (reading.length === 0) {
    console.log();
    console.log(c('dim', '  Not reading anything right now.'));
    console.log(c('dim', '  Use "nix read list" to pick something or add new.'));
    console.log();
    return;
  }
  
  console.log();
  console.log(c('bold', '  👁️  Currently Reading'));
  console.log();
  
  reading.forEach(item => {
    console.log(`  ${getIcon(item.type)} ${c('bold', item.title)} ${c('dim', `[${item.id}]`)}`);
    console.log(`     ${drawProgress(item.progress)} ${item.progress}%`);
    console.log(`     ${c('dim', `Started: ${item.started}`)}`);
    if (item.notes.length > 0) {
      const latest = item.notes[item.notes.length - 1];
      console.log(`     💭 ${c('dim', latest.text.substring(0, 50))}${latest.text.length > 50 ? '...' : ''}`);
    }
    console.log();
  });
}

function showStats() {
  const data = loadData();
  const items = data.items;
  
  const total = items.length;
  const done = items.filter(i => i.status === 'done').length;
  const reading = items.filter(i => i.status === 'reading').length;
  const later = items.filter(i => i.status === 'later').length;
  
  const byType = {};
  items.forEach(i => {
    byType[i.type] = (byType[i.type] || 0) + 1;
  });
  
  console.log();
  console.log(c('bold', '  📊 Reading Statistics'));
  console.log();
  console.log(`  Total items:    ${c('bold', total)}`);
  console.log(`  ✅ Finished:    ${c('green', done)}`);
  console.log(`  👁️  Reading:     ${c('cyan', reading)}`);
  console.log(`  ⏳ To read:     ${c('yellow', later)}`);
  
  if (total > 0) {
    const completionRate = Math.round(done / total * 100);
    console.log();
    console.log(`  Completion rate: ${c('bold', completionRate + '%')} ${drawProgress(completionRate, 15)}`);
  }
  
  if (Object.keys(byType).length > 0) {
    console.log();
    console.log(c('dim', '  By type:'));
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`    ${getIcon(type)} ${type}: ${count}`);
    });
  }
  
  console.log();
}

function showHelp() {
  console.log();
  console.log(c('bold', '  📚 Reading List Tracker'));
  console.log();
  console.log(c('bold', '  Commands:'));
  console.log(`    ${c('cyan', 'add')} <title> [type]       Add item (book/article/paper/blog/doc)`);
  console.log(`    ${c('cyan', 'list')} [status]            List items (all/reading/done/later)`);
  console.log(`    ${c('cyan', 'current')}                  Show currently reading`);
  console.log(`    ${c('cyan', 'progress')} <id> <pct>      Update progress (0-100)`);
  console.log(`    ${c('cyan', 'note')} <id> <text>         Add note to item`);
  console.log(`    ${c('cyan', 'done')} <id>                 Mark as finished`);
  console.log(`    ${c('cyan', 'stats')}                    Show statistics`);
  console.log();
  console.log(c('bold', '  Examples:'));
  console.log(`    nix read add "Deep Work" book`);
  console.log(`    nix read add "React Docs" doc`);
  console.log(`    nix read progress a3f 45`);
  console.log(`    nix read note a3f "Great chapter on focus"`);
  console.log(`    nix read done a3f`);
  console.log();
}

// Main
const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
  showHelp();
  process.exit(0);
}

switch (cmd) {
  case 'add':
    if (args.length < 2) {
      console.log(c('red', '  Usage: nix read add <title> [type]'));
      process.exit(1);
    }
    const type = args[args.length - 1];
    const validTypes = ['book', 'article', 'paper', 'blog', 'doc'];
    const hasType = validTypes.includes(type);
    const title = hasType ? args.slice(1, -1).join(' ') : args.slice(1).join(' ');
    addItem(title, hasType ? type : 'article');
    break;
    
  case 'list':
    listItems(args[1] || 'all');
    break;
    
  case 'current':
    showCurrent();
    break;
    
  case 'progress':
    if (args.length < 3) {
      console.log(c('red', '  Usage: nix read progress <id> <percent>'));
      process.exit(1);
    }
    updateProgress(args[1], args[2]);
    break;
    
  case 'note':
    if (args.length < 3) {
      console.log(c('red', '  Usage: nix read note <id> <text>'));
      process.exit(1);
    }
    addNote(args[1], args.slice(2).join(' '));
    break;
    
  case 'done':
    if (args.length < 2) {
      console.log(c('red', '  Usage: nix read done <id>'));
      process.exit(1);
    }
    markDone(args[1]);
    break;
    
  case 'stats':
    showStats();
    break;
    
  default:
    console.log(c('red', `  Unknown command: ${cmd}`));
    showHelp();
    process.exit(1);
}
