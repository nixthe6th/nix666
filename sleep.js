#!/usr/bin/env node
/**
 * sleep.js — Sleep quality tracker
 * Log sleep, track patterns, optimize rest
 * 
 * Usage: nix sleep [command] [args]
 * 
 * Commands:
 *   (none)       Show last night's sleep & trends
 *   log <h> <m>  Log sleep: hours, quality (1-5)
 *   bed <time>   Set bedtime (e.g., 23:00, 11pm)
 *   wake <time>  Set wake time (e.g., 07:00, 7am)
 *   rate <1-5>   Rate sleep quality
 *   week         Show last 7 nights
 *   avg          Show averages & insights
 *   goal <h>     Set sleep goal (default: 8)
 *   debt         Show sleep debt over last 7 days
 *   edit         Edit last entry
 */

const fs = require('fs');
const path = require('path');

const SLEEP_FILE = path.join(__dirname, 'data', 'sleep.json');
const DEFAULT_GOAL = 8; // hours

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

const MOOD_ICONS = ['😴', '😫', '😐', '🙂', '🤩'];

function c(name, text) {
  return `${COLORS[name] || ''}${text}${COLORS.reset}`;
}

function loadData() {
  if (!fs.existsSync(SLEEP_FILE)) {
    return { goal: DEFAULT_GOAL, entries: [] };
  }
  return JSON.parse(fs.readFileSync(SLEEP_FILE, 'utf8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(SLEEP_FILE), { recursive: true });
  fs.writeFileSync(SLEEP_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  const str = timeStr.toLowerCase().trim();
  
  // Handle 12-hour format (7pm, 11:30am)
  const match12 = str.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1]);
    const mins = parseInt(match12[2] || 0);
    const ampm = match12[3];
    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return { hours, mins };
  }
  
  // Handle 24-hour format (23:00, 7:30)
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return { hours: parseInt(match24[1]), mins: parseInt(match24[2]) };
  }
  
  // Handle just hour (23, 7)
  const matchHour = str.match(/^(\d{1,2})$/);
  if (matchHour) {
    return { hours: parseInt(matchHour[1]), mins: 0 };
  }
  
  return null;
}

function formatTime(timeObj) {
  if (!timeObj) return '--:--';
  const h = timeObj.hours.toString().padStart(2, '0');
  const m = timeObj.mins.toString().padStart(2, '0');
  return `${h}:${m}`;
}

function format12Hour(timeObj) {
  if (!timeObj) return '--:--';
  let h = timeObj.hours;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const m = timeObj.mins.toString().padStart(2, '0');
  return `${h}:${m}${ampm}`;
}

function calcDuration(bedtime, waketime) {
  if (!bedtime || !waketime) return null;
  
  let bedMinutes = bedtime.hours * 60 + bedtime.mins;
  let wakeMinutes = waketime.hours * 60 + waketime.mins;
  
  // Handle crossing midnight
  if (wakeMinutes < bedMinutes) {
    wakeMinutes += 24 * 60;
  }
  
  const diff = wakeMinutes - bedMinutes;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  
  return { hours, mins, totalMinutes: diff };
}

function formatDuration(duration) {
  if (!duration) return '--';
  const { hours, mins } = duration;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function getQualityIcon(rating) {
  if (!rating || rating < 1 || rating > 5) return '❓';
  return MOOD_ICONS[rating - 1];
}

function getQualityLabel(rating) {
  const labels = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];
  if (!rating || rating < 1 || rating > 5) return 'Unknown';
  return labels[rating - 1];
}

function drawBar(value, max, width = 20) {
  const pct = Math.min(value / max, 1);
  const filled = Math.round(width * pct);
  const empty = width - filled;
  
  let color = 'red';
  if (pct >= 0.9) color = 'green';
  else if (pct >= 0.7) color = 'cyan';
  else if (pct >= 0.5) color = 'yellow';
  
  return `[${c(color, '█'.repeat(filled))}${c('dim', '░'.repeat(empty))}] ${c('bold', Math.round(pct * 100) + '%')}`;
}

function getSleepAdvice(duration, quality) {
  if (!duration) return c('dim', 'Log your sleep to get insights');
  
  const totalHours = duration.hours + duration.mins / 60;
  
  if (totalHours < 6) {
    return c('red', '⚠️  Sleep deprivation detected. Prioritize rest tonight.');
  }
  if (totalHours < 7) {
    return c('yellow', '💤 A bit short. Aim for 7-9 hours for optimal recovery.');
  }
  if (quality && quality <= 2) {
    return c('yellow', '🌙 Duration good but quality was low. Check sleep hygiene.');
  }
  if (totalHours >= 7 && totalHours <= 9 && quality >= 4) {
    return c('green', '✨ Perfect! Great sleep fuels great days.');
  }
  return c('cyan', '👍 Solid rest. Keep the rhythm going.');
}

function showStatus() {
  const data = loadData();
  const entries = data.entries || [];
  
  // Get last night's sleep
  const lastEntry = entries[entries.length - 1];
  
  console.log();
  console.log(c('bold', '  🌙 SLEEP TRACKER'));
  console.log(c('dim', '  ────────────────'));
  console.log();
  
  if (!lastEntry || !lastEntry.duration) {
    console.log(c('dim', '  No sleep logged yet.'));
    console.log();
    console.log(c('dim', '  Start with: nix sleep log 7.5 4'));
    console.log();
    return;
  }
  
  const dur = lastEntry.duration;
  const goalPct = (dur.hours + dur.mins / 60) / data.goal;
  
  console.log(`  Last night: ${c('cyan', formatDuration(dur))}`);
  console.log(`  Quality:    ${getQualityIcon(lastEntry.quality)} ${c('bold', getQualityLabel(lastEntry.quality))}`);
  console.log(`  Bedtime:    ${c('dim', format12Hour(lastEntry.bedtime))} → ${format12Hour(lastEntry.waketime)}`);
  console.log();
  console.log('  ' + drawBar(dur.hours * 60 + dur.mins, data.goal * 60));
  console.log();
  console.log('  ' + getSleepAdvice(dur, lastEntry.quality));
  
  // Show streak
  const streak = calculateStreak(entries);
  if (streak > 0) {
    console.log();
    console.log(c('green', `  🔥 ${streak} day${streak > 1 ? 's' : ''} logged`));
  }
  
  // Quick commands
  console.log();
  console.log(c('dim', '  Quick: nix sleep log 8 4 | nix sleep week | nix sleep debt'));
  console.log();
}

function calculateStreak(entries) {
  if (!entries.length) return 0;
  
  let streak = 0;
  const today = getToday();
  const yesterday = getYesterday();
  
  // Check if logged today or yesterday
  const lastDate = entries[entries.length - 1]?.date;
  if (lastDate !== today && lastDate !== yesterday) return 0;
  
  // Count consecutive days
  const dates = new Set(entries.map(e => e.date));
  let checkDate = new Date();
  
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (dates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr === today) {
      // Haven't logged today yet, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

function logSleep(hours, quality) {
  const data = loadData();
  const today = getToday();
  
  // Parse inputs
  const hrs = parseFloat(hours);
  const q = parseInt(quality) || 0;
  
  if (isNaN(hrs) || hrs < 0 || hrs > 16) {
    console.log(c('red', '  Hours must be between 0 and 16'));
    return;
  }
  
  if (q < 1 || q > 5) {
    console.log(c('red', '  Quality must be 1-5 (1=terrible, 5=excellent)'));
    return;
  }
  
  // Convert hours to duration object
  const wholeHours = Math.floor(hrs);
  const mins = Math.round((hrs - wholeHours) * 60);
  
  const entry = {
    date: today,
    duration: { hours: wholeHours, mins, totalMinutes: wholeHours * 60 + mins },
    quality: q,
    bedtime: null,
    waketime: null,
    note: ''
  };
  
  // Remove existing entry for today
  data.entries = data.entries.filter(e => e.date !== today);
  data.entries.push(entry);
  saveData(data);
  
  console.log();
  console.log(`  🌙 Logged ${c('cyan', formatDuration(entry.duration))} of sleep`);
  console.log(`  Quality: ${getQualityIcon(q)} ${c('bold', getQualityLabel(q))}`);
  
  const goalPct = hrs / data.goal;
  if (goalPct >= 1) {
    console.log();
    console.log(c('green', '  ✨ Sleep goal achieved!'));
  } else if (goalPct >= 0.75) {
    console.log();
    console.log(c('yellow', '  Almost there. Rest up tonight.'));
  }
  console.log();
}

function setBedtime(timeStr) {
  const time = parseTime(timeStr);
  if (!time) {
    console.log(c('red', '  Invalid time format. Try: 23:00, 11pm, 23'));
    return;
  }
  
  const data = loadData();
  const today = getToday();
  
  // Get or create today's entry
  let entry = data.entries.find(e => e.date === today);
  if (!entry) {
    entry = { date: today, duration: null, quality: 0, bedtime: null, waketime: null, note: '' };
    data.entries.push(entry);
  }
  
  entry.bedtime = time;
  
  // Recalculate duration if we have both times
  if (entry.waketime) {
    entry.duration = calcDuration(entry.bedtime, entry.waketime);
  }
  
  saveData(data);
  
  console.log();
  console.log(`  🛏️  Bedtime set: ${c('cyan', format12Hour(time))}`);
  if (entry.duration) {
    console.log(`  Duration: ${c('green', formatDuration(entry.duration))}`);
  }
  console.log();
}

function setWaketime(timeStr) {
  const time = parseTime(timeStr);
  if (!time) {
    console.log(c('red', '  Invalid time format. Try: 07:00, 7am, 7'));
    return;
  }
  
  const data = loadData();
  const today = getToday();
  
  // Get or create today's entry
  let entry = data.entries.find(e => e.date === today);
  if (!entry) {
    entry = { date: today, duration: null, quality: 0, bedtime: null, waketime: null, note: '' };
    data.entries.push(entry);
  }
  
  entry.waketime = time;
  
  // Recalculate duration if we have both times
  if (entry.bedtime) {
    entry.duration = calcDuration(entry.bedtime, entry.waketime);
  }
  
  saveData(data);
  
  console.log();
  console.log(`  ☀️  Wake time set: ${c('cyan', format12Hour(time))}`);
  if (entry.duration) {
    console.log(`  Duration: ${c('green', formatDuration(entry.duration))}`);
  }
  console.log();
}

function rateSleep(rating) {
  const q = parseInt(rating);
  if (isNaN(q) || q < 1 || q > 5) {
    console.log(c('red', '  Rating must be 1-5'));
    console.log(c('dim', '  1 = 😴 Terrible | 2 = 😫 Poor | 3 = 😐 Okay | 4 = 🙂 Good | 5 = 🤩 Excellent'));
    return;
  }
  
  const data = loadData();
  const today = getToday();
  
  let entry = data.entries.find(e => e.date === today);
  if (!entry) {
    entry = { date: today, duration: null, quality: 0, bedtime: null, waketime: null, note: '' };
    data.entries.push(entry);
  }
  
  entry.quality = q;
  saveData(data);
  
  console.log();
  console.log(`  Rated last night's sleep: ${getQualityIcon(q)} ${c('bold', getQualityLabel(q))}`);
  console.log();
}

function showWeek() {
  const data = loadData();
  const entries = data.entries || [];
  
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  console.log();
  console.log(c('bold', '  🌙 Last 7 Nights'));
  console.log(c('dim', '  ────────────────'));
  console.log();
  
  dates.forEach(date => {
    const entry = entries.find(e => e.date === date);
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = date.substring(5);
    
    if (entry && entry.duration) {
      const dur = entry.duration;
      const hours = dur.hours + dur.mins / 60;
      const icon = getQualityIcon(entry.quality);
      const bar = drawBar(dur.totalMinutes, data.goal * 60, 15);
      console.log(`  ${dayName} ${dateStr}  ${icon} ${c('cyan', formatDuration(dur).padEnd(8))} ${bar}`);
    } else {
      console.log(`  ${dayName} ${dateStr}  ${c('dim', '─'.repeat(35))}`);
    }
  });
  
  // Summary stats
  const weekEntries = dates.map(d => entries.find(e => e.date === d)).filter(Boolean);
  if (weekEntries.length > 0) {
    const avgHours = weekEntries.reduce((sum, e) => sum + e.duration.hours + e.duration.mins / 60, 0) / weekEntries.length;
    const avgQuality = weekEntries.reduce((sum, e) => sum + (e.quality || 0), 0) / weekEntries.filter(e => e.quality).length || 0;
    
    console.log();
    console.log(c('dim', `  Average: ${c('cyan', avgHours.toFixed(1) + 'h')} sleep, ${c('yellow', avgQuality.toFixed(1) + '/5')} quality`));
  }
  
  console.log();
}

function showAverages() {
  const data = loadData();
  const entries = data.entries || [];
  
  if (entries.length === 0) {
    console.log(c('dim', '  No sleep data yet. Start logging!' ));
    return;
  }
  
  const withDuration = entries.filter(e => e.duration);
  const withQuality = entries.filter(e => e.quality > 0);
  
  const avgHours = withDuration.reduce((sum, e) => sum + e.duration.hours + e.duration.mins / 60, 0) / withDuration.length;
  const avgQuality = withQuality.reduce((sum, e) => sum + e.quality, 0) / withQuality.length;
  
  // Best and worst
  const best = [...withDuration].sort((a, b) => (b.duration.hours * 60 + b.duration.mins) - (a.duration.hours * 60 + a.duration.mins))[0];
  const worst = [...withDuration].sort((a, b) => (a.duration.hours * 60 + a.duration.mins) - (b.duration.hours * 60 + b.duration.mins))[0];
  
  console.log();
  console.log(c('bold', '  📊 Sleep Insights'));
  console.log(c('dim', '  ────────────────'));
  console.log();
  console.log(`  Total nights logged: ${c('cyan', entries.length)}`);
  console.log(`  Average duration:    ${c('cyan', avgHours.toFixed(1) + 'h')} (goal: ${data.goal}h)`);
  console.log(`  Average quality:     ${c('yellow', avgQuality.toFixed(1) + '/5')}`);
  console.log();
  
  if (best) {
    console.log(`  Best night:  ${c('green', formatDuration(best.duration))} on ${best.date}`);
  }
  if (worst && worst !== best) {
    console.log(`  Shortest:    ${c('red', formatDuration(worst.duration))} on ${worst.date}`);
  }
  
  // Sleep debt calculation (last 7 days)
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  let debtHours = 0;
  let loggedDays = 0;
  dates.forEach(date => {
    const entry = entries.find(e => e.date === date);
    if (entry && entry.duration) {
      loggedDays++;
      const hours = entry.duration.hours + entry.duration.mins / 60;
      if (hours < data.goal) {
        debtHours += data.goal - hours;
      }
    }
  });
  
  console.log();
  if (debtHours > 0) {
    console.log(c('yellow', `  ⚠️  Sleep debt: ${debtHours.toFixed(1)}h over last 7 days`));
  } else if (loggedDays > 0) {
    console.log(c('green', '  ✨ No sleep debt. You\'re well rested!'));
  }
  
  console.log();
}

function setGoal(hours) {
  const h = parseFloat(hours);
  if (isNaN(h) || h < 4 || h > 12) {
    console.log(c('red', '  Goal must be between 4 and 12 hours'));
    return;
  }
  
  const data = loadData();
  data.goal = h;
  saveData(data);
  
  console.log();
  console.log(`  🎯 Sleep goal set to ${c('cyan', h + ' hours')}`);
  console.log();
}

function showDebt() {
  const data = loadData();
  const entries = data.entries || [];
  
  // Calculate over last 30 days
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  let totalDebt = 0;
  let totalSurplus = 0;
  let loggedDays = 0;
  
  console.log();
  console.log(c('bold', '  💤 Sleep Debt Analysis'));
  console.log(c('dim', '  ─────────────────────'));
  console.log();
  
  dates.forEach(date => {
    const entry = entries.find(e => e.date === date);
    if (entry && entry.duration) {
      loggedDays++;
      const hours = entry.duration.hours + entry.duration.mins / 60;
      const diff = hours - data.goal;
      
      if (diff < 0) {
        totalDebt += Math.abs(diff);
      } else {
        totalSurplus += diff;
      }
    }
  });
  
  if (loggedDays === 0) {
    console.log(c('dim', '  No sleep data for the last 30 days'));
    console.log();
    return;
  }
  
  const netDebt = totalDebt - totalSurplus;
  
  console.log(`  Days tracked: ${c('cyan', loggedDays)}/30`);
  console.log(`  Total deficit: ${c('red', totalDebt.toFixed(1) + 'h')}`);
  console.log(`  Total surplus: ${c('green', totalSurplus.toFixed(1) + 'h')}`);
  console.log();
  
  if (netDebt > 0) {
    console.log(c('yellow', `  Net debt: ${netDebt.toFixed(1)}h — catch up on sleep!`));
  } else if (netDebt < 0) {
    console.log(c('green', `  Net surplus: ${Math.abs(netDebt).toFixed(1)}h — you're sleeping well!`));
  } else {
    console.log(c('cyan', '  Balanced sleep — exactly meeting your goal!'));
  }
  
  console.log();
  console.log(c('dim', '  Tip: Consistency matters more than perfection. Same bedtime daily.'));
  console.log();
}

function editLast() {
  const data = loadData();
  const entries = data.entries || [];
  
  if (entries.length === 0) {
    console.log(c('yellow', '  No entries to edit'));
    return;
  }
  
  const last = entries[entries.length - 1];
  console.log();
  console.log(c('bold', '  Last entry:'));
  console.log(`  Date: ${last.date}`);
  console.log(`  Duration: ${formatDuration(last.duration)}`);
  console.log(`  Quality: ${getQualityIcon(last.quality)} ${getQualityLabel(last.quality)}`);
  console.log();
  console.log(c('dim', '  To edit, just log again: nix sleep log 8 4'));
  console.log();
}

// Main
const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd) {
  showStatus();
} else if (cmd === 'log') {
  logSleep(args[1], args[2]);
} else if (cmd === 'bed') {
  setBedtime(args[1]);
} else if (cmd === 'wake') {
  setWaketime(args[1]);
} else if (cmd === 'rate') {
  rateSleep(args[1]);
} else if (cmd === 'week') {
  showWeek();
} else if (cmd === 'avg' || cmd === 'average' || cmd === 'stats') {
  showAverages();
} else if (cmd === 'goal') {
  setGoal(args[1]);
} else if (cmd === 'debt') {
  showDebt();
} else if (cmd === 'edit') {
  editLast();
} else if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
  console.log(`
  ${c('bold', '🌙 Sleep Tracker')}
  
  ${c('dim', 'Usage:')} nix sleep [command] [args]
  
  ${c('bold', 'Commands:')}
    (none)              Show last night's sleep & trends
    log <h> [q]         Log sleep hours and quality (1-5)
    bed <time>          Set bedtime (23:00, 11pm)
    wake <time>         Set wake time (07:00, 7am)
    rate <1-5>          Rate sleep quality
    week                Show last 7 nights
    avg                 Show averages & insights
    goal <h>            Set sleep goal (default: 8)
    debt                Show sleep debt analysis
    edit                View last entry for editing
  
  ${c('bold', 'Quality Scale:')}
    1 = 😴 Terrible  2 = 😫 Poor  3 = 😐 Okay  4 = 🙂 Good  5 = 🤩 Excellent
  
  ${c('bold', 'Examples:')}
    nix sleep                 # Status overview
    nix sleep log 7.5 4       # 7.5 hours, quality 4 (good)
    nix sleep bed 11pm        # Bed at 11:00 PM
    nix sleep wake 6:30       # Wake at 6:30 AM
    nix sleep week            # 7-day view
    nix sleep goal 7.5        # Set 7.5 hour goal
  `);
} else {
  // Try to interpret as hours for quick logging
  const hours = parseFloat(cmd);
  if (!isNaN(hours) && hours > 0 && hours <= 16) {
    logSleep(hours, args[1] || 3);
  } else {
    console.log(c('red', '  Unknown command. Try: nix sleep help'));
  }
}
