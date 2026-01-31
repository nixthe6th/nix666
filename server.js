#!/usr/bin/env node
/**
 * server.js - Quick HTTP server for static files
 * Usage: nix server [port] [--dir <path>] [--open]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown',
  '.txt': 'text/plain'
};

function getLocalIP() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function serveDirectory(res, dirPath, urlPath) {
  const items = fs.readdirSync(dirPath);
  const rows = items
    .filter(item => !item.startsWith('.'))
    .map(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      const isDir = stat.isDirectory();
      const size = isDir ? '-' : formatSize(stat.size);
      const icon = isDir ? '📁' : '📄';
      const href = urlPath === '/' ? item : urlPath + '/' + item;
      return `<tr><td>${icon}</td><td><a href="${href}">${item}</a></td><td>${size}</td></tr>`;
    })
    .join('');
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Index of ${urlPath}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { font-size: 1.5rem; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
    th { color: #666; font-weight: normal; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .back { margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>📂 Index of ${urlPath}</h1>
  ${urlPath !== '/' ? '<div class="back"><a href="..">⬅️ Parent directory</a></div>' : ''}
  <table>
    <tr><th></th><th>Name</th><th>Size</th></tr>
    ${rows}
  </table>
</body>
</html>`;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

function createServer(directory, port) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url);
    const filePath = path.join(directory, urlPath === '/' ? 'index.html' : urlPath);
    
    // Security check
    if (!filePath.startsWith(directory)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      serveDirectory(res, filePath, urlPath);
      return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Content-Length': stat.size
    });
    fs.createReadStream(filePath).pipe(res);
  });
  
  server.listen(port, () => {
    const ip = getLocalIP();
    console.log('');
    console.log(`${COLORS.green}✓ Server running${COLORS.reset}`);
    console.log('');
    console.log(`  ${COLORS.dim}Local:${COLORS.reset}   http://localhost:${port}`);
    console.log(`  ${COLORS.dim}Network:${COLORS.reset} http://${ip}:${port}`);
    console.log('');
    console.log(`${COLORS.dim}Press Ctrl+C to stop${COLORS.reset}`);
    console.log('');
  });
  
  return server;
}

function showHelp() {
  console.log(`${COLORS.cyan}${COLORS.bold}nix server${COLORS.reset} — Quick HTTP server`);
  console.log('');
  console.log(`${COLORS.dim}Usage:${COLORS.reset}`);
  console.log('  nix server                Serve current directory on port 8080');
  console.log('  nix server 3000           Serve on custom port');
  console.log('  nix server --dir ./dist   Serve specific directory');
  console.log('  nix server --open         Open browser automatically');
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  const portArg = args.find(a => /^\d+$/.test(a));
  const port = parseInt(portArg) || 8080;
  
  const dirIdx = args.indexOf('--dir');
  const directory = dirIdx !== -1 ? args[dirIdx + 1] : process.cwd();
  
  const resolvedDir = path.resolve(directory);
  
  if (!fs.existsSync(resolvedDir)) {
    console.log(`${COLORS.red}✗ Directory not found: ${directory}${COLORS.reset}`);
    process.exit(1);
  }
  
  const server = createServer(resolvedDir, port);
  
  if (args.includes('--open')) {
    const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${openCmd} http://localhost:${port}`);
  }
}

main();
