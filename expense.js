#!/usr/bin/env node
/**
 * expense.js - Personal expense tracker
 * Usage: nix expense [command] [args]
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'expenses.json');

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

const CATEGORIES = ['food', 'transport', 'tech', 'bills', 'entertainment', 'shopping', 'health', 'other'];

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return { expenses: [], monthlyBudget: 1000 };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
  return Date.now().toString(36).slice(-4);
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(amount) {
  return '$' + parseFloat(amount).toFixed(2);
}

function getCategoryIcon(cat) {
  const icons = {
    food: '🍔',
    transport: '🚗',
    tech: '💻',
    bills: '📄',
    entertainment: '🎬',
    shopping: '🛍️',
    health: '💊',
    other: '📦'
  };
  return icons[cat] || '📦';
}

function showHelp() {
  console.log(`
${COLORS.bold}expense.js${COLORS.reset} - Personal expense tracker

${COLORS.bold}Usage:${COLORS.reset}
  nix expense <command> [args]

${COLORS.bold}Commands:${COLORS.reset}
  add <amount> [desc] [category]   Log a new expense
  list [today|week|month]          Show expenses (default: today)
  delete <id>                      Remove an expense
  summary [month]                  Monthly summary with breakdown
  budget <amount>                  Set monthly budget
  categories                       List all categories

${COLORS.bold}Categories:${COLORS.reset}
  food, transport, tech, bills, entertainment, shopping, health, other

${COLORS.bold}Examples:${COLORS.reset}
  nix expense add 15.50 "Lunch" food
  nix expense add 120 "New keyboard" tech
  nix expense list week
  nix expense summary
  nix expense budget 1500
`);
}

function addExpense(args) {
  if (args.length < 1) {
    console.log(`${COLORS.red}Error: Amount required${COLORS.reset}`);
    showHelp();
    return;
  }

  const amount = parseFloat(args[0]);
  if (isNaN(amount) || amount <= 0) {
    console.log(`${COLORS.red}Error: Invalid amount${COLORS.reset}`);
    return;
  }

  let description = args[1] || 'Expense';
  let category = (args[2] || 'other').toLowerCase();
  
  if (!CATEGORIES.includes(category)) {
    category = 'other';
  }

  const data = loadData();
  const expense = {
    id: generateId(),
    amount,
    description,
    category,
    date: getToday(),
    timestamp: new Date().toISOString()
  };

  data.expenses.push(expense);
  saveData(data);

  console.log(`${COLORS.green}✓${COLORS.reset} Expense logged: ${COLORS.bold}${formatCurrency(amount)}${COLORS.reset} ${getCategoryIcon(category)} ${description}`);
  
  // Show daily total
  const todayTotal = data.expenses
    .filter(e => e.date === getToday())
    .reduce((sum, e) => sum + e.amount, 0);
  
  const budget = data.monthlyBudget || 1000;
  const dailyBudget = budget / 30;
  const percent = Math.min(100, (todayTotal / dailyBudget) * 100);
  const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
  
  console.log(`${COLORS.dim}Daily: ${formatCurrency(todayTotal)} / ~${formatCurrency(dailyBudget)} [${bar}]${COLORS.reset}`);
}

function listExpenses(filter) {
  const data = loadData();
  let expenses = data.expenses;
  
  const today = getToday();
  const now = new Date();
  
  if (filter === 'today') {
    expenses = expenses.filter(e => e.date === today);
  } else if (filter === 'week') {
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    expenses = expenses.filter(e => new Date(e.date) >= weekAgo);
  } else if (filter === 'month') {
    const thisMonth = today.slice(0, 7);
    expenses = expenses.filter(e => e.date.startsWith(thisMonth));
  }

  if (expenses.length === 0) {
    console.log(`${COLORS.dim}No expenses found.${COLORS.reset}`);
    return;
  }

  expenses = expenses.slice().reverse();
  
  console.log(`\n${COLORS.bold}${filter ? filter.charAt(0).toUpperCase() + filter.slice(1) : 'All'} Expenses:${COLORS.reset}`);
  console.log('─'.repeat(50));
  
  let total = 0;
  expenses.forEach(e => {
    total += e.amount;
    const date = e.date.slice(5);
    console.log(`  ${COLORS.cyan}${e.id}${COLORS.reset}  ${date}  ${getCategoryIcon(e.category)} ${e.category.padEnd(13)} ${COLORS.bold}${formatCurrency(e.amount).padStart(8)}${COLORS.reset}  ${e.description}`);
  });
  
  console.log('─'.repeat(50));
  console.log(`  ${COLORS.bold}Total: ${formatCurrency(total)}${COLORS.reset} (${expenses.length} items)\n`);
}

function deleteExpense(id) {
  const data = loadData();
  const idx = data.expenses.findIndex(e => e.id === id);
  
  if (idx === -1) {
    console.log(`${COLORS.red}Error: Expense not found${COLORS.reset}`);
    return;
  }
  
  const deleted = data.expenses.splice(idx, 1)[0];
  saveData(data);
  console.log(`${COLORS.green}✓${COLORS.reset} Deleted: ${formatCurrency(deleted.amount)} - ${deleted.description}`);
}

function showSummary(monthArg) {
  const data = loadData();
  const month = monthArg || getToday().slice(0, 7);
  
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(month));
  
  if (monthExpenses.length === 0) {
    console.log(`${COLORS.dim}No expenses for ${month}.${COLORS.reset}`);
    return;
  }

  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const budget = data.monthlyBudget || 1000;
  const remaining = budget - total;
  
  console.log(`\n${COLORS.bold}📊 Expense Summary: ${month}${COLORS.reset}\n`);
  
  // Budget progress
  const percent = Math.min(100, (total / budget) * 100);
  const barFilled = Math.floor(percent / 5);
  const bar = '█'.repeat(barFilled) + '░'.repeat(20 - barFilled);
  const color = percent > 90 ? COLORS.red : percent > 75 ? COLORS.yellow : COLORS.green;
  
  console.log(`  Budget:   ${formatCurrency(budget)}`);
  console.log(`  Spent:    ${COLORS.bold}${formatCurrency(total)}${COLORS.reset}`);
  console.log(`  Remaining: ${color}${formatCurrency(remaining)}${COLORS.reset}`);
  console.log(`  ${bar} ${percent.toFixed(1)}%\n`);
  
  // Category breakdown
  console.log(`${COLORS.bold}By Category:${COLORS.reset}`);
  const byCategory = {};
  monthExpenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });
  
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amount]) => {
      const pct = (amount / total * 100).toFixed(1);
      console.log(`  ${getCategoryIcon(cat)} ${cat.padEnd(13)} ${formatCurrency(amount).padStart(8)} (${pct}%)`);
    });
  
  console.log();
}

function setBudget(amount) {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    console.log(`${COLORS.red}Error: Invalid budget amount${COLORS.reset}`);
    return;
  }
  
  const data = loadData();
  data.monthlyBudget = num;
  saveData(data);
  console.log(`${COLORS.green}✓${COLORS.reset} Monthly budget set to ${COLORS.bold}${formatCurrency(num)}${COLORS.reset}`);
}

function listCategories() {
  console.log(`\n${COLORS.bold}Available Categories:${COLORS.reset}\n`);
  CATEGORIES.forEach(cat => {
    console.log(`  ${getCategoryIcon(cat)} ${cat}`);
  });
  console.log();
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case 'add':
      addExpense(rest);
      break;
    case 'list':
      listExpenses(rest[0]);
      break;
    case 'delete':
      deleteExpense(rest[0]);
      break;
    case 'summary':
      showSummary(rest[0]);
      break;
    case 'budget':
      setBudget(rest[0]);
      break;
    case 'categories':
      listCategories();
      break;
    default:
      console.log(`${COLORS.red}Unknown command: ${command}${COLORS.reset}`);
      showHelp();
  }
}

main();
