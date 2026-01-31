# NIX CLI API Documentation

> Auto-generated documentation for the nix666 CLI toolkit
> Generated: 2026-01-31

## Table of Contents

- [backup](#backup) — backup.js - Data backup and export for NIX
- [bm](#bm) — bm.js - Bookmark CLI for quick access to saved links
- [calc](#calc) — calc.js - Quick calculation utility
- [convert](#convert) — convert.js — Swiss Army knife converter utility
- [done](#done) — done.js - Sprint completion tracker
- [expense](#expense) — expense.js - Personal expense tracker
- [find](#find) — find.js - Universal search across all NIX data
- [focus](#focus) — focus.js - Pomodoro focus timer with motivation
- [habits](#habits) — CLI tool
- [ideas](#ideas) — ideas.js - Idea backlog and project pipeline tracker
- [later](#later) — later.js - Read/Watch later queue
- [log](#log) — log.js — Quick daily logger
- [mood](#mood) — mood.js — Daily mood & emotion tracker
- [note](#note) — note.js - Quick capture for thoughts, ideas, and tasks
- [pass](#pass) — pass.js - Quick password generator
- [projstats](#projstats) — projstats - Quick project dashboard stats
- [qr](#qr) — qr.js — Quick QR code generator for URLs, text, WiFi, contact info
- [quote](#quote) — quote - Terminal motivation from NIX
- [review](#review) — review.js - Daily/weekly progress review
- [server](#server) — server.js - Quick HTTP server for static files
- [session](#session) — session.js - Work session tracker
- [sprint](#sprint) — sprint.js — Quick sprint management CLI
- [standup](#standup) — standup.js - Daily standup report aggregator
- [stats](#stats) — stats.js — Productivity Stats Dashboard
- [streak](#streak) — streak.js - Git activity streak tracker
- [tag](#tag) — tag.js — Universal tag manager for all NIX data
- [today](#today) — today.js - Daily briefing: date, quote, streak, sprint status
- [todo](#todo) — todo.js - Sprint-mode task tracker
- [water](#water) — water.js — Hydration tracker
- [week](#week) — week.js - Weekly retrospective: commits, sprints, stats, progress
- [when](#when) — when.js - Time calculator & deadline tracker

## backup

backup.js - Data backup and export for NIX

**File:** `backup.js`

### Usage

```bash
nix backup [command] [options]
```
```bash
${C.reset}
```

### Commands

- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## bm

bm.js - Bookmark CLI for quick access to saved links

**File:** `bm.js`

### Usage

```bash
bm [list|search|open|add] [args]
```
```bash
bm <command> [args]
```
```bash
bm search <query>' + COLORS.reset);
```
```bash
bm open <title/term>' + COLORS.reset);
```
```bash
bm add <title> <url> [category] [description] [tags]' + COLORS.reset);
```

### Commands

- `bm`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## calc

calc.js - Quick calculation utility

**File:** `calc.js`

### Usage

```bash
${COLORS.reset} nix calc <expression>
```

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## convert

convert.js — Swiss Army knife converter utility

**File:** `convert.js`

### Usage

```bash
nix convert <command> [input]
```
```bash
${C.reset} nix convert <command> [input]`);
```

### Commands

- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## done

done.js - Sprint completion tracker

**File:** `done.js`

### Usage

```bash
done ["what you accomplished"] or just "done" for stats + motivation
```
```bash
done ["accomplishment text"] [--stats]');
```

### Commands

- `done`

### Flags

| Flag | Description |
|------|-------------|
| `--oneline` | — |
| `--since` | — |
| `--until` | — |
| `--shortstat` | — |
| `--format` | — |
| `--stats` | — |
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## expense

expense.js - Personal expense tracker

**File:** `expense.js`

### Usage

```bash
nix expense [command] [args]
```
```bash
${COLORS.reset}
```

### Commands

- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## find

find.js - Universal search across all NIX data

**File:** `find.js`

### Usage

```bash
find [query] [options]
```
```bash
${COLORS.reset}
```

### Commands

- `find`

### Flags

| Flag | Description |
|------|-------------|
| `--todos` | — |
| `--ideas` | — |
| `--quotes` | — |
| `--help` | — |
| `--projects` | — |
| `--sprints` | — |
| `--bookmarks` | — |

> 💡 Run with `--help` for full usage information

---

## focus

focus.js - Pomodoro focus timer with motivation

**File:** `focus.js`

### Usage

```bash
focus [minutes] [--quote]
```
```bash
');
```

### Commands

- `focus`

### Flags

| Flag | Description |
|------|-------------|
| `--quote` | — |
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## habits

**File:** `habits.js`

### Usage

```bash
habits.js [check|uncheck|list|add|remove|stats] [habit-id]
```
```bash
');
```

### Commands

- `habits`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## ideas

ideas.js - Idea backlog and project pipeline tracker

**File:** `ideas.js`

### Usage

```bash
ideas [command] [args]
```
```bash
${COLORS.reset}
```

### Commands

- `ideas`
- `nixsprint`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## later

later.js - Read/Watch later queue

**File:** `later.js`

### Usage

```bash
nix later <url> [title] [--tags tag1,tag2]
```
```bash
${COLORS.reset}
```
```bash
nix later done <id>${COLORS.reset}`);
```
```bash
nix later delete <id>${COLORS.reset}`);
```

### Commands

- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--tags` | — |
| `--help` | — |
| `--all` | — |

> 💡 Run with `--help` for full usage information

---

## log

log.js — Quick daily logger

**File:** `log.js`

### Usage

```bash
nix log add <text>');
```
```bash
nix log search <query>');
```
```bash
nix log add <text>     Add entry
```

### Commands

- `nix`

---

## mood

mood.js — Daily mood & emotion tracker

**File:** `mood.js`

### Usage

```bash
mood.js [command] [options]
```
```bash
mood.js log <1-5> [note]\n');
```
```bash
mood.js log <1-5> [note]');
```

### Commands

- `mood`
- `log`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## note

note.js - Quick capture for thoughts, ideas, and tasks

**File:** `note.js`

### Usage

```bash
note [text] [--list|--today|--grep pattern]
```
```bash
${COLORS.reset}
```

### Commands

- `note`

### Flags

| Flag | Description |
|------|-------------|
| `--list` | — |
| `--today` | — |
| `--grep` | — |
| `--stats` | — |
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## pass

pass.js - Quick password generator

**File:** `pass.js`

### Usage

```bash
nix pass [length] [--strong|--pin|--phrase]
```
```bash
${COLORS.reset}`);
```

### Commands

- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--strong` | — |
| `--pin` | — |
| `--phrase` | — |
| `--help` | — |

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

- `projstats`

---

## qr

qr.js — Quick QR code generator for URLs, text, WiFi, contact info

**File:** `qr.js`

### Usage

```bash
*   nix qr <text|url>           # Generate QR code for text/URL
```
```bash
');
```
```bash
nix qr wifi <ssid> [password]');
```
```bash
nix qr contact <name> <phone>');
```

### Commands

- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--small <text>` | — |
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## quote

quote - Terminal motivation from NIX

**File:** `quote.js`

### Usage

```bash
quote [context|all|search <term>|list]
```
```bash
quote search <term>');
```

### Commands

- `quote`

---

## review

review.js - Daily/weekly progress review

**File:** `review.js`

### Usage

```bash
review [today|week]
```

### Commands

- `review`

---

## server

server.js - Quick HTTP server for static files

**File:** `server.js`

### Usage

```bash
nix server [port] [--dir <path>] [--open]
```
```bash
${COLORS.reset}`);
```

### Commands

- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--dir <path>` | — |
| `--open` | — |
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## session

session.js - Work session tracker

**File:** `session.js`

### Usage

```bash
session.js <command> [args]
```
```bash
session.js start <project> [tag]${C.reset}`);
```
```bash
session.js <command> [args]\n');
```

### Commands

- `session`
- `start`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## sprint

sprint.js — Quick sprint management CLI

**File:** `sprint.js`

### Usage

```bash
*   sprint                    Show current sprint status
```
```bash
${C.reset}`);
```

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## standup

standup.js - Daily standup report aggregator

**File:** `standup.js`

### Usage

```bash
node standup.js [today|yesterday|week]
```
```bash
nix standup              Show today's standup (default)
```

### Commands

- `node`
- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## stats

stats.js — Productivity Stats Dashboard

**File:** `stats.js`

### Usage

```bash
nix stats [options]');
```

### Commands

- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--since` | — |
| `--format` | — |
| `--date` | — |
| `--help` | — |
| `--sprints` | — |
| `--tasks` | — |
| `--projects` | — |
| `--json` | — |

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

- `streak`

### Flags

| Flag | Description |
|------|-------------|
| `--pretty` | — |
| `--date` | — |
| `--all` | — |
| `--oneline` | — |
| `--since` | — |
| `--calendar` | — |

---

## tag

tag.js — Universal tag manager for all NIX data

**File:** `tag.js`

### Usage

```bash
*   nix tag                    # List all tags with counts
```
```bash
${C.reset}
```

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## today

today.js - Daily briefing: date, quote, streak, sprint status

**File:** `today.js`

### Usage

```bash
today [--minimal | --json]
```

### Commands

- `today`

### Flags

| Flag | Description |
|------|-------------|
| `--minimal` | — |
| `--json` | — |
| `--oneline` | — |
| `--since` | — |
| `--all` | — |
| `--until` | — |

---

## todo

todo.js - Sprint-mode task tracker

**File:** `todo.js`

### Usage

```bash
todo [add|list|done|remove|priority] [args]
```
```bash
${COLORS.reset}
```

### Commands

- `todo`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## water

water.js — Hydration tracker

**File:** `water.js`

### Usage

```bash
nix water [command] [amount]
```
```bash
')} nix water [command] [amount]
```

### Commands

- `nix`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

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

- `week`

### Flags

| Flag | Description |
|------|-------------|
| `--commits` | — |
| `--sprints` | — |
| `--json` | — |
| `--oneline` | — |
| `--since` | — |
| `--all` | — |
| `--until` | — |

---

## when

when.js - Time calculator & deadline tracker

**File:** `when.js`

### Usage

```bash
when [in|until|since|add] [time] [args]
```
```bash
')}
```
```bash
when in <duration>')); process.exit(1); }
```
```bash
when until <date>')); process.exit(1); }
```
```bash
when since <date>')); process.exit(1); }
```
```bash
when add <date> <duration>')); process.exit(1); }
```
```bash
when deadline <name> <date>')); process.exit(1); }
```

### Commands

- `when`

### Flags

| Flag | Description |
|------|-------------|
| `--help` | — |

> 💡 Run with `--help` for full usage information

---

## Quick Reference

| Tool | Purpose |
|------|---------|
| [backup](#backup) | backup.js - Data backup and export for NIX |
| [bm](#bm) | bm.js - Bookmark CLI for quick access to saved links |
| [calc](#calc) | calc.js - Quick calculation utility |
| [convert](#convert) | convert.js — Swiss Army knife converter utility |
| [done](#done) | done.js - Sprint completion tracker |
| [expense](#expense) | expense.js - Personal expense tracker |
| [find](#find) | find.js - Universal search across all NIX data |
| [focus](#focus) | focus.js - Pomodoro focus timer with motivation |
| [habits](#habits) | — |
| [ideas](#ideas) | ideas.js - Idea backlog and project pipeline tracker |
| [later](#later) | later.js - Read/Watch later queue |
| [log](#log) | log.js — Quick daily logger |
| [mood](#mood) | mood.js — Daily mood & emotion tracker |
| [note](#note) | note.js - Quick capture for thoughts, ideas, and tasks |
| [pass](#pass) | pass.js - Quick password generator |
| [projstats](#projstats) | projstats - Quick project dashboard stats |
| [qr](#qr) | qr.js — Quick QR code generator for URLs, text, WiFi, contact info |
| [quote](#quote) | quote - Terminal motivation from NIX |
| [review](#review) | review.js - Daily/weekly progress review |
| [server](#server) | server.js - Quick HTTP server for static files |
| [session](#session) | session.js - Work session tracker |
| [sprint](#sprint) | sprint.js — Quick sprint management CLI |
| [standup](#standup) | standup.js - Daily standup report aggregator |
| [stats](#stats) | stats.js — Productivity Stats Dashboard |
| [streak](#streak) | streak.js - Git activity streak tracker |
| [tag](#tag) | tag.js — Universal tag manager for all NIX data |
| [today](#today) | today.js - Daily briefing: date, quote, streak, sprint status |
| [todo](#todo) | todo.js - Sprint-mode task tracker |
| [water](#water) | water.js — Hydration tracker |
| [week](#week) | week.js - Weekly retrospective: commits, sprints, stats, progress |
| [when](#when) | when.js - Time calculator & deadline tracker |

---
*Generated by docs.js — Part of [nix666](https://github.com/nix666/nix666)*
