# Scripts

Quick tools for Nix's workflow.

## wordcount

Track daily writing output. Perfect for Fiverr gigs and content work.

```bash
# Log words written
wordcount add 500 "Blog post - AI tools"

# See today's progress
wordcount today

# View this week's daily totals
wordcount week

# Full stats breakdown
wordcount stats
```

Data stored in `~/.wordcount.json`

## wcc

Quick word count for files with optional logging.

```bash
# Just count
wcc article.md

# Count and log
wcc article.md fiverr-blog
```

## nixtrack

Income and order tracker. Log Fiverr orders, view stats, track progress toward monthly goals.

```bash
# Add an order
nixtrack add 25 "Blog post about AI" fiverr

# View recent orders
nixtrack list

# See stats and progress
nixtrack stats

# Mark order as done
nixtrack done 1
```

Data stored in `~/.nixtrack.json`

## sprint.sh

Quick commit and push.

```bash
./sprint.sh "your commit message"
```

## status.sh

System health check.

```bash
./status.sh
```
