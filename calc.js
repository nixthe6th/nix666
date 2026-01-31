#!/usr/bin/env node
/**
 * calc.js - Quick calculation utility
 * Sprint #23 deliverable
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

const formatNumber = (n) => {
  if (Number.isInteger(n)) return n.toString();
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
};

const calc = {
  // Basic math
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => b === 0 ? 'Error: Division by zero' : a / b,
  pow: (a, b) => Math.pow(a, b),
  sqrt: (a) => Math.sqrt(a),
  
  // Percentages
  percent: (value, total) => (value / total) * 100,
  of: (percent, total) => (percent / 100) * total,
  
  // Time
  minsToHours: (m) => m / 60,
  hoursToMins: (h) => h * 60,
  
  // Finance
  hourly: (annual) => annual / 2080, // 40hrs * 52wks
  annual: (hourly) => hourly * 2080
};

const showHelp = () => {
  console.log(`${COLORS.cyan}${COLORS.bright}⚡ calc - Quick calculations${COLORS.reset}

${COLORS.bright}Usage:${COLORS.reset} nix calc <expression>

${COLORS.bright}Operations:${COLORS.reset}
  <a> + <b>           Addition
  <a> - <b>           Subtraction  
  <a> * <b>           Multiplication
  <a> / <b>           Division
  <a> ^ <b>           Power
  sqrt <n>            Square root
  
${COLORS.bright}Percentages:${COLORS.reset}
  <value>% of <total>      Calculate percentage
  <percent>% <total>       What is X% of total?
  
${COLORS.bright}Time:${COLORS.reset}
  <mins>m                  Minutes to hours
  <hours>h                 Hours to minutes
  
${COLORS.bright}Finance:${COLORS.reset}
  $<annual> hourly          Annual to hourly rate
  $<hourly> annual          Hourly to annual rate

${COLORS.bright}Examples:${COLORS.reset}
  nix calc 25 * 4
  nix calc 1500 / 3
  nix calc 15% of 200
  nix calc sqrt 144
  nix calc 120m
  nix calc $75000 hourly`);
};

const parseArgs = (args) => {
  const input = args.join(' ').trim();
  
  // Help
  if (!input || input === 'help' || input === '--help' || input === '-h') {
    showHelp();
    return null;
  }
  
  // Time: minutes to hours
  if (/^(\d+(?:\.\d+)?)m$/.test(input)) {
    const mins = parseFloat(input);
    const hours = calc.minsToHours(mins);
    return { expr: `${mins}m`, result: `${formatNumber(hours)}h` };
  }
  
  // Time: hours to minutes
  if (/^(\d+(?:\.\d+)?)h$/.test(input)) {
    const hours = parseFloat(input);
    const mins = calc.hoursToMins(hours);
    return { expr: `${hours}h`, result: `${formatNumber(mins)}m` };
  }
  
  // Finance: annual to hourly
  if (/^\$(\d+(?:\.\d+)?)\s+hourly$/.test(input)) {
    const annual = parseFloat(input.match(/\$(\d+(?:\.\d+)?)/)[1]);
    const hourly = calc.hourly(annual);
    return { expr: `$${formatNumber(annual)} annual`, result: `$${formatNumber(hourly)}/hr` };
  }
  
  // Finance: hourly to annual
  if (/^\$(\d+(?:\.\d+)?)\s+annual$/.test(input)) {
    const hourly = parseFloat(input.match(/\$(\d+(?:\.\d+)?)/)[1]);
    const annual = calc.annual(hourly);
    return { expr: `$${formatNumber(hourly)}/hr`, result: `$${formatNumber(annual)} annual` };
  }
  
  // Percent: X% of Y
  if (/^(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)$/.test(input)) {
    const [, percent, total] = input.match(/^(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)$/);
    const result = calc.of(parseFloat(percent), parseFloat(total));
    return { expr: `${percent}% of ${total}`, result: formatNumber(result) };
  }
  
  // Percent: what is X% of Y (shorthand)
  if (/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)$/.test(input)) {
    const [, percent, total] = input.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)$/);
    const result = calc.of(parseFloat(percent), parseFloat(total));
    return { expr: `${percent}% of ${total}`, result: formatNumber(result) };
  }
  
  // Square root
  if (/^sqrt\s+(\d+(?:\.\d+)?)$/.test(input)) {
    const n = parseFloat(input.match(/sqrt\s+(\d+(?:\.\d+)?)/)[1]);
    const result = calc.sqrt(n);
    return { expr: `√${n}`, result: formatNumber(result) };
  }
  
  // Basic operators
  const operators = [
    { op: '+', fn: calc.add },
    { op: '-', fn: calc.sub },
    { op: '*', fn: calc.mul },
    { op: '/', fn: calc.div },
    { op: '^', fn: calc.pow },
    { op: 'x', fn: calc.mul },
    { op: 'X', fn: calc.mul }
  ];
  
  for (const { op, fn } of operators) {
    const escapedOp = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^(-?\\d+(?:\\.\\d+)?)\\s*${escapedOp}\\s*(-?\\d+(?:\\.\\d+)?)$`);
    const match = input.match(regex);
    if (match) {
      const a = parseFloat(match[1]);
      const b = parseFloat(match[2]);
      const result = fn(a, b);
      if (typeof result === 'string') return { expr: input, result, error: true };
      return { expr: `${a} ${op} ${b}`, result: formatNumber(result) };
    }
  }
  
  return { expr: input, result: null, error: true };
};

const main = () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }
  
  const parsed = parseArgs(args);
  if (!parsed) {
    process.exit(0);
  }
  
  if (parsed.error) {
    console.log(`${COLORS.yellow}⚠ Could not parse: ${parsed.expr}${COLORS.reset}`);
    console.log(`Run 'nix calc' for help`);
    process.exit(1);
  }
  
  console.log(`${COLORS.cyan}${COLORS.bright}⚡ ${parsed.expr}${COLORS.reset}`);
  console.log(`${COLORS.green}${COLORS.bright}= ${parsed.result}${COLORS.reset}`);
};

main();
