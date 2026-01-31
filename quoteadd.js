#!/usr/bin/env node
/**
 * quoteadd.js - Quick quote adder for NIX
 * Usage: node quoteadd.js "Quote text" "Author" [context]
 *        node quoteadd.js --random (show random quote)
 */

const fs = require('fs');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m'
};

const QUOTES_FILE = 'quotes.json';

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function loadQuotes() {
  return JSON.parse(fs.readFileSync(QUOTES_FILE, 'utf8'));
}

function saveQuotes(quotes) {
  fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2) + '\n');
}

function showRandom() {
  const quotes = loadQuotes();
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  log('');
  log(`"${q.text}"`, 'yellow');
  log(`  — ${q.author}${q.context ? ` (${q.context})` : ''}`, 'dim');
  log('');
}

function addQuote(text, author, context = 'general') {
  const quotes = loadQuotes();
  
  // Check for duplicates
  const exists = quotes.some(q => q.text.toLowerCase() === text.toLowerCase());
  if (exists) {
    log('⚠️  Quote already exists', 'yellow');
    return;
  }
  
  quotes.push({ text, author, context });
  saveQuotes(quotes);
  
  log(`✅ Added quote #${quotes.length}`, 'green');
  log(`   "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
  log(`   — ${author} (${context})`);
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  log('⚡ quoteadd - Quick quote manager');
  log('');
  log('Usage:');
  log('  node quoteadd.js "Quote text" "Author" [context]');
  log('  node quoteadd.js --random, -r          Show random quote');
  log('  node quoteadd.js --count, -c           Show total count');
  log('');
  log('Examples:');
  log('  node quoteadd.js "Ship it" "NIX" sprint');
  log('  node quoteadd.js -r');
  process.exit(0);
}

if (args[0] === '--random' || args[0] === '-r') {
  showRandom();
  process.exit(0);
}

if (args[0] === '--count' || args[0] === '-c') {
  const quotes = loadQuotes();
  log(`${quotes.length} quotes in collection`);
  process.exit(0);
}

// Add mode
if (args.length < 2) {
  log('❌ Need at least quote text and author', 'red');
  process.exit(1);
}

const text = args[0];
const author = args[1];
const context = args[2] || 'general';

addQuote(text, author, context);
