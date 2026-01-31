#!/usr/bin/env node
/**
 * subscription.js - Track recurring expenses and subscriptions
 * Usage: nix subscription [command] [args]
 * 
 * Commands:
 *   nix subscription add <name> <amount> <frequency> [category]
 *   nix subscription list                    # All subscriptions
 *   nix subscription monthly                 # Monthly cost breakdown
 *   nix subscription yearly                  # Yearly cost breakdown  
 *   nix subscription upcoming                # Due in next 7 days
 *   nix subscription delete <id>             # Cancel subscription
 *   nix subscription edit <id> <field> <value> # Modify entry
 * 
 * Frequencies: monthly, yearly, weekly, quarterly
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'subscriptions.json');

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

const FREQUENCIES = {
  weekly: { multiplier: 52 / 12, label: 'week' },
  monthly: { multiplier: 1, label: 'month' },
  quarterly: { multiplier: 1 / 3, label: 'quarter' },
  yearly: { multiplier: 1 / 12, label: 'year' }
};

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return { subscriptions: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
  return Math.random().toString(36).substring(2, 6);
}

function formatCurrency(amount) {
  return '$' + parseFloat(amount).toFixed(2);
}

function toMonthly(amount, frequency) {
  return amount * FREQUENCIES[frequency].multiplier;
}

function getNextDueDate(startDate, frequency) {
  const start = new Date(startDate);
  const now = new Date();
  let next = new Date(start);
  
  while (next < now) {
    switch (frequency) {
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'quarterly': next.setMonth(next.getMonth() + 3); break;
      case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
    }
  }
  return next;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(date) {
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function addSubscription(name, amount, frequency, category = 'other') {
  if (!FREQUENCIES[frequency]) {
    console.log(`${COLORS.red}❌ Invalid frequency. Use: weekly, monthly, quarterly, yearly${COLORS.reset}`);
    process.exit(1);
  }
  
  const data = loadData();
  const sub = {
    id: generateId(),
    name,
    amount: parseFloat(amount),
    frequency,
    category,
    startDate: new Date().toISOString().split('T')[0],
    created: new Date().toISOString()
  };
  
  data.subscriptions.push(sub);
  saveData(data);
  
  const monthly = toMonthly(sub.amount, frequency);
  console.log(`${COLORS.green}✅ Added subscription${COLORS.reset}`);
  console.log(`   ${sub.name} - ${formatCurrency(sub.amount)}/${FREQUENCIES[frequency].label}`);
  console.log(`   ≈ ${formatCurrency(monthly)}/month`);
}

function listSubscriptions() {
  const data = loadData();
  
  if (data.subscriptions.length === 0) {
    console.log(`${COLORS.yellow}No subscriptions tracked yet.${COLORS.reset}`);
    console.log(`${COLORS.dim}Add one with: nix subscription add "Netflix" 15.99 monthly entertainment${COLORS.reset}`);
    return;
  }
  
  console.log('');
  console.log(`${COLORS.cyan}📋 Subscriptions${COLORS.reset}`);
  console.log('');
  
  // Sort by monthly cost descending
  const sorted = [...data.subscriptions].sort((a, b) => 
    toMonthly(b.amount, b.frequency) - toMonthly(a.amount, a.frequency)
  );
  
  for (const sub of sorted) {
    const monthly = toMonthly(sub.amount, sub.frequency);
    const nextDue = getNextDueDate(sub.startDate, sub.frequency);
    const days = daysUntil(nextDue);
    const dueColor = days <= 3 ? COLORS.red : days <= 7 ? COLORS.yellow : COLORS.dim;
    
    console.log(`  ${COLORS.bold}${sub.name}${COLORS.reset} ${COLORS.dim}(${sub.id})${COLORS.reset}`);
    console.log(`     ${formatCurrency(sub.amount)}/${FREQUENCIES[sub.frequency].label} ≈ ${formatCurrency(monthly)}/mo`);
    console.log(`     Next: ${dueColor}${formatDate(nextDue)} (${days} days)${COLORS.reset}`);
    console.log('');
  }
}

function showBreakdown(period = 'monthly') {
  const data = loadData();
  
  if (data.subscriptions.length === 0) {
    console.log(`${COLORS.yellow}No subscriptions to calculate.${COLORS.reset}`);
    return;
  }
  
  let totalMonthly = 0;
  let totalYearly = 0;
  const byCategory = {};
  
  for (const sub of data.subscriptions) {
    const monthly = toMonthly(sub.amount, sub.frequency);
    const yearly = monthly * 12;
    totalMonthly += monthly;
    totalYearly += yearly;
    
    byCategory[sub.category] = byCategory[sub.category] || { monthly: 0, yearly: 0, subs: [] };
    byCategory[sub.category].monthly += monthly;
    byCategory[sub.category].yearly += yearly;
    byCategory[sub.category].subs.push(sub);
  }
  
  console.log('');
  if (period === 'yearly') {
    console.log(`${COLORS.cyan}💰 Yearly Subscription Costs${COLORS.reset}`);
    console.log(`${COLORS.bold}Total: ${formatCurrency(totalYearly)}/year${COLORS.reset}`);
    console.log(`      ≈ ${formatCurrency(totalMonthly)}/month`);
    console.log('');
    
    console.log('By category:');
    Object.entries(byCategory)
      .sort((a, b) => b[1].yearly - a[1].yearly)
      .forEach(([cat, data]) => {
        console.log(`  ${cat}: ${formatCurrency(data.yearly)}/year`);
      });
  } else {
    console.log(`${COLORS.cyan}💰 Monthly Subscription Costs${COLORS.reset}`);
    console.log(`${COLORS.bold}Total: ${formatCurrency(totalMonthly)}/month${COLORS.reset}`);
    console.log(`      ≈ ${formatCurrency(totalYearly)}/year`);
    console.log('');
    
    console.log('By category:');
    Object.entries(byCategory)
      .sort((a, b) => b[1].monthly - a[1].monthly)
      .forEach(([cat, data]) => {
        console.log(`  ${cat}: ${formatCurrency(data.monthly)}/month`);
      });
  }
  
  console.log('');
}

function showUpcoming() {
  const data = loadData();
  const upcoming = [];
  
  for (const sub of data.subscriptions) {
    const nextDue = getNextDueDate(sub.startDate, sub.frequency);
    const days = daysUntil(nextDue);
    if (days <= 7) {
      upcoming.push({ ...sub, nextDue, days });
    }
  }
  
  if (upcoming.length === 0) {
    console.log(`${COLORS.green}✅ No subscriptions due in the next 7 days${COLORS.reset}`);
    return;
  }
  
  upcoming.sort((a, b) => a.days - b.days);
  
  console.log('');
  console.log(`${COLORS.cyan}⏰ Upcoming Payments${COLORS.reset}`);
  console.log('');
  
  for (const sub of upcoming) {
    const color = sub.days <= 3 ? COLORS.red : COLORS.yellow;
    console.log(`  ${color}${sub.days}d${COLORS.reset} ${sub.name} ${COLORS.dim}-${COLORS.reset} ${formatCurrency(sub.amount)}`);
  }
  console.log('');
}

function deleteSubscription(id) {
  const data = loadData();
  const idx = data.subscriptions.findIndex(s => s.id === id);
  
  if (idx === -1) {
    console.log(`${COLORS.red}❌ Subscription not found: ${id}${COLORS.reset}`);
    process.exit(1);
  }
  
  const sub = data.subscriptions[idx];
  data.subscriptions.splice(idx, 1);
  saveData(data);
  
  console.log(`${COLORS.green}✅ Deleted ${sub.name}${COLORS.reset}`);
}

function editSubscription(id, field, value) {
  const data = loadData();
  const sub = data.subscriptions.find(s => s.id === id);
  
  if (!sub) {
    console.log(`${COLORS.red}❌ Subscription not found: ${id}${COLORS.reset}`);
    process.exit(1);
  }
  
  if (!['name', 'amount', 'frequency', 'category'].includes(field)) {
    console.log(`${COLORS.red}❌ Invalid field. Use: name, amount, frequency, category${COLORS.reset}`);
    process.exit(1);
  }
  
  if (field === 'amount') value = parseFloat(value);
  sub[field] = value;
  saveData(data);
  
  console.log(`${COLORS.green}✅ Updated ${field} = ${value}${COLORS.reset}`);
}

function showHelp() {
  console.log(`
${COLORS.cyan}📅 nix subscription${COLORS.reset} - Track recurring expenses

${COLORS.bold}Usage:${COLORS.reset}
  nix subscription add <name> <amount> <frequency> [category]
  nix subscription list
  nix subscription monthly          # Monthly cost breakdown
  nix subscription yearly           # Yearly cost breakdown
  nix subscription upcoming         # Due in next 7 days
  nix subscription delete <id>
  nix subscription edit <id> <field> <value>

${COLORS.bold}Frequencies:${COLORS.reset}
  weekly, monthly, quarterly, yearly

${COLORS.bold}Examples:${COLORS.reset}
  nix subscription add "Netflix" 15.99 monthly entertainment
  nix subscription add "AWS" 50 monthly tech
  nix subscription add "Domain" 12 yearly tech
  nix subscription add "Gym" 30 weekly health
  nix subscription edit abc1 amount 19.99
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
    case 'add':
      if (args.length < 4) {
        console.log(`${COLORS.red}❌ Usage: nix subscription add <name> <amount> <frequency> [category]${COLORS.reset}`);
        process.exit(1);
      }
      addSubscription(args[1], args[2], args[3], args[4]);
      break;
      
    case 'list':
    case 'ls':
      listSubscriptions();
      break;
      
    case 'monthly':
      showBreakdown('monthly');
      break;
      
    case 'yearly':
    case 'annual':
      showBreakdown('yearly');
      break;
      
    case 'upcoming':
    case 'due':
      showUpcoming();
      break;
      
    case 'delete':
    case 'rm':
      if (!args[1]) {
        console.log(`${COLORS.red}❌ Missing subscription ID${COLORS.reset}`);
        process.exit(1);
      }
      deleteSubscription(args[1]);
      break;
      
    case 'edit':
      if (args.length < 4) {
        console.log(`${COLORS.red}❌ Usage: nix subscription edit <id> <field> <value>${COLORS.reset}`);
        process.exit(1);
      }
      editSubscription(args[1], args[2], args[3]);
      break;
      
    default:
      console.log(`${COLORS.red}❌ Unknown command: ${command}${COLORS.reset}`);
      showHelp();
      process.exit(1);
  }
}

main();
