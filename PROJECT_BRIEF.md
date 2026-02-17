# AOVault - Project Brief

## Overview
**Domain:** aovault.app (PURCHASED Jan 19, 2026)
**Tagline:** "Your fic. Forever."
**Creator:** Max Stemberg (AO3: Weasleyismyking, writing since 2010)

## The Problem
Fanfic readers lose access to beloved stories when:
- Authors delete their work
- Platforms purge content
- Bookmarks break
- Links die

Current solutions are scattered epub files, messy spreadsheets, and browser bookmarks that break.

## The Solution
AOVault is your personal fanfiction library - save, organize, and never lose a fic again.

## Core Features (MVP)
1. **Import fics via URL** - Paste AO3/FFN link, auto-download
2. **Personal cloud storage** - Your fics saved securely
3. **Custom organization** - Tags, folders, categories
4. **Notes/annotations** - Personal comments on fics
5. **Search your library** - Full-text search across saved fics
6. **Reading progress** - Track where you left off

## Business Model
**Free + Donations (AO3 style)**
- No paywalls, no subscriptions
- Donation-supported like AO3
- "AOVault is free and always will be. If you'd like to help keep it running, consider a donation."

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js (Express) or Python (FastAPI)
- **Database:** PostgreSQL (Supabase free tier)
- **File Storage:** Cloudflare R2 (S3-compatible, cheap)
- **Auth:** Clerk (free tier, Google/Apple login)
- **Hosting:** Vercel (frontend) + Railway (backend)

## Design Direction
- **Aesthetic:** Dark mode default, cozy, bookish, slightly whimsical
- **Colors:** LiveJournal-inspired blue/green/white (2000s fandom nostalgia)
- **Feel:** Candlelit library, not sterile tech
- **Inspiration:** Spotify (library), Notion (organization), Kindle (reading), Letterboxd (social)

## Revenue Projections (Conservative)
| Milestone | Users | Paid Conversion | Revenue |
|-----------|-------|-----------------|---------|
| Year 1 | 5,000 | 10% donate | $2,500-$6,000 |
| Year 2 | 25,000 | 15% donate | $18,750-$45,000 |
| Year 3 | 100,000 | 20% donate | $100,000-$240,000 |

## Go-to-Market
1. **Build in public** on Tumblr, Twitter/X, TikTok
2. **Origin story:** "I've been writing fanfic since 2010. I've lost fics I loved. I built AOVault because I was tired of losing stories that mattered to me."
3. **Target specific fandoms first** (passionate, tech-savvy readers)
4. **Creator partnerships** with fic writers who have followings

## Folder Structure
```
AOVault/
├── frontend/          # React + Vite app
├── backend/           # API server
├── docs/              # Documentation
└── PROJECT_BRIEF.md   # This file
```

## Status
- [x] Concept locked
- [x] Name locked (AOVault)
- [x] Domain purchased (aovault.app)
- [ ] Frontend scaffolded
- [ ] Backend scaffolded
- [ ] AO3 import working
- [ ] Database schema
- [ ] Auth system
- [ ] MVP complete

---
*Created: January 19, 2026*
*This is a passion project, built by a fan, for fans.*
