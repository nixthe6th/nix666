#!/usr/bin/env node
/**
 * meditate.js — Guided breathing timer
 * Box breathing, 4-7-8 technique, and custom patterns
 * 
 * Usage: nix meditate [pattern] [duration]
 * 
 * Patterns:
 *   box       Box breathing (4-4-4-4) — focus & calm
 *   478       4-7-8 technique — relaxation & sleep
 *   coherent  Coherent breathing (5-5) — stress reduction
 *   custom    Define your own pattern
 * 
 * Examples:
 *   nix meditate box 5m       # 5 minutes of box breathing
 *   nix meditate 478          # 4-7-8 until stopped
 *   nix meditate coherent 3m  # 3 minutes coherent breathing
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

const PATTERNS = {
  box: { name: 'Box Breathing', inhale: 4, hold: 4, exhale: 4, hold2: 4, desc: 'Navy SEAL technique for focus' },
  '478': { name: '4-7-8 Breathing', inhale: 4, hold: 7, exhale: 8, hold2: 0, desc: 'Relaxation & sleep aid' },
  coherent: { name: 'Coherent Breathing', inhale: 5, hold: 0, exhale: 5, hold2: 0, desc: 'Stress reduction & balance' },
  relax: { name: 'Relaxing Breath', inhale: 4, hold: 0, exhale: 6, hold2: 0, desc: 'Natural calming rhythm' },
  energy: { name: 'Energizing Breath', inhale: 3, hold: 0, exhale: 3, hold2: 0, desc: 'Quick energy boost' }
};

function c(name, text) {
  return `${COLORS[name] || ''}${text}${COLORS.reset}`;
}

function clearLine() {
  process.stdout.write('\r' + ' '.repeat(60) + '\r');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(m|s)?$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2] || 'm';
  return unit === 'm' ? num * 60 : num;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function breathe(pattern, durationSeconds) {
  const totalCycle = pattern.inhale + pattern.hold + pattern.exhale + pattern.hold2;
  const startTime = Date.now();
  let cycleCount = 0;
  
  console.log();
  console.log(c('bold', `  🧘 ${pattern.name}`));
  console.log(c('dim', `  ${pattern.desc}`));
  console.log(c('dim', `  Pattern: ${pattern.inhale}-${pattern.hold}-${pattern.exhale}-${pattern.hold2}`));
  if (durationSeconds) {
    console.log(c('dim', `  Duration: ${formatTime(durationSeconds)}`));
  }
  console.log();
  console.log(c('dim', '  Press Ctrl+C to stop'));
  console.log();
  
  // Countdown before start
  console.log(c('cyan', '  Starting in...'));
  for (let i = 3; i > 0; i--) {
    process.stdout.write(`  ${c('bold', i.toString())} `);
    await sleep(1000);
  }
  console.log();
  console.log();
  
  while (true) {
    // Check duration
    if (durationSeconds) {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= durationSeconds) {
        console.log();
        console.log(c('green', '  ✨ Session complete'));
        console.log(c('dim', `  Cycles completed: ${cycleCount}`));
        console.log();
        return;
      }
    }
    
    cycleCount++;
    const remaining = durationSeconds ? Math.max(0, durationSeconds - Math.floor((Date.now() - startTime) / 1000)) : null;
    
    // INHALE
    await phase('Inhale', pattern.inhale, '🌬️ ', c('cyan', '▲'), remaining);
    
    // HOLD (if applicable)
    if (pattern.hold > 0) {
      await phase('Hold', pattern.hold, '⏸️ ', c('yellow', '◆'), remaining ? remaining - pattern.inhale : null);
    }
    
    // EXHALE
    await phase('Exhale', pattern.exhale, '🍃', c('green', '▼'), remaining ? remaining - pattern.inhale - pattern.hold : null);
    
    // HOLD2 (if applicable)
    if (pattern.hold2 > 0) {
      await phase('Hold', pattern.hold2, '⏸️ ', c('yellow', '◆'), remaining ? remaining - pattern.inhale - pattern.hold - pattern.exhale : null);
    }
  }
}

async function phase(name, seconds, emoji, colorSymbol, remainingTime) {
  const progressWidth = 20;
  
  for (let i = 0; i < seconds; i++) {
    clearLine();
    const progress = Math.floor((i + 1) / seconds * progressWidth);
    const bar = colorSymbol.repeat(progress) + c('dim', '░'.repeat(progressWidth - progress));
    const timeStr = remainingTime ? `(${formatTime(Math.max(0, remainingTime - i))})` : '';
    process.stdout.write(`  ${emoji} ${c('bold', name.padEnd(7))} ${bar} ${seconds - i}s ${timeStr}`);
    
    // Beep on phase change
    if (i === 0) {
      process.stdout.write('\x07');
    }
    
    await sleep(1000);
  }
  console.log();
}

function showMenu() {
  console.log();
  console.log(c('bold', '  🧘 Meditation & Breathing'));
  console.log(c('dim', '  ────────────────────────'));
  console.log();
  console.log(c('bold', '  Patterns:'));
  
  Object.entries(PATTERNS).forEach(([key, p]) => {
    console.log(`    ${c('cyan', key.padEnd(10))} ${p.name} — ${p.desc}`);
    console.log(`             ${c('dim', `${p.inhale}-${p.hold}-${p.exhale}-${p.hold2} seconds`)}`);
  });
  
  console.log();
  console.log(c('bold', '  Usage:'));
  console.log(`    nix meditate box 5m       ${c('dim', '# 5 minutes box breathing')}`);
  console.log(`    nix meditate 478          ${c('dim', '# 4-7-8 until you stop')}`);
  console.log(`    nix meditate coherent 3m  ${c('dim', '# 3 minutes coherent breath')}`);
  console.log();
  console.log(c('dim', '  Tips:'));
  console.log(c('dim', '  • Box: Best for focus before work/study'));
  console.log(c('dim', '  • 4-7-8: Best for falling asleep or calming anxiety'));
  console.log(c('dim', '  • Coherent: Best for daily stress management'));
  console.log();
}

// Main
const args = process.argv.slice(2);
const patternName = args[0];
const durationArg = args[1];

if (!patternName || patternName === 'help' || patternName === '-h' || patternName === '--help') {
  showMenu();
  process.exit(0);
}

const pattern = PATTERNS[patternName];
if (!pattern) {
  console.log(c('red', `  Unknown pattern: ${patternName}`));
  console.log(c('dim', '  Run without args to see available patterns'));
  process.exit(1);
}

const durationSeconds = parseDuration(durationArg);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log();
  console.log();
  console.log(c('dim', '  Session ended'));
  console.log();
  process.exit(0);
});

breathe(pattern, durationSeconds).catch(console.error);
