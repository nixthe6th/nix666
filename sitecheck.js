#!/usr/bin/env node
/**
 * sitecheck.js - Quick site health validator
 * Validates JSON files, checks links, reports status
 * Usage: node sitecheck.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let exitCode = 0;

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function checkJSON(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    JSON.parse(content);
    log(`  ✅ ${file}`, 'green');
    return true;
  } catch (e) {
    log(`  ❌ ${file}: ${e.message}`, 'red');
    exitCode = 1;
    return false;
  }
}

function checkFileExists(file) {
  if (fs.existsSync(file)) {
    return true;
  }
  log(`  ❌ Missing: ${file}`, 'red');
  exitCode = 1;
  return false;
}

function extractLinks(html) {
  const links = [];
  const regex = /href="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return links;
}

function validateLinks(htmlFile, baseDir) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const links = extractLinks(html);
  const issues = [];

  for (const link of links) {
    // Skip external links
    if (link.startsWith('http') || link.startsWith('//') || link.startsWith('#') || link.startsWith('mailto:')) {
      continue;
    }
    // Skip root links
    if (link === '/') continue;
    // Skip data URIs
    if (link.startsWith('data:')) continue;
    // Skip template literals (JS templates in HTML)
    if (link.includes('${')) continue;

    const fullPath = path.join(baseDir, link);
    if (!fs.existsSync(fullPath)) {
      issues.push(link);
    }
  }

  return issues;
}

// Main
log('🔍 NIX Site Check', 'blue');
log('');

// Check JSON files
log('JSON Validation:', 'blue');
const jsonFiles = [
  'projects.json',
  'bookmarks.json',
  'quotes.json',
  'manifest.json'
];

for (const file of jsonFiles) {
  checkJSON(file);
}

log('');

// Check core files exist
log('Core Files:', 'blue');
const coreFiles = [
  'index.html',
  'now.html',
  'projects.html',
  'sprints.html',
  'tools.html',
  'bookmarks.html',
  'sitemap.xml',
  'robots.txt'
];

for (const file of coreFiles) {
  if (checkFileExists(file)) {
    log(`  ✅ ${file}`, 'green');
  }
}

log('');

// Check internal links
log('Link Validation:', 'blue');
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
  const issues = validateLinks(file, '.');
  if (issues.length === 0) {
    log(`  ✅ ${file}`, 'green');
  } else {
    for (const issue of issues) {
      log(`  ❌ ${file}: broken link "${issue}"`, 'red');
      exitCode = 1;
    }
  }
}

log('');

// Stats
log('Quick Stats:', 'blue');
const projects = JSON.parse(fs.readFileSync('projects.json', 'utf8'));
const bookmarks = JSON.parse(fs.readFileSync('bookmarks.json', 'utf8'));
const quotes = JSON.parse(fs.readFileSync('quotes.json', 'utf8'));

log(`  📦 Projects: ${projects.length}`);
log(`  🔖 Bookmarks: ${bookmarks.length}`);
log(`  💬 Quotes: ${quotes.length}`);
log(`  📄 Pages: ${htmlFiles.length}`);

log('');

if (exitCode === 0) {
  log('✅ All checks passed!', 'green');
} else {
  log('❌ Some checks failed', 'red');
}

process.exit(exitCode);
