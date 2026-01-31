#!/usr/bin/env node
/**
 * goal.js - Savings goal tracker with progress visualization
 * Usage: nix goal [command] [args]
 * 
 * Commands:
 *   nix goal add <name> <target> [deadline]    # Create new goal
 *   nix goal contribute <id> <amount> [note]   # Add to goal
 *   nix goal list                              # All goals
 *   nix goal progress                          # Progress dashboard
 *   nix goal delete <id>                       # Remove goal
 * 
 * Examples:
 *   nix goal add "Vacation" 3000 "2026-06-01"
 *   nix goal add "Emergency Fund" 10000
 *   nix goal contribute vac1 500 "Tax refund"
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'goals.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return { goals: [] };
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

function formatDate(date) {
  if (!date) return 'No deadline';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(date) {
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function progressBar(percent, width = 30) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  let color = COLORS.red;
  if (percent >= 75) color = COLORS.green;
  else if (percent >= 50) color = COLORS.yellow;
  else if (percent >= 25) color = COLORS.cyan;
  
  return `${color}${bar}${COLORS.reset}`;
}

function addGoal(name, target, deadline = null) {
  const data = loadData();
  const id = generateId();
  
  const goal = {
    id,
    name,
    target: parseFloat(target),
    current: 0,
    deadline,
    created: new Date().toISOString(),
    contributions: []
  };
  
  data.goals.push(goal);
  saveData(data);
  
  console.log(`${COLORS.green}✓ Goal created${COLORS.reset}`);
  console.log(`  ${COLORS.bold}${name}${COLORS.reset} — ${formatCurrency(target)}${deadline ? ' by ' + formatDate(deadline) : ''}`);
  console.log(`  ID: ${COLORS.cyan}${id}${COLORS.reset}`);
}

function contribute(id, amount, note = '') {
  const data = loadData();
  const goal = data.goals.find(g => g.id === id);
  
  if (!goal) {
    console.log(`${COLORS.red}❌ Goal not found: ${id}${COLORS.reset}`);
    process.exit(1);
  }
  
  const contribution = {
    amount: parseFloat(amount),
    date: new Date().toISOString(),
    note
  };
  
  goal.contributions.push(contribution);
  goal.current += parseFloat(amount);
  
  saveData(data);
  
  const percent = (goal.current / goal.target) * 100;
  console.log(`${COLORS.green}✓ Contribution added${COLORS.reset}`);
  console.log(`  ${formatCurrency(amount)} → ${goal.name}`);
  console.log(`  Progress: ${formatCurrency(goal.current)} / ${formatCurrency(goal.target)} (${percent.toFixed(1)}%)`);
}

function listGoals() {
  const data = loadData();
  
  if (data.goals.length === 0) {
    console.log(`${COLORS.dim}No savings goals yet.${COLORS.reset}`);
    console.log(`Create one with: ${COLORS.cyan}nix goal add "Vacation" 3000 "2026-06-01"${COLORS.reset}`);
    return;
  }
  
  console.log(`${COLORS.bold}💰 Savings Goals${COLORS.reset}\n`);
  
  // Sort: active goals first, then by progress
  const sorted = [...data.goals].sort((a, b) => {
    const aDone = a.current >= a.target;
    const bDone = b.current >= b.target;
    if (aDone !== bDone) return aDone ? 1 : -1;
    return (b.current / b.target) - (a.current / a.target);
  });
  
  sorted.forEach(goal => {
    const percent = Math.min((goal.current / goal.target) * 100, 100);
    const isComplete = goal.current >= goal.target;
    
    console.log(`${isComplete ? COLORS.green + '✓' : '○'} ${COLORS.bold}${goal.name}${COLORS.reset} ${COLORS.dim}(${goal.id})${COLORS.reset}`);
    console.log(`  ${progressBar(percent)} ${percent.toFixed(0)}%`);
    console.log(`  ${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}`);
    
    if (goal.deadline && !isComplete) {
      const days = daysUntil(goal.deadline);
      const remaining = goal.target - goal.current;
      
      if (days > 0) {
        const monthlyNeeded = remaining / (days / 30);
        console.log(`  ${COLORS.yellow}Due: ${formatDate(goal.deadline)} (${days} days)${COLORS.reset}`);
        console.log(`  ${COLORS.cyan}Need: ${formatCurrency(monthlyNeeded)}/month${COLORS.reset}`);
      } else {
        console.log(`  ${COLORS.red}Overdue by ${Math.abs(days)} days${COLORS.reset}`);
      }
    }
    
    console.log();
  });
}

function showProgress() {
  const data = loadData();
  
  if (data.goals.length === 0) {
    console.log(`${COLORS.dim}No goals to track.${COLORS.reset}`);
    return;
  }
  
  const totalTarget = data.goals.reduce((sum, g) => sum + g.target, 0);
  const totalSaved = data.goals.reduce((sum, g) => sum + g.current, 0);
  const totalPercent = (totalSaved / totalTarget) * 100;
  const completed = data.goals.filter(g => g.current >= g.target).length;
  
  console.log(`${COLORS.bold}📊 Savings Dashboard${COLORS.reset}\n`);
  
  // Overall progress
  console.log(`${COLORS.bold}Total Progress${COLORS.reset}`);
  console.log(`  ${progressBar(totalPercent, 40)} ${totalPercent.toFixed(1)}%`);
  console.log(`  ${formatCurrency(totalSaved)} / ${formatCurrency(totalTarget)} saved`);
  console.log(`  ${COLORS.green}${completed}${COLORS.reset} of ${data.goals.length} goals completed\n`);
  
  // Recent activity
  const allContributions = data.goals.flatMap(g => 
    g.contributions.map(c => ({ ...c, goalName: g.name }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  
  if (allContributions.length > 0) {
    console.log(`${COLORS.bold}Recent Contributions${COLORS.reset}`);
    allContributions.forEach(c => {
      const date = new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      console.log(`  ${COLORS.dim}${date}${COLORS.reset} ${formatCurrency(c.amount)} → ${c.goalName}${c.note ? ' (' + c.note + ')' : ''}`);
    });
    console.log();
  }
  
  // Urgent goals (deadline within 30 days and not complete)
  const urgent = data.goals.filter(g => {
    if (!g.deadline || g.current >= g.target) return false;
    const days = daysUntil(g.deadline);
    return days > 0 && days <= 30;
  });
  
  if (urgent.length > 0) {
    console.log(`${COLORS.bold}${COLORS.yellow}⚠️ Upcoming Deadlines${COLORS.reset}`);
    urgent.forEach(g => {
      const days = daysUntil(g.deadline);
      const remaining = g.target - g.current;
      console.log(`  ${g.name}: ${days} days left, ${formatCurrency(remaining)} to go`);
    });
  }
}

function deleteGoal(id) {
  const data = loadData();
  const idx = data.goals.findIndex(g => g.id === id);
  
  if (idx === -1) {
    console.log(`${COLORS.red}❌ Goal not found: ${id}${COLORS.reset}`);
    process.exit(1);
  }
  
  const goal = data.goals[idx];
  data.goals.splice(idx, 1);
  saveData(data);
  
  console.log(`${COLORS.yellow}✓ Deleted goal: ${goal.name}${COLORS.reset}`);
}

// CLI
const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case 'add':
    if (args.length < 2) {
      console.log(`${COLORS.red}Usage: nix goal add <name> <target> [deadline]${COLORS.reset}`);
      process.exit(1);
    }
    addGoal(args[0], args[1], args[2]);
    break;
    
  case 'contribute':
  case 'add-to':
    if (args.length < 2) {
      console.log(`${COLORS.red}Usage: nix goal contribute <id> <amount> [note]${COLORS.reset}`);
      process.exit(1);
    }
    contribute(args[0], args[1], args.slice(2).join(' '));
    break;
    
  case 'list':
  case 'ls':
    listGoals();
    break;
    
  case 'progress':
  case 'status':
  case 'dashboard':
    showProgress();
    break;
    
  case 'delete':
  case 'rm':
    if (!args[0]) {
      console.log(`${COLORS.red}Usage: nix goal delete <id>${COLORS.reset}`);
      process.exit(1);
    }
    deleteGoal(args[0]);
    break;
    
  default:
    console.log(`${COLORS.bold}💰 nix goal — Savings goal tracker${COLORS.reset}\n`);
    console.log('Commands:');
    console.log(`  ${COLORS.cyan}nix goal add <name> <target> [deadline]${COLORS.reset}  Create new goal`);
    console.log(`  ${COLORS.cyan}nix goal contribute <id> <amount> [note]${COLORS.reset}  Add to goal`);
    console.log(`  ${COLORS.cyan}nix goal list${COLORS.reset}                          Show all goals`);
    console.log(`  ${COLORS.cyan}nix goal progress${COLORS.reset}                      Progress dashboard`);
    console.log(`  ${COLORS.cyan}nix goal delete <id>${COLORS.reset}                  Remove goal\n`);
    console.log('Examples:');
    console.log(`  nix goal add "Vacation" 3000 "2026-06-01"`);
    console.log(`  nix goal contribute ab12 500 "Tax refund"`);
    break;
}
