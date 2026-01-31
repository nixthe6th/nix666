#!/usr/bin/env node
/**
 * import.js - Import data into nix from various formats
 * 
 * Usage:
 *   nix import                    # Interactive import wizard
 *   nix import json <file>        # Import from JSON export
 *   nix import csv <file>         # Import from CSV
 *   nix import merge              # Merge with existing data
 *   nix import --dry-run          # Preview changes without applying
 * 
 * Options:
 *   --force                       # Overwrite existing data
 *   --backup                      # Create backup before import
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA_DIR = path.join(process.cwd(), 'data');
const EXPORT_DIR = path.join(process.cwd(), 'exports');

// Root-level data files
const ROOT_FILES = {
  bookmarks: 'bookmarks.json',
  ideas: 'ideas.json',
  projects: 'projects.json',
  quotes: 'quotes.json',
  sprints: 'sprints.json'
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
  readings: 'readings.json',
  zettels: 'zettels.json',
  subscriptions: 'subscriptions.json',
  sleep: 'sleep.json',
  workouts: 'workouts.json',
  gratitude: 'gratitude.json',
  energy: 'energy.json'
};

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

// Ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read JSON file safely
function readJson(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
}

// Write JSON file
function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Create backup of current data
function createBackup() {
  const backupDir = path.join(process.cwd(), '.backups', `pre-import-${Date.now()}`);
  ensureDir(backupDir);
  
  // Backup data directory
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.copyFileSync(
          path.join(DATA_DIR, file),
          path.join(backupDir, file)
        );
      }
    }
  }
  
  // Backup root files
  for (const [key, filename] of Object.entries(ROOT_FILES)) {
    const srcPath = path.join(process.cwd(), filename);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(backupDir, filename));
    }
  }
  
  return backupDir;
}

// Generate unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// Import from JSON export
async function importJson(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    console.log(`${C.red}✗ File not found: ${filePath}${C.reset}`);
    return false;
  }
  
  const importData = readJson(filePath, {});
  
  if (options.dryRun) {
    console.log(`${C.yellow}▶ DRY RUN - No changes will be made${C.reset}\n`);
  }
  
  // Validate structure
  if (!importData.exported || !importData.exportedAt) {
    console.log(`${C.yellow}⚠ Not a standard nix export file${C.reset}`);
    console.log(`  Importing as raw data...\n`);
  }
  
  const data = importData.data || importData;
  let totalImported = 0;
  
  // Import data files
  for (const [key, filename] of Object.entries(DATA_FILES)) {
    if (data[key] && Array.isArray(data[key])) {
      const existing = readJson(path.join(DATA_DIR, filename));
      const existingIds = new Set(existing.map(item => item.id));
      
      const newItems = data[key].filter(item => {
        if (!item.id) item.id = generateId();
        return options.force || !existingIds.has(item.id);
      });
      
      if (!options.dryRun) {
        if (options.merge) {
          writeJson(path.join(DATA_DIR, filename), [...existing, ...newItems]);
        } else {
          writeJson(path.join(DATA_DIR, filename), newItems);
        }
      }
      
      console.log(`${C.green}✓${C.reset} ${key}: ${newItems.length} items`);
      totalImported += newItems.length;
    }
  }
  
  // Import root files
  for (const [key, filename] of Object.entries(ROOT_FILES)) {
    if (data[key]) {
      const targetPath = path.join(process.cwd(), filename);
      const existing = readJson(targetPath);
      
      let newData = data[key];
      if (options.merge && Array.isArray(existing) && Array.isArray(newData)) {
        const existingIds = new Set(existing.map(i => i.id));
        newData = [...existing, ...newData.filter(i => !existingIds.has(i.id))];
      }
      
      if (!options.dryRun) {
        writeJson(targetPath, newData);
      }
      
      console.log(`${C.green}✓${C.reset} ${key}: imported`);
      totalImported++;
    }
  }
  
  console.log(`\n${C.bold}${totalImported > 0 ? C.green : C.yellow}${totalImported} items processed${C.reset}`);
  return totalImported > 0;
}

// Import from CSV
async function importCsv(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    console.log(`${C.red}✗ File not found: ${filePath}${C.reset}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) {
    console.log(`${C.red}✗ CSV file is empty or invalid${C.reset}`);
    return false;
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, idx) => row[h] = values[idx]);
    rows.push(row);
  }
  
  // Detect data type from headers
  let dataType = null;
  if (headers.includes('text') && headers.includes('done')) {
    dataType = 'todos';
  } else if (headers.includes('amount') && headers.includes('category')) {
    dataType = 'expenses';
  } else if (headers.includes('name') && headers.includes('streak')) {
    dataType = 'habits';
  }
  
  if (!dataType) {
    console.log(`${C.yellow}⚠ Could not auto-detect data type${C.reset}`);
    console.log(`  Headers: ${headers.join(', ')}`);
    return false;
  }
  
  console.log(`${C.cyan}Detected: ${dataType}${C.reset}`);
  
  if (options.dryRun) {
    console.log(`${C.yellow}▶ DRY RUN - ${rows.length} rows would be imported${C.reset}`);
    return true;
  }
  
  // Convert to nix format
  const items = rows.map(row => {
    const item = { id: generateId(), createdAt: new Date().toISOString() };
    
    if (dataType === 'todos') {
      item.text = row.text;
      item.done = row.done === 'true' || row.done === '1';
      item.priority = row.priority || 'medium';
      if (row.tags) item.tags = row.tags.split(';');
    } else if (dataType === 'expenses') {
      item.amount = parseFloat(row.amount) || 0;
      item.description = row.description || row.desc || '';
      item.category = row.category || 'uncategorized';
      item.date = row.date || new Date().toISOString().split('T')[0];
    } else if (dataType === 'habits') {
      item.name = row.name;
      item.streak = parseInt(row.streak) || 0;
      item.frequency = row.frequency || 'daily';
    }
    
    return item;
  });
  
  const filename = DATA_FILES[dataType];
  const existing = options.merge ? readJson(path.join(DATA_DIR, filename)) : [];
  writeJson(path.join(DATA_DIR, filename), [...existing, ...items]);
  
  console.log(`${C.green}✓ Imported ${items.length} ${dataType}${C.reset}`);
  return true;
}

// Interactive wizard
async function interactiveWizard() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (q) => new Promise(resolve => rl.question(q, resolve));
  
  console.log(`${C.bold}${C.cyan}╔════════════════════════════════════╗`);
  console.log(`║      NIX Import Wizard             ║`);
  console.log(`╚════════════════════════════════════╝${C.reset}\n`);
  
  // List available export files
  const exportFiles = [];
  if (fs.existsSync(EXPORT_DIR)) {
    const files = fs.readdirSync(EXPORT_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        exportFiles.push(file);
      }
    }
  }
  
  if (exportFiles.length > 0) {
    console.log(`${C.bold}Available exports:${C.reset}`);
    exportFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log('');
  }
  
  const filePath = await question('Path to import file: ');
  
  if (!fs.existsSync(filePath)) {
    console.log(`${C.red}✗ File not found${C.reset}`);
    rl.close();
    return;
  }
  
  const format = filePath.endsWith('.csv') ? 'csv' : 'json';
  const merge = (await question('Merge with existing data? (y/N): ')).toLowerCase() === 'y';
  const backup = (await question('Create backup first? (Y/n): ')).toLowerCase() !== 'n';
  
  rl.close();
  
  const options = { merge, backup, dryRun: false };
  
  if (backup) {
    const backupDir = createBackup();
    console.log(`${C.dim}Backup created: ${backupDir}${C.reset}\n`);
  }
  
  if (format === 'json') {
    await importJson(filePath, options);
  } else {
    await importCsv(filePath, options);
  }
}

// Show help
function showHelp() {
  console.log(`
${C.bold}${C.cyan}nix import${C.reset} - Import data into nix

${C.bold}Usage:${C.reset}
  nix import                    Interactive import wizard
  nix import json <file>        Import from JSON file
  nix import csv <file>         Import from CSV file

${C.bold}Options:${C.reset}
  --merge                       Merge with existing data
  --force                       Overwrite existing items
  --backup                      Create backup before import
  --dry-run                     Preview changes without applying

${C.bold}Examples:${C.reset}
  nix import json exports/nix-full-export-2026-01-31.json
  nix import csv expenses.csv --merge
  nix import --dry-run exports/partial.json
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const options = {
    merge: args.includes('--merge'),
    force: args.includes('--force'),
    backup: args.includes('--backup'),
    dryRun: args.includes('--dry-run')
  };
  
  ensureDir(DATA_DIR);
  
  if (args.length === 0) {
    await interactiveWizard();
    return;
  }
  
  const format = args[0];
  const filePath = args[1];
  
  if (options.backup) {
    const backupDir = createBackup();
    console.log(`${C.dim}Backup created: ${backupDir}${C.reset}\n`);
  }
  
  if (format === 'json' && filePath) {
    await importJson(filePath, options);
  } else if (format === 'csv' && filePath) {
    await importCsv(filePath, options);
  } else if (fs.existsSync(format)) {
    // Auto-detect format from file extension
    if (format.endsWith('.json')) {
      await importJson(format, options);
    } else if (format.endsWith('.csv')) {
      await importCsv(format, options);
    } else {
      console.log(`${C.red}✗ Unknown file format${C.reset}`);
    }
  } else {
    console.log(`${C.red}✗ Unknown command or file not found${C.reset}`);
    showHelp();
  }
}

main().catch(err => {
  console.error(`${C.red}Error: ${err.message}${C.reset}`);
  process.exit(1);
});
