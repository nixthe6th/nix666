#!/usr/bin/env node

/**
 * nix invest — Investment portfolio tracker
 * Track stocks, crypto, and other investments with performance metrics
 * 
 * Usage:
 *   nix invest add <symbol> <shares> <cost> [type] [name]   # Add holding
 *   nix invest remove <symbol>                                # Remove holding
 *   nix invest list                                           # Show all holdings
 *   nix invest performance                                    # Portfolio performance
 *   nix invest allocation                                     # Asset allocation
 *   nix invest dividend add <symbol> <amount> [date]          # Log dividend
 *   nix invest dividend list [symbol]                         # View dividends
 *   nix invest update <symbol> <price>                        # Update current price
 *   nix invest history <symbol>                               # Price history
 * 
 * Examples:
 *   nix invest add AAPL 10 175.50 stock "Apple Inc"
 *   nix invest add BTC 0.5 45000 crypto "Bitcoin"
 *   nix invest add VTI 25 220.00 etf "Total Stock Market"
 *   nix invest update AAPL 185.25
 *   nix invest dividend add AAPL 25.50
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.nix666');
const INVEST_FILE = path.join(DATA_DIR, 'investments.json');
const DIVIDEND_FILE = path.join(DATA_DIR, 'dividends.json');
const HISTORY_FILE = path.join(DATA_DIR, 'invest_history.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadInvestments() {
  if (!fs.existsSync(INVEST_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(INVEST_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveInvestments(data) {
  fs.writeFileSync(INVEST_FILE, JSON.stringify(data, null, 2));
}

function loadDividends() {
  if (!fs.existsSync(DIVIDEND_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DIVIDEND_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveDividends(data) {
  fs.writeFileSync(DIVIDEND_FILE, JSON.stringify(data, null, 2));
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveHistory(data) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

function formatPercent(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatNumber(num, decimals = 2) {
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function colorValue(value, inverse = false) {
  // For returns: green = positive, red = negative
  // For costs: can use inverse
  const isPositive = inverse ? value < 0 : value >= 0;
  if (isPositive) return `\x1b[32m${value}\x1b[0m`;
  return `\x1b[31m${value}\x1b[0m`;
}

function colorPercent(value) {
  const formatted = formatPercent(value);
  if (value > 0) return `\x1b[32m${formatted}\x1b[0m`;
  if (value < 0) return `\x1b[31m${formatted}\x1b[0m`;
  return formatted;
}

// Asset type emojis
const TYPE_ICONS = {
  stock: '📈',
  crypto: '₿',
  etf: '📊',
  bond: '📜',
  reit: '🏢',
  commodity: '🥇',
  forex: '💱',
  other: '📋'
};

function getIcon(type) {
  return TYPE_ICONS[type] || TYPE_ICONS.other;
}

// Add a new investment holding
function addHolding(symbol, shares, cost, type = 'stock', name = '') {
  const investments = loadInvestments();
  const history = loadHistory();
  
  symbol = symbol.toUpperCase();
  
  if (investments[symbol]) {
    // Update existing holding (dollar-cost average)
    const existing = investments[symbol];
    const totalShares = existing.shares + shares;
    const totalCost = (existing.shares * existing.avgCost) + (shares * cost);
    const newAvgCost = totalCost / totalShares;
    
    existing.shares = totalShares;
    existing.avgCost = newAvgCost;
    existing.updatedAt = new Date().toISOString();
    
    console.log(`📊 Updated ${symbol} position`);
    console.log(`   New average cost: ${formatCurrency(newAvgCost)}`);
    console.log(`   Total shares: ${formatNumber(totalShares)}`);
  } else {
    // Add new holding
    investments[symbol] = {
      symbol,
      name: name || symbol,
      shares: parseFloat(shares),
      avgCost: parseFloat(cost),
      currentPrice: parseFloat(cost), // Start with cost as current price
      type: type.toLowerCase(),
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log(`✅ Added ${symbol} to portfolio`);
    console.log(`   ${formatNumber(shares)} shares @ ${formatCurrency(cost)}`);
  }
  
  // Record in history
  if (!history[symbol]) history[symbol] = [];
  history[symbol].push({
    date: getToday(),
    action: 'buy',
    shares: parseFloat(shares),
    price: parseFloat(cost)
  });
  
  saveInvestments(investments);
  saveHistory(history);
}

// Remove a holding
function removeHolding(symbol) {
  const investments = loadInvestments();
  symbol = symbol.toUpperCase();
  
  if (!investments[symbol]) {
    console.log(`❌ ${symbol} not found in portfolio`);
    return;
  }
  
  const holding = investments[symbol];
  const unrealizedPnl = (holding.currentPrice - holding.avgCost) * holding.shares;
  
  console.log(`🗑️  Removing ${symbol}`);
  console.log(`   Final value: ${formatCurrency(holding.shares * holding.currentPrice)}`);
  console.log(`   Unrealized P&L: ${colorValue(formatCurrency(unrealizedPnl))}`);
  
  delete investments[symbol];
  saveInvestments(investments);
  console.log(`✅ ${symbol} removed from portfolio`);
}

// List all holdings with performance
function listHoldings() {
  const investments = loadInvestments();
  const symbols = Object.keys(investments);
  
  if (symbols.length === 0) {
    console.log('📭 Portfolio is empty');
    console.log('   Add holdings with: nix invest add <symbol> <shares> <cost>');
    return;
  }
  
  console.log('');
  console.log('📊 PORTFOLIO HOLDINGS');
  console.log('═'.repeat(90));
  console.log(`${'Symbol'.padEnd(8)} ${'Name'.padEnd(18)} ${'Type'.padEnd(8)} ${'Shares'.padEnd(10)} ${'Avg Cost'.padEnd(10)} ${'Price'.padEnd(10)} ${'Value'.padEnd(12)} ${'P&L'.padEnd(12)}`);
  console.log('─'.repeat(90));
  
  let totalValue = 0;
  let totalCost = 0;
  
  symbols.sort().forEach(symbol => {
    const h = investments[symbol];
    const value = h.shares * h.currentPrice;
    const cost = h.shares * h.avgCost;
    const pnl = value - cost;
    const pnlPercent = ((h.currentPrice - h.avgCost) / h.avgCost) * 100;
    
    totalValue += value;
    totalCost += cost;
    
    const icon = getIcon(h.type);
    const name = h.name.substring(0, 16).padEnd(18);
    
    console.log(
      `${icon} ${h.symbol.padEnd(6)} ${name} ${h.type.padEnd(8)} ` +
      `${formatNumber(h.shares).padEnd(10)} ${formatCurrency(h.avgCost).padEnd(10)} ` +
      `${formatCurrency(h.currentPrice).padEnd(10)} ${formatCurrency(value).padEnd(12)} ` +
      `${colorPercent(pnlPercent).padEnd(12)}`
    );
  });
  
  console.log('─'.repeat(90));
  
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  console.log(`   Total Portfolio Value: ${formatCurrency(totalValue).padStart(12)}`);
  console.log(`   Total Cost Basis:      ${formatCurrency(totalCost).padStart(12)}`);
  console.log(`   Total P&L:             ${colorValue(formatCurrency(totalPnl).padStart(12))}`);
  console.log(`   Return:                ${colorPercent(totalPnlPercent).padStart(12)}`);
  console.log('');
}

// Show portfolio performance summary
function showPerformance() {
  const investments = loadInvestments();
  const dividends = loadDividends();
  const symbols = Object.keys(investments);
  
  if (symbols.length === 0) {
    console.log('📭 Portfolio is empty');
    return;
  }
  
  let totalValue = 0;
  let totalCost = 0;
  let totalDividends = 0;
  
  symbols.forEach(symbol => {
    const h = investments[symbol];
    totalValue += h.shares * h.currentPrice;
    totalCost += h.shares * h.avgCost;
    
    if (dividends[symbol]) {
      totalDividends += dividends[symbol].reduce((sum, d) => sum + d.amount, 0);
    }
  });
  
  const unrealizedPnl = totalValue - totalCost;
  const unrealizedReturn = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;
  const totalReturn = totalCost > 0 ? ((unrealizedPnl + totalDividends) / totalCost) * 100 : 0;
  
  console.log('');
  console.log('📈 PORTFOLIO PERFORMANCE');
  console.log('═'.repeat(50));
  console.log('');
  console.log(`  Portfolio Value:     ${formatCurrency(totalValue)}`);
  console.log(`  Cost Basis:          ${formatCurrency(totalCost)}`);
  console.log('');
  console.log(`  Unrealized P&L:      ${colorValue(formatCurrency(unrealizedPnl))}`);
  console.log(`  Unrealized Return:   ${colorPercent(unrealizedReturn)}`);
  console.log('');
  console.log(`  Dividends Received:  ${formatCurrency(totalDividends)}`);
  console.log(`  Total Return:        ${colorPercent(totalReturn)}`);
  console.log('');
  
  // Best and worst performers
  const performers = symbols.map(symbol => {
    const h = investments[symbol];
    const return_pct = ((h.currentPrice - h.avgCost) / h.avgCost) * 100;
    return { symbol, return: return_pct, pnl: (h.currentPrice - h.avgCost) * h.shares };
  }).sort((a, b) => b.return - a.return);
  
  if (performers.length > 0) {
    console.log('  🏆 Best Performer:   ', performers[0].symbol, colorPercent(performers[0].return));
    console.log('  📉 Worst Performer:  ', performers[performers.length - 1].symbol, 
                colorPercent(performers[performers.length - 1].return));
  }
  console.log('');
}

// Show asset allocation
function showAllocation() {
  const investments = loadInvestments();
  const symbols = Object.keys(investments);
  
  if (symbols.length === 0) {
    console.log('📭 Portfolio is empty');
    return;
  }
  
  const byType = {};
  let totalValue = 0;
  
  symbols.forEach(symbol => {
    const h = investments[symbol];
    const value = h.shares * h.currentPrice;
    totalValue += value;
    
    byType[h.type] = (byType[h.type] || 0) + value;
  });
  
  console.log('');
  console.log('📊 ASSET ALLOCATION');
  console.log('═'.repeat(45));
  console.log('');
  
  const types = Object.keys(byType).sort((a, b) => byType[b] - byType[a]);
  const maxVal = Math.max(...Object.values(byType));
  
  types.forEach(type => {
    const value = byType[type];
    const percent = (value / totalValue) * 100;
    const barLength = Math.round((value / maxVal) * 25);
    const bar = '█'.repeat(barLength) + '░'.repeat(25 - barLength);
    const icon = getIcon(type);
    
    console.log(`  ${icon} ${type.padEnd(10)} ${bar} ${percent.toFixed(1)}%  ${formatCurrency(value)}`);
  });
  
  console.log('');
  console.log(`  Total: ${formatCurrency(totalValue)}`);
  console.log('');
}

// Add a dividend payment
function addDividend(symbol, amount, date = null) {
  const investments = loadInvestments();
  const dividends = loadDividends();
  symbol = symbol.toUpperCase();
  
  if (!investments[symbol]) {
    console.log(`⚠️  ${symbol} not in portfolio, adding dividend anyway`);
  }
  
  if (!dividends[symbol]) {
    dividends[symbol] = [];
  }
  
  dividends[symbol].push({
    id: generateId(),
    amount: parseFloat(amount),
    date: date || getToday(),
    recordedAt: new Date().toISOString()
  });
  
  saveDividends(dividends);
  console.log(`💰 Dividend recorded: ${formatCurrency(amount)} from ${symbol}`);
  
  // Show running total for this symbol
  const total = dividends[symbol].reduce((sum, d) => sum + d.amount, 0);
  console.log(`   Total dividends from ${symbol}: ${formatCurrency(total)}`);
}

// List dividends
function listDividends(symbol = null) {
  const dividends = loadDividends();
  const investments = loadInvestments();
  
  if (symbol) {
    symbol = symbol.toUpperCase();
    const divs = dividends[symbol] || [];
    
    console.log('');
    console.log(`💰 DIVIDENDS: ${symbol}`);
    console.log('─'.repeat(40));
    
    if (divs.length === 0) {
      console.log('  No dividends recorded');
      return;
    }
    
    let total = 0;
    divs.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(d => {
      console.log(`  ${d.date}  ${formatCurrency(d.amount)}`);
      total += d.amount;
    });
    
    console.log('─'.repeat(40));
    console.log(`  Total: ${formatCurrency(total)}`);
    console.log('');
  } else {
    // Show all dividends
    console.log('');
    console.log('💰 ALL DIVIDENDS');
    console.log('═'.repeat(50));
    
    let grandTotal = 0;
    const symbols = Object.keys(dividends).sort();
    
    if (symbols.length === 0) {
      console.log('  No dividends recorded yet');
      console.log('  Add with: nix invest dividend add <symbol> <amount>');
      return;
    }
    
    symbols.forEach(sym => {
      const divs = dividends[sym];
      const total = divs.reduce((sum, d) => sum + d.amount, 0);
      grandTotal += total;
      const icon = investments[sym] ? getIcon(investments[sym].type) : '📋';
      console.log(`  ${icon} ${sym.padEnd(8)} ${formatCurrency(total).padStart(10)}  (${divs.length} payments)`);
    });
    
    console.log('─'.repeat(50));
    console.log(`  GRAND TOTAL: ${formatCurrency(grandTotal).padStart(20)}`);
    console.log('');
  }
}

// Update current price for a holding
function updatePrice(symbol, price) {
  const investments = loadInvestments();
  const history = loadHistory();
  symbol = symbol.toUpperCase();
  
  if (!investments[symbol]) {
    console.log(`❌ ${symbol} not found in portfolio`);
    return;
  }
  
  const oldPrice = investments[symbol].currentPrice;
  investments[symbol].currentPrice = parseFloat(price);
  investments[symbol].updatedAt = new Date().toISOString();
  
  // Record price in history
  if (!history[symbol]) history[symbol] = [];
  history[symbol].push({
    date: getToday(),
    action: 'price_update',
    price: parseFloat(price)
  });
  
  saveInvestments(investments);
  saveHistory(history);
  
  const change = ((price - oldPrice) / oldPrice) * 100;
  console.log(`📈 Updated ${symbol}: ${formatCurrency(oldPrice)} → ${formatCurrency(parseFloat(price))}`);
  console.log(`   Change: ${colorPercent(change)}`);
}

// Show price history for a symbol
function showHistory(symbol) {
  const history = loadHistory();
  const investments = loadInvestments();
  symbol = symbol.toUpperCase();
  
  if (!history[symbol] || history[symbol].length === 0) {
    console.log(`📭 No history found for ${symbol}`);
    return;
  }
  
  const holding = investments[symbol];
  const icon = holding ? getIcon(holding.type) : '📋';
  
  console.log('');
  console.log(`${icon} ${symbol} HISTORY`);
  console.log('═'.repeat(50));
  console.log('');
  
  const entries = history[symbol].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  entries.forEach(entry => {
    if (entry.action === 'buy') {
      console.log(`  📥 ${entry.date}  Bought ${formatNumber(entry.shares)} shares @ ${formatCurrency(entry.price)}`);
    } else if (entry.action === 'price_update') {
      console.log(`  📊 ${entry.date}  Price update: ${formatCurrency(entry.price)}`);
    }
  });
  
  if (holding) {
    console.log('');
    console.log(`  Current: ${formatCurrency(holding.currentPrice)}`);
    console.log(`  Avg Cost: ${formatCurrency(holding.avgCost)}`);
  }
  console.log('');
}

// Show help
function showHelp() {
  console.log('');
  console.log('📈 nix invest — Investment Portfolio Tracker');
  console.log('');
  console.log('Usage:');
  console.log('  nix invest add <symbol> <shares> <cost> [type] [name]');
  console.log('  nix invest remove <symbol>');
  console.log('  nix invest list');
  console.log('  nix invest performance');
  console.log('  nix invest allocation');
  console.log('  nix invest update <symbol> <price>');
  console.log('  nix invest history <symbol>');
  console.log('  nix invest dividend add <symbol> <amount> [date]');
  console.log('  nix invest dividend list [symbol]');
  console.log('');
  console.log('Asset Types: stock, crypto, etf, bond, reit, commodity, forex, other');
  console.log('');
  console.log('Examples:');
  console.log('  nix invest add AAPL 10 175.50 stock "Apple Inc"');
  console.log('  nix invest add BTC 0.5 45000 crypto "Bitcoin"');
  console.log('  nix invest add VTI 25 220.00 etf');
  console.log('  nix invest update AAPL 185.25');
  console.log('  nix invest dividend add AAPL 25.50 2026-01-15');
  console.log('');
}

// Main command handler
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  switch (command) {
    case 'add':
      if (args.length < 4) {
        console.log('❌ Usage: nix invest add <symbol> <shares> <cost> [type] [name]');
        return;
      }
      addHolding(args[1], args[2], args[3], args[4] || 'stock', args.slice(5).join(' '));
      break;
      
    case 'remove':
    case 'delete':
      if (args.length < 2) {
        console.log('❌ Usage: nix invest remove <symbol>');
        return;
      }
      removeHolding(args[1]);
      break;
      
    case 'list':
    case 'ls':
      listHoldings();
      break;
      
    case 'performance':
    case 'perf':
      showPerformance();
      break;
      
    case 'allocation':
    case 'alloc':
      showAllocation();
      break;
      
    case 'update':
      if (args.length < 3) {
        console.log('❌ Usage: nix invest update <symbol> <price>');
        return;
      }
      updatePrice(args[1], args[2]);
      break;
      
    case 'history':
      if (args.length < 2) {
        console.log('❌ Usage: nix invest history <symbol>');
        return;
      }
      showHistory(args[1]);
      break;
      
    case 'dividend':
      const divCmd = args[1];
      if (divCmd === 'add') {
        if (args.length < 4) {
          console.log('❌ Usage: nix invest dividend add <symbol> <amount> [date]');
          return;
        }
        addDividend(args[2], args[3], args[4]);
      } else if (divCmd === 'list' || divCmd === 'ls') {
        listDividends(args[2]);
      } else {
        console.log('❌ Unknown dividend command. Use: add, list');
      }
      break;
      
    default:
      console.log(`❌ Unknown command: ${command}`);
      showHelp();
  }
}

main();
