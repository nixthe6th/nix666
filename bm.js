#!/usr/bin/env node
/**
 * bm.js - Bookmark CLI for quick access to saved links
 * Usage: bm [list|search|open|add] [args]
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
  blue: '\x1b[34m'
};

const CATEGORIES = {
  dev: { icon: '💻', color: 'cyan' },
  tools: { icon: '🛠️', color: 'yellow' },
  learning: { icon: '📚', color: 'green' },
  money: { icon: '💰', color: 'magenta' },
  default: { icon: '🔗', color: 'reset' }
};

function loadBookmarks() {
  const data = fs.readFileSync(path.join(__dirname, 'bookmarks.json'), 'utf8');
  return JSON.parse(data);
}

function saveBookmarks(bookmarks) {
  fs.writeFileSync(path.join(__dirname, 'bookmarks.json'), JSON.stringify(bookmarks, null, 2));
}

function getCategoryStyle(cat) {
  const style = CATEGORIES[cat] || CATEGORIES.default;
  return { ...style, colorCode: COLORS[style.color] };
}

function listBookmarks(category = null) {
  const bookmarks = loadBookmarks();
  const filtered = category 
    ? bookmarks.filter(b => b.category === category)
    : bookmarks;

  if (filtered.length === 0) {
    console.log(COLORS.yellow + 'No bookmarks found.' + COLORS.reset);
    return;
  }

  // Group by category
  const byCategory = filtered.reduce((acc, b) => {
    acc[b.category || 'uncategorized'] = acc[b.category || 'uncategorized'] || [];
    acc[b.category || 'uncategorized'].push(b);
    return acc;
  }, {});

  console.log('');
  console.log(COLORS.cyan + '╔══════════════════════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + COLORS.bold + '              🔖 BOOKMARKS                               ' + COLORS.reset + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '╚══════════════════════════════════════════════════════════╝' + COLORS.reset);
  console.log('');

  Object.entries(byCategory).forEach(([cat, items]) => {
    const style = getCategoryStyle(cat);
    console.log(style.colorCode + `${style.icon} ${cat.toUpperCase()}` + COLORS.reset);
    
    items.forEach((b, i) => {
      const num = (i + 1).toString().padStart(2);
      console.log(`   ${COLORS.dim}${num}.${COLORS.reset} ${COLORS.bold}${b.title}${COLORS.reset}`);
      console.log(`       ${COLORS.cyan}${b.url}${COLORS.reset}`);
      if (b.description) {
        console.log(`       ${COLORS.dim}${b.description}${COLORS.reset}`);
      }
      if (b.tags && b.tags.length > 0) {
        console.log(`       ${COLORS.yellow}#${b.tags.join(' #')}${COLORS.reset}`);
      }
      console.log('');
    });
  });

  console.log(COLORS.dim + `Total: ${filtered.length} bookmark${filtered.length !== 1 ? 's' : ''}` + COLORS.reset);
}

function searchBookmarks(query) {
  const bookmarks = loadBookmarks();
  const q = query.toLowerCase();
  
  const results = bookmarks.filter(b => 
    b.title.toLowerCase().includes(q) ||
    b.url.toLowerCase().includes(q) ||
    (b.description && b.description.toLowerCase().includes(q)) ||
    (b.tags && b.tags.some(t => t.toLowerCase().includes(q)))
  );

  if (results.length === 0) {
    console.log(COLORS.yellow + `No bookmarks found for "${query}"` + COLORS.reset);
    return;
  }

  console.log('');
  console.log(COLORS.green + `🔍 Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"` + COLORS.reset);
  console.log('');

  results.forEach((b, i) => {
    const style = getCategoryStyle(b.category);
    console.log(`${style.colorCode}${style.icon}${COLORS.reset} ${COLORS.bold}${b.title}${COLORS.reset}`);
    console.log(`   ${COLORS.cyan}${b.url}${COLORS.reset}`);
    console.log('');
  });
}

function openBookmark(query) {
  const bookmarks = loadBookmarks();
  const match = bookmarks.find(b => 
    b.title.toLowerCase() === query.toLowerCase() ||
    b.url.toLowerCase().includes(query.toLowerCase())
  );

  if (!match) {
    console.log(COLORS.red + `Bookmark not found: ${query}` + COLORS.reset);
    console.log(COLORS.dim + 'Try searching with: bm search <term>' + COLORS.reset);
    return;
  }

  console.log(COLORS.green + `Opening: ${match.title}` + COLORS.reset);
  console.log(COLORS.cyan + match.url + COLORS.reset);
  
  try {
    // Try to open based on platform
    const platform = process.platform;
    if (platform === 'darwin') {
      execSync(`open "${match.url}"`);
    } else if (platform === 'linux') {
      execSync(`xdg-open "${match.url}"`);
    } else {
      console.log(COLORS.yellow + 'Copy this URL manually:' + COLORS.reset);
    }
  } catch {
    console.log(COLORS.yellow + 'Could not auto-open. Copy manually:' + COLORS.reset);
  }
}

function addBookmark(title, url, category = 'dev', description = '', tags = []) {
  const bookmarks = loadBookmarks();
  
  const newBookmark = {
    title,
    url,
    category,
    description,
    tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean)
  };

  bookmarks.push(newBookmark);
  saveBookmarks(bookmarks);

  console.log(COLORS.green + '✅ Bookmark added!' + COLORS.reset);
  console.log(`${COLORS.bold}${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${url}${COLORS.reset}`);
  console.log(`${COLORS.dim}Category: ${category} | Tags: ${newBookmark.tags.join(', ') || 'none'}${COLORS.reset}`);
}

function categoriesList() {
  const bookmarks = loadBookmarks();
  const cats = [...new Set(bookmarks.map(b => b.category).filter(Boolean))];
  
  console.log('');
  console.log(COLORS.cyan + '📂 Categories:' + COLORS.reset);
  
  cats.forEach(cat => {
    const count = bookmarks.filter(b => b.category === cat).length;
    const style = getCategoryStyle(cat);
    console.log(`   ${style.colorCode}${style.icon}${COLORS.reset} ${cat} ${COLORS.dim}(${count})${COLORS.reset}`);
  });
  
  console.log('');
  console.log(COLORS.dim + `Use: bm list <category> to filter` + COLORS.reset);
}

function showHelp() {
  console.log(`
${COLORS.cyan}🔖 bm.js - Bookmark Manager${COLORS.reset}

Usage: bm <command> [args]

Commands:
  list [category]     List all bookmarks (optionally filter by category)
  search <query>      Search bookmarks by title, URL, or tag
  open <title/term>   Open bookmark in browser
  add <title> <url>   Add new bookmark
  categories          List available categories
  help                Show this help

Examples:
  bm list             Show all bookmarks
  bm list dev         Show only dev bookmarks
  bm search api       Search for "api"
  bm open github      Open bookmark matching "github"
  bm add "Vercel" "https://vercel.com" dev "Deploy platform" "hosting,serverless"
`);
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'list';

  switch (cmd) {
    case 'list':
    case 'ls':
      listBookmarks(args[1]);
      break;
    case 'search':
    case 's':
      if (!args[1]) {
        console.log(COLORS.red + 'Usage: bm search <query>' + COLORS.reset);
        process.exit(1);
      }
      searchBookmarks(args[1]);
      break;
    case 'open':
    case 'o':
      if (!args[1]) {
        console.log(COLORS.red + 'Usage: bm open <title/term>' + COLORS.reset);
        process.exit(1);
      }
      openBookmark(args[1]);
      break;
    case 'add':
    case 'a':
      if (args.length < 3) {
        console.log(COLORS.red + 'Usage: bm add <title> <url> [category] [description] [tags]' + COLORS.reset);
        process.exit(1);
      }
      addBookmark(args[1], args[2], args[3] || 'dev', args[4] || '', args[5] ? args[5].split(',') : []);
      break;
    case 'categories':
    case 'cats':
      categoriesList();
      break;
    case 'help':
    case '-h':
    case '--help':
      showHelp();
      break;
    default:
      // If no command, treat as search
      searchBookmarks(cmd);
  }
}

main();
