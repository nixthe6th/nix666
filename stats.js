#!/usr/bin/env node
/**
 * stats.js — Productivity Stats Dashboard
 * Visual analytics for sprints, tasks, and coding activity
 */

const fs = require('fs');
const path = require('path');

const SPRINTS_FILE = path.join(__dirname, 'sprints.json');
const TODOS_FILE = path.join(__dirname, 'data', 'todos.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

// Colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  return diff;
}

function sparkline(values, width = 20) {
  if (values.length === 0) return C.gray + '─'.repeat(width) + C.reset;
  
  const max = Math.max(...values, 1);
  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  return values.map(v => {
    const idx = Math.floor((v / max) * (blocks.length - 1));
    return C.cyan + blocks[idx] + C.reset;
  }).join('');
}

function bar(value, max, width = 20) {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return C.green + '█'.repeat(filled) + C.gray + '░'.repeat(empty) + C.reset;
}

function printBox(title, content) {
  const width = 50;
  console.log(C.cyan + '┌' + '─'.repeat(width) + '┐' + C.reset);
  console.log(C.cyan + '│' + C.reset + C.bright + title.padEnd(width) + C.reset + C.cyan + '│' + C.reset);
  console.log(C.cyan + '├' + '─'.repeat(width) + '┤' + C.reset);
  content.split('\n').forEach(line => {
    console.log(C.cyan + '│' + C.reset + ' ' + line.padEnd(width - 1) + C.cyan + '│' + C.reset);
  });
  console.log(C.cyan + '└' + '─'.repeat(width) + '┘' + C.reset);
}

function showSprintStats(sprintsData) {
  const sprints = sprintsData.sprints || sprintsData;
  const completed = sprints.filter(s => s.status === 'completed');
  const active = sprints.filter(s => s.status === 'active');
  const totalDeliverables = completed.reduce((sum, s) => sum + (s.deliverables?.length || 0), 0);
  
  console.log(C.bright + '\n📊 SPRINT ANALYTICS' + C.reset);
  console.log(C.gray + '─'.repeat(52) + C.reset);
  
  // Summary stats
  console.log(`  ${C.green}●${C.reset} Completed sprints: ${C.bright}${completed.length}${C.reset}`);
  console.log(`  ${C.yellow}●${C.reset} Active sprints:    ${C.bright}${active.length}${C.reset}`);
  console.log(`  ${C.cyan}●${C.reset} Total deliverables: ${C.bright}${totalDeliverables}${C.reset}`);
  console.log(`  ${C.magenta}●${C.reset} Avg per sprint:    ${C.bright}${(totalDeliverables / (completed.length || 1)).toFixed(1)}${C.reset}`);
  
  // Velocity chart (last 10 completed)
  const recent = completed.slice(-10);
  const velocities = recent.map(s => s.deliverables?.length || 0);
  const maxVel = Math.max(...velocities, 1);
  
  console.log(`\n  ${C.dim}Velocity (last ${velocities.length} sprints):${C.reset}`);
  console.log('  ' + sparkline(velocities));
  
  // Recent sprints list
  console.log(`\n  ${C.dim}Recent completed:${C.reset}`);
  recent.slice(-5).reverse().forEach(s => {
    const endDate = s.completed_at || s.completed || s.date;
    const days = daysAgo(endDate);
    let ago;
    if (days === null) {
      ago = 'unknown date';
    } else if (days === 0) {
      ago = 'today';
    } else if (days === 1) {
      ago = 'yesterday';
    } else {
      ago = `${days}d ago`;
    }
    const count = s.deliverables?.length || 0;
    console.log(`    ${C.green}✓${C.reset} ${C.bright}${s.name}${C.reset} ${C.gray}(${ago})${C.reset} — ${count} items`);
  });
}

function showTaskStats(todos) {
  const active = todos.filter(t => !t.done);
  const completed = todos.filter(t => t.done);
  const highPriority = active.filter(t => t.priority === 'high');
  
  console.log(C.bright + '\n📝 TASK DASHBOARD' + C.reset);
  console.log(C.gray + '─'.repeat(52) + C.reset);
  
  console.log(`  ${C.red}🔴${C.reset} High priority:   ${C.bright}${highPriority.length}${C.reset} active`);
  console.log(`  ${C.yellow}🟡${C.reset} Medium priority: ${C.bright}${active.filter(t => t.priority === 'medium').length}${C.reset} active`);
  console.log(`  ${C.blue}🔵${C.reset} Low priority:    ${C.bright}${active.filter(t => t.priority === 'low').length}${C.reset} active`);
  console.log(`  ${C.green}✓${C.reset} Completed:       ${C.bright}${completed.length}${C.reset} total`);
  
  // Completion rate
  const total = todos.length;
  const rate = total > 0 ? (completed.length / total * 100).toFixed(0) : 0;
  console.log(`\n  Completion rate: ${C.bright}${rate}%${C.reset}`);
  console.log('  ' + bar(completed.length, total || 1, 30));
  
  // High priority tasks
  if (highPriority.length > 0) {
    console.log(`\n  ${C.red}🔥 High priority tasks:${C.reset}`);
    highPriority.slice(0, 3).forEach(t => {
      console.log(`    • ${t.text.slice(0, 35)}${t.text.length > 35 ? '...' : ''}`);
    });
  }
}

function showProjectStats(projects) {
  const active = projects.filter(p => p.status === 'active');
  const live = projects.filter(p => p.status === 'live');
  const tools = projects.filter(p => p.category === 'tool');
  
  console.log(C.bright + '\n🚀 PROJECT OVERVIEW' + C.reset);
  console.log(C.gray + '─'.repeat(52) + C.reset);
  
  console.log(`  ${C.green}●${C.reset} Active projects: ${C.bright}${active.length}${C.reset}`);
  console.log(`  ${C.cyan}●${C.reset} Live projects:   ${C.bright}${live.length}${C.reset}`);
  console.log(`  ${C.yellow}●${C.reset} CLI tools:       ${C.bright}${tools.length}${C.reset}`);
  
  // Tech stack breakdown
  const techs = {};
  projects.forEach(p => {
    (p.tech || []).forEach(t => {
      techs[t] = (techs[t] || 0) + 1;
    });
  });
  
  const sortedTechs = Object.entries(techs).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (sortedTechs.length > 0) {
    console.log(`\n  ${C.dim}Top technologies:${C.reset}`);
    sortedTechs.forEach(([tech, count]) => {
      console.log(`    ${tech}: ${C.bright}${count}${C.reset} projects`);
    });
  }
}

function showCodingStreak() {
  try {
    const result = require('child_process').execSync(
      'git log --since="30 days ago" --format="%ad" --date=short | sort -u | wc -l',
      { cwd: __dirname }
    ).toString().trim();
    const activeDays = parseInt(result, 10);
    
    console.log(C.bright + '\n💻 CODING ACTIVITY' + C.reset);
    console.log(C.gray + '─'.repeat(52) + C.reset);
    console.log(`  Active days (30d): ${C.bright}${activeDays}${C.reset}/30`);
    console.log('  ' + bar(activeDays, 30, 30));
    
    if (activeDays >= 20) {
      console.log(`  ${C.green}🔥${C.reset} Incredible consistency!`);
    } else if (activeDays >= 10) {
      console.log(`  ${C.yellow}⚡${C.reset} Solid momentum, keep building!`);
    } else {
      console.log(`  ${C.blue}🚀${C.reset} Time to start a new streak!`);
    }
  } catch {
    console.log(C.gray + '  Git history unavailable' + C.reset);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: nix stats [options]');
    console.log('');
    console.log('Options:');
    console.log('  --sprints    Show sprint analytics only');
    console.log('  --tasks      Show task stats only');
    console.log('  --projects   Show project stats only');
    console.log('  --json       Output as JSON');
    console.log('');
    return;
  }
  
  const sprints = loadJSON(SPRINTS_FILE);
  const todos = loadJSON(TODOS_FILE) || [];
  const projects = loadJSON(PROJECTS_FILE);
  
  if (args.includes('--json')) {
    console.log(JSON.stringify({
      sprints: sprints ? {
        completed: sprints.filter(s => s.status === 'completed').length,
        active: sprints.filter(s => s.status === 'active').length
      } : null,
      tasks: {
        active: todos.filter(t => !t.done).length,
        completed: todos.filter(t => t.done).length
      },
      projects: projects ? {
        active: projects.filter(p => p.status === 'active').length,
        live: projects.filter(p => p.status === 'live').length
      } : null
    }, null, 2));
    return;
  }
  
  // Header
  console.log(C.cyan + '┌' + '─'.repeat(52) + '┐' + C.reset);
  console.log(C.cyan + '│' + C.reset + C.bright + '  ⚡ NIX PRODUCTIVITY STATS'.padEnd(52) + C.reset + C.cyan + '│' + C.reset);
  console.log(C.cyan + '└' + '─'.repeat(52) + '┘' + C.reset);
  
  if (args.includes('--sprints')) {
    sprints && showSprintStats(sprints);
  } else if (args.includes('--tasks')) {
    showTaskStats(todos);
  } else if (args.includes('--projects')) {
    projects && showProjectStats(projects);
  } else {
    sprints && showSprintStats(sprints);
    showTaskStats(todos);
    projects && showProjectStats(projects);
    showCodingStreak();
  }
  
  // Footer
  console.log('\n' + C.gray + 'Run with --json for machine-readable output' + C.reset);
  console.log(C.dim + 'Last updated: ' + new Date().toLocaleString() + C.reset);
}

main();
