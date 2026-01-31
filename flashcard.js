#!/usr/bin/env node
/**
 * flashcard.js — CLI flashcard system for memorization
 * Learn anything with spaced repetition flashcards
 * 
 * Usage: nix flashcard [command] [args]
 * 
 * Commands:
 *   add [deck] [front] [back]     Create a new flashcard
 *   review [deck]                 Review due cards
 *   list [deck]                   List all cards
 *   stats [deck]                  Show deck statistics
 *   delete <id>                   Delete a card
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'flashcards.json');

// SM-2 Spaced Repetition intervals (simplified)
const INTERVALS = [1, 3, 7, 14, 30, 60, 90, 180];

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
  if (!fs.existsSync(DATA_FILE)) {
    return { cards: [], decks: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// Create a new flashcard
function addCard(deck, front, back) {
  if (!deck || !front || !back) {
    console.log(`\n  ${C.red}✗ Usage: nix flashcard add "deck" "front text" "back text"${C.reset}\n`);
    process.exit(1);
  }

  const data = loadData();
  
  const card = {
    id: generateId(),
    deck: deck.toLowerCase(),
    front: front,
    back: back,
    created: getToday(),
    level: 0, // 0-7 mastery level
    nextReview: getToday(),
    reviewCount: 0,
    correctCount: 0,
    streak: 0
  };
  
  data.cards.push(card);
  
  // Update deck stats
  if (!data.decks[deck.toLowerCase()]) {
    data.decks[deck.toLowerCase()] = { name: deck, created: getToday() };
  }
  
  saveData(data);
  
  console.log(`\n  ${C.green}✓ Card added to ${C.bold}${deck}${C.reset}`);
  console.log(`  ${C.cyan}Q: ${front}${C.reset}`);
  console.log(`  ${C.gray}A: ${back}${C.reset}`);
  console.log(`  ${C.dim}ID: ${card.id}${C.reset}\n`);
}

// Get cards due for review
function getDueCards(data, deck = null) {
  const today = getToday();
  return data.cards.filter(c => {
    if (deck && c.deck.toLowerCase() !== deck.toLowerCase()) return false;
    return c.nextReview <= today;
  });
}

// Review flashcards
async function reviewCards(deck = null) {
  const data = loadData();
  const due = getDueCards(data, deck);
  
  if (due.length === 0) {
    const deckMsg = deck ? ` in ${deck}` : '';
    console.log(`\n  ${C.green}✓ No cards due${deckMsg}!${C.reset}`);
    console.log(`  ${C.dim}Check back tomorrow or add more cards.${C.reset}\n`);
    return;
  }
  
  // Shuffle due cards
  const shuffled = due.sort(() => Math.random() - 0.5);
  
  console.log(`\n  ${C.bold}🔥 Review Session${C.reset}`);
  console.log(`  ${C.gray}${shuffled.length} card${shuffled.length > 1 ? 's' : ''} due${deck ? ` in ${deck}` : ''}\n`);
  
  let correct = 0;
  let total = 0;
  
  for (const card of shuffled) {
    total++;
    
    // Show card front
    console.log(`  ${C.cyan}┌${'─'.repeat(50)}┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bold}DECK:${C.reset} ${card.deck.padEnd(43)}${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├${'─'.repeat(50)}┤${C.reset}`);
    
    const lines = wrapText(card.front, 48);
    lines.forEach(line => {
      console.log(`  ${C.cyan}│${C.reset} ${line.padEnd(48)} ${C.cyan}│${C.reset}`);
    });
    
    console.log(`  ${C.cyan}└${'─'.repeat(50)}┘${C.reset}\n`);
    
    // Wait for user to reveal
    console.log(`  ${C.dim}Press Enter to reveal answer...${C.reset}`);
    await waitForEnter();
    
    // Show back
    console.log(`  ${C.yellow}┌${'─'.repeat(50)}┐${C.reset}`);
    const backLines = wrapText(card.back, 48);
    backLines.forEach(line => {
      console.log(`  ${C.yellow}│${C.reset} ${line.padEnd(48)} ${C.yellow}│${C.reset}`);
    });
    console.log(`  ${C.yellow}└${'─'.repeat(50)}┘${C.reset}\n`);
    
    // Get user rating
    console.log(`  ${C.gray}How well did you know this?${C.reset}`);
    console.log(`  ${C.red}[1]${C.reset} Again  ${C.yellow}[2]${C.reset} Hard  ${C.green}[3]${C.reset} Good  ${C.blue}[4]${C.reset} Easy`);
    console.log(`  ${C.dim}(Press 1-4, or q to quit)${C.reset}`);
    
    const rating = await getRating();
    
    if (rating === 'q') {
      console.log(`\n  ${C.dim}Review session ended.${C.reset}\n`);
      break;
    }
    
    // Update card based on rating
    if (rating >= 3) {
      correct++;
      card.streak++;
      card.correctCount++;
      if (card.level < INTERVALS.length - 1) card.level++;
    } else {
      card.streak = 0;
      if (rating === 1) card.level = 0;
    }
    
    card.reviewCount++;
    
    // Calculate next review date
    const days = INTERVALS[card.level];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    card.nextReview = nextDate.toISOString().split('T')[0];
    
    // Save after each card
    saveData(data);
    
    const feedback = rating === 1 ? `${C.red}Again — reset${C.reset}` : 
                     rating === 2 ? `${C.yellow}Hard — keep practicing${C.reset}` :
                     rating === 3 ? `${C.green}Good!${C.reset}` : `${C.blue}Easy!${C.reset}`;
    
    console.log(`  ${feedback} • Next: ${card.nextReview} (${days}d)`);
    console.log(`  ${C.dim}Streak: ${'🔥'.repeat(Math.min(card.streak, 5)) || '○'}${C.reset}\n`);
  }
  
  // Session summary
  console.log(`  ${C.bold}📊 Session Complete${C.reset}`);
  console.log(`  ${C.green}Correct: ${correct}/${total}${C.reset}`);
  console.log(`  ${C.gray}Accuracy: ${total > 0 ? Math.round((correct/total) * 100) : 0}%${C.reset}\n`);
}

function wrapText(text, width) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  
  for (const word of words) {
    if (current.length + word.length + 1 <= width) {
      current += (current ? ' ' : '') + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function waitForEnter() {
  return new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
}

function getRating() {
  return new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', key => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      const char = key.toString();
      if (char === 'q' || char === 'Q') resolve('q');
      else if (char >= '1' && char <= '4') resolve(parseInt(char));
      else resolve(getRating()); // Retry
    });
  });
}

// List all cards
function listCards(deck = null) {
  const data = loadData();
  let cards = data.cards;
  
  if (deck) {
    cards = cards.filter(c => c.deck.toLowerCase() === deck.toLowerCase());
  }
  
  if (cards.length === 0) {
    console.log(`\n  ${C.yellow}No cards found.${C.reset}`);
    console.log(`  ${C.dim}Add one: nix flashcard add "deck" "Q" "A"${C.reset}\n`);
    return;
  }
  
  // Group by deck
  const byDeck = {};
  cards.forEach(c => {
    if (!byDeck[c.deck]) byDeck[c.deck] = [];
    byDeck[c.deck].push(c);
  });
  
  console.log(`\n  ${C.bold}🗂️  Flashcards${C.reset}\n`);
  
  for (const [deckName, deckCards] of Object.entries(byDeck)) {
    console.log(`  ${C.bold}${deckName}${C.reset} (${deckCards.length} cards)`);
    
    deckCards.forEach(card => {
      const isDue = card.nextReview <= getToday();
      const dueIcon = isDue ? `${C.red}●${C.reset}` : `${C.dim}○${C.reset}`;
      const levelDots = '●'.repeat(card.level) + '○'.repeat(7 - card.level);
      
      console.log(`    ${dueIcon} ${C.gray}[${card.id}]${C.reset} ${card.front.substring(0, 35)}${card.front.length > 35 ? '...' : ''}`);
      console.log(`       ${C.gray}Level: ${levelDots} | Reviews: ${card.reviewCount}${C.reset}`);
    });
    console.log();
  }
}

// Show statistics
function showStats(deck = null) {
  const data = loadData();
  const today = getToday();
  
  let cards = data.cards;
  if (deck) {
    cards = cards.filter(c => c.deck.toLowerCase() === deck.toLowerCase());
  }
  
  if (cards.length === 0) {
    console.log(`\n  ${C.yellow}No cards to analyze.${C.reset}\n`);
    return;
  }
  
  const total = cards.length;
  const dueToday = cards.filter(c => c.nextReview <= today).length;
  const mastered = cards.filter(c => c.level >= 5).length;
  const totalReviews = cards.reduce((sum, c) => sum + c.reviewCount, 0);
  
  console.log(`\n  ${C.bold}📊 Flashcard Stats${deck ? ` — ${deck}` : ''}${C.reset}\n`);
  console.log(`  ${C.cyan}Total Cards:${C.reset}       ${total}`);
  console.log(`  ${C.yellow}Due Today:${C.reset}         ${dueToday}`);
  console.log(`  ${C.green}Mastered:${C.reset}          ${mastered} (${Math.round((mastered/total)*100)}%)`);
  console.log(`  ${C.blue}Total Reviews:${C.reset}     ${totalReviews}`);
  
  // Deck breakdown
  if (!deck) {
    console.log(`\n  ${C.bold}By Deck:${C.reset}`);
    const byDeck = {};
    cards.forEach(c => {
      if (!byDeck[c.deck]) byDeck[c.deck] = { count: 0, due: 0 };
      byDeck[c.deck].count++;
      if (c.nextReview <= today) byDeck[c.deck].due++;
    });
    
    for (const [name, stats] of Object.entries(byDeck)) {
      const dueStr = stats.due > 0 ? `${C.red}${stats.due} due${C.reset}` : `${C.gray}0 due${C.reset}`;
      console.log(`    ${name}: ${stats.count} cards (${dueStr})`);
    }
  }
  
  console.log();
}

// Delete a card
function deleteCard(id) {
  const data = loadData();
  const idx = data.cards.findIndex(c => c.id === id);
  
  if (idx === -1) {
    console.log(`\n  ${C.red}✗ Card not found: ${id}${C.reset}\n`);
    return;
  }
  
  const card = data.cards[idx];
  data.cards.splice(idx, 1);
  saveData(data);
  
  console.log(`\n  ${C.gray}✓ Deleted: ${card.front.substring(0, 40)}${C.reset}\n`);
}

// Show help
function showHelp() {
  console.log(`
  ${C.bold}🗂️  nix flashcard — CLI flashcard system${C.reset}

  ${C.bold}Commands:${C.reset}
    add <deck> <front> <back>   Create a new flashcard
    review [deck]               Review due cards (interactive)
    list [deck]                 List all cards
    stats [deck]                Show statistics
    delete <id>                 Delete a card by ID

  ${C.bold}Examples:${C.reset}
    nix flashcard add "Spanish" "Hello" "Hola"
    nix flashcard add "JS Interview" "What is a closure?" "Function + its lexical scope"
    nix flashcard review
    nix flashcard review Spanish
    nix flashcard list
    nix flashcard stats

  ${C.gray}Spaced repetition: Cards return at increasing intervals${C.reset}
  ${C.gray}until mastered. Daily reviews = maximum retention.${C.reset}
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'add':
      addCard(args[1], args[2], args[3]);
      break;
      
    case 'review':
      await reviewCards(args[1]);
      process.exit(0);
      break;
      
    case 'list':
    case 'ls':
      listCards(args[1]);
      break;
      
    case 'stats':
    case 'stat':
      showStats(args[1]);
      break;
      
    case 'delete':
    case 'rm':
      if (!args[1]) {
        console.log(`\n  ${C.red}✗ Usage: nix flashcard delete <id>${C.reset}\n`);
        process.exit(1);
      }
      deleteCard(args[1]);
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
