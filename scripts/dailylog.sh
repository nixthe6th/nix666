#!/bin/bash
# dailylog.sh - Create today's memory file with template

DATE=$(date '+%Y-%m-%d')
FILE="memory/${DATE}.md"

if [ -f "$FILE" ]; then
    echo "📓 Log already exists: $FILE"
    exit 0
fi

cat > "$FILE" << EOF
# ${DATE}

## What Happened Today

## Work Done

## Income

## Thoughts/Ideas

## Tomorrow
EOF

echo "📓 Created: $FILE"
