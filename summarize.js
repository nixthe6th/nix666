#!/usr/bin/env node
/**
 * summarize.js - Text summarizer
 * Extractive summarization for articles, notes, and long text
 * 
 * Usage:
 *   nix summarize <file>              Summarize file content
 *   nix summarize --text "..."        Summarize provided text
 *   nix summarize --url <url>         Summarize webpage content (fetched)
 *   nix summarize <file> --sentences 5  Limit to 5 sentences
 *   nix summarize <file> --percent 20   Get top 20% of sentences
 *   echo "text" | nix summarize         Read from stdin
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

// Simple extractive summarization using sentence scoring
class Summarizer {
  constructor() {
    this.stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'and', 'but', 'if', 'or', 'because',
      'until', 'while', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
      'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
      'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
      'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
      'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'whose',
      'which', 'whichever', 'whoever', 'whomever'
    ]);
  }

  // Tokenize text into sentences
  tokenizeSentences(text) {
    // Handle common sentence endings, preserving abbreviations roughly
    return text
      .replace(/([.!?])(\s+)(?=[A-Z])/g, "$1\n")
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.split(' ').length > 3);
  }

  // Tokenize into words
  tokenizeWords(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1 && !this.stopWords.has(w));
  }

  // Calculate word frequency
  getWordFrequency(words) {
    const freq = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });
    return freq;
  }

  // Score a sentence based on word frequency
  scoreSentence(sentence, wordFreq) {
    const words = this.tokenizeWords(sentence);
    if (words.length === 0) return 0;
    
    let score = 0;
    words.forEach(word => {
      score += wordFreq[word] || 0;
    });
    
    // Normalize by sentence length to avoid bias toward long sentences
    return score / words.length;
  }

  // Main summarize function
  summarize(text, options = {}) {
    const sentences = this.tokenizeSentences(text);
    
    if (sentences.length <= 3) {
      return sentences.join(' ');
    }

    // Get all words for frequency calculation
    const allWords = this.tokenizeWords(text);
    const wordFreq = this.getWordFrequency(allWords);

    // Score each sentence
    const scored = sentences.map((sentence, index) => ({
      sentence,
      index,
      score: this.scoreSentence(sentence, wordFreq)
    }));

    // Determine how many sentences to return
    let numSentences = options.sentences || Math.ceil(sentences.length * 0.2);
    if (options.percent) {
      numSentences = Math.ceil(sentences.length * (options.percent / 100));
    }
    numSentences = Math.max(1, Math.min(numSentences, sentences.length));

    // Get top sentences and sort by original position
    const topSentences = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, numSentences)
      .sort((a, b) => a.index - b.index)
      .map(item => item.sentence);

    return {
      summary: topSentences.join(' '),
      originalSentences: sentences.length,
      summarySentences: numSentences,
      compressionRatio: ((1 - numSentences / sentences.length) * 100).toFixed(0)
    };
  }
}

// Fetch URL content (simple)
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Strip HTML tags
function stripHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract main content (naive approach - get longest paragraphs)
function extractContent(text) {
  const paragraphs = text
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 50);
  
  if (paragraphs.length === 0) return text;
  
  // Return paragraphs, prioritizing longer ones
  return paragraphs
    .sort((a, b) => b.length - a.length)
    .slice(0, 20)
    .join('\n\n');
}

// Show help
function showHelp() {
  console.log(`
⚡ nix summarize — Text summarizer

Usage:
  nix summarize <file>                  Summarize file content
  nix summarize --text "long text..."   Summarize provided text
  nix summarize --url <url>             Summarize webpage (basic)
  nix summarize <file> -n 5             Limit to 5 sentences
  nix summarize <file> -p 20            Get top 20% of sentences
  cat article.txt | nix summarize       Read from stdin

Options:
  -n, --sentences <num>   Number of sentences in summary
  -p, --percent <num>     Percentage of original to keep
  -t, --text <text>       Text to summarize directly
  -u, --url <url>         Fetch and summarize URL

Examples:
  nix summarize article.txt
  nix summarize notes.md -n 3
  nix summarize report.txt -p 15
  nix summarize --text "Long text to summarize..."
`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Parse options
  let options = {
    sentences: null,
    percent: null,
    text: null,
    url: null,
    file: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help' || arg === 'help') {
      showHelp();
      process.exit(0);
    } else if (arg === '-n' || arg === '--sentences') {
      options.sentences = parseInt(args[++i], 10);
    } else if (arg === '-p' || arg === '--percent') {
      options.percent = parseInt(args[++i], 10);
    } else if (arg === '-t' || arg === '--text') {
      options.text = args[++i];
    } else if (arg === '-u' || arg === '--url') {
      options.url = args[++i];
    } else if (!arg.startsWith('-') && !options.file) {
      options.file = arg;
    }
  }

  let text = '';

  // Get text from appropriate source
  if (options.text) {
    text = options.text;
  } else if (options.url) {
    try {
      console.log(`Fetching ${options.url}...`);
      const html = await fetchUrl(options.url);
      text = extractContent(stripHtml(html));
      console.log(`Content extracted: ${text.length} chars\n`);
    } catch (err) {
      console.error(`Error fetching URL: ${err.message}`);
      process.exit(1);
    }
  } else if (options.file) {
    if (!fs.existsSync(options.file)) {
      console.error(`File not found: ${options.file}`);
      process.exit(1);
    }
    text = fs.readFileSync(options.file, 'utf8');
  } else {
    // Try stdin
    const chunks = [];
    if (!process.stdin.isTTY) {
      process.stdin.setEncoding('utf8');
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      text = chunks.join('');
    }
  }

  if (!text.trim()) {
    console.error('No text provided. Use --text, --url, <file>, or pipe from stdin.');
    showHelp();
    process.exit(1);
  }

  // Clean text
  text = text
    .replace(/\[\d+\]/g, '') // Remove citation markers like [1], [2]
    .replace(/\s+/g, ' ')
    .trim();

  // Summarize
  const summarizer = new Summarizer();
  const result = summarizer.summarize(text, options);

  // Output
  console.log('\n📝 Summary\n' + '─'.repeat(50));
  console.log(result.summary);
  console.log('─'.repeat(50));
  console.log(`\n📊 Stats: ${result.summarySentences}/${result.originalSentences} sentences (${result.compressionRatio}% reduction)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
