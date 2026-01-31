#!/usr/bin/env node
/**
 * quote - Terminal motivation from NIX
 * Usage: quote [context|all|search <term>|list]
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

function loadQuotes() {
  const file = path.join(__dirname, 'quotes.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function randomQuote(quotes, context = null) {
  if (context && context !== 'all') {
    const filtered = quotes.filter(q => q.context === context);
    if (filtered.length === 0) return null;
    return filtered[Math.floor(Math.random() * filtered.length)];
  }
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function formatQuote(q) {
  const width = Math.min(process.stdout.columns || 60, 60);
  const text = q.text;
  const author = q.author;
  const context = q.context;
  
  console.log('');
  console.log(COLORS.cyan + '┌' + '─'.repeat(width - 2) + '┐' + COLORS.reset);
  
  // Wrap text
  const words = text.split(' ');
  let line = '│ ';
  for (const word of words) {
    if (line.length + word.length + 1 > width - 1) {
      console.log(COLORS.cyan + line.padEnd(width - 1) + '│' + COLORS.reset);
      line = '│ ' + word;
    } else {
      line += (line === '│ ' ? '' : ' ') + word;
    }
  }
  if (line.length > 2) {
    console.log(COLORS.cyan + line.padEnd(width - 1) + '│' + COLORS.reset);
  }
  
  console.log(COLORS.cyan + '├' + '─'.repeat(width - 2) + '┤' + COLORS.reset);
  console.log(COLORS.cyan + '│' + COLORS.reset + ' ' + COLORS.yellow + author.padEnd(width - 4) + ' ' + COLORS.cyan + '│' + COLORS.reset);
  console.log(COLORS.cyan + '└' + '─'.repeat(width - 2) + '┘' + COLORS.reset);
  console.log(COLORS.gray + COLORS.dim + `  context: ${context}` + COLORS.reset);
  console.log('');
}

function listContexts(quotes) {
  const contexts = [...new Set(quotes.map(q => q.context))];
  console.log('\n' + COLORS.bold + 'Available contexts:' + COLORS.reset);
  contexts.forEach(c => {
    const count = quotes.filter(q => q.context === c).length;
    console.log(`  ${COLORS.cyan}${c}${COLORS.reset} (${count} quotes)`);
  });
  console.log(`\nTotal: ${COLORS.yellow}${quotes.length}${COLORS.reset} quotes\n`);
}

function searchQuotes(quotes, term) {
  const lower = term.toLowerCase();
  return quotes.filter(q => 
    q.text.toLowerCase().includes(lower) ||
    q.author.toLowerCase().includes(lower) ||
    q.context.toLowerCase().includes(lower)
  );
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || null;
  
  try {
    const quotes = loadQuotes();
    
    // List contexts
    if (command === 'list' || command === 'ls') {
      listContexts(quotes);
      return;
    }
    
    // Search quotes
    if (command === 'search' || command === 'find') {
      const term = args[1];
      if (!term) {
        console.error('Usage: quote search <term>');
        process.exit(1);
      }
      const results = searchQuotes(quotes, term);
      if (results.length === 0) {
        console.log(COLORS.gray + 'No quotes found matching: ' + term + COLORS.reset);
        return;
      }
      console.log(`\n${COLORS.bold}Found ${results.length} quote(s) for "${term}":${COLORS.reset}\n`);
      results.forEach(q => formatQuote(q));
      return;
    }
    
    // Random quote (default behavior)
    const context = (command === 'all') ? null : command;
    const q = randomQuote(quotes, context);
    
    if (!q) {
      console.error(`No quotes found for context: ${context}`);
      console.log(`Available contexts: ${[...new Set(quotes.map(q => q.context))].join(', ')}`);
      process.exit(1);
    }
    
    formatQuote(q);
  } catch (err) {
    console.error('Error loading quotes:', err.message);
    process.exit(1);
  }
}

main();
