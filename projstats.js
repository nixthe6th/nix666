#!/usr/bin/env node
/**
 * projstats - Quick project dashboard stats
 * Usage: projstats
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
}

function main() {
  const projects = loadJson('projects.json');
  const quotes = loadJson('quotes.json');
  const sprints = loadJson('sprints.json');
  
  const active = projects.filter(p => p.status === 'active').length;
  const live = projects.filter(p => p.status === 'live').length;
  const building = projects.filter(p => p.status === 'building').length;
  
  const completedSprints = sprints.filter(s => s.status === 'completed').length;
  const totalDeliverables = sprints.reduce((acc, s) => acc + (s.deliverables?.length || 0), 0);
  
  console.log('');
  console.log(COLORS.cyan + '╔══════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + COLORS.bold + '         ⚡ NIX HUB DASHBOARD ⚡         ' + COLORS.reset + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '╚══════════════════════════════════════════╝' + COLORS.reset);
  console.log('');
  
  console.log(COLORS.yellow + '📁 Projects:' + COLORS.reset);
  console.log(`   Total:       ${COLORS.cyan}${projects.length}${COLORS.reset}`);
  console.log(`   Active:      ${COLORS.green}${active}${COLORS.reset}`);
  console.log(`   Live:        ${COLORS.magenta}${live}${COLORS.reset}`);
  console.log(`   Building:    ${COLORS.yellow}${building}${COLORS.reset}`);
  console.log('');
  
  console.log(COLORS.yellow + '📚 Content:' + COLORS.reset);
  console.log(`   Quotes:      ${COLORS.cyan}${quotes.length}${COLORS.reset}`);
  console.log(`   Sprints:     ${COLORS.cyan}${sprints.length}${COLORS.reset} (${completedSprints} completed)`);
  console.log(`   Deliverables:${COLORS.green}${totalDeliverables}${COLORS.reset}`);
  console.log('');
  
  // Count unique tags
  const allTags = projects.flatMap(p => p.tags || []);
  const uniqueTags = [...new Set(allTags)];
  console.log(COLORS.yellow + '🏷️  Technologies:' + COLORS.reset);
  console.log(`   ${COLORS.gray}${uniqueTags.slice(0, 8).join(', ')}${COLORS.reset}`);
  console.log('');
  
  console.log(COLORS.cyan + '⚡ Volume creates luck.' + COLORS.reset);
  console.log('');
}

main();
