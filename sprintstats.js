#!/usr/bin/env node
/**
 * sprintstats.js — Sprint performance analytics
 * Visualize trends, averages, and insights from your sprint history
 * 
 * Usage:
 *   sprintstats           Show summary stats
 *   sprintstats trends    Show velocity trends over time
 *   sprintstats best      Show best/fastest sprints
 *   sprintstats full      Complete analytics report
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
  cyan: '\x1b[36m'
};

function loadSprints() {
  try {
    return JSON.parse(fs.readFileSync(SPRINTS_FILE, 'utf8'));
  } catch {
    return { current: null, sprints: [] };
  }
}

function formatDuration(ms) {
  if (!ms) return 'N/A';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function formatDurationMs(ms) {
  const hours = ms / 3600000;
  return hours < 1 ? `${(hours * 60).toFixed(0)}m` : `${hours.toFixed(1)}h`;
}

function showSummary(data) {
  const completed = data.sprints.filter(s => s.status === 'completed');
  
  if (completed.length === 0) {
    console.log(`${C.yellow}No completed sprints yet${C.reset}`);
    return;
  }

  const durations = completed.map(s => s.duration_ms).filter(Boolean);
  const totalDeliverables = completed.reduce((sum, s) => sum + (s.deliverables?.length || 0), 0);
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const fastest = completed.filter(s => s.duration_ms).sort((a, b) => a.duration_ms - b.duration_ms)[0];
  const slowest = completed.filter(s => s.duration_ms).sort((a, b) => b.duration_ms - a.duration_ms)[0];
  
  const byBuilder = {};
  completed.forEach(s => {
    const builder = s.meta?.builder || 'Unknown';
    byBuilder[builder] = (byBuilder[builder] || 0) + 1;
  });

  console.log();
  console.log(`${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  ${C.bold}📊 SPRINT ANALYTICS${C.reset}${' '.repeat(38)}${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}╠══════════════════════════════════════════════════════════╣${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  Total Sprints: ${C.bold}${completed.length}${C.reset}${' '.repeat(40 - completed.length.toString().length)}${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  Total Deliverables: ${C.bold}${totalDeliverables}${C.reset}${' '.repeat(35 - totalDeliverables.toString().length)}${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  Avg Deliverables/Sprint: ${C.bold}${(totalDeliverables / completed.length).toFixed(1)}${C.reset}${' '.repeat(30 - (totalDeliverables / completed.length).toFixed(1).length)}${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}╠══════════════════════════════════════════════════════════╣${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  ${C.bold}⏱️  Timing${C.reset}${' '.repeat(43)}${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  Average Duration: ${C.bold}${formatDuration(avgDuration)}${C.reset}${' '.repeat(32 - formatDuration(avgDuration).length)}${C.cyan}║${C.reset}`);
  if (fastest) {
    console.log(`${C.cyan}║${C.reset}  Fastest: Sprint #${fastest.number} (${formatDuration(fastest.duration_ms)})${' '.repeat(21 - fastest.number.toString().length - formatDuration(fastest.duration_ms).length)}${C.cyan}║${C.reset}`);
  }
  if (slowest) {
    console.log(`${C.cyan}║${C.reset}  Slowest: Sprint #${slowest.number} (${formatDuration(slowest.duration_ms)})${' '.repeat(21 - slowest.number.toString().length - formatDuration(slowest.duration_ms).length)}${C.cyan}║${C.reset}`);
  }
  console.log(`${C.cyan}╠══════════════════════════════════════════════════════════╣${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  ${C.bold}👤 Builders${C.reset}${' '.repeat(42)}${C.cyan}║${C.reset}`);
  Object.entries(byBuilder).forEach(([builder, count]) => {
    const pct = ((count / completed.length) * 100).toFixed(0);
    console.log(`${C.cyan}║${C.reset}  ${builder}: ${C.bold}${count}${C.reset} (${pct}%)${' '.repeat(40 - builder.length - count.toString().length - pct.length)}${C.cyan}║${C.reset}`);
  });
  console.log(`${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}`);
  console.log();
}

function showTrends(data) {
  const completed = data.sprints.filter(s => s.status === 'completed').slice(0, 15);
  
  if (completed.length === 0) {
    console.log(`${C.yellow}No data for trends${C.reset}`);
    return;
  }

  console.log();
  console.log(`${C.cyan}${C.bold}📈 Sprint Velocity Trends (Last ${completed.length})${C.reset}`);
  console.log(`${C.dim}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log();
  
  const maxDuration = Math.max(...completed.map(s => s.duration_ms || 0));
  const maxDeliverables = Math.max(...completed.map(s => s.deliverables?.length || 0));
  
  completed.reverse().forEach(sprint => {
    const num = sprint.number.toString().padStart(2);
    const dur = sprint.duration_ms || 0;
    const dels = sprint.deliverables?.length || 0;
    
    // Duration bar (max 20 chars)
    const durBarLen = maxDuration > 0 ? Math.round((dur / maxDuration) * 15) : 0;
    const durBar = '█'.repeat(durBarLen) + C.dim + '░'.repeat(15 - durBarLen) + C.reset;
    
    // Deliverables bar
    const delBarLen = maxDeliverables > 0 ? Math.round((dels / maxDeliverables) * 10) : 0;
    const delBar = C.green + '█'.repeat(delBarLen) + C.dim + '░'.repeat(10 - delBarLen) + C.reset;
    
    console.log(`${C.cyan}#${num}${C.reset} ⏱️ ${durBar} ${C.dim}${formatDuration(dur).padStart(6)}${C.reset}  📦 ${delBar} ${dels}`);
  });
  
  console.log();
  console.log(`${C.dim}Legend: ⏱️ Duration  📦 Deliverables${C.reset}`);
  console.log();
}

function showBest(data) {
  const completed = data.sprints.filter(s => s.status === 'completed' && s.duration_ms);
  
  if (completed.length === 0) {
    console.log(`${C.yellow}No completed sprints with timing data${C.reset}`);
    return;
  }

  const fastest = [...completed].sort((a, b) => a.duration_ms - b.duration_ms).slice(0, 5);
  const mostDeliverables = [...completed].sort((a, b) => (b.deliverables?.length || 0) - (a.deliverables?.length || 0)).slice(0, 5);

  console.log();
  console.log(`${C.green}${C.bold}⚡ Fastest Sprints${C.reset}`);
  console.log(`${C.dim}═══════════════════════════════════════════════════════════${C.reset}`);
  fastest.forEach((s, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`${medal} #${s.number} ${C.bold}${formatDuration(s.duration_ms)}${C.reset} — ${s.goal.substring(0, 40)}${s.goal.length > 40 ? '...' : ''}`);
  });

  console.log();
  console.log(`${C.yellow}${C.bold}📦 Most Productive Sprints${C.reset}`);
  console.log(`${C.dim}═══════════════════════════════════════════════════════════${C.reset}`);
  mostDeliverables.forEach((s, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    const count = s.deliverables?.length || 0;
    console.log(`${medal} #${s.number} ${C.bold}${count} items${C.reset} — ${s.goal.substring(0, 40)}${s.goal.length > 40 ? '...' : ''}`);
  });
  console.log();
}

function showFullReport(data) {
  showSummary(data);
  showTrends(data);
  showBest(data);
  
  const completed = data.sprints.filter(s => s.status === 'completed');
  const thisWeek = completed.filter(s => {
    const date = new Date(s.completed_at || s.date);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  });
  
  console.log();
  console.log(`${C.magenta}${C.bold}📅 This Week${C.reset}`);
  console.log(`${C.dim}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`Sprints completed: ${C.bold}${thisWeek.length}${C.reset}`);
  console.log(`Deliverables shipped: ${C.bold}${thisWeek.reduce((sum, s) => sum + (s.deliverables?.length || 0), 0)}${C.reset}`);
  console.log();
}

// Main
const args = process.argv.slice(2);
const command = args[0];
const data = loadSprints();

switch (command) {
  case 'trends':
    showTrends(data);
    break;
  case 'best':
    showBest(data);
    break;
  case 'full':
    showFullReport(data);
    break;
  case 'help':
  case '--help':
  case '-h':
    console.log(`${C.bold}sprintstats.js${C.reset} — Sprint performance analytics`);
    console.log();
    console.log(`${C.dim}Usage:${C.reset}`);
    console.log(`  sprintstats           Show summary stats`);
    console.log(`  sprintstats trends    Show velocity trends chart`);
    console.log(`  sprintstats best      Show fastest/most productive sprints`);
    console.log(`  sprintstats full      Complete analytics report`);
    break;
  default:
    showSummary(data);
}
