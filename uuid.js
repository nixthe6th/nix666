#!/usr/bin/env node
/**
 * uuid.js - Generate UUIDs and random IDs
 * Usage: nix uuid [options]
 * 
 * Options:
 *   -c, --count <n>     Generate n UUIDs (default: 1)
 *   -s, --short         Generate short random IDs (8 chars)
 *   -n, --nano          Generate nano IDs (12 chars, URL-safe)
 *   -u, --upper         Uppercase UUIDs
 *   --no-dashes         Remove dashes from UUID
 *   -p, --prefix <str>  Add prefix to each ID
 */

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m'
};

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function shortId(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < len; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function nanoId(len = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-~';
  let id = '';
  for (let i = 0; i < len; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function help() {
  console.log(`${C.cyan}⚡ nix uuid${C.reset} — Generate UUIDs and random IDs\n`);
  console.log('Usage: nix uuid [options]');
  console.log('\nOptions:');
  console.log('  -c, --count <n>     Generate n IDs (default: 1)');
  console.log('  -s, --short         Short IDs (8 chars, a-z0-9)');
  console.log('  -n, --nano          Nano IDs (12 chars, URL-safe)');
  console.log('  -u, --upper         Uppercase output');
  console.log('  --no-dashes         Remove dashes from UUID');
  console.log('  -p, --prefix <str>  Add prefix to each ID');
  console.log('\nExamples:');
  console.log('  nix uuid                    # One UUID v4');
  console.log('  nix uuid -c 5               # 5 UUIDs');
  console.log('  nix uuid -s                 # Short ID: a3f7b2d9');
  console.log('  nix uuid -n -p user_        # user_Ax-9pL_2vQm');
  console.log('  nix uuid --no-dashes        # Compact UUID');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('-h') || args.includes('--help') || args.includes('help')) {
    help();
    return;
  }

  let count = 1;
  let short = false;
  let nano = false;
  let upper = false;
  let noDashes = false;
  let prefix = '';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-c':
      case '--count':
        count = parseInt(args[++i]) || 1;
        break;
      case '-s':
      case '--short':
        short = true;
        break;
      case '-n':
      case '--nano':
        nano = true;
        break;
      case '-u':
      case '--upper':
        upper = true;
        break;
      case '--no-dashes':
        noDashes = true;
        break;
      case '-p':
      case '--prefix':
        prefix = args[++i] || '';
        break;
    }
  }

  const ids = [];
  for (let i = 0; i < count; i++) {
    let id;
    if (short) {
      id = shortId();
    } else if (nano) {
      id = nanoId();
    } else {
      id = uuidv4();
      if (noDashes) {
        id = id.replace(/-/g, '');
      }
    }
    
    if (upper) {
      id = id.toUpperCase();
    }
    
    ids.push(prefix + id);
  }

  const type = short ? 'short' : nano ? 'nano' : noDashes ? 'compact' : 'uuid';
  console.log(`${C.dim}// ${count} ${type} ID${count > 1 ? 's' : ''}${C.reset}`);
  ids.forEach(id => console.log(id));
}

main();
