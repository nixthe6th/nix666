#!/usr/bin/env node
/**
 * correlate.js - Find patterns and correlations in your tracked data
 * Usage: nix correlate [command] [options]
 * 
 * Analyzes relationships between:
 * - Sleep quality vs energy levels
 * - Mood vs productivity
 * - Habit completion vs outcomes
 * - Water intake vs focus
 * 
 * Examples:
 *   nix correlate              # Show all correlations
 *   nix correlate sleep        # Sleep-related insights
 *   nix correlate mood         # Mood pattern analysis
 *   nix correlate habits       # Habit impact analysis
 *   nix correlate --days 30    # Analyze last 30 days only
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

// Data loading helpers
function loadJson(filename, defaultValue = {}) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return defaultValue;
  }
}

function parseDate(dateStr) {
  return new Date(dateStr).toISOString().split('T')[0];
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// Load all data sources
function loadAllData(daysFilter = null) {
  const cutoffDate = daysFilter ? daysAgo(daysFilter) : null;
  
  const sleep = loadJson('sleep.json', { entries: [] });
  const energy = loadJson('energy.json', { entries: [] });
  const mood = loadJson('mood.json', { entries: [] });
  const habits = loadJson('habits.json', { habits: [], history: {} });
  const water = loadJson('water.json', { entries: [], goal: 2500 });
  const workouts = loadJson('workouts.json', { entries: [] });
  const distractions = { entries: loadJson('distractions.json', []) };
  const gratitude = loadJson('gratitude.json', { entries: [] });
  
  // Filter by date if specified
  const filterByDate = (entries, dateField = 'date') => {
    if (!cutoffDate || !entries) return entries || [];
    return entries.filter(e => e[dateField] >= cutoffDate);
  };
  
  return {
    sleep: { ...sleep, entries: filterByDate(sleep.entries) },
    energy: { ...energy, entries: filterByDate(energy.entries) },
    mood: { ...mood, entries: filterByDate(mood.entries) },
    habits,
    water: { ...water, entries: filterByDate(water.entries, 'date') },
    workouts: { ...workouts, entries: filterByDate(workouts.entries, 'date') },
    distractions: { ...distractions, entries: filterByDate(distractions.entries, 'date') },
    gratitude: { ...gratitude, entries: filterByDate(gratitude.entries, 'date') }
  };
}

// Statistical helpers
function mean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function correlation(x, y) {
  const n = x.length;
  if (n !== y.length || n < 3) return null;
  
  const meanX = mean(x);
  const meanY = mean(y);
  
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  
  const denom = Math.sqrt(denX * denY);
  return denom === 0 ? 0 : num / denom;
}

function percentDiff(a, b) {
  if (b === 0) return 0;
  return ((a - b) / b) * 100;
}

// Correlation analysis functions
function analyzeSleepEnergy(data) {
  const sleepByDate = {};
  data.sleep.entries.forEach(e => {
    sleepByDate[e.date] = e.hours;
  });
  
  const energyByDate = {};
  data.energy.entries.forEach(e => {
    if (!energyByDate[e.date]) energyByDate[e.date] = [];
    energyByDate[e.date].push(e.level);
  });
  
  // Get days with both sleep and energy data
  const paired = [];
  Object.keys(sleepByDate).forEach(date => {
    if (energyByDate[date]) {
      paired.push({
        date,
        sleep: sleepByDate[date],
        energy: mean(energyByDate[date])
      });
    }
  });
  
  if (paired.length < 3) return null;
  
  const sleepValues = paired.map(p => p.sleep);
  const energyValues = paired.map(p => p.energy);
  const corr = correlation(sleepValues, energyValues);
  
  // Categorize sleep quality
  const goodSleepDays = paired.filter(p => p.sleep >= 7);
  const poorSleepDays = paired.filter(p => p.sleep < 6);
  
  return {
    correlation: corr,
    sampleSize: paired.length,
    goodSleepAvg: mean(goodSleepDays.map(p => p.energy)),
    poorSleepAvg: mean(poorSleepDays.map(p => p.energy)),
    goodSleepCount: goodSleepDays.length,
    poorSleepCount: poorSleepDays.length
  };
}

function analyzeMoodHabits(data) {
  if (!data.habits.history || data.mood.entries.length === 0) return null;
  
  const moodByDate = {};
  data.mood.entries.forEach(e => {
    moodByDate[e.date] = e.mood;
  });
  
  const habitMoodMap = {};
  
  Object.entries(data.habits.history).forEach(([habitId, dates]) => {
    const habit = data.habits.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const completedDays = Object.keys(dates).filter(d => dates[d]);
    const moodOnCompleted = completedDays.map(d => moodByDate[d]).filter(m => m !== undefined);
    const allMoodDays = Object.keys(moodByDate);
    const moodOnNotCompleted = allMoodDays
      .filter(d => !completedDays.includes(d))
      .map(d => moodByDate[d]);
    
    if (moodOnCompleted.length >= 2 && moodOnNotCompleted.length >= 2) {
      habitMoodMap[habit.name] = {
        withHabit: mean(moodOnCompleted),
        withoutHabit: mean(moodOnNotCompleted),
        completedDays: moodOnCompleted.length,
        missedDays: moodOnNotCompleted.length
      };
    }
  });
  
  return habitMoodMap;
}

function analyzeWaterEnergy(data) {
  const waterByDate = {};
  data.water.entries.forEach(e => {
    if (!waterByDate[e.date]) waterByDate[e.date] = 0;
    waterByDate[e.date] += e.amount;
  });
  
  const energyByDate = {};
  data.energy.entries.forEach(e => {
    if (!energyByDate[e.date]) energyByDate[e.date] = [];
    energyByDate[e.date].push(e.level);
  });
  
  const paired = [];
  Object.keys(waterByDate).forEach(date => {
    if (energyByDate[date]) {
      paired.push({
        date,
        water: waterByDate[date],
        energy: mean(energyByDate[date])
      });
    }
  });
  
  if (paired.length < 3) return null;
  
  const hydratedDays = paired.filter(p => p.water >= 2000);
  const dehydratedDays = paired.filter(p => p.water < 1500);
  
  return {
    sampleSize: paired.length,
    hydratedAvg: mean(hydratedDays.map(p => p.energy)),
    dehydratedAvg: mean(dehydratedDays.map(p => p.energy)),
    hydratedCount: hydratedDays.length,
    dehydratedCount: dehydratedDays.length
  };
}

function analyzeWorkoutMood(data) {
  if (!data.workouts.entries || data.mood.entries.length === 0) return null;
  
  const workoutDays = new Set(data.workouts.entries.map(e => e.date));
  const moodByDate = {};
  data.mood.entries.forEach(e => {
    moodByDate[e.date] = e.mood;
  });
  
  const workoutMoods = [];
  const restMoods = [];
  
  Object.keys(moodByDate).forEach(date => {
    if (workoutDays.has(date)) {
      workoutMoods.push(moodByDate[date]);
    } else {
      restMoods.push(moodByDate[date]);
    }
  });
  
  if (workoutMoods.length < 2 || restMoods.length < 2) return null;
  
  return {
    workoutAvg: mean(workoutMoods),
    restAvg: mean(restMoods),
    workoutDays: workoutMoods.length,
    restDays: restMoods.length
  };
}

function analyzeGratitudeImpact(data) {
  if (!data.gratitude.entries || data.mood.entries.length === 0) return null;
  
  const gratitudeDays = new Set(data.gratitude.entries.map(e => e.date));
  const moodByDate = {};
  data.mood.entries.forEach(e => {
    moodByDate[e.date] = e.mood;
  });
  
  const withGratitude = [];
  const withoutGratitude = [];
  
  Object.keys(moodByDate).forEach(date => {
    if (gratitudeDays.has(date)) {
      withGratitude.push(moodByDate[date]);
    } else {
      withoutGratitude.push(moodByDate[date]);
    }
  });
  
  if (withGratitude.length < 2 || withoutGratitude.length < 2) return null;
  
  return {
    withGratitude: mean(withGratitude),
    withoutGratitude: mean(withoutGratitude),
    gratitudeDays: withGratitude.length,
    nonGratitudeDays: withoutGratitude.length
  };
}

function analyzeDistractionPatterns(data) {
  if (!data.distractions.entries || !Array.isArray(data.distractions.entries)) return null;
  
  const bySource = {};
  data.distractions.entries.forEach(d => {
    const source = d.source || 'unknown';
    if (!bySource[source]) bySource[source] = 0;
    bySource[source]++;
  });
  
  const sorted = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return {
    total: data.distractions.entries.length,
    bySource: sorted
  };
}

// Output formatters
function formatCorrelation(corr) {
  if (corr === null) return `${COLORS.dim}insufficient data${COLORS.reset}`;
  const strength = Math.abs(corr);
  const color = strength > 0.5 ? COLORS.green : strength > 0.3 ? COLORS.yellow : COLORS.dim;
  const direction = corr > 0 ? 'positive' : 'negative';
  return `${color}${(corr * 100).toFixed(0)}% ${direction}${COLORS.reset}`;
}

function formatDiff(value, base) {
  const diff = percentDiff(value, base);
  const color = diff > 0 ? COLORS.green : diff < 0 ? COLORS.red : COLORS.dim;
  const sign = diff > 0 ? '+' : '';
  return `${color}${sign}${diff.toFixed(0)}%${COLORS.reset}`;
}

function showSleepAnalysis(result) {
  if (!result) {
    console.log(`  ${COLORS.dim}Need at least 3 days of sleep + energy data${COLORS.reset}`);
    return;
  }
  
  console.log(`  ${COLORS.cyan}Sleep-Energy Correlation:${COLORS.reset} ${formatCorrelation(result.correlation)}`);
  console.log(`  ${COLORS.dim}Based on ${result.sampleSize} days of data${COLORS.reset}`);
  console.log('');
  
  if (result.goodSleepCount > 0 && result.poorSleepCount > 0) {
    const diff = formatDiff(result.goodSleepAvg, result.poorSleepAvg);
    console.log(`  ${COLORS.green}Good sleep nights (7h+)${COLORS.reset}: ${result.goodSleepAvg.toFixed(1)}/5 energy`);
    console.log(`  ${COLORS.red}Poor sleep nights (<6h)${COLORS.reset}: ${result.poorSleepAvg.toFixed(1)}/5 energy`);
    console.log(`  ${COLORS.bold}Difference:${COLORS.reset} ${diff} energy on well-rested days`);
  }
}

function showHabitMoodAnalysis(results) {
  if (!results || Object.keys(results).length === 0) {
    console.log(`  ${COLORS.dim}Need more habit + mood data to analyze${COLORS.reset}`);
    return;
  }
  
  console.log(`  ${COLORS.cyan}Impact on Daily Mood:${COLORS.reset}`);
  Object.entries(results).forEach(([habit, data]) => {
    const diff = formatDiff(data.withHabit, data.withoutHabit);
    console.log(`    ${COLORS.yellow}•${COLORS.reset} ${habit}: ${diff} mood when completed`);
  });
}

function showWaterAnalysis(result) {
  if (!result) {
    console.log(`  ${COLORS.dim}Need more water + energy data${COLORS.reset}`);
    return;
  }
  
  if (result.hydratedCount > 0 && result.dehydratedCount > 0) {
    const diff = formatDiff(result.hydratedAvg, result.dehydratedAvg);
    console.log(`  ${COLORS.green}Well hydrated days (2L+)${COLORS.reset}: ${result.hydratedAvg.toFixed(1)}/5 energy`);
    console.log(`  ${COLORS.red}Low hydration days (<1.5L)${COLORS.reset}: ${result.dehydratedAvg.toFixed(1)}/5 energy`);
    console.log(`  ${COLORS.bold}Difference:${COLORS.reset} ${diff} energy when hydrated`);
  }
}

function showWorkoutAnalysis(result) {
  if (!result) {
    console.log(`  ${COLORS.dim}Need more workout + mood data${COLORS.reset}`);
    return;
  }
  
  const diff = formatDiff(result.workoutAvg, result.restAvg);
  console.log(`  ${COLORS.green}Workout days${COLORS.reset}: ${result.workoutAvg.toFixed(1)}/5 mood avg`);
  console.log(`  ${COLORS.yellow}Rest days${COLORS.reset}: ${result.restAvg.toFixed(1)}/5 mood avg`);
  console.log(`  ${COLORS.bold}Difference:${COLORS.reset} ${diff} mood on workout days`);
}

function showGratitudeAnalysis(result) {
  if (!result) {
    console.log(`  ${COLORS.dim}Need more gratitude + mood data${COLORS.reset}`);
    return;
  }
  
  const diff = formatDiff(result.withGratitude, result.withoutGratitude);
  console.log(`  ${COLORS.green}With gratitude practice${COLORS.reset}: ${result.withGratitude.toFixed(1)}/5 mood avg`);
  console.log(`  ${COLORS.yellow}Without gratitude${COLORS.reset}: ${result.withoutGratitude.toFixed(1)}/5 mood avg`);
  console.log(`  ${COLORS.bold}Difference:${COLORS.reset} ${diff} mood with gratitude practice`);
}

function showDistractionAnalysis(result) {
  if (!result || result.total === 0) {
    console.log(`  ${COLORS.dim}No distraction data logged yet${COLORS.reset}`);
    return;
  }
  
  console.log(`  ${COLORS.cyan}Total distractions logged:${COLORS.reset} ${result.total}`);
  console.log(`  ${COLORS.dim}Top sources:${COLORS.reset}`);
  result.bySource.forEach(([source, count], i) => {
    const icon = i === 0 ? '🔴' : i === 1 ? '🟡' : '🔵';
    console.log(`    ${icon} ${source}: ${count} times`);
  });
}

// Main report
function showFullReport(days) {
  const data = loadAllData(days);
  const timeWindow = days ? ` (last ${days} days)` : '';
  
  console.log(`
${COLORS.bold}${COLORS.cyan}📊 NIX Data Correlation Report${timeWindow}${COLORS.reset}
`);
  
  // Sleep section
  console.log(`${COLORS.bold}😴 Sleep Impact${COLORS.reset}`);
  console.log(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}`);
  showSleepAnalysis(analyzeSleepEnergy(data));
  console.log('');
  
  // Habits section
  console.log(`${COLORS.bold}✅ Habit Impact on Mood${COLORS.reset}`);
  console.log(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}`);
  showHabitMoodAnalysis(analyzeMoodHabits(data));
  console.log('');
  
  // Hydration section
  console.log(`${COLORS.bold}💧 Hydration Impact${COLORS.reset}`);
  console.log(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}`);
  showWaterAnalysis(analyzeWaterEnergy(data));
  console.log('');
  
  // Workout section
  console.log(`${COLORS.bold}💪 Exercise Impact${COLORS.reset}`);
  console.log(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}`);
  showWorkoutAnalysis(analyzeWorkoutMood(data));
  console.log('');
  
  // Gratitude section
  console.log(`${COLORS.bold}🙏 Gratitude Impact${COLORS.reset}`);
  console.log(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}`);
  showGratitudeAnalysis(analyzeGratitudeImpact(data));
  console.log('');
  
  // Distraction section
  console.log(`${COLORS.bold}⚠️ Distraction Patterns${COLORS.reset}`);
  console.log(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}`);
  showDistractionAnalysis(analyzeDistractionPatterns(data));
  console.log('');
  
  // Summary insights
  console.log(`${COLORS.bold}💡 Key Insights${COLORS.reset}`);
  console.log(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}`);
  
  const insights = [];
  const sleepEnergy = analyzeSleepEnergy(data);
  if (sleepEnergy && sleepEnergy.goodSleepAvg > sleepEnergy.poorSleepAvg + 0.5) {
    insights.push(`Good sleep correlates with ${((sleepEnergy.goodSleepAvg - sleepEnergy.poorSleepAvg) * 20).toFixed(0)}% higher energy`);
  }
  
  const workoutMood = analyzeWorkoutMood(data);
  if (workoutMood && workoutMood.workoutAvg > workoutMood.restAvg + 0.3) {
    insights.push('Exercise days show improved mood scores');
  }
  
  const gratitude = analyzeGratitudeImpact(data);
  if (gratitude && gratitude.withGratitude > gratitude.withoutGratitude + 0.3) {
    insights.push('Gratitude practice correlates with better mood');
  }
  
  if (insights.length === 0) {
    console.log(`  ${COLORS.dim}Keep tracking to unlock personalized insights${COLORS.reset}`);
    console.log(`  ${COLORS.dim}Minimum 7 days of data recommended${COLORS.reset}`);
  } else {
    insights.forEach(i => console.log(`  ${COLORS.green}•${COLORS.reset} ${i}`));
  }
  
  console.log('');
}

// Section-specific reports
function showSleepReport(days) {
  const data = loadAllData(days);
  console.log(`\n${COLORS.bold}${COLORS.cyan}😴 Sleep Analysis${COLORS.reset}\n`);
  showSleepAnalysis(analyzeSleepEnergy(data));
  
  // Additional sleep stats
  if (data.sleep.entries.length > 0) {
    const hours = data.sleep.entries.map(e => e.hours);
    const avgSleep = mean(hours);
    console.log(`\n  ${COLORS.cyan}Average sleep:${COLORS.reset} ${avgSleep.toFixed(1)} hours`);
    console.log(`  ${COLORS.cyan}Sleep range:${COLORS.reset} ${Math.min(...hours).toFixed(1)} - ${Math.max(...hours).toFixed(1)} hours`);
  }
  console.log('');
}

function showMoodReport(days) {
  const data = loadAllData(days);
  console.log(`\n${COLORS.bold}${COLORS.cyan}🎭 Mood Analysis${COLORS.reset}\n`);
  
  if (data.mood.entries.length === 0) {
    console.log(`  ${COLORS.dim}No mood data logged yet${COLORS.reset}`);
    return;
  }
  
  const moods = data.mood.entries.map(e => e.mood);
  const avgMood = mean(moods);
  console.log(`  ${COLORS.cyan}Average mood:${COLORS.reset} ${avgMood.toFixed(1)}/5`);
  console.log(`  ${COLORS.cyan}Mood range:${COLORS.reset} ${Math.min(...moods)} - ${Math.max(...moods)}`);
  
  showHabitMoodAnalysis(analyzeMoodHabits(data));
  showWorkoutAnalysis(analyzeWorkoutMood(data));
  showGratitudeAnalysis(analyzeGratitudeImpact(data));
  console.log('');
}

function showHabitsReport(days) {
  const data = loadAllData(days);
  console.log(`\n${COLORS.bold}${COLORS.cyan}✅ Habits Impact Analysis${COLORS.reset}\n`);
  
  if (!data.habits.habits || data.habits.habits.length === 0) {
    console.log(`  ${COLORS.dim}No habits configured yet${COLORS.reset}`);
    return;
  }
  
  console.log(`  ${COLORS.cyan}Tracking ${data.habits.habits.length} habits:${COLORS.reset}`);
  data.habits.habits.forEach(h => {
    const history = data.habits.history[h.id] || {};
    const completedDays = Object.values(history).filter(v => v).length;
    console.log(`    • ${h.name}: ${completedDays} days completed`);
  });
  
  console.log('');
  showHabitMoodAnalysis(analyzeMoodHabits(data));
  console.log('');
}

// Help text
function showHelp() {
  console.log(`
${COLORS.bold}correlate.js${COLORS.reset} - Find patterns in your tracked data

${COLORS.bold}Usage:${COLORS.reset}
  nix correlate [command] [options]

${COLORS.bold}Commands:${COLORS.reset}
  (none)         Full correlation report
  sleep          Sleep quality analysis
  mood           Mood pattern analysis
  habits         Habit impact analysis

${COLORS.bold}Options:${COLORS.reset}
  --days <n>     Analyze last n days only
  --help, -h     Show this help

${COLORS.bold}Examples:${COLORS.reset}
  nix correlate              # All correlations
  nix correlate sleep        # Sleep insights only
  nix correlate mood --days 30   # Mood from last month
  nix correlate --days 7     # Week of data only

${COLORS.bold}Analyzes:${COLORS.reset}
  • Sleep → Energy correlation
  • Habits → Mood impact
  • Hydration → Energy
  • Exercise → Mood
  • Gratitude → Mood
  • Distraction patterns
`);
}

// Main entry
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // Parse --days flag
  let days = null;
  const daysIndex = args.indexOf('--days');
  if (daysIndex !== -1 && args[daysIndex + 1]) {
    days = parseInt(args[daysIndex + 1], 10);
    args.splice(daysIndex, 2);
  }
  
  const command = args[0];
  
  switch (command) {
    case 'sleep':
      showSleepReport(days);
      break;
    case 'mood':
      showMoodReport(days);
      break;
    case 'habits':
      showHabitsReport(days);
      break;
    case undefined:
    case 'all':
      showFullReport(days);
      break;
    default:
      console.log(`${COLORS.red}Unknown command:${COLORS.reset} ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
