#!/usr/bin/env node
/**
 * nix timer - Pomodoro-style focus timer
 * Usage: nix timer [minutes] [--message "task name"]
 * 
 * Examples:
 *   nix timer          # 25 min default pomodoro
 *   nix timer 15       # 15 minute session
 *   nix timer 45 --message "Deep work session"
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.nix666');
const LOG_FILE = path.join(DATA_DIR, 'timer-log.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadLog() {
    if (!fs.existsSync(LOG_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveLog(entry) {
    const log = loadLog();
    log.unshift(entry);
    // Keep last 100 entries
    if (log.length > 100) log.length = 100;
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function printProgress(elapsed, total, width = 30) {
    const pct = elapsed / total;
    const filled = Math.floor(width * pct);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const remaining = total - elapsed;
    process.stdout.write(`\r${bar} ${formatTime(remaining)} remaining `);
}

function showStats() {
    const log = loadLog();
    if (log.length === 0) {
        console.log('No timer sessions yet. Start one with: nix timer');
        return;
    }
    
    const today = new Date().toDateString();
    const todaySessions = log.filter(e => new Date(e.date).toDateString() === today);
    const todayMinutes = todaySessions.reduce((sum, e) => sum + e.duration, 0);
    
    console.log('\n🍅 Timer Stats\n');
    console.log(`Today:     ${todaySessions.length} sessions, ${todayMinutes} minutes`);
    console.log(`All time:  ${log.length} sessions, ${log.reduce((s, e) => s + e.duration, 0)} minutes`);
    console.log(`\nRecent sessions:`);
    log.slice(0, 10).forEach(e => {
        const date = new Date(e.date).toLocaleDateString();
        console.log(`  ${date} - ${e.duration}min${e.message ? ' - ' + e.message : ''}`);
    });
}

async function runTimer(minutes, message) {
    const totalSeconds = minutes * 60;
    const startTime = Date.now();
    
    console.log(`\n🍅 Starting ${minutes}-minute timer${message ? ': ' + message : ''}\n`);
    console.log('Press Ctrl+C to cancel\n');
    
    // Update display every second
    for (let elapsed = 0; elapsed <= totalSeconds; elapsed++) {
        printProgress(elapsed, totalSeconds);
        if (elapsed < totalSeconds) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    // Timer complete
    process.stdout.write('\n');
    console.log('\n✅ Time\'s up!');
    
    // Save to log
    saveLog({
        date: new Date().toISOString(),
        duration: minutes,
        message: message || null
    });
    
    // Try to show notification if on macOS
    if (process.platform === 'darwin') {
        const { exec } = require('child_process');
        exec(`osascript -e 'display notification "Timer complete${message ? ': ' + message : ''}" with title "nix timer" sound name "Glass"'`);
    }
    
    // ASCII bell for terminal
    process.stdout.write('\x07');
}

// Parse arguments
const args = process.argv.slice(2);

// Handle subcommands
if (args[0] === 'stats' || args[0] === 'log') {
    showStats();
    process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🍅 nix timer - Pomodoro-style focus timer

Usage:
  nix timer [minutes] [options]
  nix timer stats

Options:
  --message, -m    Add a description for this session
  --help, -h       Show this help

Examples:
  nix timer              # 25-minute pomodoro (default)
  nix timer 15           # 15-minute session
  nix timer 45 -m "Deep work"
  nix timer stats        # View session history
`);
    process.exit(0);
}

// Parse minutes
let minutes = 25; // Default pomodoro
if (args[0] && /^\d+$/.test(args[0])) {
    minutes = parseInt(args[0], 10);
}

// Parse message
let message = '';
const msgIdx = args.findIndex(a => a === '--message' || a === '-m');
if (msgIdx !== -1 && args[msgIdx + 1]) {
    message = args[msgIdx + 1];
}

// Run the timer
runTimer(minutes, message).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
