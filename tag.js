#!/usr/bin/env node
/**
 * tag.js — Universal tag manager for all NIX data
 * Cross-reference and organize content across todos, ideas, projects, bookmarks
 * 
 * Usage:
 *   nix tag                    # List all tags with counts
 *   nix tag <tag>              # Show all items with this tag
 *   nix tag add <id> <tag>     # Add tag to item
 *   nix tag rm <id> <tag>      # Remove tag from item
 *   nix tag search <query>     # Find tags matching query
 *   nix tag cloud              # Visual tag cloud
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILES = {
  todos: { file: 'todos.json', idField: 'id', textField: 'text' },
  ideas: { file: '../ideas.json', idField: 'id', textField: 'title' },
  bookmarks: { file: '../bookmarks.json', idField: 'id', textField: 'title' },
  projects: { file: '../projects.json', idField: 'id', textField: 'name' },
  quotes: { file: '../quotes.json', idField: 'id', textField: 'text' }
};

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const TAG_COLORS = [C.red, C.green, C.yellow, C.blue, C.magenta, C.cyan];

function loadData(type) {
  const config = DATA_FILES[type];
  const filePath = path.join(__dirname, config.file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Handle array or object with array property
    if (Array.isArray(data)) return { type, items: data, config };
    if (data.sprints) return { type, items: data.sprints, config };
    if (data.ideas) return { type, items: data.ideas, config };
    if (data.projects) return { type, items: data.projects, config };
    if (data.bookmarks) return { type, items: data.bookmarks, config };
    if (data.quotes) return { type, items: data.quotes, config };
    return { type, items: [], config };
  } catch {
    return { type, items: [], config };
  }
}

function extractTags(item, type) {
  const tags = [];
  // Check explicit tags field
  if (item.tags && Array.isArray(item.tags)) {
    tags.push(...item.tags);
  }
  // Check category/tags fields
  if (item.category) tags.push(item.category);
  if (item.tag) tags.push(item.tag);
  // Extract hashtags from text fields
  const textFields = ['text', 'title', 'name', 'goal', 'description', 'note'];
  for (const field of textFields) {
    if (item[field]) {
      const matches = item[field].match(/#\w+/g);
      if (matches) {
        tags.push(...matches.map(t => t.slice(1).toLowerCase()));
      }
    }
  }
  return [...new Set(tags.map(t => t.toLowerCase()))];
}

function getAllTags() {
  const allTags = new Map();
  
  for (const type of Object.keys(DATA_FILES)) {
    const { items } = loadData(type);
    for (const item of items) {
      const tags = extractTags(item, type);
      for (const tag of tags) {
        if (!allTags.has(tag)) {
          allTags.set(tag, []);
        }
        allTags.get(tag).push({ type, item });
      }
    }
  }
  
  return allTags;
}

function listTags() {
  const tags = getAllTags();
  const sorted = [...tags.entries()].sort((a, b) => b[1].length - a[1].length);
  
  if (sorted.length === 0) {
    console.log(`${C.yellow}No tags found${C.reset}`);
    console.log(`${C.dim}Add tags to your data using #hashtags or a "tags" field${C.reset}`);
    return;
  }
  
  console.log(`\n${C.cyan}${C.bold}All Tags${C.reset} ${C.dim}(${sorted.length} total)${C.reset}\n`);
  
  // Group by first letter
  const grouped = {};
  for (const [tag, items] of sorted) {
    const letter = tag[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push({ tag, count: items.length });
  }
  
  for (const letter of Object.keys(grouped).sort()) {
    console.log(`${C.bold}${letter}${C.reset}`);
    for (const { tag, count } of grouped[letter]) {
      const color = TAG_COLORS[tag.length % TAG_COLORS.length];
      console.log(`  ${color}#${tag}${C.reset} ${C.dim}(${count})${C.reset}`);
    }
  }
  
  console.log(`\n${C.dim}View items: nix tag <tagname>${C.reset}`);
}

function showTag(tagName) {
  const tags = getAllTags();
  const normalized = tagName.toLowerCase().replace(/^#/, '');
  
  if (!tags.has(normalized)) {
    console.log(`${C.red}Tag "${tagName}" not found${C.reset}`);
    // Suggest similar tags
    const similar = [...tags.keys()].filter(t => 
      t.includes(normalized) || normalized.includes(t)
    ).slice(0, 5);
    if (similar.length > 0) {
      console.log(`${C.dim}Did you mean: ${similar.map(s => `#${s}`).join(', ')}?${C.reset}`);
    }
    return;
  }
  
  const items = tags.get(normalized);
  const byType = {};
  for (const { type, item } of items) {
    if (!byType[type]) byType[type] = [];
    byType[type].push(item);
  }
  
  console.log(`\n${C.cyan}${C.bold}#${normalized}${C.reset} ${C.dim}(${items.length} items)${C.reset}\n`);
  
  for (const [type, typeItems] of Object.entries(byType)) {
    const color = TAG_COLORS[Object.keys(DATA_FILES).indexOf(type) % TAG_COLORS.length];
    console.log(`${color}${type.toUpperCase()}${C.reset} ${C.dim}(${typeItems.length})${C.reset}`);
    
    for (const item of typeItems.slice(0, 5)) {
      const text = item.text || item.title || item.name || item.goal || 'Untitled';
      const id = item.id ? `[${item.id}]` : '';
      console.log(`  ${C.dim}${id}${C.reset} ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    }
    
    if (typeItems.length > 5) {
      console.log(`  ${C.dim}... and ${typeItems.length - 5} more${C.reset}`);
    }
    console.log();
  }
}

function tagCloud() {
  const tags = getAllTags();
  const sorted = [...tags.entries()].sort((a, b) => b[1].length - a[1].length);
  
  if (sorted.length === 0) {
    console.log(`${C.yellow}No tags found${C.reset}`);
    return;
  }
  
  console.log(`\n${C.cyan}${C.bold}Tag Cloud${C.reset}\n`);
  
  const max = sorted[0][1].length;
  const min = sorted[sorted.length - 1][1].length;
  
  for (const [tag, items] of sorted) {
    const intensity = max === min ? 1 : (items.length - min) / (max - min);
    const size = Math.floor(intensity * 3) + 1; // 1-4
    const color = TAG_COLORS[Math.floor(intensity * (TAG_COLORS.length - 1))];
    
    if (size === 1) process.stdout.write(`${C.dim}#${tag}${C.reset} `);
    else if (size === 2) process.stdout.write(`${color}#${tag}${C.reset} `);
    else if (size === 3) process.stdout.write(`${C.bold}${color}#${tag}${C.reset} `);
    else process.stdout.write(`${C.bold}${color}#${tag.toUpperCase()}${C.reset} `);
  }
  
  console.log('\n');
}

function searchTags(query) {
  const tags = getAllTags();
  const normalized = query.toLowerCase();
  const matches = [...tags.keys()].filter(t => t.includes(normalized));
  
  if (matches.length === 0) {
    console.log(`${C.yellow}No tags matching "${query}"${C.reset}`);
    return;
  }
  
  console.log(`\n${C.cyan}${C.bold}Tags matching "${query}"${C.reset}\n`);
  
  for (const tag of matches) {
    const count = tags.get(tag).length;
    const color = TAG_COLORS[tag.length % TAG_COLORS.length];
    console.log(`  ${color}#${tag}${C.reset} ${C.dim}(${count})${C.reset}`);
  }
}

function showHelp() {
  console.log(`
${C.bold}tag.js${C.reset} — Universal tag manager for NIX data

${C.bold}Usage:${C.reset}
  nix tag                    List all tags
  nix tag <tag>              Show items with this tag
  nix tag search <query>     Find tags matching query
  nix tag cloud              Visual tag cloud

${C.bold}Tag Sources:${C.reset}
  • Explicit "tags" array field in JSON
  • "category" or "tag" fields
  • #hashtags in text, title, description fields

${C.bold}Examples:${C.reset}
  nix tag                    # List all tags
  nix tag work               # Show items tagged "work"
  nix tag search dev         # Find tags with "dev"
  nix tag cloud              # Visual cloud view
`);
}

// Main
const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === 'list' || cmd === 'ls') {
  listTags();
} else if (cmd === 'cloud') {
  tagCloud();
} else if (cmd === 'search') {
  searchTags(args[1] || '');
} else if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
  showHelp();
} else if (cmd.startsWith('#') || !DATA_FILES[cmd]) {
  // Assume it's a tag name
  showTag(cmd);
} else {
  console.log(`${C.red}Unknown command: ${cmd}${C.reset}`);
  showHelp();
}
