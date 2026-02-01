# NIX Workflows — Complete Productivity Systems

> "Tools are useless without a system. Workflows turn tools into habits." — NIX

This guide shows how to combine NIX tools into complete productivity workflows.

---

## 🌅 Morning Routine (5 minutes)

**Start your day with clarity:**

```bash
# 1. Check today's briefnix today
# 2. Log how you slept
nix sleep                    # Shows last night + trends
# 3. Check energy level
nix energy 4 "Well rested"   # Log morning energy (1-5)
# 4. Review today's time blocks
nix timeblock                # See scheduled focus time
# 5. Check habits due today
nix habits                   # Morning habits (meditation, exercise)
# 6. Log gratitude
nix gratitude add "Quiet morning coffee"```

**Alternative one-liner:**
```bash
nix today && nix sleep && nix timeblock
```

---

## 🎯 Deep Work Session

**Prepare, execute, and log focused work:**

```bash
# 1. Start with clear intention
nix distraction clear        # Reset distraction log

# 2. Check what to work on
nix todo list | head -5      # Top 5 priorities

# 3. Start focused timer
nix timer 50 -m "Writing project proposal"

# 4. If interrupted, log it immediately
nix distraction "Slack notification" normal

# 5. After session, mark todo done
nix todo done abc1           # Complete the task```

**Pomodoro variant (4 cycles):**
```bash
for i in 1 2 3 4; do
    nix timer 25 -m "Focus sprint $i"
    nix water glass          # Hydrate between sessions
    sleep 300                # 5-min breakdone
```

---

## 📚 Learning Session

**Structured skill acquisition:**

```bash
# 1. Select what to learn
nix learn list               # Show active skills
nix learn review             # Due for review today

# 2. Start learning block
nix timer 45 -m "Learning Rust"

# 3. Log progress
nix learn log "Rust" "Finished chapter on ownership" 45

# 4. Create flashcards for key concepts
nix flashcard add "Rust" "What is ownership?" "Memory management without GC"

# 5. Review due cards
nix flashcard review         # Spaced repetition queue

# 6. Capture notes
nix zettel new "Rust Ownership Model" --tag rust --tag programming```

---

## 💪 Workout Logging

**Track your fitness consistently:**

```bash
# 1. Start workout
nix workout start "Push Day"

# 2. Log each exercise
nix workout log bench 3x8 80
nix workout log overhead 3x10 50
nix workout log dips 3x12 bw

# 3. Log energy after
nix energy 4 "Strong session"

# 4. End and note
nix workout end "Felt strong on bench, PR soon"

# 5. Check progress
nix workout stats bench      # See progression over time
```

**Quick cardio logging:**
```bash
nix workout start "Morning Run"
nix workout log running 30min 5km
nix workout end "Easy pace, good weather"
```

---

## 📝 Daily Standup Report

**Comprehensive day review:**

```bash
nix standup                  # Full daily report
# Shows:
# - Completed todos
# - Habits done
# - Time spent (timers)
# - Energy patterns
# - Expenses logged
```

**Manual deep-dive variant:**
```bash
# What got done?
nix todo list done

# Habits status?
nix habits stats

# How was focus?
nix timer stats              # Total focused time
nix distraction stats        # What interrupted most

# Health tracked?
nix water                    # Hydration check
nix sleep                    # Sleep quality
nix energy log               # Energy pattern

# Money spent?
nix expense list today

# Any insights?
nix correlate                # Pattern analysis
```

---

## 📖 Reading & Research

**Track reading and capture insights:**

```bash
# 1. Add book/paper to reading list
nix read add "Deep Work" book
nix read add "Rust Documentation" article

# 2. Start reading session
nix timer 30 -m "Reading Deep Work"

# 3. Update progress
nix read progress deep1 45   # 45% complete

# 4. Capture key insight as zettel
nix zettel new "Deep work requires long blocks" --tag productivity

# 5. Link related notes
nix connect suggest 26013114 # Find related notes

# 6. Log to learning tracker
nix learn log "Deep Work" "Batch shallow work" 30

# 7. Mark done when finished
nix read done deep1
nix gratitude add "Finished an inspiring book"
```

---

## 💰 Financial Check-in

**Weekly money review:**

```bash
# 1. Review week's expenses
nix expense list week
nix expense summary          # By category

# 2. Check subscriptions
nix subscription monthly     # Total monthly burn
nix subscription upcoming    # Due this week

# 3. Update investments
nix invest update AAPL 185.50
nix invest performance       # Portfolio P&L

# 4. Goal progress
nix goal progress            # Savings goals

# 5. Log any missed expenses
nix expense add 45 "Groceries" food
```

**Daily quick log:**
```bash
nix expense add 12.50 "Lunch" food
nix expense add 4 "Coffee" food
```

---

## 🧘 Evening Wind-down

**Close the day intentionally:**

```bash
# 1. Log sleep preparation
nix sleep bed 10:30pm        # Target bedtime

# 2. Brief meditation
nix meditate 478             # 4-7-8 relaxation breathing

# 3. Gratitude practice (aim for 3)
nix gratitude add "Productive work session"
nix gratitude add "Good workout"
nix gratitude add "Supportive message from friend"

# 4. Tomorrow's priority
nix todo add "Review proposal" high

# 5. Check hydration
nix water                    # Did you hit goal?

# 6. Final mood log
nix mood good "Satisfying day"
```

---

## 🔍 Weekly Review (Sunday Evening)

**Comprehensive week retrospective:**

```bash
# 1. Generate week report
nix week                     # Weekly summary

# 2. Sprint review
nix sprint list              # What shipped this week

# 3. Health & wellness patterns
nix water week               # Hydration consistency
nix sleep week               # Sleep patterns
nix energy stats             # Energy trends

# 4. Learning progress
nix learn stats              # Skills progress
nix flashcard stats          # Memorization stats
nix read stats               # Books progress

# 5. Social & network
nix network followup         # Who needs contact
nix network birthday         # Upcoming birthdays

# 6. Data insights
nix correlate --days 7       # Weekly patterns
# Look for: sleep vs energy, exercise vs mood, etc.

# 7. Archive old data
nix compact --days 30 --apply  # Keep JSON files fast

# 8. Plan next week
nix timeblock template       # Apply default schedule
nix todo                     # Review and prioritize
```

---

## 🚀 Project Planning

**Start a new project with full tracking:**

```bash
# 1. Create project outline
nix outline new "Website Redesign"
nix outline add website "Research competitors"
nix outline add website "Create wireframes" 2
nnix outline add website "Build prototype" 2

# 2. Add related todos
nix todo add "Research 5 competitor sites" medium
nix todo add "Sketch homepage layout" high

# 3. Set sprint goals
nix sprint start "Website Sprint 1"

# 4. Create reading list for research
nix read add "Web Design Trends 2026" article
nix later https://example.com/trends "Design trends" design

# 5. Block time in calendar
nix timeblock add 9:00 11:00 "Website work" deep

# 6. Track progress
nix standup                  # Daily check-in
nix sprint "Shipped wireframes"  # Log milestone
```

---

## 🎒 Travel Preparation

**Plan and track travel:**

```bash
# 1. Create expense category for trip
nix expense budget 2000      # Trip budget

# 2. Savings goal for trip
nix goal add "Japan Trip" 5000 "2026-04-01"
nix goal contribute japan1 500 "Monthly savings"

# 3. Subscriptions to pause
nix subscription list        # Note what to pause

# 4. Habits to maintain on road
nix habits                   # Identify portable habits

# 5. Reading for the flight
nix read current             # Download offline
nix later list               # Queue articles

# 6. Backup before leaving
nix sync                     # Push all data
```

---

## 🤝 Networking Follow-up

**Maintain relationships systematically:**

```bash
# 1. See who needs follow-up
nix network followup         # Overdue connections

# 2. Log interaction after meeting
nix network log alex "Coffee chat about AI" 45
nix network touch alex       # Update last contacted

# 3. Set next follow-up
nix network followup alex 30 # Remind in 30 days

# 4. Birthday check
nix network birthday         # Upcoming birthdays

# 5. Add new contact from event
nix network add "Sarah Chen" "sarah@company.com" \
    "Met at ReactConf" --tag dev --tag conference

# 6. Review network stats
nix network stats            # Connection analytics
```

---

## 🧪 Habit Stack Building

**Create and track habit chains:**

```bash
# Morning stack (after waking):
# 1. Water → 2. Meditation → 3. Gratitude → 4. Review habits
nix water glass && nix meditate box 3m && \
nix gratitude add "New day" && nix habits

# Work stack (starting work):
# 1. Check todos → 2. Start timer → 3. Clear distractions
nix todo list | head -3 && nix timer 50 && nix distraction clear

# Evening stack (before bed):
# 1. Log water → 2. Gratitude → 3. Sleep prep
nix water && nix gratitude add "Day complete" && nix sleep bed 10pm
```

---

## 📊 Monthly Deep Dive

**Comprehensive month review:**

```bash
# 1. Export all data for analysis
nix export json --since 2026-01-01 --output-dir ./monthly-review

# 2. Full correlation analysis
nix correlate --days 30      # Monthly patterns

# 3. Finance summary
nix expense summary          # Monthly spending
nix invest performance       # Portfolio review
nix goal progress            # Savings progress

# 4. Learning audit
nix learn list               # Active skills
nix read stats               # Books finished
nix zettel tags              # Knowledge areas

# 5. Health trends
nix sleep week               # (run for each week)
nix energy stats             # Energy patterns
nix workout list month       # Fitness consistency

# 6. Social audit
nix network stats            # Connection depth
nix gratitude stats          # Gratitude streak

# 7. Clean up
nix compact --days 60 --apply  # Archive old data
```

---

## ⚡ Emergency Focus Mode

**When overwhelmed, reset quickly:**

```bash
# Clear everything, focus on ONE thing
nix today                    # What's most important?
nix todo list urgent         # Critical only
nix timer 25 -m "Just this one thing"
# ...work...
nix todo done abc1
nix gratitude add "Got the important thing done"
```

---

## 🔄 Sync Across Devices

**Keep data consistent everywhere:**

```bash
# Daily sync
nix sync                     # Push to git

# On new device
nix sync setup https://github.com/user/nix666-data.git
nix sync                     # Pull all data

# Check sync status
nix sync status              # When did last sync happen?

# Enable auto-sync
nix sync auto                # Sync on every command
```

---

## 🎯 Quarterly Goal Review

**Big picture planning:**

```bash
# 1. Review completed sprints
git log --oneline --since="3 months ago"
nix sprint list              # All sprints

# 2. Health metrics
nix correlate --days 90      # Quarterly patterns

# 3. Financial health
nix invest allocation        # Asset allocation
nix goal list                # Goal progress

# 4. Learning outcomes
nix learn stats              # Skills mastered
nix flashcard stats          # Knowledge retention

# 5. Relationship audit
nix network stats            # Network growth

# 6. Set next quarter goals
nix goal add "Q2 Target" 10000 "2026-06-30"
nix read add "Quarterly Planning" article
```

---

## 💡 Quick Capture Workflows

**Capture ideas instantly without losing flow:**

```bash
# Idea struck while working?
nix note "Remember to check API rate limits"

# Article to read later?
nix later https://example.com/article "API Design" tech

# Code snippet?
nix clip add "API Auth Pattern" js --file ./auth.js

# New task?
nix todo add "Refactor auth module" medium

# Book recommendation?
nix read add "Designing Data-Intensive Applications" book

# All in one session:
nix note "$@" || nix todo add "$@" || nix later "$@"
```

---

## 📋 Meeting Workflow

**Before, during, and after:**

```bash
# Before: Add to todo
nix todo add "Prep for standup" low

# During: Quick notes
nix zettel new "Standup Notes $(date +%Y-%m-%d)" --tag meeting

# After: Log decisions
nix decide add "Switch to TypeScript" --pro "Type safety" --con "Learning curve"

# Follow-up tasks
nix todo add "Update TS config" medium
nix network log alex "Discussed TS migration" 30
```

---

## 🔧 Custom Workflow Creation

**Build your own:**

1. **Identify friction** — What do you forget or avoid?
2. **Chain 3-5 commands** — Start small
3. **Create alias** — Make it one command
4. **Use for 1 week** — Test the workflow
5. **Adjust and commit** — Refine until effortless

**Example custom workflow:**
```bash
# Add to ~/.bashrc or scripts/
workday() {
    nix today
    nix habits
    nix timeblock
    nix todo list | head -5
    nix water
}
```

---

*Pick one workflow. Use it daily for a week. Then add another.*
*The best workflow is the one you'll actually do.*
