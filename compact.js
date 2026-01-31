#!/usr/bin/env node
/**
 * compact.js — Archive old data to keep JSON files fast
 * 
 * Addresses: "Large JSON files - May slow down over months"
 * 
 * Usage:
 *   nix compact                    # Dry run - show what would be archived
 *   nix compact --apply            # Actually archive old entries
 *   nix compact --days 30          # Archive entries older than N days (default: 90)
 *   nix compact --list             # Show archive contents
 *   nix compact stats              # Show data file sizes and growth
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');

// Data files that can grow large over time
const DATA_FILES = [
  { name: 'distractions.json', dateField: 'timestamp' },
  { name: 'expenses.json', dateField: 'date' },
  { name: 'todos.json', dateField: 'created' },
  { name: 'habits.json', dateField: 'date' },
  { name: 'moods.json', dateField: 'timestamp' },
  { name: 'sleep.json', dateField: 'date' },
  { name: 'workouts.json', dateField: 'date' },
  { name: 'learn.json', dateField: 'timestamp' },
  { name: 'network.json', dateField: 'lastContact' },
  { name: 'gratitude.json', dateField: 'date' },
  { name: 'energy.json', dateField: 'timestamp' }
];

const C = {
  g: '\x1b[32m', y: '\x1b[33m', b: '\x1b[34m',
  m: '\x1b[35m', c: '\x1b[36m', r: '\x1b[31m',
  dim: '\x1b[2m', reset: '\x1b[0m'
};

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getArchivePath(filename) {
  const base = path.basename(filename, '.json');
  return path.join(ARCHIVE_DIR, `${base}.archive.json`);
}

function analyzeFile(config) {
  const filePath = path.join(DATA_DIR, config.name);
  if (!fs.existsSync(filePath)) return null;
  
  const stats = fs.statSync(filePath);
  const data = loadJson(filePath);
  
  return {
    name: config.name,
    size: stats.size,
    count: Array.isArray(data) ? data.length : Object.keys(data).length,
    dateField: config.dateField
  };
}

function showStats() {
  console.log(`\n${C.b}📊 Data File Statistics${C.reset}\n`);
  
  let totalSize = 0;
  let totalEntries = 0;
  
  const rows = DATA_FILES.map(config => {
    const info = analyzeFile(config);
    if (!info) return null;
    totalSize += info.size;
    totalEntries += info.count;
    return info;
  }).filter(Boolean);
  
  if (rows.length === 0) {
    console.log('No data files found yet.');
    return;
  }
  
  console.log(`${C.dim}File              Size        Entries${C.reset}`);
  console.log('─'.repeat(50));
  
  rows.sort((a, b) => b.size - a.size).forEach(row => {
    const sizeColor = row.size > 1024 * 1024 ? C.r : row.size > 100 * 1024 ? C.y : C.g;
    console.log(
      `${row.name.padEnd(18)} ${sizeColor}${formatBytes(row.size).padEnd(11)}${C.reset} ${row.count}`
    );
  });
  
  console.log('─'.repeat(50));
  console.log(`${C.b}Total${C.reset}             ${formatBytes(totalSize).padEnd(11)} ${totalEntries}`);
  
  // Archive stats
  if (fs.existsSync(ARCHIVE_DIR)) {
    const archives = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.archive.json'));
    if (archives.length > 0) {
      let archiveSize = 0;
      archives.forEach(f => {
        archiveSize += fs.statSync(path.join(ARCHIVE_DIR, f)).size;
      });
      console.log(`\n${C.dim}Archive files: ${archives.length} (${formatBytes(archiveSize)})${C.reset}`);
    }
  }
  
  console.log('');
}

function compactFile(config, cutoffDate, dryRun = true) {
  const filePath = path.join(DATA_DIR, config.name);
  if (!fs.existsSync(filePath)) return null;
  
  const data = loadJson(filePath);
  if (!Array.isArray(data) || data.length === 0) return null;
  
  const dateField = config.dateField;
  const toArchive = [];
  const toKeep = [];
  
  data.forEach(entry => {
    const dateStr = entry[dateField] || entry.timestamp || entry.date || entry.created;
    if (!dateStr) {
      toKeep.push(entry);
      return;
    }
    
    const entryDate = new Date(dateStr);
    if (entryDate < cutoffDate) {
      toArchive.push(entry);
    } else {
      toKeep.push(entry);
    }
  });
  
  return {
    name: config.name,
    kept: toKeep.length,
    archived: toArchive.length,
    archiveData: toArchive,
    keepData: toKeep
  };
}

function runCompact(days = 90, dryRun = true) {
  ensureDirs();
  const cutoffDate = daysAgo(days);
  
  console.log(`\n${C.b}🗜️  NIX Data Compaction${C.reset}`);
  console.log(`${C.dim}Cutoff: ${formatDate(cutoffDate)} (${days} days ago)${C.reset}`);
  console.log(`${C.dim}Mode: ${dryRun ? 'DRY RUN (no changes)' : 'APPLY (will modify files)'}${C.reset}\n`);
  
  const results = [];
  let totalKept = 0;
  let totalArchived = 0;
  
  DATA_FILES.forEach(config => {
    const result = compactFile(config, cutoffDate, dryRun);
    if (result && result.archived > 0) {
      results.push(result);
      totalKept += result.kept;
      totalArchived += result.archived;
    }
  });
  
  if (results.length === 0) {
    console.log(`${C.g}✨ No old data to archive. All files are fresh!${C.reset}\n`);
    return;
  }
  
  console.log(`${C.dim}File              Keeping  Archiving  Savings${C.reset}`);
  console.log('─'.repeat(55));
  
  results.forEach(r => {
    const savingsPct = Math.round((r.archived / (r.kept + r.archived)) * 100);
    const savingsColor = savingsPct > 50 ? C.g : savingsPct > 20 ? C.y : C.dim;
    console.log(
      `${r.name.padEnd(18)} ${String(r.kept).padStart(7)} ${String(r.archived).padStart(10)} ${savingsColor}${String(savingsPct).padStart(7)}%${C.reset}`
    );
  });
  
  console.log('─'.repeat(55));
  console.log(`${C.b}Total${C.reset}             ${String(totalKept).padStart(7)} ${String(totalArchived).padStart(10)}`);
  
  if (dryRun) {
    console.log(`\n${C.y}⚠️  This was a dry run. Use --apply to actually archive.${C.reset}\n`);
  } else {
    // Actually perform the archive
    results.forEach(r => {
      const config = DATA_FILES.find(f => f.name === r.name);
      
      // Save trimmed file
      const filePath = path.join(DATA_DIR, r.name);
      saveJson(filePath, r.keepData);
      
      // Append to archive
      const archivePath = getArchivePath(r.name);
      let existingArchive = [];
      if (fs.existsSync(archivePath)) {
        existingArchive = loadJson(archivePath);
      }
      const combined = existingArchive.concat(r.archiveData);
      saveJson(archivePath, combined);
    });
    
    console.log(`\n${C.g}✅ Archived ${totalArchived} entries to data/archive/${C.reset}\n`);
  }
}

function listArchives() {
  ensureDirs();
  
  if (!fs.existsSync(ARCHIVE_DIR)) {
    console.log('\nNo archives yet.\n');
    return;
  }
  
  const archives = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.archive.json'));
  
  if (archives.length === 0) {
    console.log('\nNo archives yet.\n');
    return;
  }
  
  console.log(`\n${C.b}📦 Archive Contents${C.reset}\n`);
  
  archives.forEach(filename => {
    const filePath = path.join(ARCHIVE_DIR, filename);
    const stats = fs.statSync(filePath);
    const data = loadJson(filePath);
    const baseName = path.basename(filename, '.archive.json');
    
    console.log(`${baseName.padEnd(15)} ${formatBytes(stats.size).padEnd(10)} ${data.length} entries`);
  });
  
  console.log('');
}

function showHelp() {
  console.log(`
${C.b}nix compact${C.reset} — Archive old data to keep NIX fast

${C.dim}Addresses the "Large JSON files" issue from the roadmap.${C.reset}

Usage:
  nix compact                # Dry run - preview what would be archived
  nix compact --apply        # Actually archive entries older than 90 days
  nix compact --days 30      # Change archive threshold (default: 90)
  nix compact stats          # Show file sizes and entry counts
  nix compact --list         # Show archive contents

Examples:
  nix compact --days 30 --apply   # Archive anything older than 30 days
  nix compact stats               # Check which files are growing

How it works:
  • Moves entries older than N days to data/archive/
  • Keeps recent data fast and responsive
  • Archives are plain JSON — fully accessible
  • No data is deleted, just reorganized
`);
}

// Main
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  // Default: show stats if no args, help if explicitly requested
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else {
    showStats();
  }
  process.exit(0);
}

if (args[0] === 'stats') {
  showStats();
  process.exit(0);
}

if (args[0] === 'help') {
  showHelp();
  process.exit(0);
}

// Parse flags
const dryRun = !args.includes('--apply');
const daysArg = args.find(a => a.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1]) : 
             args[args.indexOf('--days') + 1] || 90;

if (args.includes('--list')) {
  listArchives();
} else {
  runCompact(parseInt(days), dryRun);
}
