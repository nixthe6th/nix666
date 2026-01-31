# NIX CLI API Documentation

> Auto-generated documentation for the nix666 CLI toolkit
> Generated: 2026-01-31

## Table of Contents

- [backup](#backup) — backup.js - Data backup and export for NIX
- [bm](#bm) — bm.js - Bookmark CLI for quick access to saved links
- [calc](#calc) — calc.js - Quick calculation utility
- [convert](#convert) — convert.js — Swiss Army knife converter utility
- [done](#done) — done.js - Sprint completion tracker
- [find](#find) — find.js - Universal search across all NIX data
- [focus](#focus) — focus.js - Pomodoro focus timer with motivation
- [habits](#habits) — CLI tool
- [ideas](#ideas) — ideas.js - Idea backlog and project pipeline tracker
- [log](#log) — log.js — Quick daily logger
- [mood](#mood) — mood.js — Daily mood & emotion tracker
- [note](#note) — note.js - Quick capture for thoughts, ideas, and tasks
- [pass](#pass) — pass.js - Quick password generator
- [projstats](#projstats) — projstats - Quick project dashboard stats
- [quote](#quote) — quote - Terminal motivation from NIX
- [review](#review) — review.js - Daily/weekly progress review
- [server](#server) — server.js - Quick HTTP server for static files
- [session](#session) — session.js - Work session tracker
- [sprint](#sprint) — sprint.js — Quick sprint management CLI
- [stats](#stats) — stats.js — Productivity Stats Dashboard
- [streak](#streak) — streak.js - Git activity streak tracker
- [today](#today) — today.js - Daily briefing: date, quote, streak, sprint status
- [todo](#todo) — todo.js - Sprint-mode task tracker
- [week](#week) — week.js - Weekly retrospective: commits, sprints, stats, progress

## backup

backup.js - Data backup and export for NIX

**File:** `backup.js`

### Usage

```bash
nix backup [command] [options]
```

### Commands

- `nix backup` — Create backup
- `nix backup list` — List backups
- `nix backup restore <file>` — Restore from backup
- `nix backup clean` — Remove old backups

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## bm

bm.js - Bookmark CLI for quick access to saved links

**File:** `bm.js`

### Usage

```bash
bm [list|search|open|add] [args]
bm <command> [args]
bm search <query>
bm open <title/term>
bm add <title> <url> [category] [description] [tags]
```

### Commands

- `bm list` — List all bookmarks
- `bm search <query>` — Search bookmarks
- `bm open <term>` — Open bookmark in browser
- `bm add <title> <url>` — Add new bookmark

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## calc

calc.js - Quick calculation utility

**File:** `calc.js`

### Usage

```bash
nix calc <expression>
```

### Examples

```bash
nix calc "25 * 4"
nix calc "sqrt(16)"
nix calc "2^10"
```

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## convert

convert.js — Swiss Army knife converter utility

**File:** `convert.js`

### Usage

```bash
nix convert <command> [input]
```

### Commands

| Command | Description |
|---------|-------------|
| `b64e` | Base64 encode |
| `b64d` | Base64 decode |
| `urle` | URL encode |
| `urld` | URL decode |
| `j2y` | JSON to YAML |
| `y2j` | YAML to JSON |
| `lower` | Lowercase |
| `upper` | Uppercase |
| `uuid` | Generate UUID |
| `epoch` | Current timestamp |
| `date` | Format timestamp |

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## done

done.js - Sprint completion tracker

**File:** `done.js`

### Usage

```bash
done ["what you accomplished"] or just "done" for stats + motivation
done ["accomplishment text"] [--stats]
```

### Commands

- `done` — Show stats
- `done "message"` — Log completion

### Flags

| Flag | Description |
|------|-------------|
| `--oneline` | One line output |
| `--since` | Since date |
| `--until` | Until date |
| `--shortstat` | Short stats |
| `--format` | Output format |
| `--stats` | Show statistics |
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## find

find.js - Universal search across all NIX data

**File:** `find.js`

### Usage

```bash
find [query] [options]
```

### Commands

- `find <query>` — Search all data

### Flags

| Flag | Description |
|------|-------------|
| `--todos` | Search todos only |
| `--ideas` | Search ideas only |
| `--quotes` | Search quotes only |
| `--help` | Show help |
| `--projects` | Search projects only |
| `--sprints` | Search sprints only |
| `--bookmarks` | Search bookmarks only |

> 💡 Run with `--help` for full usage information

---

## focus

focus.js - Pomodoro focus timer with motivation

**File:** `focus.js`

### Usage

```bash
focus [minutes] [--quote]
```

### Commands

- `focus` — Start 25min timer
- `focus 15` — Start 15min timer

### Flags

| Flag | Description |
|------|-------------|
| `--quote` | Show quote after |
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## habits

habits.js — Habit tracking with streaks

**File:** `habits.js`

### Usage

```bash
habits.js [check|uncheck|list|add|remove|stats] [habit-id]
```

### Commands

- `habits list` — List all habits
- `habits check <id>` — Check off habit
- `habits uncheck <id>` — Uncheck habit
- `habits add <name>` — Add new habit
- `habits remove <id>` — Remove habit
- `habits stats` — Show stats

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## ideas

ideas.js - Idea backlog and project pipeline tracker

**File:** `ideas.js`

### Usage

```bash
ideas [command] [args]
```

### Commands

- `ideas` — List ideas
- `ideas add "idea" [priority]` — Add idea
- `ideas promote <id>` — Move to project
- `nixsprint` — Sprint mode

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## log

log.js — Quick daily logger

**File:** `log.js`

### Usage

```bash
nix log add <text>
nix log search <query>
nix log add <text>     Add entry
```

### Commands

- `nix log add <text>` — Add log entry
- `nix log search <query>` — Search logs
- `nix log list` — List recent entries

---

## mood

mood.js — Daily mood & emotion tracker

**File:** `mood.js`

### Usage

```bash
mood.js [command] [options]
mood.js log <1-5> [note]
mood.js log <1-5> [note]
```

### Commands

- `mood log <1-5> [note]` — Log mood
- `mood today` — Show today's mood
- `mood week` — Weekly summary
- `mood streak` — Streak info

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## note

note.js - Quick capture for thoughts, ideas, and tasks

**File:** `note.js`

### Usage

```bash
note [text] [--list|--today|--grep pattern]
```

### Commands

- `note <text>` — Add note
- `note --list` — List all notes
- `note --today` — Today's notes
- `note --grep <pattern>` — Search notes

### Flags

| Flag | Description |
|------|-------------|
| `--list` | List all notes |
| `--today` | Today's notes |
| `--grep` | Search pattern |
| `--stats` | Show stats |
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## pass

pass.js - Quick password generator

**File:** `pass.js`

### Usage

```bash
nix pass [length] [--strong|--pin|--phrase]
```

### Commands

- `nix pass` — Generate 16-char password
- `nix pass 20` — Generate 20-char password
- `nix pass --pin` — Generate PIN
- `nix pass --phrase` — Generate passphrase

### Flags

| Flag | Description |
|------|-------------|
| `--strong` | Stronger password |
| `--pin` | Generate PIN |
| `--phrase` | Generate passphrase |
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## projstats

projstats - Quick project dashboard stats

**File:** `projstats.js`

### Usage

```bash
projstats
```

### Commands

- `projstats` — Show dashboard

---

## quote

quote - Terminal motivation from NIX

**File:** `quote.js`

### Usage

```bash
quote [context|all|search <term>|list]
quote search <term>
```

### Commands

- `quote` — Random quote
- `quote all` — List all quotes
- `quote search <term>` — Search quotes
- `quote context <ctx>` — By context

---

## review

review.js - Daily/weekly progress review

**File:** `review.js`

### Usage

```bash
review [today|week]
```

### Commands

- `review` — Today's review (default)
- `review today` — Daily progress summary
- `review week` — Weekly retrospective

### Summary

Shows progress across:
- Tasks completed/pending
- Habits checked
- Mood tracking
- Weekly completion chart

---

## server

server.js - Quick HTTP server for static files

**File:** `server.js`

### Usage

```bash
nix server [port] [--dir <path>] [--open]
```

### Commands

- `nix server` — Start on port 8080
- `nix server 3000` — Start on port 3000

### Flags

| Flag | Description |
|------|-------------|
| `--dir <path>` | Serve different directory |
| `--open` | Open browser |
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## session

session.js - Work session tracker

**File:** `session.js`

### Usage

```bash
session.js <command> [args]
session.js start <project> [tag]
session.js <command> [args]
```

### Commands

- `session start <project> [tag]` — Start session
- `session stop` — Stop session
- `session status` — Current status
- `session log` — Show history

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## sprint

sprint.js — Quick sprint management CLI

**File:** `sprint.js`

### Usage

```bash
sprint                    Show current sprint status
sprint start "goal"       Start a new sprint
sprint complete           Mark current sprint done
sprint list [n]           Show last n sprints (default 10)
```

### Commands

- `sprint` — Show status
- `sprint start "goal"` — Start sprint
- `sprint complete` — Complete sprint
- `sprint list` — List sprints

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## stats

stats.js — Productivity Stats Dashboard

**File:** `stats.js`

### Usage

```bash
nix stats [options]
```

### Commands

- `nix stats` — Show dashboard

### Flags

| Flag | Description |
|------|-------------|
| `--since` | Since date |
| `--format` | Output format |
| `--date` | Specific date |
| `--help` | Show help |
| `--sprints` | Sprint stats only |
| `--tasks` | Task stats only |
| `--projects` | Project stats only |
| `--json` | JSON output |

> 💡 Run with `--help` for full usage information

---

## streak

streak.js - Git activity streak tracker

**File:** `streak.js`

### Usage

```bash
streak [options]
```

### Commands

- `streak` — Show streak

### Flags

| Flag | Description |
|------|-------------|
| `--pretty` | Pretty output |
| `--date` | Specific date |
| `--all` | All history |
| `--oneline` | One line |
| `--since` | Since date |
| `--calendar` | Calendar view |

---

## today

today.js - Daily briefing: date, quote, streak, sprint status

**File:** `today.js`

### Usage

```bash
today [--minimal | --json]
```

### Commands

- `today` — Full briefing
- `today --minimal` — Brief output
- `today --json` — JSON output

### Flags

| Flag | Description |
|------|-------------|
| `--minimal` | Minimal output |
| `--json` | JSON format |
| `--oneline` | One line |
| `--since` | Since date |
| `--all` | All data |
| `--until` | Until date |

---

## todo

todo.js - Sprint-mode task tracker

**File:** `todo.js`

### Usage

```bash
todo [add|list|done|remove|priority] [args]
```

### Commands

- `todo` — List todos
- `todo add <task>` — Add task
- `todo done <id>` — Mark done
- `todo remove <id>` — Remove task
- `todo priority <id> <level>` — Set priority

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help |

> 💡 Run with `--help` for full usage information

---

## week

week.js - Weekly retrospective: commits, sprints, stats, progress

**File:** `week.js`

### Usage

```bash
week [--commits|--sprints|--json]
```

### Commands

- `week` — Full retrospective
- `week --commits` — Commits only
- `week --sprints` — Sprints only

### Flags

| Flag | Description |
|------|-------------|
| `--commits` | Show commits |
| `--sprints` | Show sprints |
| `--json` | JSON output |
| `--oneline` | One line |
| `--since` | Since date |
| `--all` | All data |
| `--until` | Until date |

---

## Quick Reference

| Tool | Purpose |
|------|---------|
| [backup](#backup) | Data backup and export for NIX |
| [bm](#bm) | Bookmark CLI for quick access to saved links |
| [calc](#calc) | Quick calculation utility |
| [convert](#convert) | Swiss Army knife converter utility |
| [done](#done) | Sprint completion tracker |
| [find](#find) | Universal search across all NIX data |
| [focus](#focus) | Pomodoro focus timer with motivation |
| [habits](#habits) | Habit tracking with streaks |
| [ideas](#ideas) | Idea backlog and project pipeline tracker |
| [log](#log) | Quick daily logger |
| [mood](#mood) | Daily mood & emotion tracker |
| [note](#note) | Quick capture for thoughts, ideas, and tasks |
| [pass](#pass) | Quick password generator |
| [projstats](#projstats) | Quick project dashboard stats |
| [quote](#quote) | Terminal motivation from NIX |
| [review](#review) | Daily/weekly progress review |
| [server](#server) | Quick HTTP server for static files |
| [session](#session) | Work session tracker |
| [sprint](#sprint) | Quick sprint management CLI |
| [stats](#stats) | Productivity Stats Dashboard |
| [streak](#streak) | Git activity streak tracker |
| [today](#today) | Daily briefing: date, quote, streak, sprint status |
| [todo](#todo) | Sprint-mode task tracker |
| [week](#week) | Weekly retrospective: commits, sprints, stats, progress |

---
*Generated by docs.js — Part of [nix666](https://github.com/nix666/nix666)*
