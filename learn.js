#!/usr/bin/env node
/**
 * learn.js — Learning tracker with spaced repetition
 * Track skills, learning resources, and review schedules
 * 
 * Usage: nix learn [command] [args]
 * 
 * Commands:
 *   add <skill> [resource-url]    Start learning a new skill
 *   log <skill> [note]            Log a learning session
 *   list                          Show all skills in progress
 *   review                        Show what needs review today
 *   done <skill>                  Mark skill as completed
 *   stats                         Learning statistics dashboard
 */

const fs = require('fs');
const path = require('path');

const LEARN_FILE = path.join(__dirname, 'data', 'learn.json');

// Spaced repetition intervals (days)
const SRS_INTERVALS = [1, 3, 7, 14, 30, 60, 90];

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
  gray: '\x1b[90m'
};

function loadData() {
  if (!fs.existsSync(LEARN_FILE)) {
    return { skills: [], sessions: [] };
  }
  return JSON.parse(fs.readFileSync(LEARN_FILE, 'utf8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(LEARN_FILE), { recursive: true });
  fs.writeFileSync(LEARN_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDaysDiff(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// Add a new skill to learn
function addSkill(skillName, resource = '') {
  const data = loadData();
  
  // Check if already exists
  const exists = data.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
  if (exists) {
    console.log(`\n  ${C.yellow}⚠ Skill "${skillName}" already exists${C.reset}`);
    console.log(`  ${C.dim}Use: nix learn log "${skillName}" "your notes"${C.reset}\n`);
    return;
  }
  
  const skill = {
    id: generateId(),
    name: skillName,
    resource: resource,
    status: 'active',
    level: 1, // 1-5 proficiency level
    started: getToday(),
    lastReview: null,
    nextReview: getToday(),
    reviewCount: 0,
    totalMinutes: 0,
    tags: []
  };
  
  data.skills.push(skill);
  saveData(data);
  
  console.log(`\n  ${C.green}✓ Started learning: ${C.bold}${skillName}${C.reset}`);
  if (resource) {
    console.log(`  ${C.cyan}📚 Resource: ${resource}${C.reset}`);
  }
  console.log(`  ${C.dim}ID: ${skill.id} | Next review: today${C.reset}\n`);
}

// Log a learning session
function logSession(skillName, note = '', minutes = 0) {
  const data = loadData();
  const skill = data.skills.find(s => 
    s.name.toLowerCase() === skillName.toLowerCase() || 
    s.id === skillName
  );
  
  if (!skill) {
    console.log(`\n  ${C.red}✗ Skill not found: ${skillName}${C.reset}`);
    console.log(`  ${C.dim}Add it first: nix learn add "${skillName}"${C.reset}\n`);
    return;
  }
  
  const today = getToday();
  
  // Create session log
  const session = {
    id: generateId(),
    skillId: skill.id,
    skillName: skill.name,
    date: today,
    note: note,
    minutes: minutes || 30, // Default 30 min
    timestamp: new Date().toISOString()
  };
  
  data.sessions.push(session);
  
  // Update skill
  skill.lastReview = today;
  skill.reviewCount++;
  skill.totalMinutes += session.minutes;
  
  // Calculate next review using spaced repetition
  const intervalIndex = Math.min(skill.reviewCount - 1, SRS_INTERVALS.length - 1);
  const daysUntilNext = SRS_INTERVALS[intervalIndex];
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysUntilNext);
  skill.nextReview = nextDate.toISOString().split('T')[0];
  
  // Level up every 5 reviews
  if (skill.reviewCount % 5 === 0 && skill.level < 5) {
    skill.level++;
  }
  
  saveData(data);
  
  const levelEmoji = ['🔰', '📖', '💡', '🎯', '🏆'][skill.level - 1];
  
  console.log(`\n  ${C.green}✓ Logged ${session.minutes}min session${C.reset}`);
  console.log(`  ${C.cyan}${levelEmoji} ${skill.name} (Level ${skill.level}/5)${C.reset}`);
  if (note) {
    console.log(`  📝 ${note}`);
  }
  console.log(`  ${C.dim}Next review: ${skill.nextReview} (${daysUntilNext} days)${C.reset}`);
  console.log(`  📊 Total time: ${Math.floor(skill.totalMinutes / 60)}h ${skill.totalMinutes % 60}m\n`);
}

// List all skills
function listSkills() {
  const data = loadData();
  const active = data.skills.filter(s => s.status === 'active');
  const completed = data.skills.filter(s => s.status === 'completed');
  
  if (active.length === 0 && completed.length === 0) {
    console.log(`\n  ${C.yellow}No skills tracked yet.${C.reset}`);
    console.log(`  ${C.dim}Start learning: nix learn add "Rust Programming"${C.reset}\n`);
    return;
  }
  
  console.log(`\n  ${C.bold}📚 Learning Tracker${C.reset}\n`);
  
  if (active.length > 0) {
    console.log(`  ${C.bold}Active (${active.length}):${C.reset}\n`);
    
    // Sort by next review date
    const sorted = active.sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
    
    sorted.forEach(skill => {
      const levelEmoji = ['🔰', '📖', '💡', '🎯', '🏆'][skill.level - 1];
      const isDue = skill.nextReview <= getToday();
      const dueIcon = isDue ? `${C.red}🔥${C.reset}` : `${C.dim}⏳${C.reset}`;
      const dueText = isDue ? `${C.red}DUE TODAY${C.reset}` : skill.nextReview;
      
      console.log(`  ${levelEmoji} ${C.bold}${skill.name}${C.reset} ${dueIcon}`);
      console.log(`     ${C.gray}ID: ${skill.id} | Reviews: ${skill.reviewCount} | Level: ${skill.level}/5${C.reset}`);
      console.log(`     ${C.gray}Next review: ${dueText}${C.reset}`);
      if (skill.resource) {
        console.log(`     ${C.cyan}→ ${skill.resource}${C.reset}`);
      }
      console.log();
    });
  }
  
  if (completed.length > 0) {
    console.log(`  ${C.green}✓ Completed (${completed.length}):${C.reset} ${completed.map(s => s.name).join(', ')}\n`);
  }
}

// Show today's review queue
function showReviewQueue() {
  const data = loadData();
  const today = getToday();
  
  const dueToday = data.skills.filter(s => 
    s.status === 'active' && s.nextReview <= today
  );
  
  const upcoming = data.skills.filter(s => 
    s.status === 'active' && s.nextReview > today
  ).slice(0, 3);
  
  console.log(`\n  ${C.bold}🔥 Today's Review Queue${C.reset}\n`);
  
  if (dueToday.length === 0) {
    console.log(`  ${C.green}✓ Nothing due today!${C.reset}`);
    console.log(`  ${C.dim}Keep the momentum going anyway.${C.reset}\n`);
  } else {
    console.log(`  ${C.yellow}${dueToday.length} skill${dueToday.length > 1 ? 's' : ''} ready for review:${C.reset}\n`);
    
    dueToday.forEach(skill => {
      const levelEmoji = ['🔰', '📖', '💡', '🎯', '🏆'][skill.level - 1];
      console.log(`  ${levelEmoji} ${C.bold}${skill.name}${C.reset}`);
      console.log(`     ${C.gray}Log it: nix learn log "${skill.name}" "what you learned"${C.reset}`);
      if (skill.resource) {
        console.log(`     ${C.cyan}→ ${skill.resource}${C.reset}`);
      }
      console.log();
    });
  }
  
  if (upcoming.length > 0) {
    console.log(`  ${C.dim}Coming up:${C.reset}`);
    upcoming.forEach(skill => {
      const daysUntil = getDaysDiff(today, skill.nextReview);
      console.log(`    • ${skill.name} — in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`);
    });
    console.log();
  }
}

// Mark skill as completed
function completeSkill(skillName) {
  const data = loadData();
  const skill = data.skills.find(s => 
    s.name.toLowerCase() === skillName.toLowerCase() || 
    s.id === skillName
  );
  
  if (!skill) {
    console.log(`\n  ${C.red}✗ Skill not found: ${skillName}${C.reset}\n`);
    return;
  }
  
  skill.status = 'completed';
  skill.completedDate = getToday();
  saveData(data);
  
  console.log(`\n  ${C.green}🏆 Completed: ${C.bold}${skill.name}${C.reset}`);
  console.log(`  ${C.gray}Total reviews: ${skill.reviewCount}`);
  console.log(`  ${C.gray}Time invested: ${Math.floor(skill.totalMinutes / 60)}h ${skill.totalMinutes % 60}m${C.reset}\n`);
}

// Show learning stats
function showStats() {
  const data = loadData();
  const today = getToday();
  
  const active = data.skills.filter(s => s.status === 'active');
  const completed = data.skills.filter(s => s.status === 'completed');
  const dueToday = active.filter(s => s.nextReview <= today);
  
  // Calculate weekly sessions
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekSessions = data.sessions.filter(s => new Date(s.date) >= weekAgo);
  
  // Total time
  const totalMinutes = data.sessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  
  console.log(`\n  ${C.bold}📊 Learning Statistics${C.reset}\n`);
  
  console.log(`  ${C.cyan}Active Skills:${C.reset}     ${active.length}`);
  console.log(`  ${C.green}Completed:${C.reset}         ${completed.length}`);
  console.log(`  ${C.yellow}Due for Review:${C.reset}    ${dueToday.length}`);
  console.log(`  ${C.magenta}Sessions This Week:${C.reset} ${thisWeekSessions.length}`);
  console.log(`  ${C.blue}Total Learning Time:${C.reset} ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m\n`);
  
  if (completed.length > 0) {
    console.log(`  ${C.bold}🏆 Recently Completed:${C.reset}`);
    completed.slice(-5).forEach(skill => {
      console.log(`    ✓ ${skill.name} — ${skill.completedDate}`);
    });
    console.log();
  }
  
  // Streak calculation
  const uniqueDays = [...new Set(data.sessions.map(s => s.date))].sort();
  let streak = 0;
  const checkDate = new Date();
  
  for (let i = uniqueDays.length - 1; i >= 0; i--) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (uniqueDays[i] === dateStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (uniqueDays[i] < dateStr) {
      break;
    }
  }
  
  if (streak > 0) {
    const streakEmoji = streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '✨';
    console.log(`  ${C.bold}Learning Streak:${C.reset} ${streakEmoji} ${streak} day${streak !== 1 ? 's' : ''}\n`);
  }
}

// Show help
function showHelp() {
  console.log(`
  ${C.bold}📚 nix learn — Learning tracker with spaced repetition${C.reset}

  ${C.bold}Commands:${C.reset}
    add <skill> [url]      Start learning a new skill
    log <skill> [note]     Log a learning session (default 30min)
    list                   Show all active skills
    review                 Show review queue for today
    done <skill>           Mark skill as mastered
    stats                  Learning dashboard

  ${C.bold}Examples:${C.reset}
    nix learn add "Rust Programming" "https://doc.rust-lang.org"
    nix learn log "Rust Programming" "learned about ownership"
    nix learn log "Rust Programming" "2 hours" 120
    nix learn review
    nix learn done "Rust Programming"

  ${C.gray}Spaced repetition intervals: 1, 3, 7, 14, 30, 60, 90 days${C.reset}
`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'add':
    if (!args[1]) {
      console.log(`\n  ${C.red}✗ Usage: nix learn add "skill name" [resource-url]${C.reset}\n`);
      process.exit(1);
    }
    addSkill(args[1], args[2] || '');
    break;
    
  case 'log':
    if (!args[1]) {
      console.log(`\n  ${C.red}✗ Usage: nix learn log "skill name" [note] [minutes]${C.reset}\n`);
      process.exit(1);
    }
    logSession(args[1], args[2] || '', parseInt(args[3]) || 0);
    break;
    
  case 'list':
    listSkills();
    break;
    
  case 'review':
    showReviewQueue();
    break;
    
  case 'done':
  case 'complete':
    if (!args[1]) {
      console.log(`\n  ${C.red}✗ Usage: nix learn done "skill name"${C.reset}\n`);
      process.exit(1);
    }
    completeSkill(args[1]);
    break;
    
  case 'stats':
    showStats();
    break;
    
  case 'help':
  case '--help':
  case '-h':
  default:
    showHelp();
    break;
}
