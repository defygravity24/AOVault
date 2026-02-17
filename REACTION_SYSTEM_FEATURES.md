# AOVault Reaction System - Beyond Basic Kudos
*Created: January 22, 2026*
*The features that make readers FEEL something*

## THE PROBLEM WITH KUDOS
- One kudos per story? That's bullshit
- Can't express HOW a story made you feel
- Can't react to specific chapters/moments
- No way to say "Chapter 5 destroyed me"

## THE SOLUTION: VAULT REACTIONS

### 1. PRIVATE EMOTIONAL REACTIONS (Per Chapter!)

Instead of one boring kudos, give readers REAL reactions:

#### Core Reactions (Private, Just for You)
```javascript
reactions: {
  "destroyed": "😭 This destroyed me",
  "feral": "🔥 Going absolutely feral",
  "soft": "🥺 So soft I could die",
  "scream": "😱 SCREAMING",
  "dead": "💀 I'm deceased",
  "gay": "🏳️‍🌈 THE GAYEST THING EVER" // (in the best way)
}
```

#### Why "Gay" as Ultimate Compliment
- In fanfic culture, "this is so gay" = highest praise
- It means: perfectly queer, beautifully romantic, exactly what we wanted
- Not derogatory - CELEBRATORY
- "The gayest shit I've ever read and I LOVE IT"

### 2. MULTIPLE REACTIONS PER STORY

**The Revolution:** React to EACH part differently

```javascript
storyReactions: {
  overall: ["destroyed", "gay", "soft"],
  chapter1: ["soft"],
  chapter5: ["destroyed", "scream", "dead"],
  chapter10: ["feral", "gay", "destroyed"]
}
```

**Use Cases:**
- "Chapter 1-4: soft → Chapter 5: DESTROYED → Chapter 6-10: feral"
- Shows your emotional journey through the story
- Private record of how it made you feel

### 3. INTENSITY LEVELS

Not just WHAT but HOW MUCH:

```javascript
reactionIntensity: {
  reaction: "destroyed",
  level: 5, // 1-5 scale
  note: "Chapter 5 has me on the FLOOR"
}
```

**Visual in App:**
- 😭 (level 1) = "got me"
- 😭😭😭 (level 3) = "crying"
- 😭😭😭😭😭 (level 5) = "DESTROYED BEYOND REPAIR"

## THE FEATURES THAT MATTER

### Feature 1: Reaction History
**"Why did I vault this?"**
- See your past reactions
- Remember WHY you saved it
- "Oh right, Chapter 5 destroyed me"
- Your emotional map of the story

### Feature 2: Reaction Patterns
**Your Personal Stats:**
- "You react '😭 destroyed' to slow burn fics 89% of the time"
- "Your 'going feral 🔥' fics are usually enemies-to-lovers"
- "You mark things 'so gay 🏳️‍🌈' most on Fridays at 2am"

### Feature 3: Smart Recommendations
**Based on Reactions, Not Just Tags:**
- "Stories that destroyed other readers like Chapter 5 destroyed you"
- "More fics that made people go feral"
- "The gayest fics in your favorite tags"

## IMPLEMENTATION

### Database Schema
```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  story_id UUID,
  chapter_id UUID NULL, -- can be overall or specific
  reaction_type VARCHAR(50), -- 'destroyed', 'feral', etc
  intensity INTEGER (1-5),
  note TEXT,
  created_at TIMESTAMP,
  private BOOLEAN DEFAULT true -- always private unless shared
);

CREATE TABLE reaction_definitions (
  id UUID PRIMARY KEY,
  code VARCHAR(50), -- 'destroyed', 'gay', etc
  emoji VARCHAR(10),
  label VARCHAR(100),
  positive BOOLEAN DEFAULT true
);
```

### Default Reactions to Ship
```javascript
const DEFAULT_REACTIONS = [
  { code: 'destroyed', emoji: '😭', label: 'This destroyed me' },
  { code: 'feral', emoji: '🔥', label: 'Going absolutely feral' },
  { code: 'soft', emoji: '🥺', label: 'So soft I could die' },
  { code: 'scream', emoji: '😱', label: 'SCREAMING' },
  { code: 'dead', emoji: '💀', label: "I'm deceased" },
  { code: 'gay', emoji: '🏳️‍🌈', label: 'THE GAYEST THING EVER' },
  { code: 'pain', emoji: '💔', label: 'Why would you hurt me like this' },
  { code: 'genius', emoji: '🧠', label: 'Literary genius' },
  { code: 'comfort', emoji: '🤗', label: 'My comfort fic' },
  { code: 'unhinged', emoji: '😈', label: 'Beautifully unhinged' }
];
```

### UI Components

#### Quick Reaction Bar (Per Chapter)
```
[😭] [🔥] [🥺] [😱] [💀] [🏳️‍🌈] [+]
 1-5   1-5  1-5   1-5  1-5   1-5    more
```

#### Reaction Summary (Story Card)
```
"War and Peace AU"
📚 300k words | 45 chapters
Your reactions: 😭😭😭😭😭 (ch 5) | 🔥🔥🔥 (ch 12) | 🏳️‍🌈🏳️‍🌈🏳️‍🌈🏳️‍🌈🏳️‍🌈 (overall)
"The gayest enemies-to-lovers that destroyed me"
```

## WHY THIS IS GENIUS

### 1. MULTIPLE REACTIONS
- Not limited to one kudos
- React to EACH moment
- Build emotional map

### 2. CHAPTER-SPECIFIC
- "Chapter 5 destroyed me"
- "Chapter 12 made me feral"
- Track your journey

### 3. PRIVATE BY DEFAULT
- Your reactions are YOURS
- No judgment
- Your guilty pleasures safe

### 4. CULTURALLY AWARE
- "Gay" as highest compliment
- Fandom language native
- Not sanitized corporate speak

## QUICK ADD PRESETS

### For Smut Chapters
- 🔥 "Going feral"
- 😈 "Unhinged"
- 💀 "Deceased"

### For Angst Chapters
- 😭 "Destroyed"
- 💔 "Why hurt me"
- 😱 "SCREAMING"

### For Fluff Chapters
- 🥺 "So soft"
- 🤗 "Comfort"
- 🏳️‍🌈 "Gay (affectionate)"

## THE VISION

**Instead of:** "I left kudos on this fic"

**You get:** "Chapter 5 destroyed me completely (😭😭😭😭😭), Chapter 12 had me going feral (🔥🔥🔥), and overall this is the gayest thing I've ever read (🏳️‍🌈🏳️‍🌈🏳️‍🌈🏳️‍🌈🏳️‍🌈)"

## MVP FEATURES (BUILD FIRST)

1. **Reaction Palette:** 6-10 core reactions
2. **Per-Chapter Reactions:** React to specific chapters
3. **Intensity Levels:** 1-5 scale for each
4. **Private Notes:** Add why it destroyed you
5. **Reaction History:** See your emotional journey

## FUTURE FEATURES

1. **Custom Reactions:** Add your own
2. **Reaction Analytics:** "You get destroyed by slow burns"
3. **Friend Sharing:** (Optional) "Sarah also went feral at Chapter 12"
4. **Author View:** (Optional) Anonymous aggregated reactions

## THE BOTTOM LINE

Kudos are boring. One-click likes are meaningless.

AOVault reactions let you:
- Express HOW a story made you feel
- React MULTIPLE times
- Remember WHY you loved it
- Track your emotional journey
- Use real fandom language

**"Because sometimes one kudos isn't enough to express how thoroughly a fic destroyed you."**

---

*Note: All reactions are PRIVATE by default. This is YOUR emotional journey with fics, not social media performance.*