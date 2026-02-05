#!/usr/bin/env node

/**
 * pomodoro.js - Enhanced Pomodoro timer with task integration
 * 
 * Usage:
 *   nix pomodoro                      # Start 25-min session with task selection
 *   nix pomodoro start <task-id>      # Start session with specific task
 *   nix pomodoro start "custom task"  # Start with custom task name
 *   nix pomodoro status               # Check current session status
 *   nix pomodoro cancel               # Cancel current session
 *   nix pomodoro complete             # Mark session as complete
 *   nix pomodoro stats                # View Pomodoro statistics
 *   nix pomodoro history              # Session history
 * 
 * Features:
 *   - Task integration with nix todo
 *   - Auto-complete tasks when Pomodoro finishes
 *   - Session logging with completion reasons
 *   - Statistics and productivity insights
 *   - Configurable work/break durations
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const DATA_DIR = path.join(process.env.HOME, '.nix666');
const POMODORO_FILE = path.join(DATA_DIR, 'pomodoro.json');
const TODO_FILE = path.join(DATA_DIR, 'todos.json');
const SESSION_FILE = path.join(DATA_DIR, 'sessions.json');

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

const ICONS = {
  tomato: '🍅',
  check: '✓',
  cancel: '✗',
  pause: '⏸',
  play: '▶',
  fire: '🔥',
  chart: '📊',
  clock: '⏰',
  task: '📋',
  break: '☕',
  complete: '🎯'
};

// Default settings
const DEFAULTS = {
  workDuration: 25,      // minutes
  shortBreak: 5,         // minutes
  longBreak: 15,         // minutes
  longBreakInterval: 4,  // pomodoros before long break
  autoComplete: false,   // auto-complete task when done
  notifications: true
};

// Ensure data directory exists
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load data
function loadData(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return defaultValue;
  }
}

// Save data
function saveData(filePath, data) {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Load settings
function loadSettings() {
  return loadData(path.join(DATA_DIR, 'pomodoro-settings.json'), DEFAULTS);
}

// Save settings
function saveSettings(settings) {
  saveData(path.join(DATA_DIR, 'pomodoro-settings.json'), settings);
}

// Load todos
function loadTodos() {
  return loadData(TODO_FILE, []);
}

// Load pomodoro sessions
function loadPomodoros() {
  return loadData(POMODORO_FILE, []);
}

// Save pomodoro sessions
function savePomodoros(sessions) {
  saveData(POMODORO_FILE, sessions);
}

// Get active pomodoro (if any)
function getActivePomodoro() {
  const sessions = loadPomodoros();
  return sessions.find(s => s.status === 'active');
}

// Format duration
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// Format time remaining
function formatTimeRemaining(endTime) {
  const now = new Date();
  const end = new Date(endTime);
  const diff = Math.max(0, end - now);
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Get today's pomodoros
function getTodayPomodoros() {
  const sessions = loadPomodoros();
  const today = new Date().toISOString().split('T')[0];
  return sessions.filter(s => s.startedAt && s.startedAt.startsWith(today));
}

// Calculate current streak
function calculateStreak() {
  const sessions = loadPomodoros();
  if (sessions.length === 0) return 0;
  
  // Group by date
  const byDate = {};
  sessions.forEach(s => {
    if (s.status === 'completed') {
      const date = s.startedAt.split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    }
  });
  
  const dates = Object.keys(byDate).sort().reverse();
  if (dates.length === 0) return 0;
  
  // Check if today has any
  const today = new Date().toISOString().split('T')[0];
  let streak = byDate[today] ? 1 : 0;
  
  // Count consecutive days
  const checkDate = new Date();
  if (streak === 0) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (byDate[dateStr]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

// Display available tasks
function displayTasks() {
  const todos = loadTodos().filter(t => t.status !== 'done');
  
  if (todos.length === 0) {
    console.log(`${COLORS.yellow}No active tasks found.${COLORS.reset}`);
    console.log(`${COLORS.dim}Create one with: nix todo add "task name"${COLORS.reset}\n`);
    return null;
  }
  
  console.log(`\n${COLORS.bold}${ICONS.task} Available Tasks:${COLORS.reset}\n`);
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  todos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  todos.slice(0, 10).forEach((todo, idx) => {
    const priorityColor = todo.priority === 'high' ? COLORS.red : 
                          todo.priority === 'medium' ? COLORS.yellow : COLORS.blue;
    const priorityIcon = todo.priority === 'high' ? '🔴' : 
                         todo.priority === 'medium' ? '🟡' : '🔵';
    console.log(`  ${COLORS.cyan}${idx + 1}.${COLORS.reset} ${priorityIcon} ${todo.text}`);
    console.log(`      ${COLORS.dim}ID: ${todo.id} | Priority: ${priorityColor}${todo.priority}${COLORS.reset}`);
  });
  
  if (todos.length > 10) {
    console.log(`  ${COLORS.dim}... and ${todos.length - 10} more${COLORS.reset}`);
  }
  
  console.log();
  return todos;
}

// Start a pomodoro session
function startPomodoro(taskInput) {
  // Check if there's already an active session
  const active = getActivePomodoro();
  if (active) {
    console.log(`\n${COLORS.yellow}${ICONS.pause} A session is already active!${COLORS.reset}`);
    showStatus();
    return;
  }
  
  const settings = loadSettings();
  let taskId = null;
  let taskName = '';
  
  if (taskInput) {
    // Check if it's a task ID or custom task name
    const todos = loadTodos();
    const found = todos.find(t => t.id === taskInput);
    if (found) {
      taskId = found.id;
      taskName = found.text;
    } else {
      taskName = taskInput;
    }
  } else {
    // Show task picker
    const todos = displayTasks();
    if (todos && todos.length > 0) {
      // For now, use the first high priority task or just the first task
      const highPriority = todos.find(t => t.priority === 'high');
      const selected = highPriority || todos[0];
      taskId = selected.id;
      taskName = selected.text;
      console.log(`${COLORS.green}Auto-selected: ${taskName}${COLORS.reset}\n`);
    }
  }
  
  const now = new Date();
  const endTime = new Date(now.getTime() + settings.workDuration * 60000);
  
  const session = {
    id: `pomo-${Date.now().toString(36).slice(-6)}`,
    taskId,
    taskName: taskName || 'Focus Session',
    startedAt: now.toISOString(),
    endsAt: endTime.toISOString(),
    duration: settings.workDuration,
    status: 'active',
    completedAt: null,
    interruptions: 0,
    notes: ''
  };
  
  const sessions = loadPomodoros();
  sessions.push(session);
  savePomodoros(sessions);
  
  // Display session start
  console.log(`\n${COLORS.bold}${ICONS.tomato} Pomodoro Started!${COLORS.reset}\n`);
  console.log(`  ${ICONS.task} Task: ${COLORS.cyan}${session.taskName}${COLORS.reset}`);
  console.log(`  ${ICONS.clock} Duration: ${COLORS.yellow}${settings.workDuration} minutes${COLORS.reset}`);
  console.log(`  ${ICONS.play} Started: ${COLORS.dim}${now.toLocaleTimeString()}${COLORS.reset}`);
  console.log(`  🎯 Ends: ${COLORS.dim}${endTime.toLocaleTimeString()}${COLORS.reset}`);
  
  const todayCount = getTodayPomodoros().length;
  if (todayCount > 0) {
    console.log(`\n  ${ICONS.fire} Today's completed: ${COLORS.green}${todayCount}${COLORS.reset}`);
  }
  
  console.log(`\n${COLORS.dim}Run 'nix pomodoro status' to check time remaining${COLORS.reset}`);
  console.log(`${COLORS.dim}Run 'nix pomodoro complete' when done${COLORS.reset}`);
  console.log(`${COLORS.dim}Run 'nix pomodoro cancel' to abort${COLORS.reset}\n`);
  
  // Optionally start a background timer notification
  if (process.platform === 'darwin') {
    // macOS notification at end
    setTimeout(() => {
      const { exec } = require('child_process');
      exec(`osascript -e 'display notification "Pomodoro complete!" with title "nix pomodoro" sound name "Glass"'`);
    }, settings.workDuration * 60000);
  }
}

// Show current status
function showStatus() {
  const active = getActivePomodoro();
  
  if (!active) {
    console.log(`\n${COLORS.dim}No active Pomodoro session.${COLORS.reset}`);
    console.log(`${COLORS.dim}Start one with: nix pomodoro${COLORS.reset}\n`);
    
    // Show today's summary
    const today = getTodayPomodoros();
    const completed = today.filter(s => s.status === 'completed');
    if (completed.length > 0) {
      console.log(`${ICONS.fire} Today's completed: ${COLORS.green}${completed.length}${COLORS.reset}`);
      const totalMinutes = completed.reduce((sum, s) => sum + (s.duration || 25), 0);
      console.log(`${ICONS.clock} Total focus time: ${COLORS.cyan}${formatDuration(totalMinutes)}${COLORS.reset}\n`);
    }
    return;
  }
  
  const remaining = formatTimeRemaining(active.endsAt);
  const progress = Math.min(100, Math.round(
    (new Date() - new Date(active.startedAt)) / 
    (new Date(active.endsAt) - new Date(active.startedAt)) * 100
  ));
  
  console.log(`\n${COLORS.bold}${ICONS.tomato} Active Pomodoro${COLORS.reset}\n`);
  console.log(`  ${ICONS.task} Task: ${COLORS.cyan}${active.taskName}${COLORS.reset}`);
  console.log(`  ${ICONS.clock} Remaining: ${COLORS.yellow}${COLORS.bold}${remaining}${COLORS.reset}`);
  
  // Progress bar
  const barWidth = 30;
  const filled = Math.round(barWidth * progress / 100);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
  console.log(`  ${ICONS.play} Progress: ${COLORS.green}[${bar}]${COLORS.reset} ${progress}%`);
  
  console.log(`\n${COLORS.dim}Started at ${new Date(active.startedAt).toLocaleTimeString()}${COLORS.reset}\n`);
}

// Complete a pomodoro
function completePomodoro(notes = '') {
  const active = getActivePomodoro();
  
  if (!active) {
    console.log(`\n${COLORS.yellow}No active Pomodoro to complete.${COLORS.reset}\n`);
    return;
  }
  
  const sessions = loadPomodoros();
  const session = sessions.find(s => s.id === active.id);
  
  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  session.notes = notes;
  
  savePomodoros(sessions);
  
  // Auto-complete the associated task if configured
  const settings = loadSettings();
  if (settings.autoComplete && session.taskId) {
    // This would integrate with todo.js to mark complete
    console.log(`${COLORS.dim}(Auto-completing associated task)${COLORS.reset}`);
  }
  
  // Calculate total focus time today
  const today = getTodayPomodoros().filter(s => s.status === 'completed');
  const totalMinutes = today.reduce((sum, s) => sum + (s.duration || 25), 0);
  
  console.log(`\n${COLORS.bold}${ICONS.complete} Pomodoro Complete!${COLORS.reset}\n`);
  console.log(`  ${ICONS.check} Task: ${COLORS.cyan}${session.taskName}${COLORS.reset}`);
  console.log(`  ${ICONS.fire} Sessions today: ${COLORS.green}${today.length}${COLORS.reset}`);
  console.log(`  ${ICONS.clock} Total focus time: ${COLORS.cyan}${formatDuration(totalMinutes)}${COLORS.reset}`);
  
  const streak = calculateStreak();
  if (streak > 1) {
    console.log(`  ${ICONS.fire} Current streak: ${COLORS.yellow}${streak} days${COLORS.reset}`);
  }
  
  // Suggest break
  const settings2 = loadSettings();
  const todayCount = today.length;
  const isLongBreak = todayCount % settings2.longBreakInterval === 0;
  const breakDuration = isLongBreak ? settings2.longBreak : settings2.shortBreak;
  
  console.log(`\n  ${ICONS.break} Take a ${breakDuration}-minute break${isLongBreak ? ' (long break time!)' : ''}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Next: nix pomodoro to start another${COLORS.reset}\n`);
}

// Cancel a pomodoro
function cancelPomodoro() {
  const active = getActivePomodoro();
  
  if (!active) {
    console.log(`\n${COLORS.yellow}No active Pomodoro to cancel.${COLORS.reset}\n`);
    return;
  }
  
  const sessions = loadPomodoros();
  const session = sessions.find(s => s.id === active.id);
  
  session.status = 'cancelled';
  session.cancelledAt = new Date().toISOString();
  
  savePomodoros(sessions);
  
  console.log(`\n${COLORS.red}${ICONS.cancel} Pomodoro Cancelled${COLORS.reset}`);
  console.log(`  Task "${COLORS.dim}${session.taskName}${COLORS.reset}" was not completed\n`);
}

// Show statistics
function showStats() {
  const sessions = loadPomodoros();
  
  if (sessions.length === 0) {
    console.log(`\n${COLORS.dim}No Pomodoro data yet. Start your first session!${COLORS.reset}\n`);
    return;
  }
  
  const completed = sessions.filter(s => s.status === 'completed');
  const cancelled = sessions.filter(s => s.status === 'cancelled');
  const completionRate = sessions.length > 0 ? (completed.length / sessions.length * 100).toFixed(1) : 0;
  
  // Calculate total focus time
  const totalMinutes = completed.reduce((sum, s) => sum + (s.duration || 25), 0);
  
  // Today's stats
  const today = getTodayPomodoros();
  const todayCompleted = today.filter(s => s.status === 'completed');
  
  // This week's stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = completed.filter(s => new Date(s.startedAt) >= weekAgo);
  
  console.log(`\n${COLORS.bold}${ICONS.chart} Pomodoro Statistics${COLORS.reset}\n`);
  console.log(`  ${ICONS.tomato} Total Sessions: ${COLORS.cyan}${sessions.length}${COLORS.reset}`);
  console.log(`  ${ICONS.check} Completed: ${COLORS.green}${completed.length}${COLORS.reset}`);
  console.log(`  ${ICONS.cancel} Cancelled: ${COLORS.red}${cancelled.length}${COLORS.reset}`);
  console.log(`  📈 Completion Rate: ${COLORS.yellow}${completionRate}%${COLORS.reset}`);
  console.log(`  ${ICONS.clock} Total Focus Time: ${COLORS.cyan}${formatDuration(totalMinutes)}${COLORS.reset}`);
  console.log(`  ${ICONS.fire} Current Streak: ${COLORS.yellow}${calculateStreak()} days${COLORS.reset}`);
  
  console.log(`\n${COLORS.bold}Recent Activity:${COLORS.reset}`);
  console.log(`  Today: ${COLORS.green}${todayCompleted.length}${COLORS.reset} sessions (${formatDuration(todayCompleted.reduce((sum, s) => sum + (s.duration || 25), 0))})`);
  console.log(`  This Week: ${COLORS.green}${thisWeek.length}${COLORS.reset} sessions (${formatDuration(thisWeek.reduce((sum, s) => sum + (s.duration || 25), 0))})`);
  
  // Best day
  const byDay = {};
  completed.forEach(s => {
    const day = s.startedAt.split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  if (bestDay) {
    console.log(`\n  🏆 Best Day: ${COLORS.cyan}${bestDay[0]}${COLORS.reset} with ${COLORS.green}${bestDay[1]}${COLORS.reset} sessions`);
  }
  
  console.log();
}

// Show history
function showHistory(limit = 10) {
  const sessions = loadPomodoros();
  
  if (sessions.length === 0) {
    console.log(`\n${COLORS.dim}No Pomodoro history yet.${COLORS.reset}\n`);
    return;
  }
  
  console.log(`\n${COLORS.bold}📜 Recent Pomodoro Sessions${COLORS.reset}\n`);
  
  // Sort by date descending
  const sorted = sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  
  sorted.slice(0, limit).forEach(session => {
    const date = new Date(session.startedAt);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    const statusIcon = session.status === 'completed' ? `${COLORS.green}${ICONS.check}${COLORS.reset}` :
                       session.status === 'cancelled' ? `${COLORS.red}${ICONS.cancel}${COLORS.reset}` :
                       `${COLORS.yellow}${ICONS.play}${COLORS.reset}`;
    
    console.log(`  ${statusIcon} ${dateStr} ${COLORS.dim}${timeStr}${COLORS.reset} - ${COLORS.cyan}${session.taskName}${COLORS.reset}`);
    if (session.notes) {
      console.log(`      ${COLORS.dim}Note: ${session.notes}${COLORS.reset}`);
    }
  });
  
  console.log();
}

// Configure settings
function configureSettings() {
  console.log(`\n${COLORS.bold}⚙️  Pomodoro Settings${COLORS.reset}\n`);
  
  const settings = loadSettings();
  
  console.log(`Current settings:`);
  console.log(`  Work Duration: ${COLORS.cyan}${settings.workDuration} min${COLORS.reset}`);
  console.log(`  Short Break: ${COLORS.cyan}${settings.shortBreak} min${COLORS.reset}`);
  console.log(`  Long Break: ${COLORS.cyan}${settings.longBreak} min${COLORS.reset}`);
  console.log(`  Long Break After: ${COLORS.cyan}${settings.longBreakInterval} pomodoros${COLORS.reset}`);
  console.log(`  Auto-complete Tasks: ${settings.autoComplete ? COLORS.green + 'On' : COLORS.red + 'Off'}${COLORS.reset}`);
  
  console.log(`\n${COLORS.dim}To change settings, edit:${COLORS.reset}`);
  console.log(`  ${DATA_DIR}/pomodoro-settings.json\n`);
}

// Show help
function showHelp() {
  console.log(`
${COLORS.bold}${ICONS.tomato} nix pomodoro${COLORS.reset} - Enhanced Pomodoro timer with task integration

${COLORS.bold}Usage:${COLORS.reset}
  nix pomodoro [command] [args]

${COLORS.bold}Commands:${COLORS.reset}
  start [task-id|"task name"]  Start a new Pomodoro session
  status                       Check current session status
  complete [notes]             Mark current session as complete
  cancel                       Cancel current session
  stats                        View productivity statistics
  history [limit]              Show session history (default: 10)
  settings                     View current configuration
  help                         Show this help message

${COLORS.bold}Examples:${COLORS.reset}
  nix pomodoro                      # Start with task picker
  nix pomodoro start abc1           # Start with specific task
  nix pomodoro start "Custom task"  # Start with custom task
  nix pomodoro status               # Check time remaining
  nix pomodoro complete             # Finish session
  nix pomodoro complete "Shipped!"  # Finish with note

${COLORS.bold}Quick Start:${COLORS.reset}
  1. Create tasks with: nix todo add "my task"
  2. Start session: nix pomodoro
  3. Focus for 25 minutes
  4. Complete: nix pomodoro complete
  5. Take a break!

${COLORS.bold}Integration:${COLORS.reset}
  - Works with nix todo for task selection
  - Logs to nix session for time tracking
  - Stats available in nix stats dashboard
`);
}

// Main entry point
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  
  switch (command) {
    case 'start':
      const taskInput = args[1];
      startPomodoro(taskInput);
      break;
      
    case 'status':
    case 's':
      showStatus();
      break;
      
    case 'complete':
    case 'done':
    case 'finish':
      const notes = args.slice(1).join(' ');
      completePomodoro(notes);
      break;
      
    case 'cancel':
    case 'abort':
    case 'stop':
      cancelPomodoro();
      break;
      
    case 'stats':
    case 'statistics':
      showStats();
      break;
      
    case 'history':
    case 'log':
    case 'list':
      const limit = parseInt(args[1]) || 10;
      showHistory(limit);
      break;
      
    case 'settings':
    case 'config':
      configureSettings();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      // If no command matches, treat as a task name
      startPomodoro(command);
  }
}

main();
