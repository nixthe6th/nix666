#!/usr/bin/env node
/**
 * roll.js - Quick dice roller and random picker
 * Usage: roll [dice|coin|number|pick]
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count, sides) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDie(sides));
  }
  return results;
}

function formatDice(count, sides, results) {
  const sum = results.reduce((a, b) => a + b, 0);
  const max = count * sides;
  const pct = (sum / max) * 100;
  
  let color = COLORS.yellow;
  if (pct >= 80) color = COLORS.green;
  if (pct <= 20) color = COLORS.red;
  
  const diceIcons = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  const icons = results.map(r => sides === 6 ? diceIcons[r-1] : r).join(' ');
  
  console.log(`${COLORS.cyan}🎲 Rolled ${count}d${sides}:${COLORS.reset} ${color}${icons}${COLORS.reset}`);
  console.log(`${COLORS.dim}   Sum: ${sum} / ${max} (${Math.round(pct)}%)${COLORS.reset}`);
  
  // Critical hits/misses for d20
  if (sides === 20 && count === 1) {
    if (results[0] === 20) console.log(`${COLORS.green}   💥 CRITICAL SUCCESS!${COLORS.reset}`);
    if (results[0] === 1) console.log(`${COLORS.red}   💀 CRITICAL FAIL!${COLORS.reset}`);
  }
}

function flipCoin() {
  const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
  const icon = result === 'Heads' ? '👑' : '🦅';
  console.log(`${COLORS.cyan}🪙 Flip:${COLORS.reset} ${COLORS.bold}${icon} ${result}${COLORS.reset}`);
}

function pickRandom(max) {
  const result = rollDie(max);
  console.log(`${COLORS.cyan}🎲 Random 1-${max}:${COLORS.reset} ${COLORS.bold}${result}${COLORS.reset}`);
}

function pickFromChoices(choices) {
  const result = choices[Math.floor(Math.random() * choices.length)];
  console.log(`${COLORS.cyan}🎯 Picked from ${choices.length} options:${COLORS.reset}`);
  console.log(`   ${COLORS.green}→ ${result}${COLORS.reset}`);
}

function showHelp() {
  console.log(`
${COLORS.bold}roll.js${COLORS.reset} - Quick dice roller

${COLORS.bold}Usage:${COLORS.reset}
  nix roll              Roll a d20
  nix roll d6           Roll one 6-sided die
  nix roll 2d10         Roll two 10-sided dice
  nix roll 3d6+2        Roll 3d6, add 2
  nix roll coin         Flip a coin
  nix roll 100          Random number 1-100
  nix roll pick a b c   Pick randomly from options

${COLORS.bold}Examples:${COLORS.reset}
  nix roll              # D&D d20 roll
  nix roll 2d6          # Classic D&D damage
  nix roll 4d6          # D&D stat roll
  nix roll coin         # Make a decision
  nix roll 6            # Random 1-6
  nix roll pick pizza tacos sushi
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const cmd = args[0];
  
  // Coin flip
  if (cmd === 'coin' || cmd === 'flip') {
    flipCoin();
    return;
  }
  
  // Pick from choices
  if (cmd === 'pick' || cmd === 'choose') {
    if (args.length < 2) {
      console.log(`${COLORS.red}Error: Need options to pick from${COLORS.reset}`);
      return;
    }
    pickFromChoices(args.slice(1));
    return;
  }
  
  // Parse dice notation (e.g., 2d6, d20, 3d8+2)
  const diceMatch = cmd.match(/^(?:(\d+))?d(\d+)(?:\+(\d+))?$/i);
  if (diceMatch) {
    const count = parseInt(diceMatch[1]) || 1;
    const sides = parseInt(diceMatch[2]);
    const bonus = parseInt(diceMatch[3]) || 0;
    
    if (count > 100) {
      console.log(`${COLORS.red}Error: Max 100 dice${COLORS.reset}`);
      return;
    }
    
    const results = rollDice(count, sides);
    
    if (bonus > 0) {
      const sum = results.reduce((a, b) => a + b, 0) + bonus;
      console.log(`${COLORS.cyan}🎲 Rolled ${count}d${sides}+${bonus}:${COLORS.reset}`);
      console.log(`   ${results.join(' + ')} + ${bonus} = ${COLORS.bold}${sum}${COLORS.reset}`);
    } else {
      formatDice(count, sides, results);
    }
    return;
  }
  
  // Simple number = random 1-N
  const num = parseInt(cmd);
  if (!isNaN(num) && num > 0) {
    pickRandom(num);
    return;
  }
  
  // Default: treat as options to pick from
  pickFromChoices(args);
}

main();
