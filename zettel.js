#!/usr/bin/env node
/**
 * zettel.js - Zettelkasten note system for atomic, connected notes
 * 
 * Usage:
 *   nix zettel new "Note title"           # Create new note
 *   nix zettel new "Title" --tag idea     # With tags
 *   nix zettel link ID1 ID2               # Link two notes
 *   nix zettel list                       # List all notes
 *   nix zettel search "keyword"           # Search notes
 *   nix zettel graph                      # Show note graph
 *   nix zettel show ID                    # Show note with backlinks
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.nix', 'data');
const ZETTEL_FILE = path.join(DATA_DIR, 'zettel.json');
const LINKS_FILE = path.join(DATA_DIR, 'zettel-links.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or initialize data
function loadData() {
  const notes = fs.existsSync(ZETTEL_FILE) 
    ? JSON.parse(fs.readFileSync(ZETTEL_FILE, 'utf8')) 
    : [];
  const links = fs.existsSync(LINKS_FILE)
    ? JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'))
    : [];
  return { notes, links };
}

function saveData(notes, links) {
  fs.writeFileSync(ZETTEL_FILE, JSON.stringify(notes, null, 2));
  fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
}

// Generate ID (timestamp-based: YYMMDDHHMMSS)
function generateId() {
  const now = new Date();
  return now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
}

// Format date
function formatDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Create new note
function createNote(title, options = {}) {
  const { notes, links } = loadData();
  const id = generateId();
  
  const note = {
    id,
    title,
    content: options.content || '',
    tags: options.tags || [],
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    links: []
  };
  
  notes.unshift(note);
  saveData(notes, links);
  
  console.log(`\n✓ Created note: ${title}`);
  console.log(`  ID: ${id}`);
  console.log(`  Tags: ${note.tags.join(', ') || '(none)'}`);
  console.log(`\n  nix zettel edit ${id}    # Add content`);
  console.log(`  nix zettel show ${id}    # View note`);
}

// List all notes
function listNotes(tagFilter = null) {
  const { notes } = loadData();
  
  if (notes.length === 0) {
    console.log('No notes yet. Create one with: nix zettel new "Title"');
    return;
  }
  
  let filtered = notes;
  if (tagFilter) {
    filtered = notes.filter(n => n.tags.includes(tagFilter));
    console.log(`\n📚 Zettelkasten — ${filtered.length} notes tagged "${tagFilter}"`);
  } else {
    console.log(`\n📚 Zettelkasten — ${notes.length} atomic notes`);
  }
  console.log('─'.repeat(50));
  
  filtered.slice(0, 20).forEach(note => {
    const tags = note.tags.map(t => `#${t}`).join(' ');
    const date = formatDate(note.created).split(' ')[0];
    console.log(`${note.id}  ${note.title.substring(0, 35).padEnd(37)} ${tags}`);
  });
  
  if (filtered.length > 20) {
    console.log(`\n... and ${filtered.length - 20} more notes`);
  }
  
  console.log('\n  nix zettel show <ID>     # View a note');
  console.log('  nix zettel search <term> # Search content');
}

// Show single note with backlinks
function showNote(id) {
  const { notes, links } = loadData();
  const note = notes.find(n => n.id === id);
  
  if (!note) {
    console.log(`Note ${id} not found.`);
    return;
  }
  
  // Find backlinks
  const backlinks = links
    .filter(l => l.to === id)
    .map(l => notes.find(n => n.id === l.from))
    .filter(Boolean);
  
  // Find outgoing links
  const outgoing = links
    .filter(l => l.from === id)
    .map(l => notes.find(n => n.id === l.to))
    .filter(Boolean);
  
  console.log(`\n┌─ ${note.title}`);
  console.log(`│ ID: ${note.id}  |  ${formatDate(note.created)}`);
  if (note.tags.length) {
    console.log(`│ Tags: ${note.tags.map(t => `#${t}`).join(' ')}`);
  }
  console.log('│');
  
  if (note.content) {
    const lines = note.content.split('\n').slice(0, 10);
    lines.forEach(line => console.log(`│ ${line.substring(0, 60)}`));
    if (note.content.split('\n').length > 10) {
      console.log('│ ...');
    }
  } else {
    console.log('│ (no content yet)');
  }
  
  if (outgoing.length) {
    console.log('│');
    console.log(`│ → Links to: ${outgoing.map(n => `${n.title} (${n.id})`).join(', ')}`);
  }
  
  if (backlinks.length) {
    console.log('│');
    console.log(`│ ← Linked from:`);
    backlinks.forEach(n => console.log(`│    • ${n.title} (${n.id})`));
  }
  
  console.log('└─');
}

// Search notes
function searchNotes(term) {
  const { notes } = loadData();
  const lower = term.toLowerCase();
  
  const matches = notes.filter(n => 
    n.title.toLowerCase().includes(lower) ||
    (n.content && n.content.toLowerCase().includes(lower)) ||
    n.tags.some(t => t.toLowerCase().includes(lower))
  );
  
  console.log(`\n🔍 Search: "${term}" — ${matches.length} results`);
  console.log('─'.repeat(50));
  
  matches.slice(0, 15).forEach(note => {
    const tags = note.tags.map(t => `#${t}`).join(' ');
    console.log(`${note.id}  ${note.title.substring(0, 35).padEnd(37)} ${tags}`);
  });
}

// Link two notes
function linkNotes(fromId, toId) {
  const { notes, links } = loadData();
  
  const from = notes.find(n => n.id === fromId);
  const to = notes.find(n => n.id === toId);
  
  if (!from || !to) {
    console.log('One or both notes not found.');
    return;
  }
  
  // Check if link already exists
  if (links.some(l => l.from === fromId && l.to === toId)) {
    console.log('These notes are already linked.');
    return;
  }
  
  links.push({
    from: fromId,
    to: toId,
    created: new Date().toISOString()
  });
  
  saveData(notes, links);
  console.log(`✓ Linked: "${from.title}" → "${to.title}"`);
}

// Show graph of connections
function showGraph() {
  const { notes, links } = loadData();
  
  if (notes.length === 0) {
    console.log('No notes to graph.');
    return;
  }
  
  console.log(`\n🕸️  Zettelkasten Graph — ${notes.length} notes, ${links.length} links`);
  console.log('─'.repeat(50));
  
  // Find hub notes (most connected)
  const hubScores = {};
  links.forEach(l => {
    hubScores[l.from] = (hubScores[l.from] || 0) + 1;
    hubScores[l.to] = (hubScores[l.to] || 0) + 1;
  });
  
  const hubs = Object.entries(hubScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (hubs.length) {
    console.log('\nHub notes (most connected):');
    hubs.forEach(([id, count]) => {
      const note = notes.find(n => n.id === id);
      console.log(`  ${count} links — ${note ? note.title : id}`);
    });
  }
  
  // Show orphaned notes (no links)
  const linkedIds = new Set([...links.map(l => l.from), ...links.map(l => l.to)]);
  const orphans = notes.filter(n => !linkedIds.has(n.id));
  
  if (orphans.length) {
    console.log(`\nOrphaned notes (${orphans.length} — consider linking):`);
    orphans.slice(0, 5).forEach(n => {
      console.log(`  ${n.id}  ${n.title}`);
    });
  }
  
  // Tag summary
  const tagCounts = {};
  notes.forEach(n => {
    n.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  if (sortedTags.length) {
    console.log('\nTag cloud:');
    sortedTags.slice(0, 10).forEach(([tag, count]) => {
      console.log(`  #${tag}: ${count}`);
    });
  }
}

// Get tags
function listTags() {
  const { notes } = loadData();
  const tagCounts = {};
  notes.forEach(n => {
    n.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  
  console.log('\n🏷️  All Tags');
  console.log('─'.repeat(30));
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`  #${tag.padEnd(15)} ${count} notes`);
    });
}

// Main CLI
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'new':
    const title = args.join(' ');
    if (!title) {
      console.log('Usage: nix zettel new "Note title"');
      process.exit(1);
    }
    // Parse --tag options
    const tags = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--tag' && args[i + 1]) {
        tags.push(args[i + 1]);
        i++;
      }
    }
    const cleanTitle = title.replace(/--tag\s+\S+/g, '').trim();
    createNote(cleanTitle, { tags });
    break;
    
  case 'list':
    listNotes(args[0]);
    break;
    
  case 'show':
    if (!args[0]) {
      console.log('Usage: nix zettel show <ID>');
    } else {
      showNote(args[0]);
    }
    break;
    
  case 'search':
    if (!args[0]) {
      console.log('Usage: nix zettel search <term>');
    } else {
      searchNotes(args.join(' '));
    }
    break;
    
  case 'link':
    if (args.length < 2) {
      console.log('Usage: nix zettel link <from-id> <to-id>');
    } else {
      linkNotes(args[0], args[1]);
    }
    break;
    
  case 'graph':
    showGraph();
    break;
    
  case 'tags':
    listTags();
    break;
    
  default:
    console.log(`
📚 Zettelkasten — Atomic, connected notes

Usage:
  nix zettel new "Title" --tag concept    Create new note
  nix zettel list                         List all notes
  nix zettel list concept                 List by tag
  nix zettel show <ID>                    View note + backlinks
  nix zettel search <term>                Search notes
  nix zettel link <ID1> <ID2>             Connect two notes
  nix zettel graph                        View knowledge graph
  nix zettel tags                         List all tags

Examples:
  nix zettel new "Feynman Technique" --tag learning
  nix zettel new "Second Brain" --tag productivity --tag books
  nix zettel link 2601311423 2601311456
  nix zettel search "productivity"
`);
}
