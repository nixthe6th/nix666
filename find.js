#!/usr/bin/env node
/**
 * find.js - Universal search across all NIX data
 * Usage: find [query] [options]
 * 
 * Searches across: todos, ideas, quotes, projects, sprints, bookmarks
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

const ICONS = {
  todo: '☐',
  idea: '💡',
  quote: '"',
  project: '⚡',
  sprint: '🏃',
  bookmark: '🔖'
};

// Data sources configuration
const SOURCES = [
  { name: 'todos', file: 'data/todos.json', type: 'todo', icon: '☐' },
  { name: 'ideas', file: 'ideas.json', type: 'idea', icon: '💡' },
  { name: 'quotes', file: 'quotes.json', type: 'quote', icon: '"' },
  { name: 'projects', file: 'projects.json', type: 'project', icon: '⚡' },
  { name: 'sprints', file: 'sprints.json', type: 'sprint', icon: '🏃' },
  { name: 'bookmarks', file: 'bookmarks.json', type: 'bookmark', icon: '🔖' }
];

function loadJson(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return null;
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function normalize(str) {
  return str.toLowerCase().trim();
}

function matches(query, text) {
  if (!text) return false;
  const nQuery = normalize(query);
  const nText = normalize(text);
  return nText.includes(nQuery);
}

function highlight(text, query) {
  if (!query) return text;
  const nQuery = normalize(query);
  const nText = normalize(text);
  const idx = nText.indexOf(nQuery);
  if (idx === -1) return text;
  
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return `${before}${COLORS.yellow}${match}${COLORS.reset}${after}`;
}

function truncate(str, maxLen = 60) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

// Search functions for each source type
const searchFns = {
  todo: (data, query) => {
    if (!data || !data.todos) return [];
    return data.todos
      .filter(t => matches(query, t.text) || matches(query, t.id))
      .map(t => ({
        type: 'todo',
        icon: t.done ? '☑' : '☐',
        title: t.text,
        meta: `${t.priority} · ${t.id}`,
        date: t.created
      }));
  },
  
  idea: (data, query) => {
    if (!data || !data.ideas) return [];
    return data.ideas
      .filter(i => matches(query, i.text) || matches(query, i.tags?.join(' ')))
      .map(i => ({
        type: 'idea',
        icon: '💡',
        title: i.text,
        meta: `${i.status} · ${i.priority}${i.tags ? ' · ' + i.tags.join(', ') : ''}`,
        date: i.created
      }));
  },
  
  quote: (data, query) => {
    if (!data || !data.quotes) return [];
    return data.quotes
      .filter(q => matches(query, q.text) || matches(query, q.author) || matches(query, q.tags?.join(' ')))
      .map(q => ({
        type: 'quote',
        icon: '"',
        title: truncate(q.text, 50),
        meta: q.author + (q.tags ? ' · ' + q.tags.join(', ') : ''),
        date: null
      }));
  },
  
  project: (data, query) => {
    if (!data) return [];
    return data
      .filter(p => matches(query, p.name) || matches(query, p.description) || matches(query, p.tags?.join(' ')))
      .map(p => ({
        type: 'project',
        icon: '⚡',
        title: p.name,
        meta: `${p.status}${p.tags ? ' · ' + p.tags.join(', ') : ''}`,
        date: p.updated
      }));
  },
  
  sprint: (data, query) => {
    if (!data || !data.sprints) return [];
    return data.sprints
      .filter(s => matches(query, s.message) || matches(query, s.id))
      .map(s => ({
        type: 'sprint',
        icon: '🏃',
        title: truncate(s.message, 50),
        meta: `+${s.additions || 0}/-${s.deletions || 0} · ${s.id?.slice(0, 7)}`,
        date: s.date
      }));
  },
  
  bookmark: (data, query) => {
    if (!data || !data.bookmarks) return [];
    return data.bookmarks
      .filter(b => matches(query, b.title) || matches(query, b.url) || matches(query, b.tags?.join(' ')))
      .map(b => ({
        type: 'bookmark',
        icon: '🔖',
        title: b.title,
        meta: truncate(b.url?.replace(/^https?:\/\//, ''), 40) + (b.tags ? ' · ' + b.tags.join(', ') : ''),
        date: b.added
      }));
  }
};

function search(query, options = {}) {
  const results = [];
  const sources = options.source 
    ? SOURCES.filter(s => s.name === options.source || s.type === options.source)
    : SOURCES;
  
  for (const source of sources) {
    const data = loadJson(source.file);
    if (!data) continue;
    
    const searchFn = searchFns[source.type];
    if (!searchFn) continue;
    
    const matches = searchFn(data, query);
    results.push(...matches.map(m => ({ ...m, source: source.name })));
  }
  
  return results;
}

function formatResults(results, query) {
  if (results.length === 0) {
    return `${COLORS.gray}No results found for "${query}"${COLORS.reset}`;
  }
  
  // Group by type
  const grouped = results.reduce((acc, r) => {
    acc[r.type] = acc[r.type] || [];
    acc[r.type].push(r);
    return acc;
  }, {});
  
  const lines = [];
  lines.push(`${COLORS.bold}${results.length} result${results.length === 1 ? '' : 's'}${COLORS.reset}\n`);
  
  const order = ['todo', 'idea', 'project', 'sprint', 'bookmark', 'quote'];
  
  for (const type of order) {
    const items = grouped[type];
    if (!items || items.length === 0) continue;
    
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + 's';
    lines.push(`${COLORS.cyan}${typeLabel} (${items.length})${COLORS.reset}`);
    lines.push(`${COLORS.gray}${'─'.repeat(40)}${COLORS.reset}`);
    
    for (const item of items) {
      const title = highlight(item.title, query);
      lines.push(`  ${item.icon} ${title}`);
      lines.push(`     ${COLORS.dim}${item.meta}${COLORS.reset}`);
      if (item.date) {
        const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        lines.push(`     ${COLORS.gray}${date}${COLORS.reset}`);
      }
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

function showHelp() {
  console.log(`
${COLORS.bold}find.js${COLORS.reset} - Universal search across NIX data

${COLORS.dim}Usage:${COLORS.reset}
  nix find <query>           Search all data sources
  nix find <query> --todos   Search only todos
  nix find <query> --ideas   Search only ideas
  nix find <query> --quotes  Search only quotes

${COLORS.dim}Examples:${COLORS.reset}
  nix find "api"             Find anything mentioning "api"
  nix find "fix" --todos     Find todos with "fix"
  nix find "@author"         Find quotes by author

${COLORS.dim}Searches:${COLORS.reset}
  • Todos (text, priority, id)
  • Ideas (text, tags, status)
  • Quotes (text, author, tags)
  • Projects (name, description, tags)
  • Sprints (commit messages)
  • Bookmarks (title, url, tags)
`);
}

// CLI
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }
  
  const query = args[0];
  const options = {};
  
  // Check for source filters
  if (args.includes('--todos')) options.source = 'todo';
  if (args.includes('--ideas')) options.source = 'idea';
  if (args.includes('--quotes')) options.source = 'quote';
  if (args.includes('--projects')) options.source = 'project';
  if (args.includes('--sprints')) options.source = 'sprint';
  if (args.includes('--bookmarks')) options.source = 'bookmark';
  
  const results = search(query, options);
  console.log(formatResults(results, query));
}

main();
