#!/usr/bin/env node
/**
 * network.js — Contact and relationship tracker
 * Track people, interactions, and networking follow-ups
 * 
 * Usage:
 *   nix network add "Alex Chen" "alex@example.com" "Met at ReactConf"  # Add contact
 *   nix network add "Sam" "sam@work.com" --tag colleague --tag frontend
 *   nix network list                                              # Show all contacts
 *   nix network list --tag colleague                              # Filter by tag
 *   nix network search "React"                                    # Search notes
 *   nix network view alex                                         # View contact details
 *   nix network log alex "Coffee chat"                            # Log interaction
 *   nix network log alex "Helped with PR" 30                      # With duration
 *   nix network touch alex                                        # Update last contact
 *   nix network followup                                          # Show follow-up list
 *   nix network followup alex 7                                   # Set 7-day follow-up
 *   nix network birthday                                          # Show upcoming birthdays
 *   nix network stats                                             # Network stats
 *   nix network remind                                            # Who to reach out to
 *   nix network export                                            # Export contacts
 * 
 * Data: ~/.nix/data/network.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(require('os').homedir(), '.nix', 'data');
const DATA_FILE = path.join(DATA_DIR, 'network.json');

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

// Initialize
function initData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      contacts: [],
      interactions: [],
      lastId: 0
    }, null, 2));
  }
}

function loadData() {
  initData();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId(data) {
  data.lastId = (data.lastId || 0) + 1;
  return `c${data.lastId.toString(36)}`;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').substr(0, 10);
}

// Parse tags from args
function parseTags(args) {
  const tags = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tag' || args[i] === '-t') {
      if (args[i + 1]) tags.push(args[i + 1].toLowerCase());
      i++;
    }
  }
  return tags;
}

// Find contact by slug or partial match
function findContact(data, query) {
  const q = query.toLowerCase();
  return data.contacts.find(c => 
    c.id === q ||
    slugify(c.name).includes(q) ||
    c.name.toLowerCase().includes(q) ||
    (c.email && c.email.toLowerCase().includes(q))
  );
}

// Add contact
function addContact(args) {
  if (args.length < 2) {
    console.log(`${C.red}Usage: nix network add "Name" [email] [notes] --tag tag1 --tag tag2${C.reset}`);
    process.exit(1);
  }

  const data = loadData();
  const name = args[0];
  const email = args[1]?.includes('@') ? args[1] : '';
  const notesStart = email ? 2 : 1;
  const tags = parseTags(args);
  const notes = args.slice(notesStart).filter(a => !a.startsWith('--') && a !== email).join(' ');

  const existing = data.contacts.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    console.log(`${C.yellow}Contact already exists:${C.reset} ${existing.name} (${existing.id})`);
    console.log(`Use 'nix network update ${existing.id}' to modify`);
    return;
  }

  const contact = {
    id: generateId(data),
    name,
    email: email || '',
    notes: notes || '',
    tags,
    createdAt: new Date().toISOString(),
    lastContact: null,
    followUpDays: 30,
    birthday: null,
    company: '',
    role: '',
    social: {},
    interactions: 0
  };

  data.contacts.push(contact);
  saveData(data);

  console.log(`${C.green}✓ Added contact:${C.reset} ${C.bold}${name}${C.reset}`);
  console.log(`  ID: ${C.cyan}${contact.id}${C.reset}`);
  if (email) console.log(`  Email: ${email}`);
  if (tags.length) console.log(`  Tags: ${tags.map(t => C.yellow + t + C.reset).join(', ')}`);
  if (notes) console.log(`  Notes: ${notes}`);
}

// List contacts
function listContacts(args) {
  const data = loadData();
  const tagFilter = parseTags(args)[0];

  let contacts = data.contacts;
  if (tagFilter) {
    contacts = contacts.filter(c => c.tags.includes(tagFilter));
  }

  if (contacts.length === 0) {
    console.log(tagFilter 
      ? `${C.yellow}No contacts with tag: ${tagFilter}${C.reset}`
      : `${C.yellow}No contacts yet. Add one with: nix network add "Name"${C.reset}`
    );
    return;
  }

  // Sort by last contact (nulls last)
  contacts.sort((a, b) => {
    if (!a.lastContact) return 1;
    if (!b.lastContact) return -1;
    return new Date(b.lastContact) - new Date(a.lastContact);
  });

  console.log(`\n${C.bold}CONTACTS${tagFilter ? ` — tag: ${tagFilter}` : ''}${C.reset}\n`);
  console.log(`${C.dim}ID      NAME              LAST CONTACT    TAGS${C.reset}`);
  console.log(`${C.dim}─────────────────────────────────────────────────────────${C.reset}`);

  contacts.forEach(c => {
    const lastContact = c.lastContact 
      ? daysSince(c.lastContact) + 'd ago'
      : C.dim + 'never' + C.reset;
    const tags = c.tags.slice(0, 3).map(t => C.yellow + t + C.reset).join(' ');
    const name = c.name.length > 16 ? c.name.substr(0, 15) + '…' : c.name;
    const needsFollowUp = c.lastContact && daysSince(c.lastContact) > c.followUpDays;
    const indicator = needsFollowUp ? C.red + '● ' : C.green + '● ';

    console.log(
      `${indicator}${C.reset}${c.id.padEnd(8)}${name.padEnd(18)}${lastContact.padEnd(16)}${tags}`
    );
  });

  console.log(`\n${C.dim}${contacts.length} contacts total · ● needs follow-up${C.reset}`);
}

// Days since date
function daysSince(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  return days;
}

// View contact
function viewContact(query) {
  const data = loadData();
  const contact = findContact(data, query);

  if (!contact) {
    console.log(`${C.red}Contact not found: ${query}${C.reset}`);
    return;
  }

  console.log(`\n${C.bold}${contact.name}${C.reset} ${C.cyan}${contact.id}${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(50)}${C.reset}`);
  
  if (contact.email) console.log(`  Email:    ${contact.email}`);
  if (contact.company) console.log(`  Company:  ${contact.company}`);
  if (contact.role) console.log(`  Role:     ${contact.role}`);
  if (contact.birthday) console.log(`  Birthday: ${contact.birthday} 🎂`);
  
  console.log(`  Tags:     ${contact.tags.map(t => C.yellow + t + C.reset).join(' ') || C.dim + 'none' + C.reset}`);
  console.log(`  Follow-up: Every ${contact.followUpDays} days`);
  console.log(`  Added:    ${new Date(contact.createdAt).toLocaleDateString()}`);
  
  if (contact.lastContact) {
    const days = daysSince(contact.lastContact);
    const color = days > contact.followUpDays ? C.red : C.green;
    console.log(`  Last contact: ${color}${days} days ago${C.reset}`);
  } else {
    console.log(`  Last contact: ${C.dim}Never${C.reset}`);
  }

  if (contact.notes) {
    console.log(`\n  ${C.dim}Notes:${C.reset}`);
    console.log(`  ${contact.notes}`);
  }

  // Recent interactions
  const interactions = data.interactions
    .filter(i => i.contactId === contact.id)
    .slice(-5)
    .reverse();

  if (interactions.length > 0) {
    console.log(`\n  ${C.dim}Recent interactions:${C.reset}`);
    interactions.forEach(i => {
      const date = new Date(i.date).toLocaleDateString();
      const duration = i.duration ? ` (${i.duration}m)` : '';
      console.log(`    ${C.dim}${date}${C.reset} ${i.note}${C.dim}${duration}${C.reset}`);
    });
  }

  console.log();
}

// Log interaction
function logInteraction(args) {
  if (args.length < 2) {
    console.log(`${C.red}Usage: nix network log <contact> "note" [duration_minutes]${C.reset}`);
    process.exit(1);
  }

  const data = loadData();
  const contact = findContact(data, args[0]);

  if (!contact) {
    console.log(`${C.red}Contact not found: ${args[0]}${C.reset}`);
    return;
  }

  const note = args[1];
  const duration = parseInt(args[2]) || null;

  const interaction = {
    id: `i${Date.now().toString(36)}`,
    contactId: contact.id,
    note,
    duration,
    date: new Date().toISOString()
  };

  data.interactions.push(interaction);
  contact.lastContact = interaction.date;
  contact.interactions = (contact.interactions || 0) + 1;

  saveData(data);

  console.log(`${C.green}✓ Logged interaction:${C.reset} ${contact.name}`);
  console.log(`  ${note}${duration ? ` (${duration}m)` : ''}`);
}

// Touch (quick update last contact)
function touchContact(query) {
  const data = loadData();
  const contact = findContact(data, query);

  if (!contact) {
    console.log(`${C.red}Contact not found: ${query}${C.reset}`);
    return;
  }

  contact.lastContact = new Date().toISOString();
  contact.interactions = (contact.interactions || 0) + 1;
  saveData(data);

  console.log(`${C.green}✓ Updated:${C.reset} ${contact.name} (last contact: now)`);
}

// Set follow-up
function setFollowUp(args) {
  if (args.length < 2) {
    console.log(`${C.red}Usage: nix network followup <contact> <days>${C.reset}`);
    process.exit(1);
  }

  const data = loadData();
  const contact = findContact(data, args[0]);

  if (!contact) {
    console.log(`${C.red}Contact not found: ${args[0]}${C.reset}`);
    return;
  }

  const days = parseInt(args[1]);
  if (isNaN(days)) {
    console.log(`${C.red}Invalid days: ${args[1]}${C.reset}`);
    return;
  }

  contact.followUpDays = days;
  saveData(data);

  console.log(`${C.green}✓ Set follow-up:${C.reset} ${contact.name} every ${days} days`);
}

// Show follow-up list
function showFollowUps() {
  const data = loadData();
  const now = Date.now();

  const needsFollowUp = data.contacts.filter(c => {
    if (!c.lastContact) return true;
    const days = daysSince(c.lastContact);
    return days > c.followUpDays;
  }).sort((a, b) => {
    const aDays = a.lastContact ? daysSince(a.lastContact) : 999;
    const bDays = b.lastContact ? daysSince(b.lastContact) : 999;
    return bDays - aDays;
  });

  if (needsFollowUp.length === 0) {
    console.log(`${C.green}✓ All caught up! No follow-ups needed.${C.reset}`);
    return;
  }

  console.log(`\n${C.bold}FOLLOW-UP NEEDED${C.reset}\n`);
  console.log(`${C.dim}DAYS    NAME              FREQUENCY${C.reset}`);
  console.log(`${C.dim}─────────────────────────────────────────────${C.reset}`);

  needsFollowUp.forEach(c => {
    const days = c.lastContact ? daysSince(c.lastContact) : '∞';
    const color = days > c.followUpDays * 2 ? C.red : C.yellow;
    console.log(`${color}${String(days).padEnd(8)}${C.reset}${c.name.padEnd(18)}every ${c.followUpDays}d`);
  });

  console.log(`\n${C.dim}Tip: Use 'nix network touch <name>' to mark as contacted${C.reset}`);
}

// Search contacts
function searchContacts(query) {
  if (!query) {
    console.log(`${C.red}Usage: nix network search <query>${C.reset}`);
    process.exit(1);
  }

  const data = loadData();
  const q = query.toLowerCase();

  const matches = data.contacts.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.notes.toLowerCase().includes(q) ||
    c.tags.some(t => t.includes(q)) ||
    (c.email && c.email.toLowerCase().includes(q))
  );

  if (matches.length === 0) {
    console.log(`${C.yellow}No matches for: ${query}${C.reset}`);
    return;
  }

  console.log(`\n${C.bold}SEARCH RESULTS${C.reset} "${query}"\n`);
  matches.forEach(c => {
    const tags = c.tags.map(t => C.yellow + t + C.reset).join(' ');
    console.log(`${C.cyan}${c.id}${C.reset} ${C.bold}${c.name}${C.reset} ${tags}`);
    if (c.notes) {
      const snippet = c.notes.length > 60 ? c.notes.substr(0, 60) + '…' : c.notes;
      console.log(`  ${C.dim}${snippet}${C.reset}`);
    }
  });
  console.log(`\n${matches.length} result(s)`);
}

// Show birthdays
function showBirthdays() {
  const data = loadData();
  const withBirthday = data.contacts.filter(c => c.birthday);

  if (withBirthday.length === 0) {
    console.log(`${C.yellow}No birthdays set. Use 'nix network birthday <contact> MM-DD'${C.reset}`);
    return;
  }

  const today = new Date();
  const currentYear = today.getFullYear();

  const upcoming = withBirthday.map(c => {
    const [month, day] = c.birthday.split('-').map(Number);
    let bday = new Date(currentYear, month - 1, day);
    if (bday < today) bday = new Date(currentYear + 1, month - 1, day);
    const days = Math.ceil((bday - today) / (1000 * 60 * 60 * 24));
    return { ...c, daysUntil: days };
  }).sort((a, b) => a.daysUntil - b.daysUntil);

  console.log(`\n${C.bold}UPCOMING BIRTHDAYS 🎂${C.reset}\n`);
  upcoming.forEach(c => {
    const emoji = c.daysUntil === 0 ? '🎉 TODAY!' : c.daysUntil <= 7 ? '🎈' : '';
    const color = c.daysUntil === 0 ? C.green : c.daysUntil <= 7 ? C.yellow : C.reset;
    console.log(`${color}${String(c.daysUntil).padStart(3)} days${C.reset}  ${c.name} ${emoji}`);
  });
}

// Set birthday
function setBirthday(args) {
  if (args.length < 2) {
    console.log(`${C.red}Usage: nix network birthday <contact> MM-DD${C.reset}`);
    process.exit(1);
  }

  const data = loadData();
  const contact = findContact(data, args[0]);

  if (!contact) {
    console.log(`${C.red}Contact not found: ${args[0]}${C.reset}`);
    return;
  }

  const birthday = args[1];
  if (!/^\d{2}-\d{2}$/.test(birthday)) {
    console.log(`${C.red}Invalid format. Use MM-DD (e.g., 03-15)${C.reset}`);
    return;
  }

  contact.birthday = birthday;
  saveData(data);

  console.log(`${C.green}✓ Birthday set:${C.reset} ${contact.name} on ${birthday} 🎂`);
}

// Show stats
function showStats() {
  const data = loadData();
  const total = data.contacts.length;
  const totalInteractions = data.interactions.length;

  if (total === 0) {
    console.log(`${C.yellow}No contacts yet${C.reset}`);
    return;
  }

  // Tag breakdown
  const tagCount = {};
  data.contacts.forEach(c => {
    c.tags.forEach(t => tagCount[t] = (tagCount[t] || 0) + 1);
  });

  // Activity (last 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentInteractions = data.interactions.filter(i => 
    new Date(i.date).getTime() > thirtyDaysAgo
  ).length;

  console.log(`\n${C.bold}NETWORK STATS${C.reset}\n`);
  console.log(`  Total contacts:     ${total}`);
  console.log(`  Total interactions: ${totalInteractions}`);
  console.log(`  This month:         ${recentInteractions} interactions`);
  
  const avgInteractions = total > 0 ? (totalInteractions / total).toFixed(1) : 0;
  console.log(`  Avg per contact:    ${avgInteractions}`);

  if (Object.keys(tagCount).length > 0) {
    console.log(`\n  ${C.dim}Top tags:${C.reset}`);
    Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([tag, count]) => {
        const bar = '█'.repeat(Math.min(count, 10));
        console.log(`    ${tag.padEnd(12)} ${bar} ${count}`);
      });
  }

  // Most engaged contacts
  const engaged = [...data.contacts]
    .sort((a, b) => (b.interactions || 0) - (a.interactions || 0))
    .slice(0, 3);

  if (engaged[0]?.interactions > 0) {
    console.log(`\n  ${C.dim}Most engaged:${C.reset}`);
    engaged.forEach(c => {
      console.log(`    ${c.name}: ${c.interactions || 0} interactions`);
    });
  }
}

// Show reminders (who to contact)
function showReminders() {
  const data = loadData();
  const neverContacted = data.contacts.filter(c => !c.lastContact);
  const overdue = data.contacts.filter(c => {
    if (!c.lastContact) return false;
    return daysSince(c.lastContact) > c.followUpDays;
  });

  console.log(`\n${C.bold}REMINDERS${C.reset}\n`);

  if (neverContacted.length > 0) {
    console.log(`${C.yellow}Never contacted:${C.reset}`);
    neverContacted.slice(0, 5).forEach(c => {
      console.log(`  • ${c.name} (${c.id})`);
    });
    if (neverContacted.length > 5) {
      console.log(`  ... and ${neverContacted.length - 5} more`);
    }
    console.log();
  }

  if (overdue.length > 0) {
    console.log(`${C.red}Follow-up overdue:${C.reset}`);
    overdue.slice(0, 5).forEach(c => {
      console.log(`  • ${c.name} — ${daysSince(c.lastContact)} days ago`);
    });
    console.log();
  }

  if (neverContacted.length === 0 && overdue.length === 0) {
    console.log(`${C.green}✓ You're all caught up!${C.reset}`);
  }
}

// Help
function showHelp() {
  console.log(`
${C.bold}nix network${C.reset} — Contact and relationship tracker

${C.cyan}Commands:${C.reset}
  add "Name" [email] [notes] --tag tag   Add new contact
  list [--tag tag]                        List all contacts
  view <id/name>                          View contact details
  search <query>                          Search contacts and notes
  log <contact> "note" [minutes]          Log interaction
  touch <contact>                         Quick "just contacted"
  followup <contact> <days>               Set follow-up frequency
  followup                                Show follow-up needed list
  birthday <contact> MM-DD                Set birthday
  birthday                                Show upcoming birthdays
  stats                                   Network statistics
  remind                                  Who to reach out to

${C.cyan}Examples:${C.reset}
  nix network add "Alex Chen" "alex@work.com" "Met at ReactConf" --tag dev --tag conference
  nix network log alex "Coffee chat" 45
  nix network touch alex
  nix network followup alex 14
  nix network list --tag conference

${C.dim}Data: ~/.nix/data/network.json${C.reset}
`);
}

// Main
function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'add':
      addContact(args.slice(1));
      break;
    case 'list':
    case 'ls':
      listContacts(args.slice(1));
      break;
    case 'view':
    case 'show':
      viewContact(args[1]);
      break;
    case 'search':
    case 'find':
      searchContacts(args[1]);
      break;
    case 'log':
      logInteraction(args.slice(1));
      break;
    case 'touch':
      touchContact(args[1]);
      break;
    case 'followup':
      if (args[1]) setFollowUp(args.slice(1));
      else showFollowUps();
      break;
    case 'birthday':
      if (args[1]) setBirthday(args.slice(1));
      else showBirthdays();
      break;
    case 'stats':
      showStats();
      break;
    case 'remind':
    case 'reminders':
      showReminders();
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
      break;
  }
}

main();
