#!/usr/bin/env node

/**
 * nix sentiment - Analyze emotional tone from journal entries and notes
 * 
 * Usage:
 *   nix sentiment analyze           # Analyze recent entries
 *   nix sentiment analyze --days 7  # Analyze last 7 days
 *   nix sentiment trend             # Show sentiment over time
 *   nix sentiment tag               # Auto-tag notes by sentiment
 */

const fs = require('fs');
const path = require('path');

// Simple sentiment dictionary (positive/negative words)
// In production, this would use a proper NLP model
const sentimentDict = {
  positive: [
    'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful',
    'love', 'happy', 'joy', 'excited', 'proud', 'confident', 'strong', 'energy',
    'productive', 'focused', 'clear', 'motivated', 'inspired', 'grateful',
    'success', 'win', 'achieved', 'completed', 'progress', 'growth', 'learned',
    'beautiful', 'perfect', 'best', 'better', 'improved', 'optimistic', 'hopeful',
    'calm', 'peaceful', 'relaxed', 'rested', 'healthy', 'fit', 'strong'
  ],
  negative: [
    'bad', 'terrible', 'awful', 'horrible', 'hate', 'sad', 'depressed', 'anxious',
    'worried', 'stressed', 'overwhelmed', 'frustrated', 'angry', 'disappointed',
    'tired', 'exhausted', 'burned', 'unmotivated', 'stuck', 'lost', 'confused',
    'failure', 'fail', 'lost', 'missed', 'regret', 'sorry', 'blame', 'guilt',
    'worse', 'worst', 'declining', 'pessimistic', 'hopeless', 'difficult', 'hard',
    'struggle', 'pain', 'hurt', 'sick', 'unwell', 'weak', 'lazy'
  ],
  intensifiers: [
    'very', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally',
    'really', 'so', 'quite', 'pretty', 'fairly', 'somewhat', 'slightly'
  ],
  negations: [
    'not', 'no', 'never', 'none', 'nobody', 'nothing', 'neither', 'nowhere',
    "don't", "doesn't", "didn't", "won't", "wouldn't", "shouldn't", "couldn't",
    "can't", "isn't", "aren't", "wasn't", "weren't"
  ]
};

// Configuration
const DATA_DIR = path.join(process.env.HOME, '.nix666');
const ZETTEL_FILE = path.join(DATA_DIR, 'zettel.json');
const STANDUP_FILE = path.join(DATA_DIR, 'standup.json');
const MOOD_FILE = path.join(DATA_DIR, 'mood.json');

function loadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function analyzeSentiment(text) {
  const tokens = tokenize(text);
  let score = 0;
  let wordCount = 0;
  let positiveWords = [];
  let negativeWords = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prevToken = i > 0 ? tokens[i - 1] : null;
    let multiplier = 1;
    
    // Check for intensifiers
    if (prevToken && sentimentDict.intensifiers.includes(prevToken)) {
      multiplier = 1.5;
    }
    
    // Check for negations (look back 2 words)
    const hasNegation = [tokens[i-2], tokens[i-1]].some(t => 
      t && sentimentDict.negations.includes(t)
    );
    
    if (sentimentDict.positive.includes(token)) {
      const points = hasNegation ? -1 * multiplier : 1 * multiplier;
      score += points;
      wordCount++;
      positiveWords.push(token);
    } else if (sentimentDict.negative.includes(token)) {
      const points = hasNegation ? 1 * multiplier : -1 * multiplier;
      score += points;
      wordCount++;
      negativeWords.push(token);
    }
  }
  
  // Normalize to -1 to 1 range
  const normalizedScore = wordCount > 0 ? score / Math.sqrt(wordCount) : 0;
  const clampedScore = Math.max(-1, Math.min(1, normalizedScore));
  
  return {
    score: clampedScore,
    magnitude: Math.abs(score),
    positiveWords,
    negativeWords,
    wordCount
  };
}

function getSentimentLabel(score) {
  if (score >= 0.6) return { label: 'Very Positive', emoji: '😄', color: '\x1b[32m' };
  if (score >= 0.2) return { label: 'Positive', emoji: '🙂', color: '\x1b[92m' };
  if (score > -0.2) return { label: 'Neutral', emoji: '😐', color: '\x1b[90m' };
  if (score > -0.6) return { label: 'Negative', emoji: '🙁', color: '\x1b[93m' };
  return { label: 'Very Negative', emoji: '😞', color: '\x1b[91m' };
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

function analyzeRecent(days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  // Load all data sources
  const zettel = loadJson(ZETTEL_FILE);
  const standups = loadJson(STANDUP_FILE);
  
  const entries = [];
  
  // Process zettel notes
  zettel.forEach(note => {
    if (!note.created) return;
    const noteDate = new Date(note.created);
    if (noteDate >= cutoff) {
      entries.push({
        date: note.created,
        source: 'zettel',
        content: note.content || '',
        title: note.title || ''
      });
    }
  });
  
  // Process standup entries
  standups.forEach(standup => {
    if (!standup.date) return;
    const standupDate = new Date(standup.date);
    if (standupDate >= cutoff) {
      const content = [
        standup.wins || '',
        standup.blockers || '',
        standup.notes || ''
      ].join(' ');
      entries.push({
        date: standup.date,
        source: 'standup',
        content: content,
        title: `Standup ${formatDate(standup.date)}`
      });
    }
  });
  
  // Sort by date
  entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Analyze each entry
  const analyzed = entries.map(entry => {
    const analysis = analyzeSentiment(entry.content);
    return { ...entry, ...analysis };
  });
  
  return analyzed;
}

function showAnalysis(days) {
  console.log('\n📊 Sentiment Analysis\n');
  console.log(`Analyzing last ${days} days of journal entries...\n`);
  
  const entries = analyzeRecent(days);
  
  if (entries.length === 0) {
    console.log('No entries found. Try logging some notes or standups first!');
    console.log('\nSuggestions:');
    console.log('  nix zettel new "My thoughts today..."');
    console.log('  nix standup');
    return;
  }
  
  // Calculate aggregate stats
  const avgScore = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;
  const positiveEntries = entries.filter(e => e.score > 0.2).length;
  const negativeEntries = entries.filter(e => e.score < -0.2).length;
  const neutralEntries = entries.length - positiveEntries - negativeEntries;
  
  const sentiment = getSentimentLabel(avgScore);
  const resetColor = '\x1b[0m';
  
  console.log('═'.repeat(50));
  console.log(`Overall: ${sentiment.color}${sentiment.emoji} ${sentiment.label}${resetColor}`);
  console.log(`Average Score: ${avgScore > 0 ? '+' : ''}${avgScore.toFixed(2)}`);
  console.log(`Entries Analyzed: ${entries.length}`);
  console.log('═'.repeat(50));
  console.log();
  
  // Distribution
  console.log('Distribution:');
  const posBar = '█'.repeat(Math.round(positiveEntries / entries.length * 20));
  const neuBar = '█'.repeat(Math.round(neutralEntries / entries.length * 20));
  const negBar = '█'.repeat(Math.round(negativeEntries / entries.length * 20));
  console.log(`  😄 Positive:  ${posBar.padEnd(20)} ${positiveEntries}`);
  console.log(`  😐 Neutral:   ${neuBar.padEnd(20)} ${neutralEntries}`);
  console.log(`  😞 Negative:  ${negBar.padEnd(20)} ${negativeEntries}`);
  console.log();
  
  // Recent entries detail
  console.log('Recent Entries:');
  console.log('-'.repeat(50));
  
  entries.slice(-5).forEach(entry => {
    const s = getSentimentLabel(entry.score);
    const preview = entry.content.slice(0, 50).replace(/\n/g, ' ');
    const date = formatDate(entry.date);
    console.log(`${date} ${s.emoji} ${preview.padEnd(50)} ${entry.score > 0 ? '+' : ''}${entry.score.toFixed(2)}`);
  });
  
  console.log();
  
  // Key themes (most frequent sentiment words)
  const allPositive = entries.flatMap(e => e.positiveWords);
  const allNegative = entries.flatMap(e => e.negativeWords);
  
  if (allPositive.length > 0) {
    const topPositive = countWords(allPositive).slice(0, 3);
    console.log(`Positive themes: ${topPositive.map(w => w.word).join(', ')}`);
  }
  
  if (allNegative.length > 0) {
    const topNegative = countWords(allNegative).slice(0, 3);
    console.log(`Challenges: ${topNegative.map(w => w.word).join(', ')}`);
  }
  
  console.log();
  console.log('💡 Tip: Run `nix sentiment trend` to see patterns over time');
}

function countWords(words) {
  const counts = {};
  words.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

function showTrend() {
  console.log('\n📈 Sentiment Trend\n');
  
  const entries = analyzeRecent(30);
  
  if (entries.length < 3) {
    console.log('Need more data for trend analysis (3+ entries recommended).');
    return;
  }
  
  // Group by day
  const byDay = {};
  entries.forEach(e => {
    const day = e.date.split('T')[0];
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e.score);
  });
  
  const dailyAverages = Object.entries(byDay).map(([day, scores]) => ({
    day,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length
  }));
  
  console.log('Last 30 days (daily average):');
  console.log();
  
  // Simple ASCII chart
  const chartHeight = 10;
  const min = -1, max = 1;
  const range = max - min;
  
  dailyAverages.slice(-14).forEach(({ day, avg }) => {
    const barLength = Math.round((avg - min) / range * 20);
    const bar = '█'.repeat(Math.max(0, barLength));
    const date = day.slice(5);
    const s = getSentimentLabel(avg);
    console.log(`${date} ${s.emoji} ${bar.padEnd(20)} ${avg > 0 ? '+' : ''}${avg.toFixed(2)}`);
  });
  
  // Calculate trend direction
  const firstWeek = dailyAverages.slice(0, 7).reduce((s, d) => s + d.avg, 0) / 7;
  const lastWeek = dailyAverages.slice(-7).reduce((s, d) => s + d.avg, 0) / 7;
  const change = lastWeek - firstWeek;
  
  console.log();
  if (change > 0.2) {
    console.log('📈 Trend: Improving (+' + change.toFixed(2) + ')');
  } else if (change < -0.2) {
    console.log('📉 Trend: Declining (' + change.toFixed(2) + ')');
  } else {
    console.log('➡️  Trend: Stable');
  }
}

function showHelp() {
  console.log(`
Usage: nix sentiment <command> [options]

Commands:
  analyze [days]     Analyze sentiment of recent entries (default: 7 days)
  trend              Show sentiment trend over time
  help               Show this help message

Examples:
  nix sentiment analyze          # Analyze last 7 days
  nix sentiment analyze 14       # Analyze last 14 days
  nix sentiment trend            # View trend chart

Data Sources:
  • Zettel notes (nix zettel)
  • Standup entries (nix standup)

Note: This uses a simple dictionary-based approach. For production use,
consider integrating a proper NLP model like TensorFlow.js or using an
LLM API for more nuanced analysis.
`);
}

// Main
const args = process.argv.slice(2);
const command = args[0] || 'analyze';

switch (command) {
  case 'analyze':
    const days = parseInt(args[1]) || 7;
    showAnalysis(days);
    break;
  case 'trend':
    showTrend();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
