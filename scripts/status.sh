#!/bin/bash
# status.sh — Quick system health check for Nix's environment

echo "⚡ NIX SYSTEM STATUS"
echo "===================="
echo ""

echo "📁 Workspace: $(pwd)"
echo "🕐 Time: $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

echo "💾 Disk Usage:"
df -h . | tail -1 | awk '{print "  Used: "$3" / "$2" ("$5")"}'
echo ""

echo "📝 Recent Memory Files:"
ls -lt memory/ 2>/dev/null | head -6 | tail -5 | awk '{print "  "$9" ("$6" "$7")"}'
echo ""

echo "🌿 Git Status:"
if [ -d .git ]; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "none")
    CHANGES=$(git status --porcelain 2>/dev/null | wc -l)
    echo "  Branch: $BRANCH"
    echo "  Uncommitted changes: $CHANGES"
else
    echo "  Not a git repo"
fi
echo ""

echo "🔧 OpenClaw:"
which openclaw >/dev/null 2>&1 && echo "  Installed: $(openclaw --version 2>/dev/null || echo 'unknown')" || echo "  Not found in PATH"
echo ""
