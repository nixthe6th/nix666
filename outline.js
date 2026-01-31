#!/usr/bin/env node
/**
 * outline.js - Quick outliner for writing and brainstorming
 * Usage: nix outline [command] [args]
 * 
 * Sprint project - created for rapid iteration
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.nix666');
const OUTLINE_FILE = path.join(DATA_DIR, 'outlines.json');

// Colors for terminal output
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function loadOutlines() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(OUTLINE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(OUTLINE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveOutlines(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTLINE_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

function formatTimestamp(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function indent(level) {
  return '  '.repeat(level);
}

function printOutline(outline, id, level = 0) {
  const prefix = level === 0 ? '◆' : level === 1 ? '●' : '○';
  const title = level === 0 ? `${C.bold}${C.cyan}${outline.title}${C.reset}` : outline.title;
  console.log(`${indent(level)}${prefix} ${title}`);
  
  if (outline.items && outline.items.length > 0) {
    outline.items.forEach(item => printOutline(item, null, level + 1));
  }
}

function printCompact(outline) {
  console.log(`${C.cyan}${outline.title}${C.reset} ${C.gray}(${outline.id})${C.reset}`);
  if (outline.items) {
    outline.items.forEach((item, i) => {
      const status = item.done ? '✓' : item.items?.length ? '◐' : '○';
      console.log(`  ${status} ${item.title}`);
      if (item.items) {
        item.items.forEach(sub => {
          const subStatus = sub.done ? '✓' : '○';
          console.log(`    ${subStatus} ${sub.title}`);
        });
      }
    });
  }
}

// Commands
const commands = {
  new(args) {
    const title = args.join(' ');
    if (!title) {
      console.log(`${C.red}Usage: nix outline new "Title"${C.reset}`);
      process.exit(1);
    }
    
    const outlines = loadOutlines();
    const id = generateId();
    outlines[id] = {
      id,
      title,
      items: [],
      created: formatTimestamp(),
      updated: formatTimestamp()
    };
    saveOutlines(outlines);
    console.log(`${C.green}Created outline: ${C.bold}${title}${C.reset} ${C.gray}(${id})${C.reset}`);
  },

  list() {
    const outlines = loadOutlines();
    const ids = Object.keys(outlines);
    
    if (ids.length === 0) {
      console.log(`${C.gray}No outlines yet. Create one with: nix outline new "Title"${C.reset}`);
      return;
    }
    
    console.log(`${C.bold}Outlines:${C.reset}`);
    ids.forEach(id => {
      const o = outlines[id];
      const itemCount = countItems(o);
      console.log(`  ${C.cyan}${o.title}${C.reset} ${C.gray}(${id}) - ${itemCount} items, ${o.updated}${C.reset}`);
    });
  },

  show(args) {
    const id = args[0];
    if (!id) {
      console.log(`${C.red}Usage: nix outline show <id>${C.reset}`);
      process.exit(1);
    }
    
    const outlines = loadOutlines();
    const outline = outlines[id];
    if (!outline) {
      console.log(`${C.red}Outline not found: ${id}${C.reset}`);
      process.exit(1);
    }
    
    printOutline(outline, id);
  },

  add(args) {
    if (args.length < 2) {
      console.log(`${C.red}Usage: nix outline add <id> "Item text" [level]${C.reset}`);
      process.exit(1);
    }
    
    const id = args[0];
    const level = parseInt(args[args.length - 1]) || 1;
    const text = level > 1 ? args.slice(1, -1).join(' ') : args.slice(1).join(' ');
    
    const outlines = loadOutlines();
    const outline = outlines[id];
    if (!outline) {
      console.log(`${C.red}Outline not found: ${id}${C.reset}`);
      process.exit(1);
    }
    
    const newItem = { title: text, done: false };
    
    if (level === 1) {
      outline.items.push(newItem);
    } else if (level === 2 && outline.items.length > 0) {
      const parent = outline.items[outline.items.length - 1];
      if (!parent.items) parent.items = [];
      parent.items.push(newItem);
    } else {
      outline.items.push(newItem);
    }
    
    outline.updated = formatTimestamp();
    saveOutlines(outlines);
    console.log(`${C.green}Added: ${text}${C.reset}`);
  },

  done(args) {
    const id = args[0];
    const path = args[1]?.split('.').map(Number) || [];
    
    if (!id || path.length === 0) {
      console.log(`${C.red}Usage: nix outline done <id> <path>${C.reset}`);
      console.log(`  Example: nix outline done abc123 1.2 (marks item 1, subitem 2)`);
      process.exit(1);
    }
    
    const outlines = loadOutlines();
    const outline = outlines[id];
    if (!outline) {
      console.log(`${C.red}Outline not found: ${id}${C.reset}`);
      process.exit(1);
    }
    
    let item = outline;
    for (const idx of path) {
      item = item.items?.[idx - 1];
      if (!item) {
        console.log(`${C.red}Invalid path: ${args[1]}${C.reset}`);
        process.exit(1);
      }
    }
    
    item.done = !item.done;
    outline.updated = formatTimestamp();
    saveOutlines(outlines);
    console.log(`${item.done ? C.green : C.yellow}${item.done ? '✓' : '○'} ${item.title}${C.reset}`);
  },

  delete(args) {
    const id = args[0];
    if (!id) {
      console.log(`${C.red}Usage: nix outline delete <id>${C.reset}`);
      process.exit(1);
    }
    
    const outlines = loadOutlines();
    if (!outlines[id]) {
      console.log(`${C.red}Outline not found: ${id}${C.reset}`);
      process.exit(1);
    }
    
    delete outlines[id];
    saveOutlines(outlines);
    console.log(`${C.yellow}Deleted outline: ${id}${C.reset}`);
  },

  export(args) {
    const id = args[0];
    if (!id) {
      console.log(`${C.red}Usage: nix outline export <id>${C.reset}`);
      process.exit(1);
    }
    
    const outlines = loadOutlines();
    const outline = outlines[id];
    if (!outline) {
      console.log(`${C.red}Outline not found: ${id}${C.reset}`);
      process.exit(1);
    }
    
    console.log(toMarkdown(outline));
  }
};

function countItems(outline) {
  let count = outline.items?.length || 0;
  outline.items?.forEach(item => {
    count += item.items?.length || 0;
  });
  return count;
}

function toMarkdown(outline, level = 0) {
  let md = '';
  const prefix = '#'.repeat(Math.min(level + 1, 6)) + ' ';
  md += `${prefix}${outline.title}\n\n`;
  
  outline.items?.forEach(item => {
    md += `- [${item.done ? 'x' : ' '}] ${item.title}\n`;
    item.items?.forEach(sub => {
      md += `  - [${sub.done ? 'x' : ' '}] ${sub.title}\n`;
    });
  });
  
  return md;
}

// Main
function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'list';
  const cmdArgs = args.slice(1);

  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(`${C.bold}nix outline${C.reset} - Quick outliner for writing

${C.bold}Commands:${C.reset}
  new "Title"              Create a new outline
  list                     Show all outlines
  show <id>                Display outline structure
  add <id> "text" [level]  Add item (level 1 or 2)
  done <id> <path>         Toggle item done (e.g., 1.2)
  delete <id>              Delete an outline
  export <id>              Export as Markdown

${C.bold}Examples:${C.reset}
  nix outline new "Blog Post"
  nix outline add abc123 "Introduction"
  nix outline add abc123 "Hook" 2
  nix outline done abc123 1.1
  nix outline export abc123
`);
    return;
  }

  if (commands[cmd]) {
    commands[cmd](cmdArgs);
  } else {
    console.log(`${C.red}Unknown command: ${cmd}${C.reset}`);
    console.log(`Run ${C.cyan}nix outline help${C.reset} for usage`);
    process.exit(1);
  }
}

main();
