# Ship Search & Elite Porn Collection Features

## PRIORITY 1: SHIP-ONLY SEARCH WITH TAGS

### The Core Need: Find EXACTLY What You Want
```
Search: [Drarry]
Filter: #submission #bottom-harry #pwp
Sort by: [Most Kudos] [Recently Updated] [Your Favorites]

Results: 45 fics matching Drarry + submission
```

### Implementation:
```javascript
searchFics({
  ship: "Drarry",  // REQUIRED
  tags: ["#submission", "#bottom-harry", "#pwp"],
  exclude: ["#top-harry", "#switching"],
  minKudos: 1000,  // Quality filter
  complete: true    // Optional: only complete
})
```

### Smart Tag Combinations:
```javascript
commonSearches: {
  "Drarry Submission": ["Drarry", "#submission", "#bottom-harry"],
  "Wolfstar Comfort": ["Wolfstar", "#hurt-comfort", "#raising-harry"],
  "Stucky PWP": ["Stucky", "#pwp", "#smut", "#no-plot"]
}
```

## PRIORITY 2: THE ELITE PORN VAULT 🔥

### "The Absolute Best" Collection
**A special, password-protected folder for the ELITE tier:**

```javascript
elitePornVault: {
  name: "🔥 The Vault™",
  password: true,
  criteria: {
    minimumReactions: ["🔥🔥🔥", "🍆🍆🍆"],
    tags: ["pwp", "smut", "pure-porn"],
    yourRating: 5,  // Only your personal 10/10s
    readCount: 5+   // You've returned to it FIVE+ times - these are THE ONES
  }
}
```

### Auto-Qualification for Elite Vault:
- You've read it 5+ times (THIS IS THE ONE)
- You marked it 🔥🔥🔥 (maximum heat)
- Tagged as PWP
- You bookmarked specific chapters
- It's in your "3am favorites"

### The Elite Vault UI:
```
🔥 THE VAULT™ (23 fics)
━━━━━━━━━━━━━━━━━━━━━
"These are the ones. The absolute best. No plot, just perfect."

[🔒 Password Protected]
[🔥 Heat Map View]
[🎲 Random Elite Pick]
```

## PRIORITY 3: UPDATE TRACKING BY SHIP+TAG

### Subscription System:
```javascript
subscriptions: [
  {
    ship: "Drarry",
    tags: ["#submission", "#eighth-year"],
    notify: "daily",
    message: "New Drarry submission fics!"
  },
  {
    ship: "Wolfstar",
    tags: ["#raising-harry"],
    notify: "weekly",
    message: "New Wolfstar family fics"
  }
]
```

### Update Dashboard:
```
TODAY'S UPDATES:
━━━━━━━━━━━━━━━
DRARRY: 3 new fics matching #submission
WOLFSTAR: 1 new chapter in subscribed fic
RARE PAIR: New Draco/Neville just dropped

[View All] [Mark Read] [Add to Vault]
```

## THE SHIP STATS DASHBOARD

### Your Shipping Profile:
```
YOUR SHIPS
━━━━━━━━━━━━━━━━━━━━━━━━
Primary Ship: DRARRY (67% of library)
Total Ships: 23
Rarest Ship: Draco/Neville (only 2 fics)

YOUR DYNAMICS
━━━━━━━━━━━━━━━━━━━━━━━━
Top Dynamic: Bottom Harry (89 fics)
Second: Enemies-to-Lovers (76 fics)
Third: PWP (45 fics)

YOUR PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━
Reading Time: 2am-4am (38% of reads)
Comfort Ship: Wolfstar (read when sad)
Guilty Pleasure: Snarry (hidden folder)
```

### Heat Map of Ships x Dynamics:
```
           | Enemies | Friends | Established | PWP  |
-----------|---------|---------|-------------|------|
Drarry     |   ███   |   ██    |     █       | ███  |
Wolfstar   |   █     |   ███   |     ██      | ██   |
Stucky     |   ██    |   ██    |     ███     | █    |
```

## DATABASE STRUCTURE FOR SHIP SEARCH

```sql
-- Fast ship + tag search
CREATE INDEX idx_ship_tags ON stories(ship, tags);

-- Elite vault tracking
CREATE TABLE elite_vault (
  story_id UUID PRIMARY KEY,
  read_count INTEGER,
  heat_level INTEGER,  -- 1-5 flames
  last_read TIMESTAMP,
  personal_notes TEXT  -- "The one with the desk scene"
);

-- Ship subscriptions
CREATE TABLE ship_subscriptions (
  user_id UUID,
  ship VARCHAR(100),
  tags TEXT[],
  notify_frequency VARCHAR(20),
  last_notified TIMESTAMP
);
```

## THE SEARCH INTERFACE

### Quick Search Bar:
```
[Select Ship ▼] + [Add Tags] = [Search]

Recent Searches:
- Drarry + #submission + #eighth-year
- Wolfstar + #pwp
- Stucky + #hurt-comfort
```

### Advanced Search:
```
Ship: [Drarry________] (required)
Include Tags: [#submission] [#bottom-harry] [+]
Exclude Tags: [#top-harry] [#switching] [+]
Word Count: [10k+]
Complete Only: [✓]
In Elite Vault: [✓]
```

## QUICK IMPLEMENTATION PLAN

### Phase 1: Ship-Required Search
1. Make ship field mandatory
2. Add tag filtering
3. Save search combinations

### Phase 2: Elite Vault
1. Create special protected folder
2. Auto-qualify based on your reactions
3. Password protect
4. Add "heat map" view

### Phase 3: Update Subscriptions
1. Track ship + tag combinations
2. Check for new fics daily
3. Send notifications
4. Build update dashboard

## WHY THIS WORKS

**People know EXACTLY what they want:**
- Ship: Drarry
- Dynamic: Bottom Harry
- Mood: PWP
- Quality: The absolute best

**No more:**
- Scrolling through irrelevant fics
- Missing updates in your niche
- Losing track of the ELITE tier
- Forgetting which ones were 10/10

**Just:**
- Your ship + Your tags = Your perfect fics
- The Elite Vault for the best of the best
- Updates for exactly what you want

---

*"Find your ship. Filter your kink. Vault the best."*