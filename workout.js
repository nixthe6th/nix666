#!/usr/bin/env node
/**
 * workout.js - Quick workout logger
 * Usage: nix workout <command> [args]
 * 
 * Commands:
 *   log <exercise> <sets>x<reps> [weight]    Log a workout exercise
 *   log <exercise> <duration>min             Log timed exercise
 *   log <exercise> <distance>km              Log distance exercise
 *   start <name>                             Start a workout session
 *   end [notes]                              End current session
 *   list [today|week|month]                  Show workout history
 *   stats [exercise]                         Show exercise stats/progress
 *   pr [exercise]                            Show or set personal records
 *   routines                                 List saved routines
 *   routine <name>                           Start a saved routine
 *   template <name> <exercises...>           Save a routine template
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'data', 'workouts.json');
const ROUTINES_FILE = path.join(__dirname, 'data', 'workout-routines.json');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

const ICONS = {
  workout: '💪',
  cardio: '🏃',
  lift: '🏋️',
  timer: '⏱️',
  fire: '🔥',
  trophy: '🏆',
  check: '✓',
  arrow: '→'
};

function color(name, text) {
  return `${COLORS[name] || ''}${text}${COLORS.reset}`;
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { workouts: [], activeSession: null, prs: {} };
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { workouts: [], activeSession: null, prs: {} };
  }
}

function saveData(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadRoutines() {
  if (!fs.existsSync(ROUTINES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(ROUTINES_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveRoutines(routines) {
  const dir = path.dirname(ROUTINES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ROUTINES_FILE, JSON.stringify(routines, null, 2));
}

function generateId() {
  return crypto.randomBytes(3).toString('hex');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parseSetsReps(input) {
  const match = input.match(/(\d+)x(\d+)/i);
  if (match) {
    return { sets: parseInt(match[1]), reps: parseInt(match[2]) };
  }
  return null;
}

function parseDuration(input) {
  const match = input.match(/(\d+)\s*(min|m)/i);
  if (match) return { duration: parseInt(match[1]), unit: 'min' };
  return null;
}

function parseDistance(input) {
  const match = input.match(/([\d.]+)\s*(km|mi|m)/i);
  if (match) return { distance: parseFloat(match[1]), unit: match[2].toLowerCase() };
  return null;
}

function startSession(data, name) {
  if (data.activeSession) {
    console.log(color('yellow', '⚠ Session already active: ') + data.activeSession.name);
    console.log(color('dim', `  Started: ${formatDate(data.activeSession.started)}`));
    console.log(color('dim', '  Run "nix workout end" to close it first.'));
    return;
  }
  
  data.activeSession = {
    id: generateId(),
    name,
    started: new Date().toISOString(),
    exercises: []
  };
  saveData(data);
  console.log(color('green', `${ICONS.workout} Started workout: ${name}`));
  console.log(color('dim', `  ID: ${data.activeSession.id}`));
}

function endSession(data, notes = '') {
  if (!data.activeSession) {
    console.log(color('yellow', 'No active workout session.'));
    return;
  }
  
  const session = data.activeSession;
  const ended = new Date();
  const started = new Date(session.started);
  const duration = Math.round((ended - started) / 60000); // minutes
  
  const workout = {
    id: session.id,
    name: session.name,
    date: session.started,
    duration,
    exercises: session.exercises,
    notes
  };
  
  data.workouts.push(workout);
  data.activeSession = null;
  saveData(data);
  
  console.log(color('green', `${ICONS.trophy} Workout complete!`));
  console.log(color('bold', session.name));
  console.log(`  ${ICONS.timer} ${formatDuration(duration)}`);
  console.log(`  ${ICONS.fire} ${session.exercises.length} exercises logged`);
  if (notes) console.log(`  ${color('dim', 'Notes: ' + notes)}`);
}

function logExercise(data, exercise, detail, weight) {
  const setsReps = parseSetsReps(detail);
  const duration = parseDuration(detail);
  const distance = parseDistance(detail);
  
  const entry = {
    exercise: exercise.toLowerCase().replace(/\s+/g, '-'),
    displayName: exercise,
    timestamp: new Date().toISOString(),
    type: setsReps ? 'strength' : duration ? 'timed' : distance ? 'distance' : 'other'
  };
  
  if (setsReps) {
    entry.sets = setsReps.sets;
    entry.reps = setsReps.reps;
    if (weight) entry.weight = parseFloat(weight);
  } else if (duration) {
    entry.duration = duration.duration;
  } else if (distance) {
    entry.distance = distance.distance;
    entry.unit = distance.unit;
  } else {
    entry.detail = detail;
  }
  
  // Check for PR
  const prKey = entry.exercise;
  const currentPR = data.prs[prKey];
  let isPR = false;
  
  if (setsReps && weight) {
    const volume = setsReps.sets * setsReps.reps * parseFloat(weight);
    if (!currentPR || volume > currentPR.volume) {
      data.prs[prKey] = { weight: parseFloat(weight), sets: setsReps.sets, reps: setsReps.reps, volume, date: entry.timestamp };
      isPR = true;
    }
  }
  
  if (data.activeSession) {
    data.activeSession.exercises.push(entry);
    saveData(data);
    console.log(color('green', `${ICONS.check} Logged: ${exercise}`));
  } else {
    // Log as standalone workout
    const workout = {
      id: generateId(),
      name: exercise,
      date: entry.timestamp,
      duration: 0,
      exercises: [entry]
    };
    data.workouts.push(workout);
    saveData(data);
    console.log(color('green', `${ICONS.check} Logged: ${exercise}`));
    console.log(color('dim', '  (No active session — logged as standalone)'));
  }
  
  // Show exercise details
  if (setsReps) {
    const weightStr = weight ? ` @ ${weight}kg` : '';
    console.log(`  ${setsReps.sets}x${setsReps.reps}${weightStr}`);
  } else if (duration) {
    console.log(`  ${duration.duration} minutes`);
  } else if (distance) {
    console.log(`  ${distance.distance}${distance.unit}`);
  }
  
  if (isPR) {
    console.log(color('yellow', `  ${ICONS.trophy} NEW PR!`));
  }
}

function listWorkouts(data, period = 'all') {
  let workouts = data.workouts.slice().reverse();
  
  const now = new Date();
  if (period === 'today') {
    const today = now.toDateString();
    workouts = workouts.filter(w => new Date(w.date).toDateString() === today);
  } else if (period === 'week') {
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    workouts = workouts.filter(w => new Date(w.date) >= weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    workouts = workouts.filter(w => new Date(w.date) >= monthAgo);
  }
  
  if (workouts.length === 0) {
    console.log(color('dim', `No workouts found${period !== 'all' ? ' for ' + period : ''}.`));
    return;
  }
  
  console.log(color('bold', `${ICONS.workout} Workouts${period !== 'all' ? ' (' + period + ')' : ''}:`));
  console.log('');
  
  workouts.forEach(w => {
    console.log(`  ${color('cyan', w.id)}  ${color('yellow', formatDate(w.date))}`);
    console.log(`       ${color('bold', w.name)} ${ICONS.timer} ${formatDuration(w.duration)}`);
    w.exercises.forEach(e => {
      let detail = '';
      if (e.sets && e.reps) {
        detail = `${e.sets}x${e.reps}`;
        if (e.weight) detail += ` @ ${e.weight}kg`;
      } else if (e.duration) {
        detail = `${e.duration}min`;
      } else if (e.distance) {
        detail = `${e.distance}${e.unit}`;
      }
      console.log(`       ${ICONS.arrow} ${e.displayName}${detail ? ' (' + detail + ')' : ''}`);
    });
    console.log('');
  });
}

function showStats(data, exercise = null) {
  if (exercise) {
    const key = exercise.toLowerCase().replace(/\s+/g, '-');
    const exercises = data.workouts.flatMap(w => w.exercises).filter(e => e.exercise === key);
    const pr = data.prs[key];
    
    if (exercises.length === 0) {
      console.log(color('dim', `No data for "${exercise}".`));
      return;
    }
    
    console.log(color('bold', `${ICONS.lift} Stats: ${exercise}`));
    console.log(`  Total sessions: ${exercises.length}`);
    
    if (pr) {
      console.log(color('yellow', `  ${ICONS.trophy} PR: ${pr.weight}kg x ${pr.reps} (${pr.sets} sets)`));
      console.log(`     Volume: ${pr.volume}kg | ${new Date(pr.date).toLocaleDateString()}`);
    }
    
    // Show recent progression
    const recent = exercises.slice(-5);
    console.log(color('dim', '\n  Recent:'));
    recent.forEach(e => {
      const date = new Date(e.timestamp).toLocaleDateString();
      let detail = '';
      if (e.weight) detail = `${e.sets}x${e.reps} @ ${e.weight}kg`;
      else if (e.duration) detail = `${e.duration}min`;
      console.log(`    ${date}: ${detail || e.detail || '-'}`);
    });
  } else {
    // Overall stats
    console.log(color('bold', `${ICONS.workout} Overall Stats`));
    console.log(`  Total workouts: ${data.workouts.length}`);
    
    const totalDuration = data.workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    console.log(`  Total time: ${formatDuration(totalDuration)}`);
    
    const allExercises = data.workouts.flatMap(w => w.exercises);
    const uniqueExercises = [...new Set(allExercises.map(e => e.exercise))];
    console.log(`  Unique exercises: ${uniqueExercises.length}`);
    
    // PRs
    const prCount = Object.keys(data.prs).length;
    if (prCount > 0) {
      console.log(`  ${ICONS.trophy} Personal records: ${prCount}`);
    }
    
    // This week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = data.workouts.filter(w => new Date(w.date) >= weekAgo).length;
    console.log(`  This week: ${thisWeek} workout${thisWeek !== 1 ? 's' : ''}`);
  }
}

function showPRs(data, exercise = null) {
  if (exercise) {
    const key = exercise.toLowerCase().replace(/\s+/g, '-');
    const pr = data.prs[key];
    if (pr) {
      console.log(color('bold', `${ICONS.trophy} PR: ${exercise}`));
      console.log(`  Weight: ${pr.weight}kg`);
      console.log(`  Sets x Reps: ${pr.sets}x${pr.reps}`);
      console.log(`  Volume: ${pr.volume}kg`);
      console.log(`  Date: ${new Date(pr.date).toLocaleDateString()}`);
    } else {
      console.log(color('dim', `No PR recorded for "${exercise}".`));
    }
  } else {
    const prs = Object.entries(data.prs);
    if (prs.length === 0) {
      console.log(color('dim', 'No personal records yet. Keep lifting!'));
      return;
    }
    
    console.log(color('bold', `${ICONS.trophy} Personal Records`));
    console.log('');
    prs.forEach(([exercise, pr]) => {
      console.log(`  ${color('cyan', exercise)}`);
      console.log(`    ${pr.weight}kg x ${pr.reps} (${pr.sets} sets) = ${pr.volume}kg`);
      console.log(`    ${color('dim', new Date(pr.date).toLocaleDateString())}`);
    });
  }
}

function listRoutines() {
  const routines = loadRoutines();
  const names = Object.keys(routines);
  
  if (names.length === 0) {
    console.log(color('dim', 'No saved routines.'));
    console.log(color('dim', 'Create one: nix workout template "Upper Body" "Bench" "Rows" "Press"'));
    return;
  }
  
  console.log(color('bold', `${ICONS.workout} Saved Routines:`));
  names.forEach(name => {
    const exercises = routines[name];
    console.log(`  ${color('cyan', name)} — ${exercises.length} exercises`);
    exercises.forEach(e => console.log(`    ${ICONS.arrow} ${e}`));
  });
}

function startRoutine(data, name) {
  const routines = loadRoutines();
  const routine = routines[name.toLowerCase()];
  
  if (!routine) {
    console.log(color('red', `Routine "${name}" not found.`));
    console.log('Available:', Object.keys(routines).join(', ') || 'none');
    return;
  }
  
  startSession(data, name);
  console.log(color('dim', 'Exercises in this routine:'));
  routine.forEach(e => console.log(`  ${ICONS.arrow} ${e}`));
}

function saveTemplate(name, exercises) {
  const routines = loadRoutines();
  routines[name.toLowerCase()] = exercises;
  saveRoutines(routines);
  console.log(color('green', `${ICONS.check} Saved routine: ${name}`));
  console.log(`  ${exercises.length} exercises`);
}

function showHelp() {
  console.log(`
${color('bold', 'nix workout')} — Quick workout logger

${color('cyan', 'Usage:')}
  nix workout start <name>              Start a workout session
  nix workout log <ex> <sets>x<reps> [kg]  Log strength exercise
  nix workout log <ex> <min>min            Log timed exercise
  nix workout log <ex> <km>km              Log distance exercise
  nix workout end [notes]               End current session
  nix workout list [today|week|month]   Show history
  nix workout stats [exercise]          Show stats/progress
  nix workout pr [exercise]             Show personal records
  nix workout routines                  List saved routines
  nix workout routine <name>            Start a saved routine
  nix workout template <name> <ex...>   Save a routine template

${color('cyan', 'Examples:')}
  nix workout start "Push Day"
  nix workout log bench 3x8 80
  nix workout log running 30min
  nix workout log swim 2km
  nix workout end "Felt strong today"
  nix workout template "Pull Day" "Pullups" "Rows" "Curls"
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    showHelp();
    return;
  }
  
  const data = loadData();
  const command = args[0];
  
  switch (command) {
    case 'start':
      if (!args[1]) {
        console.log(color('red', 'Usage: nix workout start <name>'));
        return;
      }
      startSession(data, args.slice(1).join(' '));
      break;
      
    case 'end':
      endSession(data, args.slice(1).join(' '));
      break;
      
    case 'log':
      if (args.length < 3) {
        console.log(color('red', 'Usage: nix workout log <exercise> <detail> [weight]'));
        return;
      }
      logExercise(data, args[1], args[2], args[3]);
      break;
      
    case 'list':
      listWorkouts(data, args[1]);
      break;
      
    case 'stats':
      showStats(data, args[1]);
      break;
      
    case 'pr':
      showPRs(data, args[1]);
      break;
      
    case 'routines':
      listRoutines();
      break;
      
    case 'routine':
      if (!args[1]) {
        console.log(color('red', 'Usage: nix workout routine <name>'));
        return;
      }
      startRoutine(data, args[1]);
      break;
      
    case 'template':
      if (args.length < 3) {
        console.log(color('red', 'Usage: nix workout template <name> <exercise1> [ex2...]'));
        return;
      }
      saveTemplate(args[1], args.slice(2));
      break;
      
    default:
      console.log(color('red', `Unknown command: ${command}`));
      console.log('Run "nix workout" for help');
  }
}

main();
