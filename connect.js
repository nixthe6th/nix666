#!/usr/bin/env node
/**
 * connect.js - Discover connections between zettel notes
 * 
 * Finds hidden relationships, suggests links, bridges knowledge gaps.
 * 
 * Usage:
 *   nix connect related <ID>          Find notes related to ID
 *   nix connect orphaned              Find unlinked notes
 *   nix connect bridges               Find notes that bridge clusters
 *   nix connect suggest <ID>          Suggest links for a note
 *   nix connect serendipity           Random surprising connections
 *   nix connect path <ID1> <ID2>      Find path between two notes
 *   nix connect clusters              Show knowledge clusters
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.nix', 'data');
const ZETTEL_FILE = path.join(DATA_DIR, 'zettel.json');
const LINKS_FILE = path.join(DATA_DIR, 'zettel-links.json');

function loadData() {
  const notes = fs.existsSync(ZETTEL_FILE) 
    ? JSON.parse(fs.readFileSync(ZETTEL_FILE, 'utf8')) 
    : [];
  const links = fs.existsSync(LINKS_FILE)
    ? JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'))
    : [];
  return { notes, links };
}

// Build adjacency list for graph operations
function buildGraph(links) {
  const graph = {};
  links.forEach(l => {
    if (!graph[l.from]) graph[l.from] = [];
    if (!graph[l.to]) graph[l.to] = [];
    graph[l.from].push(l.to);
    graph[l.to].push(l.from);
  });
  return graph;
}

// Find notes related by shared tags
function findRelated(noteId, minShared = 1) {
  const { notes, links } = loadData();
  const target = notes.find(n => n.id === noteId);
  
  if (!target) {
    console.log(`Note ${noteId} not found.`);
    return;
  }
  
  const targetTagSet = new Set(target.tags);
  const graph = buildGraph(links);
  const linkedIds = new Set(graph[noteId] || []);
  
  const related = notes
    .filter(n => n.id !== noteId)
    .map(n => {
      const shared = n.tags.filter(t => targetTagSet.has(t));
      return { note: n, sharedTags: shared, isLinked: linkedIds.has(n.id) };
    })
    .filter(r => r.sharedTags.length >= minShared)
    .sort((a, b) => b.sharedTags.length - a.sharedTags.length);
  
  console.log(`\n🔗 Notes related to: "${target.title}"`);
  console.log(`Tags: ${target.tags.map(t => `#${t}`).join(' ') || '(none)'}`);
  console.log('─'.repeat(50));
  
  if (related.length === 0) {
    console.log('No related notes found.');
    return;
  }
  
  related.slice(0, 15).forEach(r => {
    const status = r.isLinked ? '✓' : '○';
    const tags = r.sharedTags.map(t => `#${t}`).join(' ');
    console.log(`${status} ${r.note.id}  ${r.note.title.substring(0, 30).padEnd(32)} ${tags}`);
  });
  
  const unlinked = related.filter(r => !r.isLinked);
  if (unlinked.length > 0) {
    console.log(`\n💡 Suggestion: Link with nix zettel link ${noteId} ${unlinked[0].note.id}`);
  }
}

// Find orphaned notes (no links)
function findOrphaned() {
  const { notes, links } = loadData();
  
  if (notes.length === 0) {
    console.log('No notes yet.');
    return;
  }
  
  const linkedIds = new Set([
    ...links.map(l => l.from), 
    ...links.map(l => l.to)
  ]);
  
  const orphans = notes.filter(n => !linkedIds.has(n.id));
  
  console.log(`\n🌱 Orphaned Notes (${orphans.length}/${notes.length})`);
  console.log('─'.repeat(50));
  
  if (orphans.length === 0) {
    console.log('All notes are connected! 🎉');
    return;
  }
  
  orphans.forEach(n => {
    const tags = n.tags.map(t => `#${t}`).join(' ');
    console.log(`${n.id}  ${n.title.substring(0, 35).padEnd(37)} ${tags}`);
  });
  
  console.log('\n💡 Tip: Use "nix connect suggest <ID>" to find link candidates');
}

// Find bridge notes (connect separate clusters)
function findBridges() {
  const { notes, links } = loadData();
  
  if (links.length < 3) {
    console.log('Need at least 3 links to find bridges.');
    return;
  }
  
  const graph = buildGraph(links);
  
  // Find connected components using BFS
  const visited = new Set();
  const components = [];
  
  notes.forEach(n => {
    if (visited.has(n.id)) return;
    
    const component = [];
    const queue = [n.id];
    visited.add(n.id);
    
    while (queue.length > 0) {
      const current = queue.shift();
      component.push(current);
      
      (graph[current] || []).forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
    
    components.push(component);
  });
  
  console.log(`\n🌉 Knowledge Clusters — ${components.length} groups`);
  console.log('─'.repeat(50));
  
  components.forEach((comp, i) => {
    const sample = comp.slice(0, 3).map(id => {
      const note = notes.find(n => n.id === id);
      return note ? note.title.substring(0, 20) : id;
    }).join(', ');
    console.log(`Cluster ${i + 1}: ${comp.length} notes — ${sample}${comp.length > 3 ? '...' : ''}`);
  });
  
  if (components.length > 1) {
    console.log('\n💡 Tip: Create links between clusters to unify your knowledge');
  }
}

// Suggest links for a specific note
function suggestLinks(noteId) {
  const { notes, links } = loadData();
  const target = notes.find(n => n.id === noteId);
  
  if (!target) {
    console.log(`Note ${noteId} not found.`);
    return;
  }
  
  const graph = buildGraph(links);
  const alreadyLinked = new Set(graph[noteId] || []);
  
  // Score potential connections
  const candidates = notes
    .filter(n => n.id !== noteId && !alreadyLinked.has(n.id))
    .map(n => {
      let score = 0;
      let reasons = [];
      
      // Shared tags (high weight)
      const sharedTags = n.tags.filter(t => target.tags.includes(t));
      if (sharedTags.length > 0) {
        score += sharedTags.length * 3;
        reasons.push(`${sharedTags.length} shared tags`);
      }
      
      // Similar title words
      const targetWords = new Set(target.title.toLowerCase().split(/\s+/));
      const nWords = n.title.toLowerCase().split(/\s+/);
      const sharedWords = nWords.filter(w => targetWords.has(w) && w.length > 3);
      if (sharedWords.length > 0) {
        score += sharedWords.length;
        reasons.push('similar title');
      }
      
      // Created around same time (possible related capture)
      const timeDiff = Math.abs(new Date(target.created) - new Date(n.created));
      if (timeDiff < 1000 * 60 * 60) { // Within 1 hour
        score += 1;
        reasons.push('created together');
      }
      
      return { note: n, score, reasons };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);
  
  console.log(`\n💡 Link Suggestions for: "${target.title}"`);
  console.log('─'.repeat(50));
  
  if (candidates.length === 0) {
    console.log('No strong candidates found. Try adding more tags.');
    return;
  }
  
  candidates.slice(0, 10).forEach(c => {
    console.log(`${c.note.id}  ${c.note.title.substring(0, 30).padEnd(32)} (${c.reasons.join(', ')})`);
  });
  
  if (candidates[0]) {
    console.log(`\n  nix zettel link ${noteId} ${candidates[0].note.id}`);
  }
}

// Find path between two notes
function findPath(fromId, toId) {
  const { notes, links } = loadData();
  const from = notes.find(n => n.id === fromId);
  const to = notes.find(n => n.id === toId);
  
  if (!from || !to) {
    console.log('One or both notes not found.');
    return;
  }
  
  const graph = buildGraph(links);
  
  // BFS to find shortest path
  const queue = [[fromId]];
  const visited = new Set([fromId]);
  
  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    
    if (current === toId) {
      console.log(`\n🛤️  Path found (${path.length - 1} hops):`);
      console.log('─'.repeat(50));
      
      path.forEach((id, i) => {
        const note = notes.find(n => n.id === id);
        const indent = '  '.repeat(i);
        console.log(`${indent}→ ${note ? note.title : id}`);
      });
      return;
    }
    
    (graph[current] || []).forEach(neighbor => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    });
  }
  
  console.log(`\nNo path found between "${from.title}" and "${to.title}"`);
  console.log('Try: nix connect suggest to find linking opportunities');
}

// Serendipity - random connections
function findSerendipity() {
  const { notes, links } = loadData();
  
  if (notes.length < 2) {
    console.log('Need at least 2 notes for serendipity.');
    return;
  }
  
  const graph = buildGraph(links);
  
  // Find pairs with shared tags but no direct link
  const unlinkedPairs = [];
  
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const n1 = notes[i];
      const n2 = notes[j];
      
      const isLinked = (graph[n1.id] || []).includes(n2.id);
      if (isLinked) continue;
      
      const shared = n1.tags.filter(t => n2.tags.includes(t));
      if (shared.length >= 2) {
        unlinkedPairs.push({ n1, n2, sharedTags: shared });
      }
    }
  }
  
  if (unlinkedPairs.length === 0) {
    // Fall back to random pair
    const i = Math.floor(Math.random() * notes.length);
    let j = Math.floor(Math.random() * notes.length);
    while (j === i) j = Math.floor(Math.random() * notes.length);
    
    console.log('\n🎲 Random Connection');
    console.log('─'.repeat(50));
    console.log(`"${notes[i].title}"`);
    console.log(`"${notes[j].title}"`);
    console.log('\nSometimes randomness sparks creativity...');
    return;
  }
  
  // Pick a random pair with shared tags
  const pair = unlinkedPairs[Math.floor(Math.random() * unlinkedPairs.length)];
  
  console.log('\n✨ Serendipitous Connection');
  console.log('─'.repeat(50));
  console.log(`"${pair.n1.title}"`);
  console.log(`"${pair.n2.title}"`);
  console.log(`\nShared: ${pair.sharedTags.map(t => `#${t}`).join(' ')}`);
  console.log(`\n  nix zettel link ${pair.n1.id} ${pair.n2.id}  # Connect them`);
}

// Show tag clusters (notes grouped by tags)
function showTagClusters() {
  const { notes } = loadData();
  
  const tagGroups = {};
  notes.forEach(n => {
    n.tags.forEach(t => {
      if (!tagGroups[t]) tagGroups[t] = [];
      tagGroups[t].push(n);
    });
  });
  
  console.log('\n🏷️  Tag Clusters');
  console.log('─'.repeat(50));
  
  Object.entries(tagGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([tag, tagNotes]) => {
      console.log(`\n#${tag} (${tagNotes.length} notes):`);
      tagNotes.slice(0, 5).forEach(n => {
        console.log(`  • ${n.title}`);
      });
      if (tagNotes.length > 5) {
        console.log(`  ... and ${tagNotes.length - 5} more`);
      }
    });
}

// Main CLI
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'related':
    if (!args[0]) {
      console.log('Usage: nix connect related <note-id>');
    } else {
      findRelated(args[0]);
    }
    break;
    
  case 'orphaned':
    findOrphaned();
    break;
    
  case 'bridges':
    findBridges();
    break;
    
  case 'suggest':
    if (!args[0]) {
      console.log('Usage: nix connect suggest <note-id>');
    } else {
      suggestLinks(args[0]);
    }
    break;
    
  case 'path':
    if (args.length < 2) {
      console.log('Usage: nix connect path <from-id> <to-id>');
    } else {
      findPath(args[0], args[1]);
    }
    break;
    
  case 'serendipity':
    findSerendipity();
    break;
    
  case 'clusters':
    showTagClusters();
    break;
    
  default:
    console.log(`
🕸️  nix connect — Discover connections between notes

Usage:
  nix connect related <ID>          Find notes with shared tags
  nix connect orphaned              Find unlinked notes
  nix connect bridges               Show knowledge clusters
  nix connect suggest <ID>          Suggest links for a note
  nix connect path <ID1> <ID2>      Find path between notes
  nix connect serendipity           Random surprising connections
  nix connect clusters              View notes by tag clusters

Examples:
  nix connect related 2601311423
  nix connect suggest 2601311423
  nix connect path 2601311423 2601311456
  nix connect serendipity
`);
}
