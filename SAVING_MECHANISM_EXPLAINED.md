# How AOVault "Saves" Fics - The Technical Truth

## THE BIG QUESTION: What Actually Gets Saved?

### Current Reality (What You Have Now)
Looking at your existing AOVault on localhost:5555, it appears to be saving:
- **Metadata** (title, author, tags, chapter count)
- **The URL** (link back to AO3)
- **Your personal data** (favorites, notes, reading progress)

### What Users WANT vs What's LEGAL

**Users Want:** "Save this fic so it never disappears"
**The Problem:** Fics get deleted, authors orphan works, sites go down
**The Solution:** We need to actually save the content, BUT do it ethically

## THREE APPROACHES (You Choose)

### OPTION 1: "Reference Manager" (Current)
```javascript
// What gets saved
{
  url: "https://archiveofourown.org/works/12345",
  title: "Amazing Fic",
  metadata: {...},
  userNotes: "Your reactions"
}
```
**Pros:** 100% legal, simple, no storage costs
**Cons:** If fic deleted on AO3 = gone forever
**User Experience:** "I bookmarked this fic beautifully"

### OPTION 2: "Cache & Archive" (RECOMMENDED)
```javascript
// What gets saved
{
  url: "original link",
  metadata: {...},
  content: {
    chapters: ["chapter1.html", "chapter2.html"],
    savedDate: "2024-01-22",
    format: "html"
  },
  userNotes: "Your reactions"
}
```

**How It Works:**
1. User pastes AO3 link
2. AOVault fetches the fic content
3. Stores in user's personal vault (database/cloud)
4. User can read from vault OR original site
5. If AO3 removes it, user still has their copy

**Pros:**
- Fics truly saved forever
- Works offline
- Protected from deletion
- "Your fic. Forever." promise kept

**Cons:**
- Storage costs
- Some authors might object
- More complex to build

### OPTION 3: "Download Manager" (Power User)
```javascript
// User explicitly downloads
{
  url: "original link",
  downloadedFormats: ["epub", "pdf", "html"],
  localStorage: "/AOVault/downloads/",
  cloudBackup: true
}
```

**User Flow:**
- Import fic (saves reference)
- Click "Download for Offline"
- Choose format (EPUB, PDF, HTML)
- Saves to their device/cloud

## THE ETHICAL APPROACH

### If We Save Content, We Should:

1. **Respect "Please Don't Download" Requests**
   - Some authors explicitly ask not to download
   - Honor those requests

2. **Keep It Private**
   - Never share downloaded fics
   - Each user's vault is private
   - No "sharing" features for content

3. **Maintain Attribution**
   - Always keep author name
   - Link back to original when possible
   - Never claim ownership

4. **The AO3 Approach**
   - AO3 offers download buttons
   - If they offer it, we can automate it
   - Same as user clicking "Download" on AO3

## RECOMMENDED IMPLEMENTATION

### The Hybrid Approach
```javascript
// Default behavior
saveToVault(url) {
  // 1. Always save metadata and URL
  saveMetadata(url);

  // 2. Ask user preference
  if (userSettings.autoArchive) {
    // Download and store content
    archiveContent(url);
  } else {
    // Just save reference
    saveReference(url);
  }

  // 3. User can always choose later
  // "Archive this fic" button available
}
```

### Storage Solutions

**For Personal Use:**
- **Frontend Only:** IndexedDB (50MB-100MB limit)
- **With Backend:** PostgreSQL + S3/Cloudflare R2
- **Cost:** ~$5/month for 1000 users with 100 fics each

**Database Structure:**
```sql
stories (
  id, url, title, author, metadata
)

story_content (
  story_id,
  chapter_number,
  content_html,
  cached_date
)

user_libraries (
  user_id,
  story_id,
  saved_content BOOLEAN,
  personal_notes
)
```

## THE USER EXPERIENCE

### What User Sees:
```
📥 "Vault This Fic"
    ↓
✨ "Saving to your vault..."
    ↓
✅ "Fic vaulted! Safe forever"

[Read from Vault] [Read on AO3]
```

### Behind the Scenes:
1. Fetches all chapters
2. Stores in database
3. Creates reading interface
4. Maintains sync with original

### If Original Deleted:
```
⚠️ "This fic was removed from AO3"
✅ "Good thing you vaulted it! Read from your saved copy"
[Read from Vault]
```

## THE BOTTOM LINE DECISION

### You Need to Decide:

**A) Just Bookmarks** (Current)
- Simple, legal, no storage
- But fics can disappear

**B) Full Archive** (Recommended)
- Actually saves fics
- Keeps promise of "Your fic. Forever"
- Some complexity and cost

**C) User Choice** (Flexible)
- Let users decide per fic
- "Bookmark only" vs "Archive forever"

## MY RECOMMENDATION

**Go with Option B: Full Archive**

Why?
1. **Your tagline is "Your fic. Forever."** - Need to deliver on that
2. **AO3 already allows downloads** - We're automating what's allowed
3. **Users HATE losing fics** - This solves real pain
4. **Storage is cheap** - $5-10/month for thousands of fics
5. **It's why AOVault exists** - To never lose a fic again

**Implementation:**
- Save content by default
- Always keep attribution
- Private vaults only
- Optional "bookmark only" mode
- Clear messaging about what's saved

---

**The Technical Answer:**
Yes, we should save the actual fic content to the vault. Not just bookmarks. Real archiving. That's what makes AOVault special - it's a TRUE vault, not just a bookmark manager.

*"Your fic. Forever." means FOREVER - even if deleted from AO3.*