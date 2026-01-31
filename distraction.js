#!/usr/bin/env node
/**
 * distraction.js — Track and log distractions during focus sessions
 * 
 * Usage:
 *   nix distraction "Twitter notification"        # Log a distraction
 *   nix distraction "Slack message" urgent          # Mark urgency level
 *   nix distraction list                            # Show today's distractions
 *   nix distraction list --week                     # Show this week's
 *   nix distraction stats                           # Distraction analytics
 *   nix distraction top                             # Most common sources
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DISTRACTION_FILE = path.join(DATA_DIR, 'distractions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load distractions
function loadDistractions() {
  if (!fs.existsSync(DISTRACTION_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DISTRACTION_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// Save distractions
function saveDistractions(distractions) {
  fs.writeFileSync(DISTRACTION_FILE, JSON.stringify(distractions, null, 2));
}

// Generate ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
}

// Format date for display
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format time for display
function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Get date range filter
function getDateRange(filter) {
  const now = new Date();
  const start = new Date(now);
  
  switch(filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case 'week':
      start.setDate(now.getDate() - 7);
      return { start, end: now };
    case 'month':
      start.setDate(1);
      return { start, end: now };
    default:
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
  }
}

// Add a distraction
function addDistraction(note, urgency = 'normal') {
  const distractions = loadDistractions();
  
  const entry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    note: note,
    urgency: ['low', 'normal', 'urgent'].includes(urgency) ? urgency : 'normal',
    category: guessCategory(note)
  };
  
  distractions.push(entry);
  saveDistractions(distractions);
  
  const urgencyEmoji = { low: '💤', normal: '⚡', urgent: '🔥' }[entry.urgency];
  console.log(`${urgencyEmoji} Distraction logged: "${note}"`);
  
  // Show count today
  const today = getDateRange('today');
  const todayCount = distractions.filter(d => {
    const dt = new Date(d.timestamp);
    return dt >= today.start && dt <= today.end;
  }).length;
  
  console.log(`📊 Today's distractions: ${todayCount}`);
}

// Guess category from note
function guessCategory(note) {
  const lower = note.toLowerCase();
  const categories = {
    notification: ['notification', 'alert', 'ping', 'buzz'],
    social: ['twitter', 'x.com', 'facebook', 'instagram', 'linkedin', 'social'],
    message: ['slack', 'discord', 'telegram', 'whatsapp', 'message', 'text'],
    email: ['email', 'gmail', 'inbox', 'mail'],
    news: ['news', 'reddit', 'hackernews', 'hn'],
    app: ['app', 'game', 'youtube', 'netflix', 'video']
  };
  
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'other';
}

// List distractions
function listDistractions(filter = 'today') {
  const distractions = loadDistractions();
  const range = getDateRange(filter);
  
  const filtered = distractions
    .filter(d => {
      const dt = new Date(d.timestamp);
      return dt >= range.start && dt <= range.end;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  if (filtered.length === 0) {
    console.log(`✨ No distractions logged for ${filter}. Stay focused!`);
    return;
  }
  
  const filterLabel = filter === 'today' ? "Today's" : 
                      filter === 'week' ? "This week's" : 
                      "This month's";
  
  console.log(`\n${filterLabel} Distractions (${filtered.length}):\n`);
  console.log('Time     │ Urg │ Category   │ Note');
  console.log('─────────┼─────┼────────────┼──────────────────────────────');
  
  filtered.forEach(d => {
    const time = formatTime(d.timestamp);
    const urgencyEmoji = { low: '💤', normal: '⚡', urgent: '🔥' }[d.urgency];
    const cat = d.category.padEnd(10);
    const note = d.note.length > 28 ? d.note.slice(0, 25) + '...' : d.note;
    console.log(`${time} │ ${urgencyEmoji}  │ ${cat} │ ${note}`);
  });
  
  console.log('');
}

// Show stats
function showStats() {
  const distractions = loadDistractions();
  
  if (distractions.length === 0) {
    console.log('📊 No distractions tracked yet.');
    return;
  }
  
  // Total counts
  const total = distractions.length;
  const today = getDateRange('today');
  const week = getDateRange('week');
  
  const todayCount = distractions.filter(d => {
    const dt = new Date(d.timestamp);
    return dt >= today.start && dt <= today.end;
  }).length;
  
  const weekCount = distractions.filter(d => {
    const dt = new Date(d.timestamp);
    return dt >= week.start && dt <= week.end;
  }).length;
  
  // By urgency
  const byUrgency = { low: 0, normal: 0, urgent: 0 };
  distractions.forEach(d => byUrgency[d.urgency]++);
  
  // By category
  const byCategory = {};
  distractions.forEach(d => {
    byCategory[d.category] = (byCategory[d.category] || 0) + 1;
  });
  
  console.log('\n📊 Distraction Statistics\n');
  console.log(`Total tracked:     ${total}`);
  console.log(`Today:             ${todayCount}`);
  console.log(`This week:         ${weekCount}`);
  console.log(`Daily average:     ${(total / Math.max(1, Math.ceil((Date.now() - new Date(distractions[0].timestamp)) / 86400000))).toFixed(1)}`);
  
  console.log('\nBy Urgency:');
  console.log(`  💤 Low:    ${byUrgency.low}`);
  console.log(`  ⚡ Normal: ${byUrgency.normal}`);
  console.log(`  🔥 Urgent: ${byUrgency.urgent}`);
  
  console.log('\nBy Category:');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const bar = '█'.repeat(Math.min(20, Math.round(count / total * 20)));
      console.log(`  ${cat.padEnd(12)} ${bar} ${count}`);
    });
  
  console.log('');
}

// Show top sources
function showTop() {
  const distractions = loadDistractions();
  
  if (distractions.length === 0) {
    console.log('📊 No distractions tracked yet.');
    return;
  }
  
  // Extract keywords from notes
  const words = {};
  distractions.forEach(d => {
    d.note.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['this', 'that', 'from', 'with', 'notification', 'message'].includes(w))
      .forEach(w => {
        words[w] = (words[w] || 0) + 1;
      });
  });
  
  console.log('\n🔥 Top Distraction Sources:\n');
  Object.entries(words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([word, count], i) => {
      console.log(`  ${i + 1}. ${word.padEnd(15)} ${count}x`);
    });
  
  console.log('');
}

// Show help
function showHelp() {
  console.log(`
nix distraction — Track and analyze focus interruptions

Usage:
  nix distraction "what interrupted you" [urgency]   Log a distraction
  nix distraction list [today|week|month]            List distractions  
  nix distraction stats                              Show analytics
  nix distraction top                                Most common sources
  nix distraction help                               Show this help

Urgency levels: low, normal (default), urgent

Examples:
  nix distraction "Twitter notification"
  nix distraction "Slack ping from boss" urgent
  nix distraction list week
`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

switch(command) {
  case 'list':
    const filter = args[1] || 'today';
    listDistractions(filter.replace('--', ''));
    break;
    
  case 'stats':
    showStats();
    break;
    
  case 'top':
    showTop();
    break;
    
  default:
    // Assume it's a distraction note
    const note = command;
    const urgency = args[1] || 'normal';
    addDistraction(note, urgency);
}
