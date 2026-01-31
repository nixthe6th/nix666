#!/usr/bin/env node
/**
 * export.js - Export nix data in various formats for portability
 * 
 * Usage:
 *   nix export                  # Export all data to export/ directory
 *   nix export json             # Export as formatted JSON
 *   nix export csv              # Export as CSV (todos, habits, expenses)
 *   nix export markdown         # Export as Markdown notes
 * 
 * Options:
 *   --output-dir <path>         # Custom export directory
 *   --since <date>              # Export data since date (YYYY-MM-DD)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const NIX_DIR = path.join(os.homedir(), '.nix');
const DATA_DIR = path.join(NIX_DIR, 'data');
const EXPORT_DIR = path.join(process.cwd(), 'exports');

// Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

// Data file mappings
const DATA_FILES = {
  todos: 'todos.json',
  habits: 'habits.json',
  mood: 'mood.json',
  sessions: 'sessions.json',
  expenses: 'expenses.json',
  learning: 'learning.json',
  flashcards: 'flashcards.json',
  clips: 'clips.json',
  reading: 'reading.json',
  zettel: 'zettel.json',
  'zettel-links': 'zettel-links.json',
  sleep: 'sleep.json',
  workouts: 'workouts.json',
  water: 'water.json',
  gratitude: 'gratitude.json',
  energy: 'energy.json'
};

function loadData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

// Escape CSV field
function csvEscape(str) {
  if (str == null) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Export as formatted JSON
function exportJSON(outputDir, since) {
  ensureDir(outputDir);
  
  console.log(`\n${C.bold}${C.cyan}📦 Exporting to JSON${C.reset}\n`);
  
  const exported = [];
  const sinceDate = since ? new Date(since) : null;
  
  for (const [name, filename] of Object.entries(DATA_FILES)) {
    const data = loadData(filename);
    if (!data) continue;
    
    // Filter by date if specified
    let filteredData = data;
    if (sinceDate && Array.isArray(data)) {
      filteredData = data.filter(item => {
        const itemDate = item.created || item.date || item.timestamp || item.logged;
        return itemDate && new Date(itemDate) >= sinceDate;
      });
    }
    
    if (Array.isArray(filteredData) && filteredData.length === 0) continue;
    
    const outputFile = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(filteredData, null, 2));
    
    const count = Array.isArray(filteredData) ? filteredData.length : 1;
    exported.push({ name, count, file: `${name}.json` });
    console.log(`  ${C.green}✓${C.reset} ${name.padEnd(15)} ${C.dim}${count} items${C.reset}`);
  }
  
  // Create manifest
  const manifest = {
    exportedAt: new Date().toISOString(),
    format: 'json',
    since: since || null,
    files: exported
  };
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  console.log(`\n${C.green}✓ Exported ${exported.length} files to:${C.reset}`);
  console.log(`  ${C.dim}${outputDir}${C.reset}`);
  
  return exported.length;
}

// Export as CSV
function exportCSV(outputDir, since) {
  ensureDir(outputDir);
  
  console.log(`\n${C.bold}${C.cyan}📊 Exporting to CSV${C.reset}\n`);
  
  const sinceDate = since ? new Date(since) : null;
  let totalExported = 0;
  
  // Export Todos
  const todos = loadData('todos.json');
  if (todos && todos.length > 0) {
    let filtered = todos;
    if (sinceDate) {
      filtered = todos.filter(t => t.created && new Date(t.created) >= sinceDate);
    }
    if (filtered.length > 0) {
      const headers = ['id', 'text', 'priority', 'done', 'created', 'completed', 'tags'];
      const rows = filtered.map(t => [
        t.id, csvEscape(t.text), t.priority || '', t.done || false,
        t.created || '', t.completed || '', (t.tags || []).join(';')
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fs.writeFileSync(path.join(outputDir, 'todos.csv'), csv);
      console.log(`  ${C.green}✓${C.reset} todos.csv ${C.dim}${filtered.length} items${C.reset}`);
      totalExported++;
    }
  }
  
  // Export Habits
  const habits = loadData('habits.json');
  if (habits && habits.length > 0) {
    let filtered = habits;
    if (sinceDate) {
      filtered = habits.filter(h => h.created && new Date(h.created) >= sinceDate);
    }
    if (filtered.length > 0) {
      const headers = ['id', 'name', 'frequency', 'streak', 'created', 'lastCompleted'];
      const rows = filtered.map(h => [
        h.id, csvEscape(h.name), h.frequency || 'daily', h.streak || 0,
        h.created || '', h.lastCompleted || ''
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fs.writeFileSync(path.join(outputDir, 'habits.csv'), csv);
      console.log(`  ${C.green}✓${C.reset} habits.csv ${C.dim}${filtered.length} items${C.reset}`);
      totalExported++;
    }
  }
  
  // Export Expenses
  const expenses = loadData('expenses.json');
  if (expenses && expenses.length > 0) {
    let filtered = expenses;
    if (sinceDate) {
      filtered = expenses.filter(e => e.date && new Date(e.date) >= sinceDate);
    }
    if (filtered.length > 0) {
      const headers = ['id', 'amount', 'description', 'category', 'date', 'tags'];
      const rows = filtered.map(e => [
        e.id, e.amount, csvEscape(e.description), e.category || '',
        e.date || '', (e.tags || []).join(';')
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fs.writeFileSync(path.join(outputDir, 'expenses.csv'), csv);
      console.log(`  ${C.green}✓${C.reset} expenses.csv ${C.dim}${filtered.length} items${C.reset}`);
      totalExported++;
    }
  }
  
  // Export Mood
  const mood = loadData('mood.json');
  if (mood && mood.length > 0) {
    let filtered = mood;
    if (sinceDate) {
      filtered = mood.filter(m => m.date && new Date(m.date) >= sinceDate);
    }
    if (filtered.length > 0) {
      const headers = ['date', 'rating', 'note', 'tags'];
      const rows = filtered.map(m => [
        m.date || '', m.rating || '', csvEscape(m.note || ''), (m.tags || []).join(';')
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fs.writeFileSync(path.join(outputDir, 'mood.csv'), csv);
      console.log(`  ${C.green}✓${C.reset} mood.csv ${C.dim}${filtered.length} items${C.reset}`);
      totalExported++;
    }
  }
  
  // Export Sleep
  const sleep = loadData('sleep.json');
  if (sleep && sleep.length > 0) {
    let filtered = sleep;
    if (sinceDate) {
      filtered = sleep.filter(s => s.date && new Date(s.date) >= sinceDate);
    }
    if (filtered.length > 0) {
      const headers = ['date', 'hours', 'quality', 'bedTime', 'wakeTime', 'notes'];
      const rows = filtered.map(s => [
        s.date || '', s.hours || '', s.quality || '', s.bedTime || '', s.wakeTime || '', csvEscape(s.notes || '')
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fs.writeFileSync(path.join(outputDir, 'sleep.csv'), csv);
      console.log(`  ${C.green}✓${C.reset} sleep.csv ${C.dim}${filtered.length} items${C.reset}`);
      totalExported++;
    }
  }
  
  // Export Zettel notes
  const zettel = loadData('zettel.json');
  if (zettel && zettel.length > 0) {
    let filtered = zettel;
    if (sinceDate) {
      filtered = zettel.filter(z => z.created && new Date(z.created) >= sinceDate);
    }
    if (filtered.length > 0) {
      const headers = ['id', 'title', 'tags', 'created', 'updated', 'content_preview'];
      const rows = filtered.map(z => [
        z.id, csvEscape(z.title), (z.tags || []).join(';'),
        z.created || '', z.updated || '', csvEscape((z.content || '').substring(0, 100))
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fs.writeFileSync(path.join(outputDir, 'zettel.csv'), csv);
      console.log(`  ${C.green}✓${C.reset} zettel.csv ${C.dim}${filtered.length} items${C.reset}`);
      totalExported++;
    }
  }
  
  // Create manifest
  const manifest = {
    exportedAt: new Date().toISOString(),
    format: 'csv',
    since: since || null
  };
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  console.log(`\n${C.green}✓ Exported ${totalExported} CSV files to:${C.reset}`);
  console.log(`  ${C.dim}${outputDir}${C.reset}`);
  
  return totalExported;
}

// Export as Markdown
function exportMarkdown(outputDir, since) {
  ensureDir(outputDir);
  
  console.log(`\n${C.bold}${C.cyan}📝 Exporting to Markdown${C.reset}\n`);
  
  const sinceDate = since ? new Date(since) : null;
  let totalExported = 0;
  
  // Export Zettel as Markdown notes
  const zettel = loadData('zettel.json');
  if (zettel && zettel.length > 0) {
    const zettelDir = path.join(outputDir, 'zettel');
    ensureDir(zettelDir);
    
    let filtered = zettel;
    if (sinceDate) {
      filtered = zettel.filter(z => z.created && new Date(z.created) >= sinceDate);
    }
    
    filtered.forEach(note => {
      const date = note.created ? formatDate(note.created) : 'unknown';
      const tags = (note.tags || []).map(t => `#${t}`).join(' ');
      
      let md = `---\n`;
      md += `id: ${note.id}\n`;
      md += `title: ${note.title}\n`;
      md += `created: ${note.created || ''}\n`;
      md += `updated: ${note.updated || ''}\n`;
      md += `tags: [${(note.tags || []).join(', ')}]\n`;
      md += `---\n\n`;
      md += `# ${note.title}\n\n`;
      if (tags) md += `Tags: ${tags}\n\n`;
      md += note.content || '';
      md += '\n';
      
      const filename = `${date}-${note.id}.md`;
      fs.writeFileSync(path.join(zettelDir, filename), md);
    });
    
    console.log(`  ${C.green}✓${C.reset} zettel/ ${C.dim}${filtered.length} notes${C.reset}`);
    totalExported += filtered.length;
  }
  
  // Export Reading list
  const reading = loadData('reading.json');
  if (reading && reading.length > 0) {
    let md = '# Reading List\n\n';
    md += `Generated: ${new Date().toISOString()}\n\n`;
    
    let filtered = reading;
    if (sinceDate) {
      filtered = reading.filter(r => r.added && new Date(r.added) >= sinceDate);
    }
    
    // Group by status
    const byStatus = { reading: [], later: [], done: [] };
    filtered.forEach(r => {
      const status = r.status || 'later';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(r);
    });
    
    for (const [status, items] of Object.entries(byStatus)) {
      if (items.length === 0) continue;
      md += `## ${status.charAt(0).toUpperCase() + status.slice(1)}\n\n`;
      items.forEach(r => {
        const progress = r.progress ? ` (${r.progress}%)` : '';
        const type = r.type ? ` [${r.type}]` : '';
        md += `- [${status === 'done' ? 'x' : ' '}]${type} **${r.title}**${progress}\n`;
        if (r.author) md += `  - Author: ${r.author}\n`;
        if (r.url) md += `  - URL: ${r.url}\n`;
        if (r.notes) md += `  - Notes: ${r.notes}\n`;
      });
      md += '\n';
    }
    
    fs.writeFileSync(path.join(outputDir, 'reading.md'), md);
    console.log(`  ${C.green}✓${C.reset} reading.md ${C.dim}${filtered.length} items${C.reset}`);
    totalExported++;
  }
  
  // Create manifest
  const manifest = {
    exportedAt: new Date().toISOString(),
    format: 'markdown',
    since: since || null
  };
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  console.log(`\n${C.green}✓ Exported to Markdown:${C.reset}`);
  console.log(`  ${C.dim}${outputDir}${C.reset}`);
  
  return totalExported;
}

// Show export summary
function showSummary() {
  console.log(`\n${C.bold}${C.cyan}📦 Export Summary${C.reset}\n`);
  
  let totalFiles = 0;
  let totalItems = 0;
  
  for (const [name, filename] of Object.entries(DATA_FILES)) {
    const data = loadData(filename);
    if (!data) continue;
    const count = Array.isArray(data) ? data.length : 1;
    totalItems += count;
    totalFiles++;
    console.log(`  ${name.padEnd(15)} ${C.dim}${count} items${C.reset}`);
  }
  
  console.log(`\n${C.bold}Total:${C.reset} ${totalFiles} files, ${totalItems} items`);
  console.log(`\n${C.dim}Data directory: ${DATA_DIR}${C.reset}`);
}

// Show help
function showHelp() {
  console.log(`
${C.bold}${C.cyan}📦 nix export${C.reset} - Export your data in various formats

${C.bold}Usage:${C.reset}
  nix export                  # Show summary of all data
  nix export json             # Export all data as JSON
  nix export csv              # Export tabular data as CSV
  nix export markdown         # Export notes as Markdown files

${C.bold}Options:${C.reset}
  --output-dir <path>         # Custom export directory
  --since <YYYY-MM-DD>        # Only export data since date

${C.bold}Examples:${C.reset}
  nix export json                          # Export everything as JSON
  nix export csv --since 2026-01-01        # Export CSV for this year
  nix export markdown --output-dir ./notes # Export to specific folder

${C.bold}Formats:${C.reset}
  json      - Machine-readable, complete data preservation
  csv       - Spreadsheet compatible (todos, habits, expenses, etc.)
  markdown  - Human-readable notes (zettel, reading list)

${C.dim}Data is exported from ~/.nix/data/${C.reset}
`);
}

// Main
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // Parse options
  const outputIndex = args.indexOf('--output-dir');
  const outputDir = outputIndex > -1 ? args[outputIndex + 1] : null;
  
  const sinceIndex = args.indexOf('--since');
  const since = sinceIndex > -1 ? args[sinceIndex + 1] : null;
  
  const format = args.find(a => !a.startsWith('--') && a !== outputDir && a !== since);
  
  if (!format) {
    showSummary();
    console.log(`\nRun with --help for export options`);
    return;
  }
  
  const dir = outputDir || path.join(EXPORT_DIR, `${format}-${timestamp()}`);
  
  switch (format) {
    case 'json':
      exportJSON(dir, since);
      break;
    case 'csv':
      exportCSV(dir, since);
      break;
    case 'markdown':
    case 'md':
      exportMarkdown(dir, since);
      break;
    default:
      console.log(`${C.red}Unknown format: ${format}${C.reset}`);
      console.log(`Supported: json, csv, markdown`);
  }
}

main();
