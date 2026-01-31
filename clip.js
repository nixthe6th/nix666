#!/usr/bin/env node
/**
 * clip.js - Code snippet manager
 * Usage: nix clip <command> [args]
 * 
 * Commands:
 *   add <title> [lang] [tags...]   Save a snippet (pipes content via stdin or --file)
 *   list [lang|tag]                List all snippets or filter by language/tag
 *   search <query>                 Search snippets by title, content, or tags
 *   show <id>                      Display a specific snippet
 *   copy <id>                      Copy snippet to clipboard
 *   delete <id>                    Delete a snippet
 *   lang                           List all languages used
 *   tags                           List all tags with counts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const SNIPPETS_FILE = path.join(__dirname, 'data', 'snippets.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  blue: '\x1b[34m'
};

const LANG_ICONS = {
  js: '📜',
  javascript: '📜',
  ts: '📘',
  typescript: '📘',
  py: '🐍',
  python: '🐍',
  rb: '💎',
  ruby: '💎',
  go: '🐹',
  rust: '⚙️',
  rs: '⚙️',
  sh: '💲',
  bash: '💲',
  zsh: '💲',
  fish: '🐟',
  html: '🌐',
  css: '🎨',
  scss: '🎨',
  sass: '🎨',
  json: '📋',
  yaml: '📋',
  yml: '📋',
  sql: '🗄️',
  md: '📝',
  markdown: '📝',
  vim: '📗',
  lua: '🌙',
  c: '🔧',
  cpp: '🔧',
  cxx: '🔧',
  java: '☕',
  kt: '🟣',
  kotlin: '🟣',
  swift: '🦅',
  php: '🐘',
  dockerfile: '🐳',
  docker: '🐳',
  nginx: '▶️',
  git: '🌿',
  regex: '🔍',
  default: '📄'
};

function ensureDataDir() {
  const dir = path.dirname(SNIPPETS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadSnippets() {
  if (!fs.existsSync(SNIPPETS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(SNIPPETS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveSnippets(snippets) {
  ensureDataDir();
  fs.writeFileSync(SNIPPETS_FILE, JSON.stringify(snippets, null, 2));
}

function generateId() {
  return crypto.randomBytes(4).toString('hex');
}

function getIcon(lang) {
  return LANG_ICONS[lang?.toLowerCase()] || LANG_ICONS.default;
}

function getTimestamp() {
  return new Date().toISOString();
}

function copyToClipboard(text) {
  try {
    // Try multiple clipboard methods
    if (process.platform === 'darwin') {
      execSync(`echo ${JSON.stringify(text)} | pbcopy`);
      return true;
    } else if (process.platform === 'linux') {
      try {
        execSync(`echo ${JSON.stringify(text)} | xclip -selection clipboard`);
        return true;
      } catch {
        execSync(`echo ${JSON.stringify(text)} | xsel -b`);
        return true;
      }
    } else if (process.platform === 'win32') {
      execSync(`echo ${JSON.stringify(text)} | clip`);
      return true;
    }
  } catch {
    return false;
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data.trim()));
    
    // Timeout if no stdin
    setTimeout(() => resolve(''), 100);
  });
}

// Commands
async function addSnippet(title, lang = 'text', tags = []) {
  const content = await readStdin();
  
  if (!content) {
    console.log(COLORS.yellow + 'Usage: cat file.js | nix clip add "My Snippet" js utils array' + COLORS.reset);
    console.log(COLORS.dim + '   or: nix clip add "My Snippet" js utils array --file ./file.js' + COLORS.reset);
    process.exit(1);
  }

  const snippets = loadSnippets();
  const snippet = {
    id: generateId(),
    title,
    lang: lang.toLowerCase(),
    tags: tags.map(t => t.toLowerCase()),
    content,
    created: getTimestamp(),
    accessed: 0
  };

  snippets.push(snippet);
  saveSnippets(snippets);

  console.log(COLORS.green + '✓ Snippet saved' + COLORS.reset);
  console.log(COLORS.dim + `  ID: ${snippet.id}` + COLORS.reset);
  console.log(COLORS.dim + `  ${getIcon(snippet.lang)} ${snippet.lang} · ${snippet.tags.join(', ') || 'no tags'}` + COLORS.reset);
}

function listSnippets(filter = null) {
  const snippets = loadSnippets();
  
  if (snippets.length === 0) {
    console.log(COLORS.yellow + 'No snippets saved yet.' + COLORS.reset);
    console.log(COLORS.dim + 'Create one: echo "console.log(\'hello\')" | nix clip add "Hello World" js' + COLORS.reset);
    return;
  }

  let filtered = snippets;
  if (filter) {
    const f = filter.toLowerCase();
    filtered = snippets.filter(s => 
      s.lang === f || s.tags.includes(f)
    );
  }

  // Sort by created desc
  filtered.sort((a, b) => new Date(b.created) - new Date(a.created));

  const label = filter ? ` (${filter})` : '';
  console.log(COLORS.bold + `Snippets${label}` + COLORS.reset + COLORS.gray + ` · ${filtered.length} total` + COLORS.reset);
  console.log();

  filtered.slice(0, 20).forEach(s => {
    const tags = s.tags.length > 0 ? COLORS.gray + ' #' + s.tags.join(' #') : '';
    const date = new Date(s.created).toLocaleDateString();
    console.log(`  ${getIcon(s.lang)} ${COLORS.cyan}${s.id}${COLORS.reset} ${COLORS.bold}${s.title}${COLORS.reset}`);
    console.log(`     ${COLORS.gray}${s.lang} · ${date}${tags}${COLORS.reset}`);
  });

  if (filtered.length > 20) {
    console.log(COLORS.gray + `  ... and ${filtered.length - 20} more` + COLORS.reset);
  }
}

function searchSnippets(query) {
  const snippets = loadSnippets();
  const q = query.toLowerCase();
  
  const results = snippets.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.content.toLowerCase().includes(q) ||
    s.tags.some(t => t.includes(q)) ||
    s.lang.includes(q)
  );

  if (results.length === 0) {
    console.log(COLORS.yellow + `No snippets found for "${query}"` + COLORS.reset);
    return;
  }

  console.log(COLORS.bold + `Search: "${query}"` + COLORS.reset + COLORS.gray + ` · ${results.length} results` + COLORS.reset);
  console.log();

  results.forEach(s => {
    const tags = s.tags.length > 0 ? COLORS.gray + ' #' + s.tags.join(' #') : '';
    console.log(`  ${getIcon(s.lang)} ${COLORS.cyan}${s.id}${COLORS.reset} ${COLORS.bold}${s.title}${COLORS.reset}`);
    console.log(`     ${COLORS.gray}${s.lang}${tags}${COLORS.reset}`);
    
    // Show matching content preview
    const lines = s.content.split('\n').filter(line => line.toLowerCase().includes(q));
    if (lines.length > 0) {
      const preview = lines[0].trim().slice(0, 60);
      console.log(`     ${COLORS.yellow}↳${COLORS.reset} ${COLORS.dim}${preview}${preview.length >= 60 ? '...' : ''}${COLORS.reset}`);
    }
  });
}

function showSnippet(id) {
  const snippets = loadSnippets();
  const snippet = snippets.find(s => s.id === id);
  
  if (!snippet) {
    console.log(COLORS.red + `Snippet "${id}" not found` + COLORS.reset);
    return;
  }

  // Update access count
  snippet.accessed = (snippet.accessed || 0) + 1;
  saveSnippets(snippets);

  const tags = snippet.tags.length > 0 ? ' #' + snippet.tags.join(' #') : '';
  const date = new Date(snippet.created).toLocaleDateString();
  
  console.log();
  console.log(`${getIcon(snippet.lang)} ${COLORS.bold}${snippet.title}${COLORS.reset}`);
  console.log(`${COLORS.gray}${snippet.lang} · ${date}${COLORS.gray}${tags}${COLORS.reset}`);
  console.log(COLORS.gray + '─'.repeat(50) + COLORS.reset);
  console.log();
  console.log(snippet.content);
  console.log();
  console.log(COLORS.gray + '─'.repeat(50) + COLORS.reset);
  console.log(COLORS.dim + `ID: ${snippet.id} · Copy: nix clip copy ${snippet.id}` + COLORS.reset);
}

function copySnippet(id) {
  const snippets = loadSnippets();
  const snippet = snippets.find(s => s.id === id);
  
  if (!snippet) {
    console.log(COLORS.red + `Snippet "${id}" not found` + COLORS.reset);
    return;
  }

  if (copyToClipboard(snippet.content)) {
    snippet.accessed = (snippet.accessed || 0) + 1;
    saveSnippets(snippets);
    console.log(COLORS.green + '✓ Copied to clipboard' + COLORS.reset);
    console.log(COLORS.dim + `  ${snippet.title} (${snippet.content.length} chars)` + COLORS.reset);
  } else {
    console.log(COLORS.yellow + 'Could not copy to clipboard. Displaying instead:' + COLORS.reset);
    console.log(snippet.content);
  }
}

function deleteSnippet(id) {
  let snippets = loadSnippets();
  const idx = snippets.findIndex(s => s.id === id);
  
  if (idx === -1) {
    console.log(COLORS.red + `Snippet "${id}" not found` + COLORS.reset);
    return;
  }

  const snippet = snippets[idx];
  snippets.splice(idx, 1);
  saveSnippets(snippets);

  console.log(COLORS.green + '✓ Snippet deleted' + COLORS.reset);
  console.log(COLORS.dim + `  ${snippet.title}` + COLORS.reset);
}

function listLanguages() {
  const snippets = loadSnippets();
  const langs = {};
  
  snippets.forEach(s => {
    langs[s.lang] = (langs[s.lang] || 0) + 1;
  });

  const sorted = Object.entries(langs).sort((a, b) => b[1] - a[1]);
  
  console.log(COLORS.bold + 'Languages' + COLORS.reset);
  console.log();
  
  sorted.forEach(([lang, count]) => {
    console.log(`  ${getIcon(lang)} ${COLORS.cyan}${lang}${COLORS.reset} ${COLORS.gray}· ${count} snippet${count !== 1 ? 's' : ''}${COLORS.reset}`);
  });
}

function listTags() {
  const snippets = loadSnippets();
  const tags = {};
  
  snippets.forEach(s => {
    s.tags.forEach(t => {
      tags[t] = (tags[t] || 0) + 1;
    });
  });

  const sorted = Object.entries(tags).sort((a, b) => b[1] - a[1]);
  
  if (sorted.length === 0) {
    console.log(COLORS.yellow + 'No tags used yet.' + COLORS.reset);
    return;
  }

  console.log(COLORS.bold + 'Tags' + COLORS.reset);
  console.log();
  
  sorted.forEach(([tag, count]) => {
    const bar = '█'.repeat(Math.min(count, 10));
    console.log(`  #${COLORS.yellow}${tag}${COLORS.reset} ${COLORS.gray}${bar} ${count}${COLORS.reset}`);
  });
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(COLORS.bold + '📎 nix clip — Code snippet manager' + COLORS.reset);
  console.log();
  console.log(COLORS.gray + 'Save snippets:' + COLORS.reset);
  console.log('  echo "code" | nix clip add "Title" js utils');
  console.log('  nix clip add "Dockerfile" docker --file ./Dockerfile');
  console.log();
  console.log(COLORS.gray + 'Browse & search:' + COLORS.reset);
  console.log('  nix clip list          # All snippets');
  console.log('  nix clip list js       # Filter by language');
  console.log('  nix clip search axios  # Search content');
  console.log();
  console.log(COLORS.gray + 'Use snippets:' + COLORS.reset);
  console.log('  nix clip show <id>     # View snippet');
  console.log('  nix clip copy <id>     # Copy to clipboard');
  console.log('  nix clip delete <id>   # Remove snippet');
  console.log();
  console.log(COLORS.gray + 'Overview:' + COLORS.reset);
  console.log('  nix clip lang          # List languages');
  console.log('  nix clip tags          # List tags');
  process.exit(0);
}

switch (command) {
  case 'add':
    if (!args[1]) {
      console.log(COLORS.red + 'Title required' + COLORS.reset);
      process.exit(1);
    }
    // Check for --file flag
    const fileIdx = args.indexOf('--file');
    let content = '';
    if (fileIdx !== -1 && args[fileIdx + 1]) {
      try {
        content = fs.readFileSync(args[fileIdx + 1], 'utf8');
        process.stdin.push(content); // Push to stdin for addSnippet
      } catch (e) {
        console.log(COLORS.red + `Cannot read file: ${args[fileIdx + 1]}` + COLORS.reset);
        process.exit(1);
      }
    }
    addSnippet(args[1], args[2], args.slice(3).filter(a => a !== '--file' && a !== args[fileIdx + 1]));
    break;
  
  case 'list':
    listSnippets(args[1]);
    break;
  
  case 'search':
    if (!args[1]) {
      console.log(COLORS.red + 'Search query required' + COLORS.reset);
      process.exit(1);
    }
    searchSnippets(args[1]);
    break;
  
  case 'show':
    if (!args[1]) {
      console.log(COLORS.red + 'Snippet ID required' + COLORS.reset);
      process.exit(1);
    }
    showSnippet(args[1]);
    break;
  
  case 'copy':
    if (!args[1]) {
      console.log(COLORS.red + 'Snippet ID required' + COLORS.reset);
      process.exit(1);
    }
    copySnippet(args[1]);
    break;
  
  case 'delete':
  case 'rm':
    if (!args[1]) {
      console.log(COLORS.red + 'Snippet ID required' + COLORS.reset);
      process.exit(1);
    }
    deleteSnippet(args[1]);
    break;
  
  case 'lang':
  case 'langs':
  case 'languages':
    listLanguages();
    break;
  
  case 'tags':
  case 'tag':
    listTags();
    break;
  
  default:
    console.log(COLORS.red + `Unknown command: ${command}` + COLORS.reset);
    console.log(COLORS.dim + 'Try: nix clip help' + COLORS.reset);
    process.exit(1);
}
