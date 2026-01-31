#!/usr/bin/env node
/**
 * pass.js - Quick password generator
 * Usage: nix pass [length] [--strong|--pin|--phrase]
 */

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const WORDS = [
  'alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india',
  'juliet','kilo','lima','mike','november','oscar','papa','quebec','romeo',
  'sierra','tango','uniform','victor','whiskey','xray','yankee','zulu',
  'quick','brown','lazy','fox','jumps','over','fence','silver','gold',
  'thunder','storm','lightning','ocean','mountain','forest','river','eagle',
  'falcon','tiger','dragon','phoenix','nebula','cosmos','quantum','crystal'
];

function generatePassword(length = 16, strong = false) {
  const chars = strong 
    ? LOWER + UPPER + NUMBERS + SYMBOLS
    : LOWER + UPPER + NUMBERS;
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

function generatePin(length = 6) {
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
  }
  return pin;
}

function generatePassphrase(words = 4, separator = '-') {
  const phrase = [];
  for (let i = 0; i < words; i++) {
    phrase.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  // Add a number for extra entropy
  phrase.push(Math.floor(Math.random() * 99));
  return phrase.join(separator);
}

function calculateEntropy(password) {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32;
  
  const entropy = Math.log2(Math.pow(pool, password.length));
  return Math.floor(entropy);
}

function ratePassword(entropy) {
  if (entropy < 40) return { label: 'WEAK', color: COLORS.red };
  if (entropy < 60) return { label: 'FAIR', color: COLORS.yellow };
  if (entropy < 80) return { label: 'GOOD', color: COLORS.cyan };
  return { label: 'STRONG', color: COLORS.green };
}

function showHelp() {
  console.log(`${COLORS.cyan}${COLORS.bold}nix pass${COLORS.reset} — Password generator`);
  console.log('');
  console.log(`${COLORS.dim}Usage:${COLORS.reset}`);
  console.log('  nix pass [length]         Generate password (default: 16 chars)');
  console.log('  nix pass --strong         Include symbols');
  console.log('  nix pass --pin [digits]   Generate PIN (default: 6)');
  console.log('  nix pass --phrase [words] Generate passphrase (default: 4 words)');
  console.log('  nix pass --help           Show this help');
  console.log('');
  console.log(`${COLORS.dim}Examples:${COLORS.reset}`);
  console.log('  nix pass                  # 16-char password');
  console.log('  nix pass 32               # 32-char password');
  console.log('  nix pass --strong         # With symbols');
  console.log('  nix pass --pin            # 6-digit PIN');
  console.log('  nix pass --pin 4          # 4-digit PIN');
  console.log('  nix pass --phrase         # 4-word passphrase');
  console.log('  nix pass --phrase 6       # 6-word passphrase');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  let password, type;
  
  if (args.includes('--pin')) {
    const pinIdx = args.indexOf('--pin');
    const length = parseInt(args[pinIdx + 1]) || 6;
    password = generatePin(length);
    type = 'PIN';
  } else if (args.includes('--phrase')) {
    const phraseIdx = args.indexOf('--phrase');
    const words = parseInt(args[phraseIdx + 1]) || 4;
    password = generatePassphrase(words);
    type = 'PASSPHRASE';
  } else {
    const strong = args.includes('--strong');
    const length = parseInt(args.find(a => /^\d+$/.test(a))) || 16;
    password = generatePassword(length, strong);
    type = strong ? 'STRONG' : 'STANDARD';
  }
  
  const entropy = calculateEntropy(password);
  const rating = ratePassword(entropy);
  
  console.log('');
  console.log(`${COLORS.bold}${password}${COLORS.reset}`);
  console.log('');
  console.log(`${COLORS.dim}Type:${COLORS.reset} ${type}  ${COLORS.dim}Entropy:${COLORS.reset} ${entropy} bits  ${rating.color}[${rating.label}]${COLORS.reset}`);
  console.log('');
}

main();
