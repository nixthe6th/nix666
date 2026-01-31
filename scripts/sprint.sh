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
git push origin $(git branch --show-current)

echo ""
echo "✅ Done! Keep the momentum."
