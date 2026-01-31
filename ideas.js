#!/usr/bin/env node
/**
 * ideas.js - Idea backlog and project pipeline tracker
 * Captures ideas, features, and projects before they become sprints
 * Usage: ideas [command] [args]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IDEAS_FILE = path.join(__dirname, 'ideas.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

const PRIORITIES = {
  high: { color: 'red', emoji: '🔴', weight: 3 },
  medium: { color: 'yellow', emoji: '🟡', weight: 2 },
  low: { color: 'green', emoji: '🟢', weight: 1 }
};

const STATUSES = ['backlog', 'planning', 'ready', 'icebox', 'completed'];

function loadIdeas() {
  if (!fs.existsSync(IDEAS_FILE)) {
    return { ideas: [], lastId: 0, archived: [] };
  }
  return JSON.parse(fs.readFileSync(IDEAS_FILE, 'utf8'));
}

function saveIdeas(data) {
  fs.writeFileSync(IDEAS_FILE, JSON.stringify(data, null, 2));
}

function generateId(data) {
  data.lastId = (data.lastId || 0) + 1;
  return data.lastId;
}

function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function addIdea(text, priority = 'medium', tags = []) {
  const data = loadIdeas();
  const idea = {
    id: generateId(data),
    text: text,
    priority: priority.toLowerCase(),
    status: 'backlog',
    tags: tags.map(t => t.toLowerCase()),
    created: formatDate(),
    updated: formatDate()
  };

  data.ideas.push(idea);
  saveIdeas(data);

  const p = PRIORITIES[idea.priority];
  console.log(COLORS.green + `✓ Idea #${idea.id} captured` + COLORS.reset);
  console.log(COLORS.dim + `  Priority: ${p.emoji} ${idea.priority}` + COLORS.reset);
  if (idea.tags.length) {
    console.log(COLORS.dim + `  Tags: ${idea.tags.join(', ')}` + COLORS.reset);
  }
}

function listIdeas(filter = 'active') {
  const data = loadIdeas();
  
  let ideas = data.ideas;
  
  if (filter === 'active') {
    ideas = ideas.filter(i => ['backlog', 'planning', 'ready'].includes(i.status));
  } else if (filter === 'backlog') {
    ideas = ideas.filter(i => i.status === 'backlog');
  } else if (filter === 'ready') {
    ideas = ideas.filter(i => i.status === 'ready');
  } else if (filter === 'completed') {
    ideas = ideas.filter(i => i.status === 'completed');
  } else if (filter === 'icebox') {
    ideas = ideas.filter(i => i.status === 'icebox');
  } else if (filter.startsWith('tag:')) {
    const tag = filter.slice(4).toLowerCase();
    ideas = ideas.filter(i => i.tags.includes(tag));
  } else if (filter.startsWith('priority:')) {
    const p = filter.slice(9).toLowerCase();
    ideas = ideas.filter(i => i.priority === p);
  }

  // Sort by priority weight (high first), then by id
  ideas.sort((a, b) => {
    const pDiff = PRIORITIES[b.priority].weight - PRIORITIES[a.priority].weight;
    if (pDiff !== 0) return pDiff;
    return a.id - b.id;
  });

  if (ideas.length === 0) {
    console.log(COLORS.yellow + 'No ideas found.' + COLORS.reset);
    return;
  }

  const statusEmoji = {
    backlog: '📦',
    planning: '📋',
    ready: '🚀',
    icebox: '🧊',
    completed: '✅'
  };

  console.log(COLORS.cyan + COLORS.bold + `💡 Ideas (${filter})\n` + COLORS.reset);

  const byStatus = {};
  ideas.forEach(idea => {
    if (!byStatus[idea.status]) byStatus[idea.status] = [];
    byStatus[idea.status].push(idea);
  });

  STATUSES.forEach(status => {
    if (!byStatus[status]) return;
    console.log(COLORS.bold + `${statusEmoji[status]} ${status.toUpperCase()}` + COLORS.reset);
    
    byStatus[status].forEach(idea => {
      const p = PRIORITIES[idea.priority];
      const age = Math.floor((new Date() - new Date(idea.created)) / (1000 * 60 * 60 * 24));
      const ageStr = age === 0 ? 'today' : age === 1 ? '1d ago' : `${age}d ago`;
      
      console.log(`  ${p.emoji} #${idea.id} ${idea.text.substring(0, 45)}${idea.text.length > 45 ? '...' : ''}`);
      console.log(COLORS.dim + `     ${ageStr}${idea.tags.length ? ' | ' + idea.tags.join(', ') : ''}` + COLORS.reset);
    });
    console.log('');
  });
}

function showIdea(id) {
  const data = loadIdeas();
  const idea = data.ideas.find(i => i.id === parseInt(id));
  
  if (!idea) {
    console.log(COLORS.red + `Idea #${id} not found.` + COLORS.reset);
    return;
  }

  const p = PRIORITIES[idea.priority];
  const statusEmoji = { backlog: '📦', planning: '📋', ready: '🚀', icebox: '🧊', completed: '✅' };

  console.log('');
  console.log(COLORS.cyan + '╔══════════════════════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + COLORS.bold + ` 💡 IDEA #${idea.id}`.padEnd(57) + COLORS.reset + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '╠══════════════════════════════════════════════════════════╣' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + ' ' + idea.text.padEnd(56) + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '╠══════════════════════════════════════════════════════════╣' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + ` Priority: ${p.emoji} ${idea.priority.padEnd(46)}` + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + ` Status: ${statusEmoji[idea.status]} ${idea.status.padEnd(48)}` + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + ` Created: ${idea.created.padEnd(47)}` + COLORS.cyan + '║' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + ` Updated: ${idea.updated.padEnd(47)}` + COLORS.cyan + '║' + COLORS.reset);
  if (idea.tags.length) {
    console.log(COLORS.cyan + '║' + COLORS.reset + ` Tags: ${idea.tags.join(', ').padEnd(51)}` + COLORS.cyan + '║' + COLORS.reset);
  }
  console.log(COLORS.cyan + '╚══════════════════════════════════════════════════════════╝' + COLORS.reset);
  console.log('');
}

function updateIdea(id, updates) {
  const data = loadIdeas();
  const idea = data.ideas.find(i => i.id === parseInt(id));
  
  if (!idea) {
    console.log(COLORS.red + `Idea #${id} not found.` + COLORS.reset);
    return;
  }

  if (updates.priority) idea.priority = updates.priority;
  if (updates.status) idea.status = updates.status;
  if (updates.tags) idea.tags = updates.tags;
  idea.updated = formatDate();

  saveIdeas(data);
  console.log(COLORS.green + `✓ Idea #${id} updated` + COLORS.reset);
}

function deleteIdea(id) {
  const data = loadIdeas();
  const idx = data.ideas.findIndex(i => i.id === parseInt(id));
  
  if (idx === -1) {
    console.log(COLORS.red + `Idea #${id} not found.` + COLORS.reset);
    return;
  }

  const idea = data.ideas[idx];
  data.archived = data.archived || [];
  data.archived.push({ ...idea, deleted: formatDate() });
  data.ideas.splice(idx, 1);
  
  saveIdeas(data);
  console.log(COLORS.green + `✓ Idea #${id} deleted (archived)` + COLORS.reset);
}

function searchIdeas(query) {
  const data = loadIdeas();
  const regex = new RegExp(query, 'i');
  
  const matches = data.ideas.filter(i => 
    regex.test(i.text) || 
    i.tags.some(t => regex.test(t))
  );

  if (matches.length === 0) {
    console.log(COLORS.yellow + `No ideas match "${query}"` + COLORS.reset);
    return;
  }

  console.log(COLORS.cyan + COLORS.bold + `🔍 Found ${matches.length} idea${matches.length !== 1 ? 's' : ''} for "${query}"\n` + COLORS.reset);
  
  matches.forEach(idea => {
    const p = PRIORITIES[idea.priority];
    console.log(`${p.emoji} #${idea.id} [${idea.status}] ${idea.text.substring(0, 50)}`);
  });
}

function showStats() {
  const data = loadIdeas();
  
  const byStatus = {};
  const byPriority = {};
  
  data.ideas.forEach(i => {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    byPriority[i.priority] = (byPriority[i.priority] || 0) + 1;
  });

  console.log(COLORS.cyan + COLORS.bold + '📊 Ideas Pipeline Stats\n' + COLORS.reset);
  
  console.log(COLORS.bold + 'By Status:' + COLORS.reset);
  STATUSES.forEach(s => {
    const count = byStatus[s] || 0;
    const bar = '█'.repeat(count);
    console.log(`  ${s.padEnd(10)} ${count.toString().padStart(2)} ${COLORS.cyan}${bar}${COLORS.reset}`);
  });
  
  console.log('');
  console.log(COLORS.bold + 'By Priority:' + COLORS.reset);
  Object.entries(byPriority).forEach(([p, count]) => {
    const emoji = PRIORITIES[p].emoji;
    console.log(`  ${emoji} ${p.padEnd(8)} ${count}`);
  });
  
  console.log('');
  console.log(COLORS.dim + `Total active: ${data.ideas.length}` + COLORS.reset);
  console.log(COLORS.dim + `Archived: ${(data.archived || []).length}` + COLORS.reset);
}

function promoteToSprint(id) {
  const data = loadIdeas();
  const idea = data.ideas.find(i => i.id === parseInt(id));
  
  if (!idea) {
    console.log(COLORS.red + `Idea #${id} not found.` + COLORS.reset);
    return;
  }

  console.log(COLORS.cyan + 'Promoting to sprint:' + COLORS.reset);
  console.log(`  "${idea.text}"`);
  console.log('');
  console.log(COLORS.yellow + 'Run: nixsprint start "' + idea.text + '"' + COLORS.reset);
  console.log(COLORS.dim + 'Then mark this idea as completed: ideas complete ' + id + COLORS.reset);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    listIdeas('active');
    return;
  }

  const cmd = args[0];

  // Add new idea
  if (!['list', 'show', 'update', 'delete', 'complete', 'search', 'stats', 'promote', 'ready', 'icebox', 'plan', '--help', '-h'].includes(cmd)) {
    // Parse: ideas "text" [priority] [tag1,tag2]
    const text = args[0];
    const priority = args[1] || 'medium';
    const tags = args[2] ? args[2].split(',') : [];
    
    if (!PRIORITIES[priority.toLowerCase()]) {
      console.log(COLORS.red + `Invalid priority: ${priority}` + COLORS.reset);
      console.log(COLORS.dim + 'Use: high, medium, or low' + COLORS.reset);
      return;
    }
    
    addIdea(text, priority, tags);
    return;
  }

  if (cmd === '--help' || cmd === '-h') {
    console.log(`
${COLORS.bold}ideas.js${COLORS.reset} - Idea backlog and project pipeline

${COLORS.bold}Usage:${COLORS.reset}
  ideas                             List active ideas
  ideas "text" [priority] [tags]    Add new idea
  ideas list [filter]               List with filter (backlog/ready/icebox/completed)
  ideas list tag:javascript         List by tag
  ideas list priority:high          List by priority
  ideas show <id>                   Show idea details
  ideas update <id> <field> <val>   Update priority or status
  ideas ready <id>                  Mark as ready to sprint
  ideas plan <id>                   Move to planning
  ideas icebox <id>                 Put on ice
  ideas complete <id>               Mark completed
  ideas promote <id>                Show sprint command for idea
  ideas delete <id>                 Delete (archive) idea
  ideas search <query>              Search text and tags
  ideas stats                       Show pipeline statistics

${COLORS.bold}Examples:${COLORS.reset}
  ideas "Build a CLI for X" high automation,cli
  ideas "Refactor auth" medium backend
  ideas list ready
  ideas ready 5
  ideas complete 3
`);
    return;
  }

  if (cmd === 'list') {
    listIdeas(args[1] || 'active');
    return;
  }

  if (cmd === 'show' && args[1]) {
    showIdea(args[1]);
    return;
  }

  if (cmd === 'update' && args[2] && args[3]) {
    const updates = {};
    updates[args[2]] = args[3];
    updateIdea(args[1], updates);
    return;
  }

  if (cmd === 'ready' && args[1]) {
    updateIdea(args[1], { status: 'ready' });
    return;
  }

  if (cmd === 'plan' && args[1]) {
    updateIdea(args[1], { status: 'planning' });
    return;
  }

  if (cmd === 'icebox' && args[1]) {
    updateIdea(args[1], { status: 'icebox' });
    return;
  }

  if (cmd === 'complete' && args[1]) {
    updateIdea(args[1], { status: 'completed' });
    return;
  }

  if (cmd === 'delete' && args[1]) {
    deleteIdea(args[1]);
    return;
  }

  if (cmd === 'search' && args[1]) {
    searchIdeas(args[1]);
    return;
  }

  if (cmd === 'stats') {
    showStats();
    return;
  }

  if (cmd === 'promote' && args[1]) {
    promoteToSprint(args[1]);
    return;
  }

  console.log(COLORS.red + 'Unknown command. Run "ideas --help" for usage.' + COLORS.reset);
}

main();
