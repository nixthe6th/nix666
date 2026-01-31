#!/usr/bin/env node
/**
 * energy.js — Energy level tracker throughout the day
 * Log energy at different times to find your peak hours
 * 
 * Usage: nix energy [command] [options]
 */

const fs = require('fs');
const path = require('path');

const ENERGY_FILE = path.join(__dirname, 'data', 'energy.json');

const LEVELS = {
  1: { emoji: '🔋', label: 'Drained', color: '\x1b[31m', desc: 'Running on empty' },
  2: { emoji: '🪫', label: 'Low', color: '\x1b[33m', desc: 'Need rest soon' },
  3: { emoji: '⚡', label: 'Okay', color: '\x1b[90m', desc: 'Steady state' },
  4: { emoji: '⚡⚡', label: 'Good', color: '\x1b[32m', desc: 'In the zone' },
  5: { emoji: '🔥', label: 'Peak', color: '\x1b[35m', desc: 'Maximum flow' }
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function loadData() {
  if (!fs.existsSync(ENERGY_FILE)) {
    return { entries: [], peakHours: {} };
  }
  return JSON.parse(fs.readFileSync(ENERGY_FILE, 'utf8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(ENERGY_FILE), { recursive: true });
  fs.writeFileSync(ENERGY_FILE, JSON.stringify(data, null, 2));
}

function getNow() {
  const d = new Date();
  return {
    date: d.toISOString().split('T')[0],
    time: d.toTimeString().split(' ')[0].substring(0, 5),
    hour: d.getHours()
  };
}

function log(level, note = '') {
  const data = loadData();
  const now = getNow();
  
  const entry = {
    date: now.date,
    time: now.time,
    hour: now.hour,
    level: parseInt(level),
    note: note,
    timestamp: new Date().toISOString()
  };
  
  data.entries.push(entry);
  saveData(data);
  
  const e = LEVELS[level];
  console.log(`\n  ${e.color}${e.emoji} Energy logged: ${e.label}${RESET}`);
  console.log(`  ${DIM}${e.desc}${RESET}`);
  console.log(`  🕐 ${now.time} | 📅 ${now.date}`);
  if (note) console.log(`  📝 ${note}`);
  console.log();
}

function today() {
  const data = loadData();
  const todayStr = getNow().date;
  const entries = data.entries.filter(e => e.date === todayStr);
  
  if (entries.length === 0) {
    console.log('\n  No energy logs today.');
    console.log('  Try: nix energy log 4');
    console.log();
    return;
  }
  
  console.log(`\n  ${BOLD}⚡ Today's Energy Levels${RESET}\n`);
  
  entries.forEach(entry => {
    const e = LEVELS[entry.level];
    console.log(`  ${e.color}${e.emoji}${RESET} ${entry.time} — ${e.color}${e.label}${RESET}`);
    if (entry.note) console.log(`      "${entry.note}"`);
  });
  
  const avg = (entries.reduce((a, e) => a + e.level, 0) / entries.length).toFixed(1);
  console.log(`\n  Average today: ${avg}/5 (${entries.length} check-ins)`);
  console.log();
}

function chart() {
  const data = loadData();
  
  if (data.entries.length === 0) {
    console.log('\n  No data yet. Start logging!');
    console.log('  nix energy log 4');
    console.log();
    return;
  }
  
  // Build hourly averages
  const hourData = {};
  for (let i = 6; i <= 23; i++) hourData[i] = { sum: 0, count: 0 };
  
  data.entries.forEach(e => {
    if (hourData[e.hour] !== undefined) {
      hourData[e.hour].sum += e.level;
      hourData[e.hour].count++;
    }
  });
  
  console.log(`\n  ${BOLD}⚡ Energy by Hour of Day${RESET}\n`);
  
  for (let h = 6; h <= 23; h++) {
    const d = hourData[h];
    const avg = d.count > 0 ? (d.sum / d.count) : 0;
    const barLen = Math.round(avg * 3);
    const bar = '█'.repeat(barLen) + DIM + '░'.repeat(15 - barLen) + RESET;
    const label = `${h}:00`.padStart(5);
    const count = d.count > 0 ? `(${d.count})` : '';
    const avgStr = avg > 0 ? avg.toFixed(1) : '-';
    
    console.log(`  ${label} ${bar} ${avgStr} ${DIM}${count}${RESET}`);
  }
  
  // Find peak hours
  const sorted = Object.entries(hourData)
    .filter(([_, d]) => d.count > 0)
    .map(([h, d]) => ({ hour: parseInt(h), avg: d.sum / d.count }))
    .sort((a, b) => b.avg - a.avg);
  
  if (sorted.length > 0) {
    console.log(`\n  🏆 Peak energy: ${sorted[0].hour}:00 (${sorted[0].avg.toFixed(1)}/5)`);
  }
  console.log();
}

function week() {
  const data = loadData();
  const dates = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  console.log(`\n  ${BOLD}⚡ Energy This Week${RESET}\n`);
  
  dates.forEach(date => {
    const entries = data.entries.filter(e => e.date === date);
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = date.substring(5);
    
    if (entries.length === 0) {
      console.log(`  ${dayName} ${dateStr}  ${DIM}no data${RESET}`);
    } else {
      const avg = entries.reduce((a, e) => a + e.level, 0) / entries.length;
      const bar = avg >= 4 ? '🔥' : avg >= 3 ? '⚡' : '🪫';
      const barVis = bar.repeat(Math.round(avg));
      console.log(`  ${dayName} ${dateStr}  ${barVis} ${avg.toFixed(1)}`);
    }
  });
  
  console.log();
}

function insights() {
  const data = loadData();
  
  if (data.entries.length < 5) {
    console.log('\n  Need more data (5+ entries) for insights.');
    console.log(`  Current: ${data.entries.length} entries\n`);
    return;
  }
  
  // Calculate stats
  const avg = data.entries.reduce((a, e) => a + e.level, 0) / data.entries.length;
  const recent = data.entries.slice(-10);
  const recentAvg = recent.reduce((a, e) => a + e.level, 0) / recent.length;
  
  // Find best time of day
  const hourAvgs = {};
  data.entries.forEach(e => {
    if (!hourAvgs[e.hour]) hourAvgs[e.hour] = [];
    hourAvgs[e.hour].push(e.level);
  });
  
  let bestHour = null;
  let bestAvg = 0;
  Object.entries(hourAvgs).forEach(([h, levels]) => {
    if (levels.length >= 2) {
      const hAvg = levels.reduce((a, b) => a + b, 0) / levels.length;
      if (hAvg > bestAvg) {
        bestAvg = hAvg;
        bestHour = h;
      }
    }
  });
  
  console.log(`\n  ${BOLD}🧠 Energy Insights${RESET}\n`);
  console.log(`  Total check-ins: ${data.entries.length}`);
  console.log(`  Overall average: ${avg.toFixed(1)}/5`);
  console.log(`  Recent trend: ${recentAvg > avg ? '📈 Rising' : recentAvg < avg ? '📉 Dipping' : '➡️ Stable'}`);
  if (bestHour) {
    console.log(`  💡 Peak performance: ${bestHour}:00 (${bestAvg.toFixed(1)}/5)`);
  }
  
  console.log(`\n  ${DIM}Tip: Log energy 3-4x/day to find your peak hours${RESET}\n`);
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'log':
  case 'l':
    const level = args[1];
    if (!level || !LEVELS[level]) {
      console.log('\n  Usage: nix energy log <1-5> [note]');
      console.log('  1=🔋 Drained | 2=🪫 Low | 3=⚡ Okay | 4=⚡⚡ Good | 5=🔥 Peak\n');
      process.exit(1);
    }
    log(level, args.slice(2).join(' '));
    break;
    
  case 'today':
  case 't':
    today();
    break;
    
  case 'chart':
  case 'c':
    chart();
    break;
    
  case 'week':
  case 'w':
    week();
    break;
    
  case 'insights':
  case 'i':
    insights();
    break;
    
  case 'help':
  case '-h':
  case '--help':
    console.log(`
  ${BOLD}energy.js${RESET} — Track energy throughout the day

  Commands:
    nix energy log <1-5> [note]  Log current energy level
    nix energy today              Show today's entries
    nix energy chart              View energy by hour
    nix energy week               This week's overview
    nix energy insights           Analytics & patterns
    nix energy help               Show this help

  Examples:
    nix energy log 4 "Just finished coffee"
    nix energy log 2 "Post-lunch crash"
    nix energy l 5 "Deep work flow!"
`);
    break;
    
  default:
    today();
}
