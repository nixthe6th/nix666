# NIX Troubleshooting Guide

> "Every problem is a puzzle. Every error is a hint." — NIX

Common issues and their solutions. If you don't find your issue here, check the [GitHub Issues](https://github.com/nixthe6th/nix666/issues).

---

## Installation Issues

### "nix: command not found"

**Cause:** The scripts directory isn't in your PATH.

**Solution:**
```bash
# Option 1: Add to PATH (recommended)
echo 'export PATH="$PATH:/path/to/nix666/scripts"' >> ~/.bashrc
source ~/.bashrc

# Option 2: Use make
make install

# Option 3: Create symlink
ln -s /path/to/nix666/scripts/nix ~/.local/bin/nix
```

### Permission denied when running nix

**Cause:** Scripts aren't executable.

**Solution:**
```bash
chmod +x scripts/nix*
chmod +x *.js
```

---

## Data File Issues

### "Cannot find module './data/...'"

**Cause:** Running script from wrong directory.

**Solution:**
```bash
# Always run from repo root
cd /path/to/nix666
node today.js

# Or use the nix dispatcher which handles paths
./scripts/nix today
```

### "SyntaxError: Unexpected token" in JSON file

**Cause:** Data file was corrupted or manually edited incorrectly.

**Solution:**
```bash
# Check which file is broken
node -e "JSON.parse(require('fs').readFileSync('./data/todos.json'))"

# Restore from backup (if you have one)
cp data/backups/todos-2026-01-01.json data/todos.json

# Or reset to empty array
mkdir -p data
echo "[]" > data/todos.json
```

### Data files growing too large

**Cause:** Months of accumulated entries.

**Solution:**
```bash
# Archive old data
node compact.js --days 90 --apply

# Check file sizes
ls -lh data/
```

---

## Sync Issues

### "Sync failed: repository not found"

**Cause:** Remote repository URL incorrect or not configured.

**Solution:**
```bash
# Check current config
cat data/.sync-config.json

# Re-setup sync
node sync.js setup https://github.com/YOURUSER/nix666-data.git
```

### "Merge conflict detected"

**Cause:** Edited same file on multiple devices.

**Solution:**
```bash
# View conflicts
node sync.js resolve

# Manual resolution: backup local, pull remote, merge manually
cp data/todos.json data/todos.json.local
cd data && git checkout --theirs todos.json
cd ..
# Then manually merge important entries
```

### Sync creating too many commits

**Cause:** Auto-sync interval too frequent.

**Solution:**
```bash
# Edit sync config to reduce frequency
node sync.js status
# Then modify data/.sync-config.json to increase intervalMinutes
```

---

## Timer & Focus Issues

### Timer not making sound

**Cause:** No notification system available.

**Solution:**
```bash
# macOS - enable notification sounds
# System Preferences > Notifications > Terminal > Sounds

# Linux - install notification daemon
sudo apt-get install libnotify-bin  # Ubuntu/Debian

# Or use visual-only timer
node timer.js 25 --quiet
```

### Pomodoro sessions not being tracked

**Cause:** Session log file permissions.

**Solution:**
```bash
# Check permissions
ls -la data/sessions.json

# Fix if needed
chmod 644 data/*.json
```

---

## Habit Tracking Issues

### Habits not showing in "today" view

**Cause:** Habit due date logic or frequency misconfiguration.

**Solution:**
```bash
# Check habit definition
node habits.js list

# Reset habit tracking (keeps habit, resets streak)
node habits.js reset "habit-name"
```

### Streak broken incorrectly

**Cause:** Timezone or date boundary issues.

**Solution:**
```bash
# Check system date
date

# Log habit manually for missed day
node habits.js log "meditation" 2026-01-30
```

---

## Performance Issues

### Commands running slowly

**Cause:** Large data files or old Node.js version.

**Solution:**
```bash
# Check file sizes
find data -name "*.json" -size +1M

# Archive old data
node compact.js --apply

# Check Node version (needs 16+)
node --version

# Use faster alternatives for common commands
./scripts/nix today    # instead of node today.js
```

### Dashboard loading slowly

**Cause:** Too much historical data being loaded.

**Solution:**
```bash
# Archive old data first
node compact.js --days 180 --apply

# Or manually archive in browser dev tools
# Clear localStorage for nix666 if using PWA
```

---

## Git & Version Control Issues

### "git: not a git repository"

**Cause:** Running outside git repo or incomplete clone.

**Solution:**
```bash
# Initialize if needed
git init
git remote add origin https://github.com/nixthe6th/nix666.git

# Or re-clone
cd ..
mv nix666 nix666-backup
git clone https://github.com/nixthe6th/nix666.git
```

### Accidentally committed data files with secrets

**Cause:** API keys or personal data in data/ committed to git.

**Solution:**
```bash
# Remove from git (keep locally)
git rm --cached data/config.json
echo "data/" >> .gitignore
git add .gitignore
git commit -m "Remove data files from tracking"

# If pushed to GitHub with secrets, rotate those keys immediately!
```

---

## Web Interface Issues

### Dashboard shows empty charts

**Cause:** No data yet or data not loading.

**Solution:**
```bash
# Check data exists
ls data/*.json

# Check browser console for errors
# F12 > Console

# Force reload
# Ctrl+Shift+R (hard refresh)
```

### Mobile layout broken

**Cause:** Browser caching old CSS.

**Solution:**
```bash
# Hard refresh on mobile
# iOS Safari: Pull down to refresh, or clear cache in Settings

# Or add cache-busting query param
open dashboard.html?v=2
```

---

## Common Error Messages

### "EACCES: permission denied"

```bash
# Fix ownership
sudo chown -R $(whoami) /path/to/nix666

# Or fix permissions
chmod -R u+rw /path/to/nix666
```

### "ENOENT: no such file or directory"

```bash
# Create missing data directory
mkdir -p data

# Initialize empty data files
echo "[]" > data/todos.json
echo "[]" > data/habits.json
echo "[]" > data/notes.json
```

### "MODULE_NOT_FOUND"

```bash
# All NIX tools are zero-dependency
# This error usually means running from wrong directory
cd /path/to/nix666
./scripts/nix today
```

---

## Recovery Procedures

### Complete Data Reset

⚠️ **Warning:** This deletes all your data!

```bash
# Backup first
tar czf ~/nix-backup-$(date +%Y%m%d).tar.gz data/ memory/

# Reset
cd /path/to/nix666
rm -rf data/* memory/*
mkdir -p data memory

# Re-initialize by running any command
node today.js  # Creates fresh data files
```

### Fresh Install Without Losing Data

```bash
# Backup data
cp -r data ~/nix-data-backup
cp -r memory ~/nix-memory-backup

# Re-clone
cd ..
mv nix666 nix666-old
git clone https://github.com/nixthe6th/nix666.git

# Restore data
cp -r ~/nix-data-backup/* nix666/data/
cp -r ~/nix-memory-backup/* nix666/memory/
```

---

## Getting Help

If none of these solutions work:

1. **Check the logs:**
   ```bash
   # Most recent errors
   ls -lt data/*.log 2>/dev/null || echo "No logs found"
   ```

2. **Run diagnostics:**
   ```bash
   node apicheck.js
   ```

3. **Open an issue:**
   - Include the exact error message
   - Include output of `node --version`
   - Include your OS version
   - Describe what you were trying to do

4. **Check system health:**
   ```bash
   make test
   ```

---

## Prevention Tips

1. **Regular backups:**
   ```bash
   # Add to crontab
   0 2 * * * cd /path/to/nix666 && tar czf ~/backups/nix-$(date +\%Y\%m\%d).tar.gz data/
   ```

2. **Enable sync early:**
   ```bash
   node sync.js setup https://github.com/YOURUSER/nix666-data.git
   ```

3. **Archive monthly:**
   ```bash
   node compact.js --days 60 --apply
   ```

4. **Keep data out of git:**
   ```bash
   echo "data/" >> .gitignore
   echo "memory/" >> .gitignore
   ```

---

*Last updated: 2026-02-05*
*Found an issue not covered here? [Open an issue](https://github.com/nixthe6th/nix666/issues/new)*
