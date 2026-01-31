#!/usr/bin/env node
/**
 * alias.js - Custom command shortcuts for nix
 * Usage: nix alias [command]
 * 
 * Commands:
 *   nix alias                    List all aliases
 *   nix alias add <name> <cmd>   Create new alias
 *   nix alias remove <name>      Delete alias
 *   nix alias run <name> [args]  Execute aliased command
 *   nix alias clear              Remove all aliases
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ALIAS_FILE = path.join(os.homedir(), '.nix666', 'aliases.json');

function loadAliases() {
  try {
    return JSON.parse(fs.readFileSync(ALIAS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveAliases(aliases) {
  const dir = path.dirname(ALIAS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ALIAS_FILE, JSON.stringify(aliases, null, 2));
}

function listAliases() {
  const aliases = loadAliases();
  const entries = Object.entries(aliases);
  
  if (entries.length === 0) {
    console.log('No aliases defined. Use: nix alias add <name> <cmd>');
    return;
  }
  
  console.log('⚡ Aliases:\n');
  const maxName = Math.max(...entries.map(([k]) => k.length));
  entries.forEach(([name, cmd]) => {
    const padded = name.padEnd(maxName);
    console.log(`  ${padded} → ${cmd}`);
  });
  console.log(`\nTotal: ${entries.length} alias(es)`);
}

function addAlias(name, cmd) {
  if (!name || !cmd) {
    console.error('Usage: nix alias add <name> <command>');
    console.error('Example: nix alias add tf "nix todo focus"');
    process.exit(1);
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    console.error('Alias name must be alphanumeric with - or _ only');
    process.exit(1);
  }
  
  const aliases = loadAliases();
  const isUpdate = name in aliases;
  aliases[name] = cmd;
  saveAliases(aliases);
  
  console.log(isUpdate ? '✓ Updated:' : '✓ Added:', `${name} → ${cmd}`);
}

function removeAlias(name) {
  const aliases = loadAliases();
  if (!(name in aliases)) {
    console.error(`Alias '${name}' not found`);
    process.exit(1);
  }
  
  delete aliases[name];
  saveAliases(aliases);
  console.log(`✓ Removed alias: ${name}`);
}

function runAlias(name, args) {
  const aliases = loadAliases();
  if (!(name in aliases)) {
    console.error(`Alias '${name}' not found. Run: nix alias`);
    process.exit(1);
  }
  
  let cmd = aliases[name];
  // Replace $1, $2, etc with args
  args.forEach((arg, i) => {
    cmd = cmd.replace(new RegExp(`\\$${i + 1}`, 'g'), arg);
  });
  
  console.log(`→ ${cmd}`);
  require('child_process').execSync(cmd, { stdio: 'inherit', shell: true });
}

function clearAliases() {
  saveAliases({});
  console.log('✓ All aliases cleared');
}

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case 'add':
    addAlias(rest[0], rest.slice(1).join(' '));
    break;
  case 'remove':
  case 'rm':
  case 'delete':
  case 'del':
    removeAlias(rest[0]);
    break;
  case 'run':
    runAlias(rest[0], rest.slice(1));
    break;
  case 'clear':
    clearAliases();
    break;
  case 'list':
  case undefined:
    listAliases();
    break;
  default:
    // Try to run as alias
    runAlias(cmd, rest);
}
