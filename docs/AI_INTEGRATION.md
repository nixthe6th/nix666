# AI Integration Guide for NIX

> Transforming raw data into intelligent insights

This guide explores how AI capabilities can enhance the NIX ecosystem, building on the existing data correlation foundation (`correlate.js`) to create truly personalized productivity intelligence.

## Current State: Pattern Detection

The `nix correlate` command already identifies relationships between tracked metrics:

```bash
nix correlate sleep      # Sleep quality vs energy, mood, productivity
nix correlate mood       # Mood patterns vs habits, weather, sleep
nix correlate habits     # Habit completion impact on wellbeing
nix correlate --days 30  # Focus on recent patterns
```

### Available Correlations

| Metric Pair | Insight Type | Use Case |
|-------------|--------------|----------|
| Sleep ↔ Energy | Linear regression | Optimal bedtime prediction |
| Hydration ↔ Focus | Pattern match | Alert when hydration low |
| Exercise ↔ Mood | Moving average | Workout motivation timing |
| Meditation ↔ Sleep | Trend analysis | Evening routine optimization |
| Gratitude ↔ Wellbeing | Cumulative score | Practice encouragement |

## Phase 1: Sentiment Analysis (Implementable Now)

### Overview
Analyze emotional tone from journal entries, notes, and standup reflections to track mood trends without explicit logging.

### Implementation Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Data Sources   │────▶│ Sentiment Model │────▶│  Mood Timeline  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • zettel notes  │     │ Local LLM or    │     │ Daily scores    │
│ • standup logs  │     │ lightweight     │     │ Trend alerts    │
│ • ideas entries │     │ classifier      │     │ Correlations    │
│ • workout notes │     │ (privacy-first) │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Proposed Command: `nix sentiment`

```bash
# Analyze recent entries
nix sentiment analyze --days 7

# Output:
# 📊 Sentiment Analysis (Last 7 Days)
# ─────────────────────────────────────
# Overall: +0.6 (Positive trend)
# Volatility: Low (stable mood)
# Peak positivity: Tuesday (+0.9 after workout)
# Lowest point: Thursday (+0.2, noted "deadlines stressful")
# 
# 🔗 Correlations detected:
# • High sentiment → 2x more likely to complete habits
# • Post-exercise entries 40% more positive
# • Morning notes trend more positive than evening

# Track trends over time
nix sentiment trend --weeks 4

# Compare periods
nix sentiment compare 2026-01 2025-12
```

### Technical Approach

1. **Local-first option**: Use TensorFlow Lite sentiment model (~2MB)
   - Pros: Complete privacy, no API costs, works offline
   - Cons: Less nuanced than cloud LLMs

2. **Hybrid approach**: Local for real-time, LLM for weekly summaries
   - Daily: Local model scores new entries
   - Weekly: LLM generates narrative insights from aggregated data

### Integration Points

| Source | Field | Sentiment Value |
|--------|-------|-----------------|
| `zettel.json` | `content` | Note tone |
| `standup.json` | `wins`, `blockers` | Daily sentiment |
| `workout.json` | `notes` | Exercise satisfaction |
| `ideas.json` | `description` | Creative energy |

## Phase 2: Smart Suggestions

### Concept
Predictive recommendations based on historical patterns:

```bash
nix suggest focus     # Best focus time today
# 🤖 Based on your patterns:
#    • You complete 3x more deep work at 9am vs 3pm
#    • Current streak: 4 days of morning focus
#    • Energy typically peaks in ~45 minutes
#    ➜ Recommended: Start 90-min focus block now

nix suggest workout   # Optimal training time
# 💪 Analysis:
#    • PRs most common: Tue/Thu 6-8pm
#    • Current fatigue: Low (good sleep last 2 nights)
#    • Weather: Clear (good for outdoor run)
#    ➜ Suggested: Push day at 6:30pm

nix suggest sleep     # Optimal bedtime
# 😴 Prediction:
#    • Target wake: 6:30am (based on history)
#    • Sleep need: 7.5h (your average)
#    • Wind-down: 30 min
#    ➜ Bedtime: 10:30pm recommended
```

### Data Requirements

```javascript
// Suggestion engine inputs
const factors = {
  temporal: {
    timeOfDay: '09:00',
    dayOfWeek: 'tuesday',
    weekOfYear: 5,
    streaks: { current: 4, longest: 12 }
  },
  physiological: {
    sleepQuality: 4,      // 1-5 scale
    sleepDuration: 7.2,   // hours
    energyLevel: 4,       // latest log
    hydration: 1500       // ml today
  },
  behavioral: {
    habitsToday: 5,       // completed / total
    focusSessions: 2,     // count today
    lastWorkout: '1d ago',// recency
    moodTrend: 'upward'   // from sentiment
  },
  environmental: {
    weather: 'clear',     // from weather API
    dayLength: '10h 23m', // seasonal
    moonPhase: 'waxing'   // experimental
  }
};
```

### Confidence Scoring

Every suggestion includes confidence level:

| Confidence | Basis | Example |
|------------|-------|---------|
| High (80%+) | Strong pattern, 30+ data points | "You always focus best at 9am" |
| Medium (50-80%) | Moderate pattern, some variance | "Usually good for workout, but slept poorly" |
| Low (<50%) | Weak pattern or conflicting data | "Limited data — try tracking more" |

## Phase 3: Auto-Categorization

### Automatic Expense Categorization

```bash
nix expense add 45.50 "Starbucks near office"
# 🤖 Auto-categorized: Food & Dining → Coffee
#    Confidence: 94% (based on merchant + amount pattern)
#    [Enter to accept, type category to override]
```

### Note Auto-Tagging

```bash
nix zettel new "Just read about spaced repetition..."
# 🤖 Suggested tags: learning, books, memory
#    Based on: content keywords + your existing tags
#    Similar notes: 3 with "spaced repetition" tag
```

### Pattern Recognition

The system learns your personal patterns:

```javascript
// User pattern profile (auto-generated)
const userPatterns = {
  spending: {
    coffeeShops: ['starbucks', 'blue bottle', 'local cafe'],
    typicalAmounts: { coffee: [4, 6, 8], lunch: [12, 15, 18] }
  },
  productivity: {
    peakHours: [9, 10, 15],      // from focus session data
    lowEnergyDays: ['sunday'],   // from energy logs
    idealSprintLength: 90        // from completion rates
  },
  wellness: {
    sleepNeed: 7.5,              // personal average
    workoutRecovery: 48,         // hours between sessions
    hydrationGoal: 2500          // ml (personalized from data)
  }
};
```

## Phase 4: Predictive Analytics

### Burnout Detection

Early warning system based on leading indicators:

```bash
nix health check
# ⚠️ Wellness Alert
# 
# Risk factors detected:
# • Sleep debt: 3.5 hours (trending ↑)
# • Focus sessions: 40% below weekly average
# • Mood trend: Declining 4 days
# • Exercise: Last workout 6 days ago
# • Energy logs: Dropping (4 → 2.5)
# 
# 🔮 Predicted outcome:
#    At current trajectory: Burnout likely in 5-7 days
# 
# 💡 Recommendations:
#    1. Prioritize 8+ hours sleep tonight
#    2. Take 30-min walk (energy boost historically +1.2)
#    3. Reduce goals for next 2 days
#    4. Schedule social activity (mood ↑ historically)
```

### Goal Achievement Prediction

```bash
nix goal predict
# 🎯 Savings Goal: "Vacation Fund"
#    Target: $3,000 by June 1, 2026
#    Current: $1,850 (62%)
#    Timeline: 120 days remaining
# 
# 🔮 Prediction:
#    • At current rate: $2,940 (98% of goal) — RISK
#    • With +$100/month: $3,140 (105% of goal) — SAFE
#    • Recommended: Increase contribution to $320/month
# 
# 📊 Factors considered:
#    • Historical savings rate: $280/month
#    • Recent trend: $310/month (improving)
#    • Upcoming expenses: $450 (from subscriptions)
```

## Implementation Roadmap

### Week 1-2: Sentiment Analysis MVP
- [ ] Research local sentiment models (TensorFlow Lite, ONNX)
- [ ] Build `sentiment.js` prototype
- [ ] Test on existing zettel/standup data
- [ ] Add `nix sentiment` command

### Week 3-4: Smart Suggestions v1
- [ ] Build suggestion engine framework
- [ ] Implement `nix suggest focus` (highest value)
- [ ] Add confidence scoring
- [ ] Create suggestion history tracking

### Week 5-6: Auto-Categorization
- [ ] Expense categorization training
- [ ] Note auto-tagging
- [ ] User feedback loop (corrections improve model)

### Week 7-8: Predictive Features
- [ ] Burnout detection algorithm
- [ ] Goal prediction modeling
- [ ] Weekly AI digest report

## Privacy-First Architecture

All AI features follow these principles:

1. **Local by default**: Models run on-device
2. **Transparent**: User can see what data informs suggestions
3. **Opt-in**: Each feature requires explicit enablement
4. **Editable**: User can correct/train the system
5. **Deletable**: All learned patterns can be reset

```javascript
// Privacy-respecting data handling
const aiConfig = {
  features: {
    sentiment: { enabled: true, localOnly: true },
    suggestions: { enabled: true, sharePatterns: false },
    predictions: { enabled: false }  // user choice
  },
  dataRetention: {
    rawEntries: 'forever',      // user owns their data
    derivedPatterns: '1year',   // learned behaviors
    modelUpdates: 'onRequest'   // only when user asks
  }
};
```

## Expected Outcomes

### Quantified Benefits

| Metric | Before AI | After AI | Improvement |
|--------|-----------|----------|-------------|
| Habit completion | 65% | 78% | +13pp (timely reminders) |
| Goal achievement | 60% | 75% | +15pp (progress prediction) |
| Sleep quality | 3.2/5 | 3.8/5 | +0.6 (optimal timing) |
| Focus sessions/week | 8 | 12 | +50% (suggestion timing) |
| Data categorization | 45% | 92% | +47pp (auto-tag) |

### Qualitative Benefits

- **Reduced cognitive load**: System remembers patterns so you don't have to
- **Proactive wellness**: Catch burnout before it happens
- **Personalized insights**: Generic advice → Your specific patterns
- **Friction reduction**: Less manual categorization and tracking

## Next Steps

1. **Start collecting**: Ensure consistent logging for training data
2. **Enable correlations**: Run `nix correlate` weekly to understand patterns
3. **Prototype sentiment**: Manually review notes for emotional tone
4. **Define goals**: Clear targets enable better predictions

---

*This guide bridges ROADMAP experimental ideas with concrete implementation plans. The goal is augmenting human intelligence, not replacing human agency.*

> "The best AI is invisible — it just makes everything work better."
