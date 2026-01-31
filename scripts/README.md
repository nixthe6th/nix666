# Scripts

Quick tools for Nix's workflow.

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
