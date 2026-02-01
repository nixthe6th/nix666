#!/usr/bin/env node

/**
 * calexport.js — Calendar export for sprints
 * 
 * Export sprints to .ics format for import into:
 * - Google Calendar
 * - Apple Calendar  
 * - Outlook
 * - Any iCalendar-compatible app
 * 
 * Usage:
 *   nix calexport                    # Export all sprints to stdout
 *   nix calexport --file sprints.ics # Save to file
 *   nix calexport --completed        # Only completed sprints
 *   nix calexport --current          # Only current sprint
 *   nix calexport --since 2026-01-01 # Sprints after date
 *   nix calexport --days 30          # Last 30 days
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'sprints.json');

// ANSI colors
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  red: '\x1b[31m'
};

function log(...args) {
  console.log(...args);
}

function error(msg) {
  console.error(`${C.red}Error: ${msg}${C.reset}`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    completed: false,
    current: false,
    since: null,
    until: null,
    days: null,
    format: 'ics',
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--file':
      case '-f':
        options.file = args[++i];
        break;
      case '--completed':
      case '-c':
        options.completed = true;
        break;
      case '--current':
        options.current = true;
        break;
      case '--since':
      case '-s':
        options.since = new Date(args[++i]);
        if (isNaN(options.since)) error('Invalid since date. Use YYYY-MM-DD');
        break;
      case '--until':
      case '-u':
        options.until = new Date(args[++i]);
        if (isNaN(options.until)) error('Invalid until date. Use YYYY-MM-DD');
        break;
      case '--days':
      case '-d':
        options.days = parseInt(args[++i], 10);
        if (isNaN(options.days)) error('Invalid days value');
        break;
      case '--json':
        options.format = 'json';
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          options.file = arg;
        }
    }
  }

  return options;
}

function showHelp() {
  log(`
${C.blue}nix calexport${C.reset} — Export sprints to calendar format

${C.yellow}Usage:${C.reset}
  nix calexport [options] [output-file]

${C.yellow}Options:${C.reset}
  -f, --file <path>     Save to file (default: stdout)
  -c, --completed       Only completed sprints
  --current             Only current sprint
  -s, --since <date>    Sprints starting after YYYY-MM-DD
  -u, --until <date>    Sprints starting before YYYY-MM-DD
  -d, --days <n>        Last n days
  --json                Output as JSON instead of ICS
  -h, --help            Show this help

${C.yellow}Examples:${C.reset}
  nix calexport                              # Print ICS to stdout
  nix calexport -f sprints.ics               # Save to file
  nix calexport --completed -f done.ics      # Export completed only
  nix calexport --since 2026-01-01           # Sprints from Jan 1
  nix calexport -d 30 -f recent.ics          # Last 30 days

${C.yellow}Importing:${C.reset}
  ${C.gray}Google Calendar:${C.reset} Settings → Import & Export → Import
  ${C.gray}Apple Calendar:${C.reset} File → Import → Select .ics file
  ${C.gray}Outlook:${C.reset} File → Open & Export → Import/Export
`);
}

function loadSprints() {
  if (!fs.existsSync(DATA_FILE)) {
    error(`No sprints file found at ${DATA_FILE}`);
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return data.sprints || [];
  } catch (e) {
    error(`Failed to parse sprints.json: ${e.message}`);
  }
}

function filterSprints(sprints, options) {
  let filtered = [...sprints];

  if (options.completed) {
    filtered = filtered.filter(s => s.status === 'completed');
  }

  if (options.current) {
    filtered = filtered.filter(s => s.status === 'active' || s.status === 'in-progress');
  }

  if (options.since) {
    filtered = filtered.filter(s => {
      const date = s.started_at ? new Date(s.started_at) : new Date(s.date);
      return date >= options.since;
    });
  }

  if (options.until) {
    filtered = filtered.filter(s => {
      const date = s.started_at ? new Date(s.started_at) : new Date(s.date);
      return date <= options.until;
    });
  }

  if (options.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - options.days);
    filtered = filtered.filter(s => {
      const date = s.started_at ? new Date(s.started_at) : new Date(s.date);
      return date >= cutoff;
    });
  }

  // Sort by date ascending
  return filtered.sort((a, b) => {
    const dateA = a.started_at ? new Date(a.started_at) : new Date(a.date);
    const dateB = b.started_at ? new Date(b.started_at) : new Date(b.date);
    return dateA - dateB;
  });
}

function formatDateForICS(date) {
  // Format: YYYYMMDDTHHMMSSZ (UTC)
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatDateOnlyForICS(dateStr) {
  // For all-day events: YYYYMMDD
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

function escapeICS(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function generateICS(sprints) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NIX//Sprint Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:NIX Sprints',
    'X-WR-TIMEZONE:UTC',
    ''
  ];

  const now = formatDateForICS(new Date());
  const uidBase = 'sprint-';

  sprints.forEach((sprint, idx) => {
    const startDate = sprint.started_at ? new Date(sprint.started_at) : new Date(sprint.date);
    const endDate = sprint.completed_at ? new Date(sprint.completed_at) : startDate;
    
    // Default to 1 hour duration if no completion time
    const duration = sprint.completed_at 
      ? (endDate - startDate) / 1000 / 60 // minutes
      : 60;
    
    // Ensure at least 30 min duration
    const finalDuration = Math.max(duration, 30);
    
    // End date for the event
    const eventEnd = new Date(startDate.getTime() + finalDuration * 60 * 1000);

    const uid = `${uidBase}${sprint.number}-${startDate.toISOString().split('T')[0]}@nix666.dev`;
    const summary = `Sprint #${sprint.number}: ${sprint.name}`;
    const description = [
      `Goal: ${sprint.goal || 'No goal set'}`,
      `Status: ${sprint.status || 'unknown'}`,
      sprint.deliverables ? `Deliverables:\n${sprint.deliverables.map(d => `- ${d}`).join('\\n')}` : ''
    ].filter(Boolean).join('\\n\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${formatDateForICS(startDate)}`);
    lines.push(`DTEND:${formatDateForICS(eventEnd)}`);
    lines.push(`SUMMARY:${escapeICS(summary)}`);
    lines.push(`DESCRIPTION:${escapeICS(description)}`);
    
    if (sprint.status === 'completed') {
      lines.push('STATUS:CONFIRMED');
    } else if (sprint.status === 'active' || sprint.status === 'in-progress') {
      lines.push('STATUS:TENTATIVE');
    }
    
    lines.push(`CATEGORIES:Sprint,${sprint.status || 'unknown'}`);
    lines.push('END:VEVENT');
    lines.push('');
  });

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

function generateJSON(sprints) {
  return JSON.stringify({
    calendar: 'NIX Sprints',
    exported: new Date().toISOString(),
    count: sprints.length,
    events: sprints.map(s => ({
      uid: `sprint-${s.number}@nix666.dev`,
      title: `Sprint #${s.number}: ${s.name}`,
      start: s.started_at || s.date,
      end: s.completed_at || s.date,
      status: s.status,
      goal: s.goal,
      deliverables: s.deliverables || []
    }))
  }, null, 2);
}

function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  const sprints = loadSprints();
  const filtered = filterSprints(sprints, options);

  if (filtered.length === 0) {
    log(`${C.yellow}No sprints match the specified criteria.${C.reset}`);
    return;
  }

  const output = options.format === 'json' 
    ? generateJSON(filtered)
    : generateICS(filtered);

  if (options.file) {
    fs.writeFileSync(options.file, output);
    const absPath = path.resolve(options.file);
    log(`${C.green}✓ Exported ${filtered.length} sprint(s) to ${absPath}${C.reset}`);
    
    if (options.format !== 'json') {
      log(`${C.gray}  Import this file into your calendar app${C.reset}`);
    }
  } else {
    log(output);
  }
}

main();
