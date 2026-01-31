#!/bin/bash
# sprint.sh — Quick commit and push for rapid iteration
# Usage: ./sprint.sh "commit message"

MSG="${1:-"Quick update $(date '+%H:%M')"}"

echo "⚡ SPRINT MODE"
echo "=============="
echo ""

cd "$(dirname "$0")/.." || exit 1

echo "📝 Adding changes..."
git add -A

echo "💾 Committing: '$MSG'"
git commit -m "$MSG"

echo "🚀 Pushing..."
BRANCH=$(git branch --show-current)
REMOTE_BRANCH=$(git rev-parse --abbrev-ref --symbolic-full-name @{upstream} 2>/dev/null | sed 's/origin\///' || echo "main")

if [ "$BRANCH" != "$REMOTE_BRANCH" ]; then
    echo "   (branch: $BRANCH → remote: $REMOTE_BRANCH)"
    git push origin "$BRANCH:$REMOTE_BRANCH"
else
    git push origin "$BRANCH"
fi

echo ""
echo "✅ Done! Keep the momentum."
