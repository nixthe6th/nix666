#!/usr/bin/env node
/**
 * todo.js - Sprint-mode task tracker
 * Usage: todo [add|list|done|remove|priority] [args]
 */

const fs = require('fs');
const path = require('path');

const TODO_FILE = path.join(__dirname, 'data', 'todos.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

const PRIORITIES = {
  high: { color: 'red', icon: '🔴', weight: 3 },
  medium: { color: 'yellow', icon: '🟡', weight: 2 },
  low: { color: 'cyan', icon: '🔵', weight: 1 }
};

function ensureDir() {
  const dir = path.dirname(TODO_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadTodos() {
  ensureDir();
  if (!fs.existsSync(TODO_FILE)) return [];
  return JSON.parse(fs.readFileSync(TODO_FILE, 'utf8'));
}

function saveTodos(todos) {
  ensureDir();
  fs.writeFileSync(TODO_FILE, JSON.stringify(todos, null, 2));
}

function generateId() {
  return Date.now().toString(36).slice(-4);
}

function addTodo(text, priority = 'medium') {
  const todos = loadTodos();
  const todo = {
    id: generateId(),
    text,
    priority: priority.toLowerCase(),
    created: new Date().toISOString(),
    done: false
  };
  todos.push(todo);
  saveTodos(todos);
  const p = PRIORITIES[todo.priority] || PRIORITIES.medium;
  const colorCode = COLORS[p.color] || COLORS.cyan;
  console.log(`${COLORS.green}✓ Added ${colorCode}${p.icon}${COLORS.reset} ${COLORS.dim}[${todo.id}]${COLORS.reset}: ${text}`);
}

function listTodos(filter = null) {
  const todos = loadTodos().filter(t => !t.done);
  
  if (filter) {
    const f = filter.toLowerCase();
    const filtered = todos.filter(t => 
      t.priority === f || 
      t.text.toLowerCase().includes(f)
    );
    displayTodos(filtered, filter);
    return;
  }
  
  // Sort by priority weight (desc) then created (asc)
  todos.sort((a, b) => {
    const wa = (PRIORITIES[a.priority] || PRIORITIES.medium).weight;
    const wb = (PRIORITIES[b.priority] || PRIORITIES.medium).weight;
    if (wb !== wa) return wb - wa;
    return new Date(a.created) - new Date(b.created);
  });
  
  displayTodos(todos);
}

function displayTodos(todos, label = null) {
  if (todos.length === 0) {
    console.log(COLORS.yellow + '✨ No active todos. Time to create something!' + COLORS.reset);
    return;
  }
  
  const header = label ? `🎯 Todos (${label})` : '🎯 Active Todos';
  console.log(COLORS.cyan + COLORS.bold + header + COLORS.reset);
  console.log('');
  
  todos.forEach(t => {
    const p = PRIORITIES[t.priority] || PRIORITIES.medium;
    const age = getAge(t.created);
    const colorCode = COLORS[p.color] || COLORS.cyan;
    console.log(`  ${colorCode}${p.icon}${COLORS.reset} ${COLORS.bold}[${t.id}]${COLORS.reset} ${t.text}`);
    console.log(`     ${COLORS.dim}${t.priority} · ${age}${COLORS.reset}`);
  });
  
  console.log('');
  console.log(COLORS.dim + `  ${todos.length} task${todos.length !== 1 ? 's' : ''} remaining` + COLORS.reset);
}

function getAge(iso) {
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours/24)}d ago`;
}

function completeTodo(id) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === id);
  if (!todo) {
    console.log(COLORS.red + `✗ No todo with id "${id}"` + COLORS.reset);
    return;
  }
  todo.done = true;
  todo.completed = new Date().toISOString();
  saveTodos(todos);
  console.log(`${COLORS.green}✓ Done!${COLORS.reset} ${todo.text}`);
  
  // Show remaining count
  const remaining = todos.filter(t => !t.done).length;
  if (remaining > 0) {
    console.log(COLORS.dim + `  ${remaining} task${remaining !== 1 ? 's' : ''} remaining` + COLORS.reset);
  } else {
    console.log(COLORS.green + '  🎉 All caught up!' + COLORS.reset);
  }
}

function removeTodo(id) {
  const todos = loadTodos();
  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) {
    console.log(COLORS.red + `✗ No todo with id "${id}"` + COLORS.reset);
    return;
  }
  const removed = todos.splice(idx, 1)[0];
  saveTodos(todos);
  console.log(`${COLORS.yellow}✗ Removed${COLORS.reset} [${removed.id}] ${removed.text}`);
}

function setPriority(id, priority) {
  if (!PRIORITIES[priority]) {
    console.log(COLORS.red + `Invalid priority. Use: high, medium, low` + COLORS.reset);
    return;
  }
  const todos = loadTodos();
  const todo = todos.find(t => t.id === id);
  if (!todo) {
    console.log(COLORS.red + `✗ No todo with id "${id}"` + COLORS.reset);
    return;
  }
  todo.priority = priority;
  saveTodos(todos);
  const p = PRIORITIES[priority];
  console.log(`${p.color}${p.icon} Priority set${COLORS.reset}: [${id}] is now ${priority}`);
}

function showStats() {
  const todos = loadTodos();
  const active = todos.filter(t => !t.done);
  const completed = todos.filter(t => t.done);
  
  const byPriority = { high: 0, medium: 0, low: 0 };
  active.forEach(t => byPriority[t.priority] = (byPriority[t.priority] || 0) + 1);
  
  console.log(COLORS.cyan + COLORS.bold + '📊 Todo Stats' + COLORS.reset);
  console.log('');
  console.log(`  Active:   ${active.length}`);
  console.log(`  Done:     ${completed.length}`);
  console.log('');
  console.log('  By priority:');
  console.log(`    🔴 High:   ${byPriority.high}`);
  console.log(`    🟡 Medium: ${byPriority.medium}`);
  console.log(`    🔵 Low:    ${byPriority.low}`);
}

function showHelp() {
  console.log(`
${COLORS.bold}todo.js${COLORS.reset} - Sprint-mode task tracker

${COLORS.bold}Usage:${COLORS.reset}
  todo "task text" [priority]  Add a new todo (default: medium)
  todo list [filter]           List active todos
  todo done <id>               Mark todo as complete
  todo remove <id>             Delete a todo
  todo priority <id> <level>   Set priority (high/medium/low)
  todo stats                   Show statistics

${COLORS.bold}Examples:${COLORS.reset}
  todo "Fix login bug" high
  todo "Update docs" low
  todo list
  todo done a3f7
  todo priority a3f7 high
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    listTodos();
    return;
  }
  
  const cmd = args[0];
  
  if (cmd === '--help' || cmd === '-h') {
    showHelp();
    return;
  }
  
  if (cmd === 'list' || cmd === '-l' || cmd === 'ls') {
    listTodos(args[1]);
    return;
  }
  
  if (cmd === 'done' || cmd === 'complete') {
    completeTodo(args[1]);
    return;
  }
  
  if (cmd === 'remove' || cmd === 'rm' || cmd === 'delete') {
    removeTodo(args[1]);
    return;
  }
  
  if (cmd === 'priority' || cmd === 'pri') {
    setPriority(args[1], args[2]);
    return;
  }
  
  if (cmd === 'stats' || cmd === '-s') {
    showStats();
    return;
  }
  
  // Check if last arg is a priority
  const last = args[args.length - 1].toLowerCase();
  if (PRIORITIES[last]) {
    addTodo(args.slice(0, -1).join(' '), last);
  } else {
    addTodo(args.join(' '));
  }
}

main();
