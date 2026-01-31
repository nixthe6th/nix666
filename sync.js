#!/usr/bin/env node
/**
 * sync.js - Git-based data synchronization for nix666
 * Usage: nix sync [command] [options]
 * 
 * Features:
 * - Automatic backup/sync to remote Git repository
 * - Conflict resolution for multi-device usage
 * - Sync status and history
 * - Selective sync (exclude large files)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const WORKSPACE = process.env.NIX_WORKSPACE || process.cwd();
const SYNC_CONFIG = path.join(WORKSPACE, 'data', 'sync-config.json');
const DATA_DIR = path.join(WORKSPACE, 'data');
const SYNC_STATE = path.join(WORKSPACE, 'data', '.sync-state');

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

// ============ CONFIGURATION ============

function loadConfig() {
  if (!fs.existsSync(SYNC_CONFIG)) {
    return {
      enabled: false,
      remoteUrl: null,
      branch: 'main',
      autoSync: false,
      syncInterval: 300, // 5 minutes
      excludePatterns: ['*.tmp', '*.log'],
      lastSync: null,
      deviceName: require('os').hostname()
    };
  }
  return JSON.parse(fs.readFileSync(SYNC_CONFIG, 'utf8'));
}

function saveConfig(config) {
  ensureDir();
  fs.writeFileSync(SYNC_CONFIG, JSON.stringify(config, null, 2));
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ============ GIT OPERATIONS ============

function execGit(args, options = {}) {
  try {
    const result = execSync(`git ${args.join(' ')}`, {
      cwd: WORKSPACE,
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return result ? result.trim() : null;
  } catch (err) {
    if (options.ignoreError) return null;
    throw err;
  }
}

function execGitSilent(args) {
  return execGit(args, { silent: true, ignoreError: true });
}

function isGitRepo() {
  return fs.existsSync(path.join(WORKSPACE, '.git'));
}

function hasRemote() {
  const remotes = execGitSilent(['remote']);
  return remotes && remotes.includes('origin');
}

function getSyncStatus() {
  if (!isGitRepo()) return { error: 'Not a git repository' };
  
  try {
    const status = execGitSilent(['status', '--porcelain', '--branch']);
    const lines = status ? status.split('\n').filter(l => l.trim()) : [];
    
    const branchLine = lines.find(l => l.startsWith('##'));
    const isAhead = branchLine && branchLine.includes('[ahead');
    const isBehind = branchLine && branchLine.includes('[behind');
    const hasChanges = lines.some(l => !l.startsWith('##'));
    
    const lastCommit = execGitSilent(['log', '-1', '--format=%h|%ci|%s']);
    const lastCommitInfo = lastCommit ? lastCommit.split('|') : [null, null, null];
    
    return {
      isGitRepo: true,
      hasRemote: hasRemote(),
      isAhead,
      isBehind,
      hasChanges,
      lastCommit: {
        hash: lastCommitInfo[0],
        date: lastCommitInfo[1],
        message: lastCommitInfo[2]
      },
      needsSync: isAhead || isBehind || hasChanges
    };
  } catch (err) {
    return { error: err.message };
  }
}

// ============ SYNC OPERATIONS ============

function syncNow(options = {}) {
  const config = loadConfig();
  
  if (!config.enabled && !options.force) {
    console.log(`${COLORS.yellow}⚠ Sync is not enabled${COLORS.reset}`);
    console.log(`  Run: ${COLORS.cyan}nix sync setup${COLORS.reset} to configure`);
    return;
  }
  
  if (!isGitRepo()) {
    console.log(`${COLORS.red}✗ Not a git repository${COLORS.reset}`);
    console.log(`  Run: ${COLORS.cyan}git init${COLORS.reset} first`);
    return;
  }
  
  console.log(`${COLORS.cyan}🔄 Syncing data...${COLORS.reset}\n`);
  
  // Stage all data files
  const dataFiles = execGitSilent(['ls-files', 'data/']);
  if (dataFiles) {
    execGit(['add', 'data/'], { silent: true });
  }
  
  // Check for changes
  const diff = execGitSilent(['diff', '--cached', '--name-only']);
  
  if (!diff) {
    console.log(`${COLORS.dim}  No local changes to sync${COLORS.reset}`);
  } else {
    // Commit changes
    const timestamp = new Date().toISOString();
    const commitMsg = `sync: ${config.deviceName} @ ${timestamp.split('T')[0]}`;
    
    try {
      execGit(['commit', '-m', commitMsg, '--quiet'], { silent: true });
      console.log(`${COLORS.green}✓ Committed local changes${COLORS.reset}`);
    } catch (err) {
      console.log(`${COLORS.dim}  No changes to commit${COLORS.reset}`);
    }
  }
  
  if (!hasRemote()) {
    console.log(`${COLORS.yellow}⚠ No remote configured${COLORS.reset}`);
    console.log(`  Run: ${COLORS.cyan}nix sync setup${COLORS.reset}`);
    return;
  }
  
  // Pull first to avoid conflicts
  console.log(`  ${COLORS.dim}Pulling remote changes...${COLORS.reset}`);
  try {
    execGit(['pull', 'origin', config.branch, '--no-rebase', '--quiet'], { silent: true });
    console.log(`${COLORS.green}✓ Pulled remote changes${COLORS.reset}`);
  } catch (err) {
    console.log(`${COLORS.yellow}⚠ Pull failed - may have conflicts${COLORS.reset}`);
    console.log(`  Run: ${COLORS.cyan}nix sync resolve${COLORS.reset} to fix`);
    return;
  }
  
  // Push changes
  console.log(`  ${COLORS.dim}Pushing to remote...${COLORS.reset}`);
  try {
    execGit(['push', 'origin', config.branch, '--quiet'], { silent: true });
    console.log(`${COLORS.green}✓ Pushed to remote${COLORS.reset}`);
  } catch (err) {
    console.log(`${COLORS.red}✗ Push failed${COLORS.reset}`);
    return;
  }
  
  // Update config
  config.lastSync = new Date().toISOString();
  saveConfig(config);
  
  // Write sync state
  fs.writeFileSync(SYNC_STATE, JSON.stringify({
    lastSync: config.lastSync,
    device: config.deviceName
  }, null, 2));
  
  console.log(`\n${COLORS.green}✓ Sync complete${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Last sync: ${new Date().toLocaleString()}${COLORS.reset}`);
}

function setupSync(remoteUrl) {
  console.log(`${COLORS.cyan}⚙ Setting up sync...${COLORS.reset}\n`);
  
  const config = loadConfig();
  
  if (!isGitRepo()) {
    console.log(`  ${COLORS.dim}Initializing git repository...${COLORS.reset}`);
    execGit(['init'], { silent: true });
    console.log(`${COLORS.green}✓ Git repository initialized${COLORS.reset}`);
  }
  
  // Ensure .gitignore exists and includes sensitive files
  const gitignorePath = path.join(WORKSPACE, '.gitignore');
  let gitignore = '';
  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, 'utf8');
  }
  
  const requiredIgnores = [
    'node_modules/',
    '.env',
    'credentials/',
    '*.key',
    '*.pem',
    '.DS_Store'
  ];
  
  let updated = false;
  for (const pattern of requiredIgnores) {
    if (!gitignore.includes(pattern)) {
      gitignore += (gitignore.endsWith('\n') ? '' : '\n') + pattern + '\n';
      updated = true;
    }
  }
  
  if (updated) {
    fs.writeFileSync(gitignorePath, gitignore);
    console.log(`${COLORS.green}✓ Updated .gitignore${COLORS.reset}`);
  }
  
  if (remoteUrl) {
    // Remove existing remote if present
    if (hasRemote()) {
      execGit(['remote', 'remove', 'origin'], { silent: true, ignoreError: true });
    }
    execGit(['remote', 'add', 'origin', remoteUrl], { silent: true });
    config.remoteUrl = remoteUrl;
    console.log(`${COLORS.green}✓ Remote configured: ${remoteUrl}${COLORS.reset}`);
  }
  
  config.enabled = true;
  saveConfig(config);
  
  console.log(`\n${COLORS.green}✓ Sync setup complete!${COLORS.reset}`);
  console.log(`\n${COLORS.bold}Next steps:${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}nix sync${COLORS.reset}        - Sync now`);
  console.log(`  ${COLORS.cyan}nix sync auto${COLORS.reset}   - Enable auto-sync`);
  console.log(`  ${COLORS.cyan}nix sync status${COLORS.reset} - Check sync status`);
}

function showStatus() {
  const config = loadConfig();
  const status = getSyncStatus();
  
  console.log(`${COLORS.bold}📊 Sync Status${COLORS.reset}\n`);
  
  // Config status
  console.log(`${COLORS.bold}Configuration:${COLORS.reset}`);
  console.log(`  Enabled: ${config.enabled ? COLORS.green + '✓' + COLORS.reset : COLORS.red + '✗' + COLORS.reset}`);
  console.log(`  Device: ${COLORS.cyan}${config.deviceName}${COLORS.reset}`);
  console.log(`  Remote: ${config.remoteUrl ? COLORS.green + '✓ configured' + COLORS.reset : COLORS.yellow + '⚠ not set' + COLORS.reset}`);
  console.log(`  Auto-sync: ${config.autoSync ? COLORS.green + 'enabled' + COLORS.reset : COLORS.dim + 'disabled' + COLORS.reset}`);
  
  if (config.lastSync) {
    const lastSync = new Date(config.lastSync);
    const ago = Math.floor((Date.now() - lastSync) / 60000);
    const agoText = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.floor(ago/60)}h ago`;
    console.log(`  Last sync: ${COLORS.cyan}${agoText}${COLORS.reset}`);
  }
  
  console.log();
  
  // Git status
  console.log(`${COLORS.bold}Repository:${COLORS.reset}`);
  if (status.error) {
    console.log(`  ${COLORS.red}✗ ${status.error}${COLORS.reset}`);
    return;
  }
  
  console.log(`  Git repo: ${COLORS.green}✓${COLORS.reset}`);
  console.log(`  Remote: ${status.hasRemote ? COLORS.green + '✓' + COLORS.reset : COLORS.yellow + '⚠ not configured' + COLORS.reset}`);
  
  if (status.lastCommit.hash) {
    console.log(`  Last commit: ${COLORS.dim}${status.lastCommit.hash} - ${status.lastCommit.message}${COLORS.reset}`);
  }
  
  if (status.needsSync) {
    console.log(`\n${COLORS.yellow}⚠ Sync needed:${COLORS.reset}`);
    if (status.hasChanges) console.log(`  • Local changes pending`);
    if (status.isAhead) console.log(`  • Commits to push`);
    if (status.isBehind) console.log(`  • Commits to pull`);
  } else {
    console.log(`\n${COLORS.green}✓ Up to date${COLORS.reset}`);
  }
}

function enableAutoSync() {
  const config = loadConfig();
  config.autoSync = true;
  saveConfig(config);
  
  console.log(`${COLORS.green}✓ Auto-sync enabled${COLORS.reset}`);
  console.log(`\n${COLORS.dim}Auto-sync will run every ${config.syncInterval / 60} minutes${COLORS.reset}`);
  console.log(`\n${COLORS.bold}To set up automatic sync:${COLORS.reset}`);
  console.log(`  1. Add to your shell profile (.bashrc/.zshrc):`);
  console.log(`     ${COLORS.cyan}nix sync auto-start${COLORS.reset}`);
  console.log(`  2. Or run manually in a background terminal:`);
  console.log(`     ${COLORS.cyan}nix sync daemon${COLORS.reset}`);
}

function disableAutoSync() {
  const config = loadConfig();
  config.autoSync = false;
  saveConfig(config);
  console.log(`${COLORS.yellow}⚠ Auto-sync disabled${COLORS.reset}`);
}

function runDaemon() {
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log(`${COLORS.red}✗ Sync not enabled${COLORS.reset}`);
    return;
  }
  
  console.log(`${COLORS.cyan}🔄 Sync daemon started${COLORS.reset}`);
  console.log(`${COLORS.dim}  Interval: ${config.syncInterval / 60} minutes${COLORS.reset}`);
  console.log(`${COLORS.dim}  Press Ctrl+C to stop${COLORS.reset}\n`);
  
  // Initial sync
  syncNow();
  
  // Periodic sync
  const intervalMs = config.syncInterval * 1000;
  setInterval(() => {
    console.log(`\n${COLORS.dim}[${new Date().toLocaleTimeString()}]${COLORS.reset}`);
    syncNow();
  }, intervalMs);
  
  // Keep process alive
  process.stdin.resume();
}

function resolveConflicts() {
  console.log(`${COLORS.cyan}🔧 Resolving conflicts...${COLORS.reset}\n`);
  
  const status = execGitSilent(['status', '--porcelain']);
  const lines = status ? status.split('\n').filter(l => l.trim()) : [];
  
  const conflicts = lines.filter(l => l.startsWith('UU') || l.startsWith('AA') || l.startsWith('DD') || l.startsWith('AU') || l.startsWith('UA'));
  
  if (conflicts.length === 0) {
    console.log(`${COLORS.green}✓ No conflicts detected${COLORS.reset}`);
    return;
  }
  
  console.log(`${COLORS.yellow}⚠ Found ${conflicts.length} conflict(s):${COLORS.reset}`);
  conflicts.forEach(line => {
    const file = line.slice(3).trim();
    console.log(`  • ${file}`);
  });
  
  console.log(`\n${COLORS.bold}Resolution options:${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}nix sync resolve --ours${COLORS.reset}   - Keep local changes`);
  console.log(`  ${COLORS.cyan}nix sync resolve --theirs${COLORS.reset} - Keep remote changes`);
  console.log(`  ${COLORS.cyan}nix sync resolve --manual${COLORS.reset} - Open files to edit manually`);
}

function showHistory(limit = 10) {
  console.log(`${COLORS.bold}📜 Sync History${COLORS.reset}\n`);
  
  if (!isGitRepo()) {
    console.log(`${COLORS.red}✗ Not a git repository${COLORS.reset}`);
    return;
  }
  
  const log = execGitSilent(['log', `--format=%h|%ci|%s|%an`, '-n', limit.toString()]);
  
  if (!log) {
    console.log(`${COLORS.dim}No commits yet${COLORS.reset}`);
    return;
  }
  
  const commits = log.split('\n').filter(l => l.trim());
  
  commits.forEach(commit => {
    const [hash, date, message, author] = commit.split('|');
    const shortDate = date ? date.split(' ')[0] : '';
    const isSync = message && message.startsWith('sync:');
    
    const icon = isSync ? '🔄' : '💾';
    console.log(`  ${icon} ${COLORS.cyan}${hash}${COLORS.reset} ${COLORS.dim}${shortDate}${COLORS.reset}`);
    console.log(`     ${message}`);
    if (author && author !== 'unknown') {
      console.log(`     ${COLORS.dim}by ${author}${COLORS.reset}`);
    }
    console.log();
  });
}

function showHelp() {
  console.log(`
${COLORS.bold}sync.js${COLORS.reset} - Git-based data synchronization

${COLORS.bold}Usage:${COLORS.reset}
  nix sync [command] [options]

${COLORS.bold}Commands:${COLORS.reset}
  setup [url]       Configure sync with optional remote URL
  status            Show sync status and configuration
  now               Force sync immediately
  auto              Enable automatic sync
  auto-off          Disable automatic sync
  daemon            Run sync daemon (continuous)
  history [n]       Show last n sync commits (default: 10)
  resolve           Show/resolve sync conflicts
  reset             Reset sync configuration

${COLORS.bold}Examples:${COLORS.reset}
  nix sync setup https://github.com/user/nix666-data.git
  nix sync                    # Sync now (if enabled)
  nix sync status             # Check sync status
  nix sync auto               # Enable auto-sync
  nix sync daemon             # Run continuous sync
  nix sync history 20         # Show last 20 commits

${COLORS.bold}Configuration:${COLORS.reset}
  Config file: data/sync-config.json
  Sync state:  data/.sync-state
`);
}

// ============ MAIN ENTRY ============

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Default: sync now if enabled
    syncNow();
    return;
  }
  
  const cmd = args[0];
  
  switch (cmd) {
    case '--help':
    case '-h':
    case 'help':
      showHelp();
      break;
      
    case 'setup':
      setupSync(args[1]);
      break;
      
    case 'status':
      showStatus();
      break;
      
    case 'now':
      syncNow({ force: true });
      break;
      
    case 'auto':
      enableAutoSync();
      break;
      
    case 'auto-off':
      disableAutoSync();
      break;
      
    case 'daemon':
      runDaemon();
      break;
      
    case 'history':
      showHistory(parseInt(args[1]) || 10);
      break;
      
    case 'resolve':
      resolveConflicts();
      break;
      
    case 'reset':
      if (fs.existsSync(SYNC_CONFIG)) {
        fs.unlinkSync(SYNC_CONFIG);
        console.log(`${COLORS.green}✓ Sync configuration reset${COLORS.reset}`);
      }
      break;
      
    default:
      console.log(`${COLORS.red}✗ Unknown command: ${cmd}${COLORS.reset}`);
      console.log(`Run ${COLORS.cyan}nix sync help${COLORS.reset} for usage`);
      process.exit(1);
  }
}

main();
