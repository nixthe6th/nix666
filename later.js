#!/usr/bin/env node
/**
 * later.js - Read/Watch later queue
 * Usage: nix later <url> [title] [--tags tag1,tag2]
 *        nix later list           Show queue
 *        nix later done <id>      Mark as consumed
 *        nix later delete <id>    Remove item
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'later.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ items: [] }, null, 2));
}

function loadData() {
  ensureData();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function getTypeIcon(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '▶️';
  if (url.includes('github.com')) return '💻';
  if (url.includes('medium.com') || url.includes('dev.to')) return '📝';
  if (url.includes('reddit.com')) return '💬';
  if (url.match(/\.(mp4|mov|avi)$/)) return '🎬';
  if (url.match(/\.(pdf|epub)$/)) return '📄';
  return '🔗';
}

function addItem(url, title, tags = []) {
  const data = loadData();
  const item = {
    id: generateId(),
    url,
    title: title || url,
    domain: extractDomain(url),
    tags,
    added: new Date().toISOString(),
    consumed: null
  };
  data.items.push(item);
  saveData(data);
  console.log(`${COLORS.green}✓ Added to queue${COLORS.reset}`);
  console.log(`${COLORS.dim}  ${getTypeIcon(url)} ${item.title.substring(0, 50)}${COLORS.reset}`);
  console.log(`${COLORS.dim}  ID: ${item.id}${COLORS.reset}`);
}

function listItems(filter = 'pending') {
  const data = loadData();
  const items = data.items.filter(i => filter === 'all' ? true : !i.consumed);
  
  if (items.length === 0) {
    console.log(`${COLORS.yellow}Queue empty.${COLORS.reset}`);
    return;
  }

  console.log(`${COLORS.cyan}${COLORS.bold}📚 Read/Watch Later Queue${COLORS.reset}\n`);
  
  items.slice(0, 15).forEach(item => {
    const age = Math.floor((Date.now() - new Date(item.added)) / (1000 * 60 * 60 * 24));
    const ageStr = age === 0 ? 'today' : age === 1 ? '1d ago' : `${age}d ago`;
    const tags = item.tags.length > 0 ? `${COLORS.magenta}[${item.tags.join(',')}]${COLORS.reset}` : '';
    
    console.log(`${getTypeIcon(item.url)} ${COLORS.bold}${item.id}${COLORS.reset} ${item.title.substring(0, 45)}${item.title.length > 45 ? '...' : ''}`);
    console.log(`   ${COLORS.gray}${item.domain} • ${ageStr}${COLORS.reset} ${tags}`);
  });

  if (items.length > 15) {
    console.log(`${COLORS.dim}\n... and ${items.length - 15} more${COLORS.reset}`);
  }
  console.log(`${COLORS.dim}\n${items.length} items in queue${COLORS.reset}`);
}

function markDone(id) {
  const data = loadData();
  const item = data.items.find(i => i.id === id);
  if (!item) {
    console.log(`${COLORS.red}✗ Item not found: ${id}${COLORS.reset}`);
    return;
  }
  item.consumed = new Date().toISOString();
  saveData(data);
  console.log(`${COLORS.green}✓ Marked as done${COLORS.reset}`);
  console.log(`${COLORS.dim}  ${item.title.substring(0, 50)}${COLORS.reset}`);
}

function deleteItem(id) {
  const data = loadData();
  const idx = data.items.findIndex(i => i.id === id);
  if (idx === -1) {
    console.log(`${COLORS.red}✗ Item not found: ${id}${COLORS.reset}`);
    return;
  }
  const item = data.items[idx];
  data.items.splice(idx, 1);
  saveData(data);
  console.log(`${COLORS.yellow}✓ Deleted${COLORS.reset}`);
  console.log(`${COLORS.dim}  ${item.title.substring(0, 50)}${COLORS.reset}`);
}

function showStats() {
  const data = loadData();
  const pending = data.items.filter(i => !i.consumed).length;
  const consumed = data.items.filter(i => i.consumed).length;
  const byDomain = {};
  data.items.forEach(i => {
    byDomain[i.domain] = (byDomain[i.domain] || 0) + 1;
  });

  console.log(`${COLORS.cyan}${COLORS.bold}📊 Later Queue Stats${COLORS.reset}\n`);
  console.log(`Pending: ${pending}`);
  console.log(`Consumed: ${consumed}`);
  console.log(`Total: ${data.items.length}`);
  
  if (Object.keys(byDomain).length > 0) {
    console.log(`\n${COLORS.bold}Top Sources:${COLORS.reset}`);
    Object.entries(byDomain)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([domain, count]) => {
        console.log(`  ${domain}: ${count}`);
      });
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
${COLORS.bold}later.js${COLORS.reset} - Read/Watch later queue

${COLORS.bold}Usage:${COLORS.reset}
  nix later <url> [title] [tags]   Add item to queue
  nix later list                   Show pending items
  nix later list --all             Show all items
  nix later done <id>              Mark item as consumed
  nix later delete <id>            Remove item
  nix later stats                  Show statistics

${COLORS.bold}Examples:${COLORS.reset}
  nix later https://youtube.com/watch?v=abc "Cool Video" video,tech
  nix later https://github.com/user/repo "Interesting Project"
  nix later list
  nix later done a3f7b2
`);
    return;
  }

  const cmd = args[0];

  if (cmd === 'list' || cmd === 'ls' || cmd === '-l') {
    listItems(args.includes('--all') ? 'all' : 'pending');
    return;
  }

  if (cmd === 'done' || cmd === 'complete') {
    if (!args[1]) {
      console.log(`${COLORS.red}Usage: nix later done <id>${COLORS.reset}`);
      return;
    }
    markDone(args[1]);
    return;
  }

  if (cmd === 'delete' || cmd === 'del' || cmd === 'rm') {
    if (!args[1]) {
      console.log(`${COLORS.red}Usage: nix later delete <id>${COLORS.reset}`);
      return;
    }
    deleteItem(args[1]);
    return;
  }

  if (cmd === 'stats') {
    showStats();
    return;
  }

  // Add new item - first arg is URL
  const url = args[0];
  if (!url.startsWith('http')) {
    console.log(`${COLORS.red}✗ Invalid URL: ${url}${COLORS.reset}`);
    return;
  }

  let title = '';
  let tags = [];
  
  // Parse remaining args for title and tags
  for (let i = 1; i < args.length; i++) {
    if (args[i].includes(',')) {
      tags = args[i].split(',').map(t => t.trim());
    } else {
      title = args.slice(i).join(' ').replace(/,\w+$/, '').trim();
      // Check if last word is tags
      const lastWord = args[args.length - 1];
      if (lastWord.includes(',')) {
        tags = lastWord.split(',').map(t => t.trim());
        title = args.slice(i, -1).join(' ').trim();
      }
      break;
    }
  }

  addItem(url, title, tags);
}

main();
