#!/usr/bin/env node
/**
 * convert.js — Swiss Army knife converter utility
 * Base64, URL encoding, JSON formatting, case conversions, timestamps
 * 
 * Usage: nix convert <command> [input]
 */

const fs = require('fs');
const path = require('path');

// Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

function banner() {
  console.log(`${C.cyan}${C.bold}⚡ nix convert${C.reset} — Data format utilities\n`);
}

function help() {
  banner();
  console.log(`${C.bold}USAGE:${C.reset} nix convert <command> [input]`);
  console.log(`       echo "text" | nix convert <command>\n`);
  console.log(`${C.bold}COMMANDS:${C.reset}`);
  console.log(`  ${C.cyan}b64e, base64enc${C.reset}  <text>   Base64 encode`);
  console.log(`  ${C.cyan}b64d, base64dec${C.reset}  <text>   Base64 decode`);
  console.log(`  ${C.cyan}urle, urlenc${C.reset}    <text>   URL encode`);
  console.log(`  ${C.cyan}urld, urldec${C.reset}    <text>   URL decode`);
  console.log(`  ${C.cyan}json, fmt${C.reset}        <text>   Format/validate JSON`);
  console.log(`  ${C.cyan}ts2date${C.reset}          <ms>     Timestamp to date`);
  console.log(`  ${C.cyan}date2ts${C.reset}          [date]   Date to timestamp (now if empty)`);
  console.log(`  ${C.cyan}case${C.reset}             <text>   Show all case variants`);
  console.log(`  ${C.cyan}camel${C.reset}            <text>   to camelCase`);
  console.log(`  ${C.cyan}snake${C.reset}            <text>   to snake_case`);
  console.log(`  ${C.cyan}kebab${C.reset}            <text>   to kebab-case`);
  console.log(`  ${C.cyan}upper${C.reset}            <text>   to UPPERCASE`);
  console.log(`  ${C.cyan}lower${C.reset}            <text>   to lowercase`);
  console.log(`\n${C.dim}Pipe input or pass as argument${C.reset}`);
}

function getInput() {
  const args = process.argv.slice(2);
  
  // Check for file input flag first
  if (args[0] === '-f' && args[1]) {
    const content = fs.readFileSync(args[1], 'utf-8').trim();
    return { cmd: args[2], input: content };
  }
  
  // Check for piped input (only if not a TTY)
  if (!process.stdin.isTTY) {
    try {
      const stdin = fs.readFileSync(0, 'utf-8').trim();
      if (stdin) return { cmd: args[0], input: stdin };
    } catch (e) {
      // No piped input, continue to args
    }
  }
  
  // Regular args
  return { cmd: args[0], input: args.slice(1).join(' ') };
}

// Case conversion helpers
const toCamel = (s) => s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
const toPascal = (s) => s.replace(/(?:^|[^a-zA-Z0-9]+)([a-zA-Z])/g, (_, c) => c.toUpperCase());
const toSnake = (s) => s.replace(/(?:^|[^a-zA-Z0-9]+)([a-zA-Z0-9])/g, (_, c, i) => (i > 0 ? '_' : '') + c.toLowerCase());
const toKebab = (s) => s.replace(/(?:^|[^a-zA-Z0-9]+)([a-zA-Z0-9])/g, (_, c, i) => (i > 0 ? '-' : '') + c.toLowerCase());
const toUpper = (s) => s.toUpperCase();
const toLower = (s) => s.toLowerCase();

function formatJSON(input) {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return { error: true, msg: `Invalid JSON: ${e.message}` };
  }
}

function run() {
  const { cmd, input } = getInput();
  
  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    help();
    process.exit(0);
  }

  // Allow empty input for date2ts (uses current time)
  if (!input && cmd !== 'date2ts' && cmd !== 'tsnow') {
    console.log(`${C.red}Error: No input provided${C.reset}`);
    help();
    process.exit(1);
  }

  let result = '';

  switch (cmd) {
    case 'b64e':
    case 'base64enc':
    case 'base64':
      result = Buffer.from(input).toString('base64');
      console.log(`${C.green}Base64 encoded:${C.reset}\n${result}`);
      break;

    case 'b64d':
    case 'base64dec':
    case 'decode':
      try {
        result = Buffer.from(input, 'base64').toString('utf-8');
        console.log(`${C.green}Base64 decoded:${C.reset}\n${result}`);
      } catch (e) {
        console.log(`${C.red}Error: Invalid Base64${C.reset}`);
        process.exit(1);
      }
      break;

    case 'urle':
    case 'urlenc':
    case 'encode':
      result = encodeURIComponent(input);
      console.log(`${C.green}URL encoded:${C.reset}\n${result}`);
      break;

    case 'urld':
    case 'urldec':
    case 'decode':
      try {
        result = decodeURIComponent(input);
        console.log(`${C.green}URL decoded:${C.reset}\n${result}`);
      } catch (e) {
        console.log(`${C.red}Error: Invalid URL encoding${C.reset}`);
        process.exit(1);
      }
      break;

    case 'json':
    case 'fmt':
    case 'format':
      const jsonResult = formatJSON(input);
      if (jsonResult.error) {
        console.log(`${C.red}${jsonResult.msg}${C.reset}`);
        process.exit(1);
      } else {
        console.log(`${C.green}Formatted JSON:${C.reset}\n${jsonResult}`);
      }
      break;

    case 'ts2date':
    case 'ts':
      const ts = parseInt(input);
      if (isNaN(ts)) {
        console.log(`${C.red}Error: Invalid timestamp${C.reset}`);
        process.exit(1);
      }
      const date = new Date(ts.toString().length === 10 ? ts * 1000 : ts);
      console.log(`${C.green}Date:${C.reset} ${date.toISOString()}`);
      console.log(`${C.dim}Local:${C.reset}  ${date.toString()}`);
      break;

    case 'date2ts':
    case 'tsnow':
      const dateInput = input || new Date().toISOString();
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) {
        console.log(`${C.red}Error: Invalid date format${C.reset}`);
        process.exit(1);
      }
      console.log(`${C.green}Timestamp (ms):${C.reset} ${d.getTime()}`);
      console.log(`${C.green}Timestamp (s):${C.reset}  ${Math.floor(d.getTime() / 1000)}`);
      break;

    case 'case':
    case 'cases':
      console.log(`${C.bold}Case variants:${C.reset}`);
      console.log(`  ${C.cyan}camelCase:${C.reset}   ${toCamel(input)}`);
      console.log(`  ${C.cyan}PascalCase:${C.reset}  ${toPascal(input)}`);
      console.log(`  ${C.cyan}snake_case:${C.reset}  ${toSnake(input)}`);
      console.log(`  ${C.cyan}kebab-case:${C.reset}  ${toKebab(input)}`);
      console.log(`  ${C.cyan}UPPERCASE:${C.reset}   ${toUpper(input)}`);
      console.log(`  ${C.cyan}lowercase:${C.reset}   ${toLower(input)}`);
      break;

    case 'camel':
      console.log(toCamel(input));
      break;
    case 'pascal':
      console.log(toPascal(input));
      break;
    case 'snake':
      console.log(toSnake(input));
      break;
    case 'kebab':
      console.log(toKebab(input));
      break;
    case 'upper':
      console.log(toUpper(input));
      break;
    case 'lower':
      console.log(toLower(input));
      break;

    default:
      console.log(`${C.red}Unknown command: ${cmd}${C.reset}`);
      help();
      process.exit(1);
  }
}

run();
