#!/usr/bin/env node
/**
 * sprint.js — Quick sprint management CLI
 * Start, complete, and track sprints from the terminal
 * 
 * Usage:
 *   sprint                    Show current sprint status
 *   sprint start "Goal here"  Start a new sprint
 *   sprint complete           Mark current sprint done
 *   sprint list               Show recent sprints
 *   sprint ls                 Alias for list
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRINTS_FILE = path.join(__dirname, 'sprints.json');

// Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function loadSprints() {
  try {
    return JSON.parse(fs.readFileSync(SPRINTS_FILE, 'utf8'));
  } catch {
    return { current: null, sprints: [] };
  }
}

function saveSprints(data) {
  fs.writeFileSync(SPRINTS_FILE, JSON.stringify(data, null, 2));
}

function formatDuration(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function showStatus(data) {
  if (!data.current) {
    console.log(`${C.yellow}⚡ No active sprint${C.reset}`);
    console.log(`${C.dim}Start one with: sprint start "your goal here"${C.reset}`);
    return;
  }

  const sprint = data.current;
  const started = new Date(sprint.started_at);
  const elapsed = Date.now() - started.getTime();
  
  console.log();
  console.log(`${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  ${C.bold}${C.yellow}⚡ SPRINT #${sprint.number}${C.reset} ${C.dim}—${C.reset} ${sprint.name || 'Active Sprint'}${' '.repeat(Math.max(0, 42 - (sprint.name?.length || 0)))}${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}╠══════════════════════════════════════════════════════════╣${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  Goal: ${sprint.goal}${' '.repeat(Math.max(0, 54 - sprint.goal.length))}${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  Started: ${started.toLocaleTimeString()} (${formatDuration(elapsed)} ago)${' '.repeat(Math.max(0, 40 - formatDuration(elapsed).length))}${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}`);
  console.log();
  console.log(`${C.dim}Complete with: sprint complete${C.reset}`);
}

function startSprint(data, goal) {
  if (data.current) {
    console.log(`${C.red}⚠️  Sprint #${data.current.number} is already active${C.reset}`);
    console.log(`${C.dim}Complete it first: sprint complete${C.reset}`);
    return;
  }

  const nextNum = data.sprints.length > 0 
    ? Math.max(...data.sprints.map(s => s.number)) + 1 
    : 1;

  const sprint = {
    number: nextNum,
    name: `Sprint ${nextNum}`,
    goal: goal,
    status: 'active',
    date: new Date().toISOString().split('T')[0],
    started_at: new Date().toISOString(),
    deliverables: [],
    meta: {
      trigger: 'manual',
      builder: 'user'
    }
  };

  data.current = sprint;
  saveSprints(data);

  console.log();
  console.log(`${C.green}✅ Sprint #${nextNum} started!${C.reset}`);
  console.log(`${C.cyan}   Goal: ${goal}${C.reset}`);
  console.log();
  console.log(`${C.dim}Go build something. Run 'sprint' to check status.${C.reset}`);
}

function completeSprint(data) {
  if (!data.current) {
    console.log(`${C.yellow}⚡ No active sprint to complete${C.reset}`);
    return;
  }

  const sprint = data.current;
  const completedAt = new Date();
  const started = new Date(sprint.started_at);
  const duration = completedAt.getTime() - started.getTime();

  sprint.status = 'completed';
  sprint.completed_at = completedAt.toISOString();
  sprint.duration_ms = duration;

  data.sprints.unshift(sprint);
  data.current = null;
  saveSprints(data);

  console.log();
  console.log(`${C.green}╔══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.green}║${C.reset}  ✅ SPRINT #${sprint.number} COMPLETE!${' '.repeat(42)}${C.green}║${C.reset}`);
  console.log(`${C.green}╠══════════════════════════════════════════════════════════╣${C.reset}`);
  console.log(`${C.green}║${C.reset}  Duration: ${C.bold}${formatDuration(duration)}${C.reset}${' '.repeat(44 - formatDuration(duration).length)}${C.green}║${C.reset}`);
  console.log(`${C.green}║${C.reset}  Goal: ${sprint.goal.substring(0, 50)}${sprint.goal.length > 50 ? '...' : ''}${' '.repeat(Math.max(0, 52 - Math.min(sprint.goal.length, 53)))}${C.green}║${C.reset}`);
  console.log(`${C.green}╚══════════════════════════════════════════════════════════╝${C.reset}`);
  console.log();
  console.log(`${C.dim}Total sprints completed: ${data.sprints.filter(s => s.status === 'completed').length}${C.reset}`);
}

function listSprints(data, limit = 10) {
  const completed = data.sprints.filter(s => s.status === 'completed').slice(0, limit);
  
  console.log();
  console.log(`${C.cyan}${C.bold}Recent Sprints${C.reset}`);
  console.log(`${C.dim}═══════════════════════════════════════════════════════════${C.reset}`);
  
  if (completed.length === 0) {
    console.log(`${C.dim}No completed sprints yet${C.reset}`);
    return;
  }

  completed.forEach(sprint => {
    const duration = sprint.duration_ms ? formatDuration(sprint.duration_ms) : '?';
    const date = sprint.date || sprint.completed_at?.split('T')[0] || '?';
    console.log(`${C.green}#${sprint.number.toString().padStart(2)}${C.reset} ${C.dim}${date}${C.reset} ${C.bold}${duration.padStart(6)}${C.reset} ${sprint.goal.substring(0, 45)}${sprint.goal.length > 45 ? '...' : ''}`);
  });

  if (data.sprints.length > limit) {
    console.log(`${C.dim}... and ${data.sprints.length - limit} more${C.reset}`);
  }
  console.log();
}

// Main
const args = process.argv.slice(2);
const command = args[0];
const data = loadSprints();

switch (command) {
  case 'start':
    const goal = args.slice(1).join(' ') || 'Quick sprint';
    startSprint(data, goal);
    break;
  case 'complete':
  case 'done':
    completeSprint(data);
    break;
  case 'list':
  case 'ls':
    listSprints(data, parseInt(args[1]) || 10);
    break;
  case 'help':
  case '--help':
  case '-h':
    console.log(`${C.bold}sprint.js${C.reset} — Quick sprint management`);
    console.log();
    console.log(`${C.dim}Usage:${C.reset}`);
    console.log(`  sprint                    Show current sprint status`);
    console.log(`  sprint start "goal"       Start a new sprint`);
    console.log(`  sprint complete           Mark current sprint done`);
    console.log(`  sprint list [n]           Show last n sprints (default 10)`);
    break;
  default:
    showStatus(data);
}
