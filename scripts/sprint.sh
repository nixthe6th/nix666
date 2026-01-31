#!/bin/bash
#
# sprint.sh - Git sprint mode: commit & push with speed
# Usage: sprint.sh "commit message"
# Alias: nix sprint "message"
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
}

cd "$REPO_ROOT"

# Get commit message
MSG="${1:-}"

# If no message, generate one
if [ -z "$MSG" ]; then
    # Check for common patterns
    if git diff --cached --name-only | grep -q "\.md$"; then
        MSG="Update documentation"
    elif git diff --cached --name-only | grep -q "\.json$"; then
        MSG="Update data"
    elif git diff --cached --name-only | grep -q "\.js$"; then
        MSG="Update scripts"
    elif git diff --cached --name-only | grep -q "\.html$"; then
        MSG="Update site"
    else
        MSG="Quick update"
    fi
    echo -e "${YELLOW}⚠️  No message provided, using: '${MSG}'${NC}"
fi

# Check if there are changes
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    exit 0
fi

# Show what's changing
echo -e "${CYAN}📋 Changes:${NC}"
git status --short

# Auto-stage all changes if nothing staged
if [ -z "$(git diff --cached --name-only)" ]; then
    echo -e "${CYAN}📦 Auto-staging all changes...${NC}"
    git add -A
fi

# Commit
echo -e "${CYAN}💾 Committing: ${MSG}${NC}"
git commit -m "$MSG" --quiet

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Push
echo -e "${CYAN}🚀 Pushing to ${BRANCH}...${NC}"
git push origin "$BRANCH" --quiet

# Success!
echo -e "${GREEN}✅ Sprint complete!${NC}"
echo -e "${GREEN}   ${MSG}${NC}"
echo ""
echo -e "${CYAN}⚡ Volume creates luck. Keep shipping.${NC}"
