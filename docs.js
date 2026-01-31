#!/usr/bin/env node
/**
 * docs.js — Auto-generate API documentation for nix CLI tools
 * 
 * Scans JavaScript files, extracts CLI usage, generates markdown docs
 * Usage: node docs.js [--html] [--output <path>]
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  sourceDir: __dirname,
  outputMd: 'API.md',
  outputHtml: 'api.html',
  ignoreFiles: ['docs.js', 'apicheck.js', 'sitecheck.js', 'quoteadd.js'],
  repoUrl: 'https://github.com/nix666/nix666'
};

// Extract CLI info from JS file
function extractCliInfo(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const name = fileName.replace('.js', '');
  
  // Extract description from first comment block
  const descMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/s);
  const description = descMatch ? descMatch[1].replace(/^\s*\*\s?/gm, '').trim() : '';
  
  // Extract usage patterns
  const usages = [];
  const usageMatches = content.matchAll(/Usage:\s*(.+)/gi);
  for (const match of usageMatches) {
    usages.push(match[1].trim());
  }
  
  // Extract command patterns from console logs or comments
  const commands = [];
  const cmdMatches = content.matchAll(/(?:Usage|command|run):\s*(?:\w+\.js\s+)?(\w+)/gi);
  for (const match of cmdMatches) {
    if (!commands.includes(match[1])) commands.push(match[1]);
  }
  
  // Extract flags (--flag patterns)
  const flags = [];
  const flagMatches = content.matchAll(/(--[\w-]+)(?:\s+[<\[](\w+)[>\]])?/g);
  for (const match of flagMatches) {
    const flag = match[1];
    const arg = match[2] ? ` <${match[2]}>` : '';
    // Look for flag description in comments
    const flagDescMatch = content.match(new RegExp(`${flag}[^\n]*—\s*(.+)`));
    const desc = flagDescMatch ? flagDescMatch[1].trim() : '';
    if (!flags.find(f => f.flag === flag)) {
      flags.push({ flag, arg, desc });
    }
  }
  
  // Extract examples from code
  const examples = [];
  const exampleMatches = content.matchAll(/(?:example|e\.g\.|Example):?\s*(?:\/\/\s*)?(.+\.js.+)/gi);
  for (const match of exampleMatches) {
    if (!examples.includes(match[1].trim())) {
      examples.push(match[1].trim());
    }
  }
  
  return {
    name,
    fileName,
    description,
    usages,
    commands,
    flags,
    examples,
    hasHelp: content.includes('--help') || content.includes('help')
  };
}

// Find all CLI tools
function findTools() {
  const files = fs.readdirSync(CONFIG.sourceDir);
  const tools = [];
  
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    if (CONFIG.ignoreFiles.includes(file)) continue;
    
    const filePath = path.join(CONFIG.sourceDir, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;
    
    try {
      const info = extractCliInfo(filePath);
      if (info.description || info.usages.length > 0) {
        tools.push(info);
      }
    } catch (e) {
      // Skip files that can't be parsed
    }
  }
  
  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

// Generate Markdown documentation
function generateMarkdown(tools) {
  const lines = [
    '# NIX CLI API Documentation',
    '',
    `> Auto-generated documentation for the nix666 CLI toolkit`,
    `> Generated: ${new Date().toISOString().split('T')[0]}`,
    '',
    '## Table of Contents',
    ''
  ];
  
  // TOC
  for (const tool of tools) {
    lines.push(`- [${tool.name}](#${tool.name}) — ${tool.description || 'CLI tool'}`);
  }
  lines.push('');
  
  // Tool details
  for (const tool of tools) {
    lines.push(`## ${tool.name}`
    );
    lines.push('');
    if (tool.description) {
      lines.push(tool.description);
      lines.push('');
    }
    
    lines.push(`**File:** \`${tool.fileName}\``);
    lines.push('');
    
    if (tool.usages.length > 0) {
      lines.push('### Usage');
      lines.push('');
      for (const usage of tool.usages) {
        lines.push(`\`\`\`bash`);
        lines.push(usage);
        lines.push(`\`\`\``);
      }
      lines.push('');
    }
    
    if (tool.commands.length > 0) {
      lines.push('### Commands');
      lines.push('');
      for (const cmd of tool.commands) {
        lines.push(`- \`${cmd}\``);
      }
      lines.push('');
    }
    
    if (tool.flags.length > 0) {
      lines.push('### Flags');
      lines.push('');
      lines.push('| Flag | Description |');
      lines.push('|------|-------------|');
      for (const { flag, arg, desc } of tool.flags) {
        lines.push(`| \`${flag}${arg}\` | ${desc || '—'} |`);
      }
      lines.push('');
    }
    
    if (tool.examples.length > 0) {
      lines.push('### Examples');
      lines.push('');
      for (const ex of tool.examples) {
        lines.push(`\`\`\`bash`);
        lines.push(ex);
        lines.push(`\`\`\``);
      }
      lines.push('');
    }
    
    if (tool.hasHelp) {
      lines.push('> 💡 Run with `--help` for full usage information');
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }
  
  // Footer
  lines.push('## Quick Reference');
  lines.push('');
  lines.push('| Tool | Purpose |');
  lines.push('|------|---------|');
  for (const tool of tools) {
    lines.push(`| [${tool.name}](#${tool.name}) | ${tool.description || '—'} |`);
  }
  lines.push('');
  lines.push(`---`);
  lines.push(`*Generated by docs.js — Part of [nix666](${CONFIG.repoUrl})*`);
  lines.push('');
  
  return lines.join('\n');
}

// Generate HTML documentation
function generateHTML(tools) {
  const toolSections = tools.map(tool => {
    const usageSection = tool.usages.length > 0 
      ? `<div class="section"><h4>Usage</h4>${tool.usages.map(u => `<pre><code>${u}</code></pre>`).join('')}</div>`
      : '';
    
    const flagsSection = tool.flags.length > 0
      ? `<div class="section"><h4>Flags</h4><table>${tool.flags.map(f => `<tr><td><code>${f.flag}${f.arg}</code></td><td>${f.desc || '—'}</td></tr>`).join('')}</table></div>`
      : '';
    
    const examplesSection = tool.examples.length > 0
      ? `<div class="section"><h4>Examples</h4>${tool.examples.map(e => `<pre><code>${e}</code></pre>`).join('')}</div>`
      : '';
    
    const helpBadge = tool.hasHelp ? '<span class="badge">--help available</span>' : '';
    
    return `
      <section id="${tool.name}">
        <h3>${tool.name} <code>${tool.fileName}</code></h3>
        <p>${tool.description || 'CLI tool'}</p>
        ${helpBadge}
        ${usageSection}
        ${flagsSection}
        ${examplesSection}
      </section>
    `;
  }).join('');
  
  const quickRefRows = tools.map(t => `<tr><td><a href="#${t.name}">${t.name}</a></td><td>${t.description || '—'}</td></tr>`).join('');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIX CLI API Documentation</title>
  <style>
    :root { --bg: #0a0a0f; --surface: #12121a; --text: #e0e0e0; --muted: #888; --accent: #ffd700; --border: #222; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 2rem; }
    h1 { color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: 0.5rem; }
    h2 { color: var(--accent); margin-top: 2rem; }
    h3 { color: var(--text); margin-top: 1.5rem; }
    h3 code { color: var(--muted); font-size: 0.7em; font-weight: normal; }
    section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
    .section { margin-top: 1rem; }
    .section h4 { color: var(--accent); margin-bottom: 0.5rem; }
    pre { background: var(--bg); padding: 1rem; border-radius: 4px; overflow-x: auto; }
    code { font-family: 'SF Mono', Monaco, monospace; font-size: 0.9em; }
    pre code { color: var(--accent); }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: left; }
    th { color: var(--accent); }
    .badge { background: var(--accent); color: var(--bg); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
    .meta { color: var(--muted); font-size: 0.9rem; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>⚡ NIX CLI API Documentation</h1>
  <p class="meta">Auto-generated on ${new Date().toISOString().split('T')[0]}</p>
  
  <h2>Quick Reference</h2>
  <table>
    <tr><th>Tool</th><th>Description</th></tr>
    ${quickRefRows}
  </table>
  
  <h2>Tools</h2>
  ${toolSections}
  
  <footer>
    Generated by <code>docs.js</code> — Part of <a href="${CONFIG.repoUrl}">nix666</a>
  </footer>
</body>
</html>`;
}

// Main
function main() {
  const args = process.argv.slice(2);
  const generateHtml = args.includes('--html');
  const outputIndex = args.indexOf('--output');
  const customOutput = outputIndex !== -1 ? args[outputIndex + 1] : null;
  
  console.log('🔍 Scanning CLI tools...');
  const tools = findTools();
  console.log(`✓ Found ${tools.length} tools`);
  
  // Generate Markdown
  const mdPath = customOutput || CONFIG.outputMd;
  const markdown = generateMarkdown(tools);
  fs.writeFileSync(mdPath, markdown);
  console.log(`✓ Generated ${mdPath}`);
  
  // Generate HTML if requested
  if (generateHtml) {
    const htmlPath = CONFIG.outputHtml;
    const html = generateHTML(tools);
    fs.writeFileSync(htmlPath, html);
    console.log(`✓ Generated ${htmlPath}`);
  }
  
  // Summary
  console.log('\n📊 Documentation Summary:');
  console.log(`   Tools documented: ${tools.length}`);
  console.log(`   Total flags: ${tools.reduce((a, t) => a + t.flags.length, 0)}`);
  console.log(`   Total examples: ${tools.reduce((a, t) => a + t.examples.length, 0)}`);
  
  // List undocumented
  const allJs = fs.readdirSync(CONFIG.sourceDir).filter(f => f.endsWith('.js') && !CONFIG.ignoreFiles.includes(f));
  const documented = new Set(tools.map(t => t.fileName));
  const undocumented = allJs.filter(f => !documented.has(f));
  if (undocumented.length > 0) {
    console.log(`\n⚠️  Undocumented: ${undocumented.join(', ')}`);
  }
}

main();
