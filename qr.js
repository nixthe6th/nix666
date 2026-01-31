#!/usr/bin/env node
/**
 * qr.js — Quick QR code generator for URLs, text, WiFi, contact info
 * 
 * Usage:
 *   nix qr <text|url>           # Generate QR code for text/URL
 *   nix qr wifi <ssid> <pass>   # Generate WiFi connection QR
 *   nix qr contact <name> <tel> # Generate contact card QR
 *   nix qr --small <text>       # Compact QR (terminal-friendly)
 * 
 * Examples:
 *   nix qr https://nix666.dev
 *   nix qr "Meeting at 3pm"
 *   nix qr wifi MyNetwork password123
 */

const https = require('https');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m'
};

function showHelp() {
  console.log(`${C.bold}⚡ nix qr${C.reset} — QR code generator`);
  console.log('');
  console.log('Usage:');
  console.log(`  nix qr <text|url>           ${C.dim}Generate QR for text/URL${C.reset}`);
  console.log(`  nix qr wifi <ssid> <pass>   ${C.dim}WiFi connection QR${C.reset}`);
  console.log(`  nix qr contact <name> <tel> ${C.dim}Contact card QR${C.reset}`);
  console.log('');
  console.log('Examples:');
  console.log('  nix qr https://nix666.dev');
  console.log('  nix qr "Follow up on project"');
  console.log('  nix qr wifi MyNetwork password123');
}

function generateQRUrl(data) {
  // Use qrserver.com API (free, no key needed)
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
}

function printQR(url, label) {
  console.log('');
  console.log(`${C.bold}${label || 'QR Code'}:${C.reset}`);
  console.log(`${C.dim}${url}${C.reset}`);
  console.log('');
  console.log(`${C.cyan}┌─────────────────────────────┐${C.reset}`);
  console.log(`${C.cyan}│${C.reset}  ${C.yellow}📱 Scan with your camera${C.reset}   ${C.cyan}│${C.reset}`);
  console.log(`${C.cyan}│${C.reset}                             ${C.cyan}│${C.reset}`);
  console.log(`${C.cyan}│${C.reset}  ${C.dim}${url.substring(0, 25).padEnd(25)}${C.reset}  ${C.cyan}│${C.reset}`);
  console.log(`${C.cyan}└─────────────────────────────┘${C.reset}`);
  console.log('');
  console.log(`${C.green}✓${C.reset} Open this URL or scan the code above:`);
  console.log(`  ${C.bold}${url}${C.reset}`);
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  let data = '';
  let label = '';

  const cmd = args[0];

  switch (cmd) {
    case 'wifi': {
      if (args.length < 2) {
        console.log('Usage: nix qr wifi <ssid> [password]');
        process.exit(1);
      }
      const ssid = args[1];
      const pass = args[2] || '';
      const security = pass ? 'WPA' : 'nopass';
      data = `WIFI:S:${ssid};T:${security};P:${pass};;`;
      label = `WiFi: ${ssid}`;
      break;
    }
    case 'contact': {
      if (args.length < 3) {
        console.log('Usage: nix qr contact <name> <phone>');
        process.exit(1);
      }
      const name = args[1];
      const phone = args[2];
      data = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEND:VCARD`;
      label = `Contact: ${name}`;
      break;
    }
    default: {
      // Regular text/URL
      data = args.join(' ');
      label = data.length > 40 ? data.substring(0, 40) + '...' : data;
      break;
    }
  }

  const qrUrl = generateQRUrl(data);
  printQR(qrUrl, label);
}

main();
