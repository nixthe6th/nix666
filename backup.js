#!/usr/bin/env node
/**
 * backup.js - Data backup and export for NIX
 * Usage: nix backup [command] [options]
 * 
 * Commands:
 *   backup              Create timestamped backup of all data
 *   backup list         Show backup history
 *   backup export       Export data as markdown
 *   backup clean        Remove old backups (keep last N)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.cwd();
const BACKUP_DIR = path.join(DATA_DIR, '.backups');
const DATA_FILES = [
  'bookmarks.json',
  'ideas.json',
  'projects.json',
  'quotes.json',
  'sprints.json'
];

// Colors for terminal output
const C = {
  g: '\x1b[32m', y: '\x1b[33m', b: '\x1b[34m',
  m: '\x1b[35m', c: '\x1b[36m', r: '\x1b[31m',
  dim: '\x1b[2m', reset: '\x1b[0m'
};

function timestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function createBackup() {
  ensureBackupDir();
  const ts = timestamp();
  const backupPath = path.join(BACKUP_DIR, `backup-${ts}`);
  fs.mkdirSync(backupPath, { recursive: true });
  
  let totalSize = 0;
  let backedUp = 0;
  
  console.log(`${C.c}⚡ Creating backup: ${ts}${C.reset}\n`);
  
  for (const file of DATA_FILES) {
    const srcPath = path.join(DATA_DIR, file);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(backupPath, file);
      const content = fs.readFileSync(srcPath);
      fs.writeFileSync(destPath, content);
      const size = content.length;
      totalSize += size;
      backedUp++;
      console.log(`  ${C.g}✓${C.reset} ${file} ${C.dim}(${formatBytes(size)})${C.reset}`);
    } else {
      console.log(`  ${C.y}○${C.reset} ${file} ${C.dim}(not found)${C.reset}`);
    }
  }
  
  // Create manifest
  const manifest = {
    timestamp: ts,
    created: new Date().toISOString(),
    files: backedUp,
    size: totalSize,
    version: '1.0'
  };
  fs.writeFileSync(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  console.log(`\n${C.g}✓${C.reset} Backed up ${C.b}${backedUp}${C.reset} files (${C.b}${formatBytes(totalSize)}${C.reset})`);
  console.log(`${C.dim}  Location: ${backupPath}${C.reset}`);
  
  return backupPath;
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`${C.y}No backups found.${C.reset}`);
    return;
  }
  
  const entries = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-'))
    .map(f => {
      const fullPath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fullPath);
      const manifestPath = path.join(fullPath, 'manifest.json');
      let manifest = null;
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch {}
      }
      return { name: f, stat, manifest, path: fullPath };
    })
    .sort((a, b) => b.stat.mtime - a.stat.mtime);
  
  if (entries.length === 0) {
    console.log(`${C.y}No backups found.${C.reset}`);
    return;
  }
  
  console.log(`${C.c}⚡ Backup History${C.reset}\n`);
  console.log(`  ${C.dim}Total: ${entries.length} backup(s)${C.reset}\n`);
  
  entries.forEach((entry, i) => {
    const isLatest = i === 0;
    const prefix = isLatest ? `${C.g}→${C.reset}` : ' ';
    const date = entry.manifest?.created 
      ? new Date(entry.manifest.created).toLocaleString()
      : entry.stat.mtime.toLocaleString();
    const size = entry.manifest?.size 
      ? formatBytes(entry.manifest.size)
      : formatBytes(entry.stat.size);
    const files = entry.manifest?.files || '?';
    
    console.log(`  ${prefix} ${C.b}${entry.name}${C.reset}`);
    console.log(`      ${C.dim}Date:${C.reset} ${date}`);
    console.log(`      ${C.dim}Size:${C.reset} ${size}  ${C.dim}Files:${C.reset} ${files}`);
    if (isLatest) console.log();
  });
}

function exportToMarkdown() {
  const exportDir = path.join(DATA_DIR, 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  const ts = timestamp().split('T')[0];
  let exported = 0;
  
  console.log(`${C.c}⚡ Exporting data to Markdown${C.reset}\n`);
  
  // Export sprints
  if (fs.existsSync('sprints.json')) {
    const sprints = JSON.parse(fs.readFileSync('sprints.json', 'utf8'));
    let md = '# Sprint History\n\n';
    md += `*Exported: ${new Date().toLocaleString()}*\n\n`;
    
    if (sprints.sprints) {
      for (const sprint of sprints.sprints.slice().reverse()) {
        md += `## ${sprint.name}\n\n`;
        md += `- **Date:** ${sprint.date || 'Unknown'}\n`;
        md += `- **Commits:** ${sprint.commits || 0}\n`;
        if (sprint.duration) md += `- **Duration:** ${sprint.duration}m\n`;
        if (sprint.summary) md += `- **Summary:** ${sprint.summary}\n`;
        md += '\n';
        
        if (sprints.entries?.[sprint.id]) {
          md += '### Entries\n\n';
          for (const entry of sprints.entries[sprint.id]) {
            md += `- ${entry.message}\n`;
          }
          md += '\n';
        }
      }
    }
    
    fs.writeFileSync(path.join(exportDir, `sprints-${ts}.md`), md);
    console.log(`  ${C.g}✓${C.reset} sprints-${ts}.md`);
    exported++;
  }
  
  // Export ideas
  if (fs.existsSync('ideas.json')) {
    const ideas = JSON.parse(fs.readFileSync('ideas.json', 'utf8'));
    let md = '# Ideas Backlog\n\n';
    md += `*Exported: ${new Date().toLocaleString()}*\n\n`;
    
    const byStatus = { active: [], archived: [] };
    for (const idea of ideas.ideas || []) {
      const status = idea.status || 'active';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(idea);
    }
    
    for (const [status, items] of Object.entries(byStatus)) {
      if (items.length === 0) continue;
      md += `## ${status.charAt(0).toUpperCase() + status.slice(1)}\n\n`;
      for (const idea of items) {
        const priority = idea.priority ? ` [${idea.priority}]` : '';
        const tags = idea.tags?.length ? ` #${idea.tags.join(' #')}` : '';
        md += `- **${idea.title}**${priority}${tags}\n`;
        if (idea.description) md += `  ${idea.description}\n`;
        md += '\n';
      }
    }
    
    fs.writeFileSync(path.join(exportDir, `ideas-${ts}.md`), md);
    console.log(`  ${C.g}✓${C.reset} ideas-${ts}.md`);
    exported++;
  }
  
  // Export projects
  if (fs.existsSync('projects.json')) {
    const data = JSON.parse(fs.readFileSync('projects.json', 'utf8'));
    let md = '# Projects\n\n';
    md += `*Exported: ${new Date().toLocaleString()}*\n\n`;
    
    for (const proj of data.projects || []) {
      md += `## ${proj.name}\n\n`;
      if (proj.description) md += `${proj.description}\n\n`;
      md += `- **Status:** ${proj.status || 'unknown'}\n`;
      if (proj.url) md += `- **URL:** ${proj.url}\n`;
      if (proj.tech?.length) md += `- **Tech:** ${proj.tech.join(', ')}\n`;
      md += '\n';
    }
    
    fs.writeFileSync(path.join(exportDir, `projects-${ts}.md`), md);
    console.log(`  ${C.g}✓${C.reset} projects-${ts}.md`);
    exported++;
  }
  
  console.log(`\n${C.g}✓${C.reset} Exported ${C.b}${exported}${C.reset} files to ${C.b}exports/${C.reset}`);
}

function cleanBackups(keep = 5) {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`${C.y}No backups to clean.${C.reset}`);
    return;
  }
  
  const entries = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-'))
    .map(f => ({ name: f, path: path.join(BACKUP_DIR, f), stat: fs.statSync(path.join(BACKUP_DIR, f)) }))
    .sort((a, b) => b.stat.mtime - a.stat.mtime);
  
  if (entries.length <= keep) {
    console.log(`${C.y}Only ${entries.length} backup(s), nothing to clean.${C.reset}`);
    return;
  }
  
  const toRemove = entries.slice(keep);
  console.log(`${C.c}⚡ Cleaning old backups${C.reset}`);
  console.log(`  ${C.dim}Keeping: ${keep} newest${C.reset}`);
  console.log(`  ${C.dim}Removing: ${toRemove.length} old backup(s)${C.reset}\n`);
  
  for (const entry of toRemove) {
    fs.rmSync(entry.path, { recursive: true });
    console.log(`  ${C.r}✗${C.reset} ${entry.name}`);
  }
  
  console.log(`\n${C.g}✓${C.reset} Cleaned ${C.r}${toRemove.length}${C.reset} backup(s)`);
}

function showHelp() {
  console.log(`${C.c}⚡ nix backup - Data backup and export${C.reset}

${C.y}Usage:${C.reset}
  nix backup              Create timestamped backup
  nix backup list         Show backup history  
  nix backup export       Export data as Markdown
  nix backup clean [N]    Keep only N backups (default: 5)

${C.y}Examples:${C.reset}
  nix backup              # Quick backup
  nix backup list         # View history
  nix backup export       # Export to md files
  nix backup clean 3      # Keep last 3 backups`);
}

// Main
const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case 'list':
  case 'ls':
    listBackups();
    break;
  case 'export':
  case 'e':
    exportToMarkdown();
    break;
  case 'clean':
    cleanBackups(parseInt(args[1]) || 5);
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  case undefined:
  case 'create':
  case 'c':
    createBackup();
    break;
  default:
    console.log(`${C.r}Unknown command: ${cmd}${C.reset}`);
    showHelp();
    process.exit(1);
}
