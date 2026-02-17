# Ship Tracking - CORE MVP FEATURE
*Because fanfic IS shipping*

## WHY SHIPS MATTER

**The Truth:** People don't search for "good stories" - they search for their SHIPS
- "Draco/Harry enemies to lovers"
- "Zuko/Katara slow burn"
- "Steve/Bucky hurt/comfort"

**Ships are HOW we organize fanfic mentally**

## MVP SHIP FEATURES

### 1. PRIMARY SHIP FIELD (Required)
```javascript
story: {
  primaryShip: "Draco/Harry",  // or "Drarry"
  shipTags: ["Drarry", "Draco/Harry", "H/D"],
  shipDynamics: ["enemies-to-lovers", "slow-burn", "switching"]
}
```

### 2. SHIP NAME RECOGNITION
**Auto-detect common ship names:**
```javascript
shipAliases: {
  "Drarry": ["Draco/Harry", "Harry/Draco", "H/D", "HD"],
  "Destiel": ["Dean/Castiel", "Castiel/Dean", "D/C"],
  "Stucky": ["Steve/Bucky", "Bucky/Steve", "S/B"],
  "Zutara": ["Zuko/Katara", "Katara/Zuko", "Z/K"]
}
```

### 3. YOUR SHIP STATS
```
YOUR TOP SHIPS:
1. Drarry - 145 fics (38% of library)
2. Wolfstar - 89 fics (23%)
3. Stucky - 67 fics (17%)

YOUR SHIP DYNAMICS:
- Enemies to lovers: 234 fics
- Friends to lovers: 156 fics
- Established relationship: 98 fics
```

### 4. SHIP-BASED FOLDERS
**Auto-generated smart folders:**
```
📁 Ships
  📁 Drarry (145)
    📁 Enemies to Lovers (67)
    📁 Eighth Year (45)
    📁 Auror Partners (23)
  📁 Wolfstar (89)
    📁 Marauders Era (56)
    📁 Raising Harry (20)
```

### 5. NOTP (Not Our Ship) FILTERING
**Hide ships you don't like:**
```javascript
userPreferences: {
  notps: ["Harry/Ginny", "Ron/Hermione"],
  hideNOTPs: true,  // Never show these
  warnSecondaryNOTP: true  // Warn if NOTP is secondary ship
}
```

## SHIP DYNAMICS TAGS

### Essential Dynamics to Track:
```javascript
shipDynamics: [
  // Relationship progression
  "enemies-to-lovers",
  "friends-to-lovers",
  "established-relationship",
  "getting-together",
  "slow-burn",

  // Power dynamics
  "switching",
  "top-draco",
  "bottom-harry",
  "verse",

  // Tropes
  "fake-relationship",
  "arranged-marriage",
  "soulmates",
  "bonding",
  "mating",

  // Settings
  "eighth-year",
  "post-war",
  "canon-divergent",
  "muggle-au"
]
```

## QUICK SHIP ENTRY

### When Adding a Fic:
```
Paste URL: [_________________]
Primary Ship: [Drarry_______] (autocomplete)
Dynamics: [x] enemies-to-lovers [x] slow-burn [ ] eighth-year

[Vault This Ship!]
```

### Ship-First Navigation:
```
Browse by:
[Ships] [Fandoms] [Tags] [Authors]

Select Ship:
[Drarry ▼]

Filter by dynamics:
[All] [Enemies] [Friends] [Established] [Slow Burn]
```

## MULTI-SHIP SUPPORT

### For Multi-Ship Fics:
```javascript
ships: {
  primary: "Drarry",
  secondary: ["Wolfstar", "Pansy/Hermione"],
  background: ["Ron/Blaise"],
  endgame: "Drarry"  // For fics with relationship journey
}
```

### Polyamory Ships:
```javascript
ships: {
  primary: "Harry/Draco/Hermione",
  type: "polyamory",
  aliases: ["Harmony", "Golden Trio OT3"]
}
```

## SHIP RECOMMENDATIONS

### "More Like This" Based on Ships:
```
Because you love Drarry + enemies-to-lovers:
- "Turn" by Saras_Girl (Drarry, eighth-year)
- "Stop All the Clocks" by firethesound (Drarry, memory-loss)

Other ships with similar dynamics:
- Zutara (enemies-to-lovers in ATLA)
- Dramione (enemies-to-lovers in HP)
```

## SHIP HISTORY TRACKING

### Your Shipping Journey:
```
2020: Discovered Drarry (first fic: "Turn")
2021: Wolfstar phase (89 fics in 3 months)
2022: Stucky obsession (read entire AO3 tag)
2023: Multi-fandom era (15 different ships)
2024: Back to Drarry (comfort ship)
```

## THE UI/UX

### Ship Pills/Tags:
```
"Away Childish Things"
[Drarry] [De-aging] [Kid Fic] [8th Year]
     ↓
  (Click ship to see all Drarry fics)
```

### Quick Ship Switch:
```
Currently viewing: DRARRY (145 fics)
Quick switch: [Wolfstar] [Stucky] [Zutara]
```

## DATABASE SCHEMA

```sql
-- Ships table
CREATE TABLE ships (
  id UUID PRIMARY KEY,
  ship_name VARCHAR(100),  -- "Drarry"
  character1 VARCHAR(100),  -- "Draco Malfoy"
  character2 VARCHAR(100),  -- "Harry Potter"
  fandom VARCHAR(100),      -- "Harry Potter"
  aliases TEXT[]            -- ["H/D", "Harry/Draco"]
);

-- Story ships (many-to-many)
CREATE TABLE story_ships (
  story_id UUID,
  ship_id UUID,
  ship_type VARCHAR(20),  -- primary, secondary, background
  is_endgame BOOLEAN
);

-- User ship preferences
CREATE TABLE user_ships (
  user_id UUID,
  ship_id UUID,
  is_notp BOOLEAN DEFAULT false,
  fic_count INTEGER,
  first_read DATE,
  notes TEXT
);
```

## WHY THIS IS MVP

**People organize by ships MORE than any other factor:**
- "Show me my Drarry fics"
- "I need Wolfstar comfort"
- "New Zutara just dropped"
- "Hide all my NOTPs"

**Ships are identity in fandom:**
- "I'm a Drarry shipper"
- "Wolfstar owns my soul"
- "Multishipper but Stucky main"

## QUICK WINS

1. **Ship field on import** (required)
2. **Ship folders** (auto-organize)
3. **NOTP filtering** (hide ships you hate)
4. **Ship stats** (know your preferences)
5. **Ship dynamics** (enemies-to-lovers, etc)

---

**THE BOTTOM LINE:**
If AOVault doesn't track ships properly, it's not a fanfic app. Ships ARE fanfic. This needs to be core MVP, not an afterthought.

*"Your ships. Your dynamics. Your vault."*