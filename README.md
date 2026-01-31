# nix666 ⚡

Personal hub for NIX — the 6th incarnation.

## What This Is

A living GitHub Pages site for projects, experiments, and whatever comes next. Built fast, improved constantly.

## Pages

- `/` — Landing + vibe check
- `/now.html` — What we're building now
- `/projects.html` — Project showcase
- `/sprints.html` — Sprint history
- `/tools.html` — Useful tools

## CLI Toolkit

20+ terminal tools for productivity:

```bash
# Quick start
nix today      # Daily briefing
nix todo       # Task tracker
nix focus 25   # Pomodoro timer with quotes
nix timer 25   # Pomodoro timer with session logging
nix streak     # Git activity
nix stats      # Dashboard
nix decide     # Decision log
nix when       # Time calculator
```

**New:** `nix expense` — Expense tracker for personal finance:
```bash
nix expense add 15.50 "Lunch" food       # Log expense
nix expense add 120 "Keyboard" tech      # With category
nix expense list today                   # Today's expenses
nix expense list week                    # Last 7 days
nix expense summary                      # Monthly breakdown
nix expense budget 2000                  # Set monthly budget
```

`nix learn` — Learning tracker with spaced repetition:
```bash
nix learn add "Rust Programming" "https://doc.rust-lang.org"
nix learn log "Rust" "learned about ownership" 60
nix learn review                         # Show today's review queue
nix learn list                           # All active skills
nix learn stats                          # Learning dashboard
nix learn done "Rust"                    # Mark as mastered
```

`nix flashcard` — Memorization with flashcards:
```bash
nix flashcard add "Spanish" "Hello" "Hola"           # Create card
nix flashcard add "JS" "What is a closure?" "Fn + scope"
nix flashcard review                                   # Daily review
nix flashcard list                                     # All cards
nix flashcard stats                                    # Progress stats
```

`nix clip` — Code snippet manager:
```bash
cat config.js | nix clip add "Webpack Config" js build  # Save from pipe
nix clip add "Dockerfile" docker --file ./Dockerfile     # Save from file
nix clip list                                           # List all snippets
nix clip list js                                        # Filter by language
nix clip search axios                                   # Search content
nix clip copy a3f7b2                                    # Copy to clipboard
nix clip tags                                           # View tag cloud
```

`nix summarize` — Text/article summarizer:
```bash
nix summarize article.txt              # Summarize to 20% of sentences
nix summarize report.md -n 5           # Get top 5 sentences
nix summarize --text "long text..."    # Summarize inline text
cat blog.md | nix summarize            # Pipe from stdin
```

`nix config` — User preferences and settings:
```bash
nix config list                        # Show all settings
nix config set currency EUR            # Change default currency
nix config set default_timer 45        # Set default timer
nix config get currency                # Get a specific value
nix config delete currency             # Remove custom setting
nix config reset                       # Reset to defaults
```

`nix subscription` — Track recurring expenses:
```bash
nix subscription add "Netflix" 15.99 monthly entertainment
nix subscription add "Domain" 12 yearly tech
nix subscription list                  # All subscriptions
nix subscription monthly               # Monthly cost breakdown
nix subscription yearly                # Yearly cost breakdown
nix subscription upcoming              # Due in next 7 days
```

`nix water` — Hydration tracker with daily goals:
```bash
nix water 500                  # Add 500ml
nix water glass                # Add 250ml (quick)
nix water bottle               # Add 500ml (quick)
nix water week                 # Show last 7 days
nix water goal 3000            # Set daily goal
```

`nix timer` — Pomodoro timer with session tracking:
```bash
nix timer                      # 25-minute pomodoro (default)
nix timer 15                   # 15-minute session
nix timer 45 -m "Deep work"    # With message/description
nix timer stats                # View session history
```

`nix energy` — Energy level tracking throughout the day:
```bash
nix energy 5 "Feeling great"           # Log energy level 1-5 with note
nix energy log                         # Show today's entries
nix energy stats                       # Weekly energy patterns
```

`nix timeblock` — Daily time blocking planner:
```bash
nix timeblock                          # Show today's schedule
nix timeblock template                 # Apply default time blocks
nix timeblock template creative        # Creative-focused schedule
nix timeblock add 9:00 11:00 "Deep work" deep
nix timeblock clear                    # Clear today's schedule
nix timeblock stats                    # Weekly deep work stats
```

`nix gratitude` — Daily gratitude practice:
```bash
nix gratitude add "Supportive friends"   # Log gratitude
nix gratitude add "Quiet morning"        # 3x daily goal
nix gratitude random                     # Recall a memory
nix gratitude stats                      # Streak & progress
```

`nix distraction` — Track and analyze focus interruptions:
```bash
nix distraction "Twitter notification"         # Log what interrupted you
nix distraction "Slack ping" urgent            # Mark urgency (low/normal/urgent)
nix distraction list                           # Today's distractions
nix distraction list week                      # This week's log
nix distraction stats                          # Analytics & patterns
nix distraction top                            # Most common sources
```

`nix standup` — Daily standup report aggregating all productivity data:
```bash
nix standup                    # Full daily standup report
nix standup yesterday          # Yesterday's wins only
nix standup week               # Week summary
```

`nix later` — Read/watch later queue for articles, videos, and links:
```bash
nix later https://youtube.com/watch?v=abc "Cool Video" tech,video
nix later list                 # Show pending queue
nix later done a3f7b2          # Mark item as consumed
nix later stats                # Queue statistics
```

`nix when` — Calculate deadlines, time remaining, future dates:

`nix qr` — Generate QR codes for quick sharing:
```bash
nix qr https://nix666.dev          # Share URL
nix qr wifi MyNetwork password123  # WiFi connection
nix qr contact "John" 555-1234     # Contact card
```

`nix uuid` — Generate UUIDs and random IDs:
```bash
nix uuid                    # Generate UUID v4
nix uuid -c 5               # Generate 5 UUIDs
nix uuid -s                 # Short ID (8 chars): a3f7b2d9
nix uuid -n                 # Nano ID (12 chars, URL-safe)
nix uuid -p user_           # Add prefix: user_a3f7b2d9
nix uuid --no-dashes        # Compact UUID without dashes
```

`nix sleep` — Sleep quality tracker for better rest:
```bash
nix sleep                   # Show last night's sleep & trends
nix sleep log 7.5 4         # Log 7.5 hours, quality 4 (good)
nix sleep bed 11pm          # Set bedtime
nix sleep wake 6:30         # Set wake time
nix sleep week              # 7-night history
nix sleep debt              # Sleep debt analysis
nix sleep goal 8            # Set 8-hour sleep goal
```

`nix workout` — Quick workout logger with PR tracking:
```bash
nix workout start "Push Day"                  # Start a workout session
nix workout log bench 3x8 80                  # Log 3 sets of 8 reps at 80kg
nix workout log running 30min                 # Log timed cardio
nix workout log swim 2km                      # Log distance exercise
nix workout end "Felt strong today"           # End session with notes
nix workout list week                         # Show this week's workouts
nix workout stats bench                       # Show exercise progress
nix workout pr                                # Show all personal records
nix workout template "Pull Day" "Rows" "Curls" # Save a routine
nix workout routine "Pull Day"                # Start a saved routine
```

`nix meditate` — Guided breathing exercises:
```bash
nix meditate box 5m           # 5 min box breathing (4-4-4-4) — focus
nix meditate 478              # 4-7-8 technique — relaxation & sleep
nix meditate coherent 3m      # 5-5 coherent breathing — stress relief
nix meditate relax            # 4-6 relaxing rhythm — natural calm
nix meditate energy           # Quick 3-3 energizing breaths
```

`nix read` — Reading list with progress tracking:
```bash
nix read add "Deep Work" book              # Add book to reading list
nix read add "Rust Book" book              # Track any reading material
nix read list                              # Show all reading items
nix read list reading                      # Currently reading
nix read current                           # Quick view of active reads
nix read progress rq7 45                   # Update progress to 45%
nix read note rq7 "Key insight here"       # Add reading notes
nix read done rq7                          # Mark as finished
nix read stats                             # Reading statistics
```

`nix zettel` — Zettelkasten note system for atomic, connected notes:
```bash
nix zettel new "Feynman Technique" --tag learning     # Create note
nix zettel new "Second Brain" --tag book --tag idea   # Multiple tags
nix zettel list                                         # List all notes
nix zettel list learning                                # Filter by tag
nix zettel show 2601311423                              # View with backlinks
nix zettel search "productivity"                        # Search notes
nix zettel link 2601311423 2601311456                   # Connect notes
nix zettel graph                                        # Knowledge graph view
nix zettel tags                                         # List all tags
```

`nix connect` — Discover connections between zettel notes:
```bash
nix connect related 2601311423              # Find notes with shared tags
nix connect orphaned                        # Find unlinked notes
nix connect bridges                         # Show knowledge clusters
nix connect suggest 2601311423              # Suggest link candidates
nix connect path 2601311423 2601311456      # Find path between notes
nix connect serendipity                     # Random surprising connections
nix connect clusters                        # View notes by tag clusters
```

`nix outline` — Quick outliner for writing and brainstorming:
```bash
nix outline new "Blog Post"                 # Create new outline
nix outline list                            # Show all outlines
nix outline show abc123                     # Display outline structure
nix outline add abc123 "Introduction"       # Add level 1 item
nix outline add abc123 "Hook" 2             # Add level 2 (sub-item)
nix outline done abc123 1.2                 # Toggle item done status
nix outline export abc123                   # Export as Markdown
```

`nix export` — Export your data in multiple formats for portability:
```bash
nix export                                  # Show data summary
nix export json                             # Export all data as JSON
nix export csv                              # Export tabular data as CSV
nix export markdown                         # Export notes as Markdown files
nix export json --since 2026-01-01          # Export only recent data
nix export csv --output-dir ./my-data       # Export to specific folder
```

`nix import` — Import data from exports and external sources:
```bash
nix import                                  # Interactive import wizard
nix import json exports/nix-2026-01-31.json # Import from JSON export
nix import csv expenses.csv                 # Import from CSV
nix import exports/data.json --merge        # Merge with existing data
nix import file.json --dry-run              # Preview changes
nix import file.json --backup               # Auto-backup before import
```

See [`scripts/README.md`](scripts/README.md) for all commands.

Want to add your own? Check [`CONTRIBUTING.md`](CONTRIBUTING.md) for patterns and templates.

## Deploy

Auto-deploys via GitHub Pages on push to main.

## Status

⚡ **INCARNATION_V6_ONLINE**

> "No one is coming to save you. Build it yourself." — NIX
