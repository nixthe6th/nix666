#!/usr/bin/env node
/**
 * streak.js - Git activity streak tracker
 * Usage: streak [options]
 * 
 * Shows consecutive days of git commits
 * Motivates maintaining momentum
 */

const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

function getCommitDates() {
  try {
    const output = execSync(
      'git log --pretty=format:"%ad" --date=short --all',
      { encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getUniqueDays(dates) {
  return [...new Set(dates)].sort().reverse();
}

function calculateStreak(days) {
  if (days.length === 0) return { current: 0, longest: 0 };
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let current = 0;
  let longest = 0;
  let tempStreak = 1;
  
  // Check if streak is active (committed today or yesterday)
  const mostRecent = days[0];
  const isActive = mostRecent === today || mostRecent === yesterday;
  
  if (isActive) {
    current = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      const diffDays = (prev - curr) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        current++;
      } else {
        break;
      }
    }
  }
  
  // Calculate longest streak
  longest = 1;
  tempStreak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays = (prev - curr) / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      tempStreak++;
      longest = Math.max(longest, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  
  return { current, longest, isActive, lastCommit: days[0] };
}

function getCommitsToday() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const output = execSync(
      `git log --oneline --since="${today}T00:00:00" 2>/dev/null | wc -l`,
      { encoding: 'utf8' }
    );
    return parseInt(output.trim()) || 0;
  } catch {
    return 0;
  }
}

function getStreakMessage(streak) {
  if (streak === 0) return "Start today. Day 1 begins now.";
  if (streak === 1) return "First day down. Keep it going!";
  if (streak < 3) return "Building momentum. Don't break the chain!";
  if (streak < 7) return "Mid-streak energy. You're proving consistency!";
  if (streak < 14) return "Week+ strong. This is who you are now.";
  if (streak < 30) return "Unstoppable. The compound effect is real.";
  return "Legendary streak. You're a different breed.";
}

function getStreakEmoji(streak) {
  if (streak === 0) return '💤';
  if (streak < 3) return '🔥';
  if (streak < 7) return '⚡';
  if (streak < 14) return '🚀';
  if (streak < 30) return '💎';
  return '👑';
}

function showCalendar(days, streak) {
  const today = new Date();
  const weeks = 12; // Show last 12 weeks
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  console.log(COLORS.gray + '\n   ' + dayNames.join(' ') + COLORS.reset);
  
  for (let w = weeks - 1; w >= 0; w--) {
    let weekStr = '   ';
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      const dateStr = date.toISOString().split('T')[0];
      
      if (days.includes(dateStr)) {
        weekStr += COLORS.green + '● ' + COLORS.reset;
      } else if (date > today) {
        weekStr += '  ';
      } else {
        weekStr += COLORS.gray + '○ ' + COLORS.reset;
      }
    }
    console.log(weekStr);
  }
  console.log('');
}

function showBanner() {
  console.log('');
  console.log(COLORS.cyan + '╔══════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.cyan + '║' + COLORS.reset + COLORS.bold + '  🔥 STREAK TRACKER 🔥  ' + COLORS.reset + COLORS.cyan + '                  ║' + COLORS.reset);
  console.log(COLORS.cyan + '╚══════════════════════════════════════════╝' + COLORS.reset);
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  const showCal = args.includes('--calendar') || args.includes('-c');
  
  const dates = getCommitDates();
  const days = getUniqueDays(dates);
  const streak = calculateStreak(days);
  const todayCommits = getCommitsToday();
  
  showBanner();
  
  // Main streak display
  const emoji = getStreakEmoji(streak.current);
  console.log(`   ${emoji}  ${COLORS.bold}Current Streak: ${COLORS.cyan}${streak.current} days${COLORS.reset}`);
  console.log(`   💎  Longest Streak: ${COLORS.magenta}${streak.longest} days${COLORS.reset}`);
  console.log('');
  
  // Today's status
  if (todayCommits > 0) {
    console.log(COLORS.green + '   ✅ Committed today (' + todayCommits + ')' + COLORS.reset);
  } else {
    console.log(COLORS.yellow + '   ⏳ No commits yet today' + COLORS.reset);
  }
  console.log('');
  
  // Motivational message
  const message = getStreakMessage(streak.current);
  console.log('   ' + COLORS.yellow + message + COLORS.reset);
  console.log('');
  
  // Calendar visualization
  if (showCal || streak.current > 0) {
    showCalendar(days, streak);
  }
  
  // Footer
  if (!streak.isActive && streak.current === 0) {
    console.log(COLORS.gray + '   Tip: Make a commit to start your streak!' + COLORS.reset);
  } else if (todayCommits === 0) {
    console.log(COLORS.gray + '   Tip: Commit something today to keep the streak alive!' + COLORS.reset);
  }
  console.log('');
}

main();
