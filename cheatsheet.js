#!/usr/bin/env node
/**
 * cheatsheet.js - Quick command reference
 * Usage: nix cheat [category]
 */

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

const C = COLORS;

const CATEGORIES = {
  daily: {
    title: 'Daily Tracking',
    icon: '📅',
    commands: [
      ['nix today', 'Daily briefing'],
      ['nix todo', 'Task management'],
      ['nix habits', 'Track habits'],
      ['nix water', 'Hydration tracker'],
      ['nix mood', 'Log mood'],
      ['nix energy', 'Energy levels'],
    ]
  },
  focus: {
    title: 'Focus & Productivity',
    icon: '🎯',
    commands: [
      ['nix timer 25', 'Pomodoro timer'],
      ['nix focus 25', 'Focus with quotes'],
      ['nix distraction', 'Log interruptions'],
      ['nix timeblock', 'Daily schedule'],
      ['nix standup', 'Daily report'],
    ]
  },
  health: {
    title: 'Health & Wellness',
    icon: '💪',
    commands: [
      ['nix sleep', 'Sleep tracker'],
      ['nix sleep log 7.5 4', 'Log 7.5h, quality 4/5'],
      ['nix workout', 'Exercise log'],
      ['nix meditate', 'Breathing exercises'],
      ['nix water 500', 'Add 500ml water'],
    ]
  },
  learning: {
    title: 'Learning & Knowledge',
    icon: '📚',
    commands: [
      ['nix learn', 'Learning tracker'],
      ['nix flashcard', 'Spaced repetition'],
      ['nix read', 'Reading list'],
      ['nix zettel', 'Atomic notes'],
      ['nix connect', 'Find connections'],
      ['nix clip', 'Code snippets'],
    ]
  },
  money: {
    title: 'Finance',
    icon: '💰',
    commands: [
      ['nix expense', 'Expense tracker'],
      ['nix subscription', 'Recurring costs'],
      ['nix goal', 'Savings goals'],
      ['nix invest', 'Portfolio tracker'],
    ]
  },
  review: {
    title: 'Review & Analysis',
    icon: '📊',
    commands: [
      ['nix week', 'Weekly summary'],
      ['nix correlate', 'Pattern analysis'],
      ['nix stats', 'Dashboard'],
      ['nix gratitude', 'Gratitude log'],
      ['nix sprint', 'Sprint tracker'],
    ]
  },
  quick: {
    title: 'Quick Capture',
    icon: '⚡',
    commands: [
      ['nix note', 'Quick notes'],
      ['nix later', 'Read later queue'],
      ['nix ideas', 'Idea backlog'],
      ['nix decide', 'Decision log'],
      ['nix quote', 'Random quote'],
    ]
  },
  social: {
    title: 'Social & Network',
    icon: '🤝',
    commands: [
      ['nix network', 'Contact manager'],
      ['nix network followup', 'Who to contact'],
      ['nix network birthday', 'Birthday reminders'],
    ]
  },
  utility: {
    title: 'Utilities',
    icon: '🛠️',
    commands: [
      ['nix calc', 'Calculator'],
      ['nix pass', 'Password gen'],
      ['nix uuid', 'Generate IDs'],
      ['nix qr', 'QR codes'],
      ['nix convert', 'Format converter'],
      ['nix when', 'Time calculator'],
    ]
  },
  data: {
    title: 'Data Management',
    icon: '💾',
    commands: [
      ['nix export', 'Export data'],
      ['nix import', 'Import data'],
      ['nix sync', 'Sync across devices'],
      ['nix backup', 'Backup data'],
      ['nix compact', 'Archive old data'],
    ]
  }
};

function showHeader() {
  console.log(`
${C.cyan}${C.bold}╔════════════════════════════════════════╗${C.reset}
${C.cyan}${C.bold}║${C.reset}     ${C.bold}NIX COMMAND CHEATSHEET${C.reset}          ${C.cyan}${C.bold}║${C.reset}
${C.cyan}${C.bold}╚════════════════════════════════════════╝${C.reset}
`);
}

function showCategory(key) {
  const cat = CATEGORIES[key];
  if (!cat) return false;

  console.log(`\n${cat.icon}  ${C.bold}${cat.title}${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(40)}${C.reset}`);
  
  cat.commands.forEach(([cmd, desc]) => {
    console.log(`  ${C.cyan}${cmd.padEnd(22)}${C.reset} ${C.dim}# ${desc}${C.reset}`);
  });
  
  return true;
}

function showAll() {
  showHeader();
  
  Object.keys(CATEGORIES).forEach(key => {
    showCategory(key);
  });
  
  console.log(`
${C.dim}Tip: Run 'nix cheat <category>' for specific sections${C.reset}
${C.dim}Categories: daily, focus, health, learning, money, review, quick, social, utility, data${C.reset}
`);
}

function showHelp() {
  console.log(`
${C.bold}cheatsheet.js${C.reset} - Quick command reference

${C.bold}Usage:${C.reset}
  nix cheat                Show all categories
  nix cheat <category>     Show specific category
  nix cheat --list         List categories

${C.bold}Categories:${C.reset}`);

  Object.keys(CATEGORIES).forEach(key => {
    const cat = CATEGORIES[key];
    console.log(`  ${C.cyan}${key.padEnd(12)}${C.reset} ${cat.icon} ${cat.title}`);
  });

  console.log(`
${C.bold}Examples:${C.reset}
  nix cheat daily          Morning routine commands
  nix cheat focus          Productivity & focus
  nix cheat health         Sleep, workout, meditation
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showAll();
    return;
  }
  
  const cmd = args[0];
  
  if (cmd === '--help' || cmd === '-h') {
    showHelp();
    return;
  }
  
  if (cmd === '--list' || cmd === 'list') {
    console.log(`\n${C.bold}Available Categories:${C.reset}\n`);
    Object.keys(CATEGORIES).forEach(key => {
      const cat = CATEGORIES[key];
      console.log(`  ${cat.icon}  ${C.cyan}${key.padEnd(12)}${C.reset} ${cat.title}`);
    });
    console.log();
    return;
  }
  
  // Try to match category
  const key = Object.keys(CATEGORIES).find(k => k.startsWith(cmd.toLowerCase()));
  
  if (key) {
    showHeader();
    showCategory(key);
    console.log();
  } else {
    console.log(`${C.red}✗${C.reset} Unknown category: ${cmd}`);
    console.log(`\nRun ${C.cyan}nix cheat --list${C.reset} to see available categories.`);
    process.exit(1);
  }
}

main();
