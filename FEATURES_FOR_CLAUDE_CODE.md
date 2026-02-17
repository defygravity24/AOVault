# AOVault Features - Combined Vision
*Created: January 22, 2026*
*From Frank & Max's brainstorming session*

## PRIORITY 1: Core Features to Build NOW

### 1. Smart Folder System (NEW)
**What:** Custom folders with drag-and-drop organization
**Implementation:**
```javascript
folders: {
  // Default smart folders
  "all": { icon: "📚", name: "All Stories", smart: true },
  "reading": { icon: "📖", name: "Currently Reading", smart: true },
  "waiting-complete": { icon: "⏳", name: "Waiting for Complete", smart: true },
  "finished": { icon: "✅", name: "Finished", smart: true },

  // User custom folders
  "comfort": { icon: "🤗", name: "Comfort Reads", custom: true },
  "dark": { icon: "😈", name: "Dark Fics", custom: true },
  "3am-crying": { icon: "😭", name: "3am Crying Sessions", custom: true }
}
```

**Features:**
- Unlimited custom folders with emoji icons
- Nested folders (folders within folders)
- Drag stories between folders
- Multi-select for bulk operations
- Folder counts in sidebar

### 2. "Notify When Complete" System (GENIUS FEATURE)
**What:** Only get notified when a story is COMPLETELY done
**Why:** No other app does this - readers hate incomplete fics

**Implementation:**
- Toggle on each story: "Don't notify until complete"
- Check for "Complete" status on AO3
- Special "Waiting for Complete" smart folder
- Badge showing how many stories you're waiting on
- Optional: Estimated completion date based on update patterns

### 3. Private Chapter Notes & Kudos
**What:** Your personal thoughts on EACH chapter, not just the whole fic
**Implementation:**
```javascript
chapters: [
  {
    number: 1,
    read: true,
    readDate: "2024-01-22",
    personalKudos: true, // private, just for you
    notes: "The way they met!!!! 😭",
    favoriteQuotes: ["line 1", "line 2"]
  }
]
```

**Features:**
- Private kudos per chapter (just for your memory)
- Personal notes per chapter
- Mark specific quotes/moments
- "Chapter 5 destroyed me" type notes
- Track which chapters you've read multiple times

### 4. Binge Mode (AMAZING)
**What:** Don't notify until X chapters accumulate
**Options:**
- Wait for 5+ new chapters
- Wait for 10+ new chapters
- Custom threshold
- "I only read complete arcs"

### 5. Reading Progress Intelligence
**What:** Never lose your place, know exactly where you are

**Features:**
- "3 chapters behind" counter
- Progress bar visualization
- "Last read: Chapter 7 of 10"
- Scroll position within chapter
- "You stopped at the good part!" reminders
- Reading velocity tracking ("You usually read 2 chapters/day")

## PRIORITY 2: Enhanced Import & Organization

### 6. Smart Import from AO3
**What:** One-click import that gets EVERYTHING
- Auto-parse all metadata
- Pull tags and let user choose which to keep
- Detect series and offer to import all
- "Import all bookmarks" option
- "Import reading history" (if possible)

### 7. Update Pattern Detection
**What:** Learn author's posting schedule
- "This author updates every Friday"
- "Usually 2 weeks between chapters"
- "Has been 6 months - probably abandoned"
- Predictive completion dates

### 8. Advanced Tag System
**What:** YOUR tags, YOUR way
- Original tags from AO3 (optional import)
- Your custom tags (private)
- Tag combinations ("dark + enemies-to-lovers")
- Exclude tags ("NOT high school AU")
- Tag groups/categories

## PRIORITY 3: The Secret Sauce Features

### 9. "Completion Only" Filter
**Revolutionary Feature:** Toggle to ONLY see completed fics
- Hide all WIPs from browse
- "Complete or nothing" mode
- Exception list for trusted authors

### 10. Reading Statistics Dashboard
**What:** Your personal fanfic wrapped
- Most read fandom/ship/tag
- Total hours reading (estimate)
- Favorite time to read
- "Comfort fic" you've read 10+ times
- Reading streaks

### 11. Offline Mode (Legal Version)
**What:** Cache for reading, not downloading
- Progressive Web App that caches as you read
- Works offline for already-read chapters
- NOT downloading/storing full fics
- Just smart caching like Spotify

### 12. Privacy Features
**What:** Your guilty pleasures stay SECRET
- No public profiles by default
- Password/biometric lock on app
- Incognito folders
- "Emergency hide" button
- No social features unless explicitly enabled

## TECHNICAL IMPLEMENTATION NOTES

### Database Schema Additions
```sql
-- Folders
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT,
  icon TEXT,
  parent_folder_id UUID REFERENCES folders(id),
  is_smart BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);

-- Story Progress
CREATE TABLE reading_progress (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES stories(id),
  user_id UUID REFERENCES users(id),
  current_chapter INTEGER,
  total_chapters INTEGER,
  last_read_at TIMESTAMP,
  notify_when_complete BOOLEAN DEFAULT false,
  binge_threshold INTEGER DEFAULT 0
);

-- Chapter Notes
CREATE TABLE chapter_notes (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES stories(id),
  chapter_number INTEGER,
  user_id UUID REFERENCES users(id),
  notes TEXT,
  private_kudos BOOLEAN DEFAULT false,
  favorite_quotes JSONB,
  read_count INTEGER DEFAULT 0
);
```

### API Endpoints Needed
```
POST /api/stories/import          - Import from URL
GET  /api/stories/:id/check-updates - Check for new chapters
POST /api/folders                 - Create folder
POST /api/stories/:id/move        - Move to folder
POST /api/chapters/:id/notes      - Save chapter notes
GET  /api/stats/dashboard          - Reading statistics
POST /api/stories/:id/notify-settings - Update notification preferences
```

### Frontend Components Needed
1. **Sidebar** - Folder tree with counts
2. **StoryCard** - Shows progress, badges, notes preview
3. **ChapterModal** - Chapter-by-chapter notes/kudos
4. **ImportWizard** - Smart import with tag selection
5. **ProgressBar** - Visual reading progress
6. **NotificationSettings** - Completion/binge mode toggles

## THE KILLER FEATURES NO ONE ELSE HAS

1. **"Notify ONLY when complete"** - Revolutionary
2. **Private chapter-by-chapter notes** - Not even AO3 has this
3. **Binge mode thresholds** - Wait for multiple chapters
4. **Update pattern prediction** - "Completes in ~2 months"
5. **Smart folders with nesting** - True organization
6. **Progress tracking** - "3 chapters behind" at a glance
7. **Private kudos system** - Your appreciation, privately

## UI/UX PRIORITIES

### Dark Mode First
- Easy on eyes for late-night reading
- Warm grays, not harsh blacks
- Subtle purple/pink accents
- Cozy, not corporate

### Mobile First
- One-hand operation
- Swipe between chapters
- Quick-add bookmarks
- Offline reading

### Speed
- Instant imports
- Fast search
- Quick folder switching
- Snappy navigation

## WHAT MAKES THIS DIFFERENT

**It's NOT social media for fanfic.**
**It's a PRIVATE vault for YOUR stories.**

- No public profiles (unless you want)
- No social pressure
- No judgment
- Just you and your perfectly organized fics
- The features readers ACTUALLY want
- Built by a fanfic reader FOR fanfic readers

## PHASE 1 DELIVERABLES (This Week)

1. Folder system with drag-and-drop
2. "Notify when complete" toggle
3. Chapter-by-chapter notes
4. Progress tracking ("X chapters behind")
5. Binge mode settings
6. Smart import from AO3

## SUCCESS METRICS

- Can import a fic in <10 seconds
- Can organize 100+ fics easily
- Never lose reading position
- Zero social anxiety
- 100% private unless shared

---

## MESSAGE TO CLAUDE CODE:

We've been brainstorming the features that fanfic readers ACTUALLY want. The existing AOVault on localhost:5555 is good, but these features will make it AMAZING.

Focus on:
1. Privacy first (no default social)
2. Organization (folders are CRUCIAL)
3. The "notify when complete" feature (no one else has this!)
4. Chapter-level notes (game changer)

The backend is in `/Documents/AOVault/backend` and frontend in `/Documents/AOVault/frontend`.

Let's build the features readers are DESPERATE for, not what we think they want.

*"Your fic. Forever. Organized exactly how YOU want."*