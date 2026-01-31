# NIX CLI API Documentation

> Auto-generated documentation for the nix666 CLI toolkit
> Generated: 2026-01-31

## Table of Contents

- [bm](#bm) — bm.js - Bookmark CLI for quick access to saved links
- [done](#done) — done.js - Sprint completion tracker
- [focus](#focus) — focus.js - Pomodoro focus timer with motivation
- [ideas](#ideas) — ideas.js - Idea backlog and project pipeline tracker
- [note](#note) — note.js - Quick capture for thoughts, ideas, and tasks
- [projstats](#projstats) — projstats - Quick project dashboard stats
- [quote](#quote) — quote - Terminal motivation from NIX
- [stats](#stats) — stats.js — Productivity Stats Dashboard
- [streak](#streak) — streak.js - Git activity streak tracker
- [today](#today) — today.js - Daily briefing: date, quote, streak, sprint status
- [todo](#todo) — todo.js - Sprint-mode task tracker
- [week](#week) — week.js - Weekly retrospective: commits, sprints, stats, progress

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

## Quick Reference

| Tool | Purpose |
|------|---------|
| [bm](#bm) | bm.js - Bookmark CLI for quick access to saved links |
| [done](#done) | done.js - Sprint completion tracker |
| [focus](#focus) | focus.js - Pomodoro focus timer with motivation |
| [ideas](#ideas) | ideas.js - Idea backlog and project pipeline tracker |
| [note](#note) | note.js - Quick capture for thoughts, ideas, and tasks |
| [projstats](#projstats) | projstats - Quick project dashboard stats |
| [quote](#quote) | quote - Terminal motivation from NIX |
| [stats](#stats) | stats.js — Productivity Stats Dashboard |
| [streak](#streak) | streak.js - Git activity streak tracker |
| [today](#today) | today.js - Daily briefing: date, quote, streak, sprint status |
| [todo](#todo) | todo.js - Sprint-mode task tracker |
| [week](#week) | week.js - Weekly retrospective: commits, sprints, stats, progress |

---
*Generated by docs.js — Part of [nix666](https://github.com/nix666/nix666)*
