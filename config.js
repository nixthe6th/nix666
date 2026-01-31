#!/usr/bin/env node
/**
 * config.js - User configuration manager for nix
 * Usage: nix config [command] [key] [value]
 * 
 * Commands:
 *   nix config get <key>           # Get a config value
 *   nix config set <key> <value>   # Set a config value
 *   nix config list                # List all config values
 *   nix config delete <key>        # Remove a config key
 *   nix config reset               # Reset to defaults
 *   nix config path                # Show config file path
 * 
 * Available settings:
 *   default_timer      - Default timer duration in minutes (default: 25)
 *   default_pomodoro   - Default pomodoro length (default: 25)
 *   data_dir          - Custom data directory path
 *   currency          - Default currency for expenses (default: USD)
 *   date_format       - Date format: US|EU|ISO (default: ISO)
 *   time_format       - Time format: 12h|24h (default: 24h)
 *   theme             - Color theme: auto|dark|light (default: auto)
 *   editor            - Preferred editor command
 *   name              - Your name (used in some outputs)
 *   notification_sound - Enable notification sounds (default: true)
 *   backup_enabled    - Enable auto-backups (default: true)
 *   backup_count      - Number of backups to keep (default: 10)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.nix666');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Default configuration values
const DEFAULTS = {
  default_timer: 25,
  default_pomodoro: 25,
  currency: 'USD',
  date_format: 'ISO',
  time_format: '24h',
  theme: 'auto',
  notification_sound: true,
  backup_enabled: true,
  backup_count: 10
};

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULTS };
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveConfig(config) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getConfig(key) {
  const config = loadConfig();
  if (!(key in config)) {
    console.log(`${COLORS.red}❌ Unknown config key: ${key}${COLORS.reset}`);
    console.log(`Run 'nix config list' to see available settings.`);
    process.exit(1);
  }
  return config[key];
}

function setConfig(key, value) {
  const config = loadConfig();
  
  // Type coercion based on existing value or default
  let coercedValue = value;
  if (key in DEFAULTS) {
    const defaultType = typeof DEFAULTS[key];
    if (defaultType === 'boolean') {
      coercedValue = value === 'true' || value === 'yes' || value === '1';
    } else if (defaultType === 'number') {
      coercedValue = parseFloat(value);
      if (isNaN(coercedValue)) {
        console.log(`${COLORS.red}❌ Invalid number: ${value}${COLORS.reset}`);
        process.exit(1);
      }
    }
  }
  
  config[key] = coercedValue;
  saveConfig(config);
  
  console.log(`${COLORS.green}✅ Set ${COLORS.bold}${key}${COLORS.reset}${COLORS.green} = ${JSON.stringify(coercedValue)}${COLORS.reset}`);
}

function listConfig() {
  const config = loadConfig();
  
  console.log('');
  console.log(`${COLORS.cyan}⚙️  NIX Configuration${COLORS.reset}`);
  console.log(`${COLORS.dim}${CONFIG_FILE}${COLORS.reset}`);
  console.log('');
  
  const keys = Object.keys({ ...DEFAULTS, ...config }).sort();
  
  for (const key of keys) {
    const value = config[key];
    const isDefault = !(key in config) || JSON.stringify(config[key]) === JSON.stringify(DEFAULTS[key]);
    const defaultMark = isDefault ? COLORS.dim : COLORS.yellow + '*' + COLORS.reset;
    const displayValue = JSON.stringify(value);
    
    console.log(`  ${defaultMark} ${COLORS.bold}${key}${COLORS.reset}: ${displayValue}`);
    
    // Show description from defaults
    if (key === 'default_timer') console.log(`      ${COLORS.dim}Default timer duration in minutes${COLORS.reset}`);
    if (key === 'currency') console.log(`      ${COLORS.dim}Default currency code (USD, EUR, etc.)${COLORS.reset}`);
    if (key === 'date_format') console.log(`      ${COLORS.dim}Date format: US (MM/DD), EU (DD/MM), ISO (YYYY-MM-DD)${COLORS.reset}`);
    if (key === 'time_format') console.log(`      ${COLORS.dim}Time format: 12h or 24h${COLORS.reset}`);
    if (key === 'theme') console.log(`      ${COLORS.dim}Color theme: auto, dark, or light${COLORS.reset}`);
  }
  
  console.log('');
  console.log(`${COLORS.dim}* = modified from default${COLORS.reset}`);
  console.log('');
  console.log('Usage:');
  console.log(`  ${COLORS.dim}nix config set <key> <value>${COLORS.reset}`);
  console.log(`  ${COLORS.dim}nix config get <key>${COLORS.reset}`);
  console.log('');
}

function deleteConfig(key) {
  const config = loadConfig();
  
  if (!(key in config)) {
    console.log(`${COLORS.red}❌ Key not found: ${key}${COLORS.reset}`);
    process.exit(1);
  }
  
  delete config[key];
  saveConfig(config);
  console.log(`${COLORS.green}✅ Deleted ${key}${COLORS.reset}`);
  
  if (key in DEFAULTS) {
    console.log(`${COLORS.dim}   Reverted to default: ${JSON.stringify(DEFAULTS[key])}${COLORS.reset}`);
  }
}

function resetConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log(`${COLORS.yellow}⚠️  No config file to reset${COLORS.reset}`);
    return;
  }
  
  fs.unlinkSync(CONFIG_FILE);
  console.log(`${COLORS.green}✅ Configuration reset to defaults${COLORS.reset}`);
  console.log(`${COLORS.dim}   Config file removed: ${CONFIG_FILE}${COLORS.reset}`);
}

function showPath() {
  console.log(CONFIG_FILE);
}

function showHelp() {
  console.log(`
${COLORS.cyan}⚙️  nix config${COLORS.reset} - User preferences and settings

${COLORS.bold}Usage:${COLORS.reset}
  nix config get <key>           Get a config value
  nix config set <key> <value>   Set a config value
  nix config list                List all settings
  nix config delete <key>        Remove a custom setting
  nix config reset               Reset all to defaults
  nix config path                Show config file path

${COLORS.bold}Available settings:${COLORS.reset}
  default_timer       Default timer duration (minutes)
  currency           Default currency for expenses
  date_format        Date format: US|EU|ISO
  time_format        Time format: 12h|24h
  theme              Color theme: auto|dark|light
  editor             Preferred editor command
  name               Your name
  notification_sound Enable sounds (true/false)
  backup_enabled     Auto-backup (true/false)
  backup_count       Backups to keep (number)

${COLORS.bold}Examples:${COLORS.reset}
  nix config set currency EUR
  nix config set default_timer 45
  nix config set name "Alex"
  nix config get currency
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'get':
      if (!args[1]) {
        console.log(`${COLORS.red}❌ Missing key name${COLORS.reset}`);
        process.exit(1);
      }
      console.log(getConfig(args[1]));
      break;
      
    case 'set':
      if (!args[1] || args[2] === undefined) {
        console.log(`${COLORS.red}❌ Usage: nix config set <key> <value>${COLORS.reset}`);
        process.exit(1);
      }
      // Handle value with spaces
      const value = args.slice(2).join(' ');
      setConfig(args[1], value);
      break;
      
    case 'list':
    case 'ls':
      listConfig();
      break;
      
    case 'delete':
    case 'del':
    case 'rm':
      if (!args[1]) {
        console.log(`${COLORS.red}❌ Missing key name${COLORS.reset}`);
        process.exit(1);
      }
      deleteConfig(args[1]);
      break;
      
    case 'reset':
      resetConfig();
      break;
      
    case 'path':
      showPath();
      break;
      
    default:
      console.log(`${COLORS.red}❌ Unknown command: ${command}${COLORS.reset}`);
      showHelp();
      process.exit(1);
  }
}

main();
