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
nix focus 25   # Pomodoro timer
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

`nix water` — Hydration tracker with daily goals:
```bash
nix water 500                  # Add 500ml
nix water glass                # Add 250ml (quick)
nix water bottle               # Add 500ml (quick)
nix water week                 # Show last 7 days
nix water goal 3000            # Set daily goal
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

See [`scripts/README.md`](scripts/README.md) for all commands.

Want to add your own? Check [`CONTRIBUTING.md`](CONTRIBUTING.md) for patterns and templates.

## Deploy

Auto-deploys via GitHub Pages on push to main.

## Status

⚡ **INCARNATION_V6_ONLINE**

> "No one is coming to save you. Build it yourself." — NIX
