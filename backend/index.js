/**
 * AOVault Backend Server
 *
 * Core API for fanfiction library management
 * - Import fics from AO3 (FFN coming later)
 * - Store metadata and epub files
 * - User library management
 */

console.log('[AOVault] Starting server...');

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Auth modules
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Lazy-loaded modules (heavy imports that can hang in some environments)
let axios, parseHTML;
const getAxios = () => { if (!axios) axios = require('axios'); return axios; };
const getParseHTML = () => { if (!parseHTML) ({ parse: parseHTML } = require('node-html-parser')); return parseHTML; };

const app = express();
const PORT = process.env.PORT || 3001;

// In production, serve the built frontend
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const frontendPath = path.join(__dirname, 'public');
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
  }
}

// JWT Secret — generate once, persist in .env
const envPath = path.join(__dirname, '.env');
let JWT_SECRET;
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/JWT_SECRET=(.+)/);
  if (match) JWT_SECRET = match[1].trim();
}
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  fs.appendFileSync(envPath, `\nJWT_SECRET=${JWT_SECRET}\n`);
  console.log('Generated JWT_SECRET and saved to .env');
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3001',
    'http://192.168.1.215:5173',
    'http://192.168.1.215:3001',
    'https://aovault.net',
    'https://www.aovault.net',
    'capacitor://localhost',
    'ionic://localhost',
  ],
  credentials: true,
}));
app.use(express.json());

// Async route wrapper — catches unhandled errors so Express doesn't crash
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// AO3 rate limiter — minimum 1.5s between requests
let lastAO3Request = 0;
const ao3RateLimit = () => new Promise(resolve => {
  const now = Date.now();
  const elapsed = now - lastAO3Request;
  if (elapsed < 1500) {
    setTimeout(() => { lastAO3Request = Date.now(); resolve(); }, 1500 - elapsed);
  } else {
    lastAO3Request = now;
    resolve();
  }
});

// Database — uses better-sqlite3 locally, Turso/@libsql in production
const db = require('./db');

// =====================================
// DATABASE INITIALIZATION (async for Turso compatibility)
// =====================================
async function initDatabase() {
  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS fics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT,
      author_url TEXT,
      fandom TEXT,
      ship TEXT,
      rating TEXT,
      warnings TEXT,
      categories TEXT,
      characters TEXT,
      tags TEXT,
      summary TEXT,
      word_count INTEGER,
      chapter_count INTEGER,
      chapter_total INTEGER,
      status TEXT,
      language TEXT,
      published_at TEXT,
      updated_at TEXT,
      epub_path TEXT,
      notes TEXT,
      personal_tags TEXT,
      favorite INTEGER DEFAULT 0,
      read_status TEXT DEFAULT 'unread',
      read_progress INTEGER DEFAULT 0,
      date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, source, source_id)
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reading_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fic_id INTEGER,
      user_id INTEGER DEFAULT 1,
      chapter INTEGER,
      progress_percent INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fic_id) REFERENCES fics(id)
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '📚',
      is_smart BOOLEAN DEFAULT 0,
      smart_rules TEXT,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS collection_fics (
      collection_id INTEGER NOT NULL,
      fic_id INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (collection_id, fic_id),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (fic_id) REFERENCES fics(id) ON DELETE CASCADE
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reaction_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      emoji TEXT NOT NULL,
      label TEXT NOT NULL,
      position INTEGER DEFAULT 0
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS fic_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fic_id INTEGER NOT NULL,
      reaction_code TEXT NOT NULL,
      chapter_number INTEGER,
      intensity INTEGER DEFAULT 3,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fic_id) REFERENCES fics(id) ON DELETE CASCADE
    );
  `);

  console.log('Database tables initialized');

  // Phase 4: Elite Vault & Notify When Complete — add columns if missing
  const ficColumnsRaw = await db.prepare("PRAGMA table_info(fics)").all();
  const ficColumns = ficColumnsRaw.map(c => c.name);
  if (!ficColumns.includes('in_elite_vault')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN in_elite_vault INTEGER DEFAULT 0;`);
    console.log('Added in_elite_vault column');
  }
  if (!ficColumns.includes('notify_on_complete')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN notify_on_complete INTEGER DEFAULT 0;`);
    console.log('Added notify_on_complete column');
  }
  if (!ficColumns.includes('binge_threshold')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN binge_threshold INTEGER DEFAULT 0;`);
    console.log('Added binge_threshold column');
  }
  if (!ficColumns.includes('times_read')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN times_read INTEGER DEFAULT 0;`);
    console.log('Added times_read column');
  }
  if (!ficColumns.includes('last_checked_at')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN last_checked_at DATETIME;`);
    console.log('Added last_checked_at column');
  }
  if (!ficColumns.includes('elite_pin')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN elite_pin TEXT;`);
  }
  // Offline download columns
  if (!ficColumns.includes('download_status')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN download_status TEXT DEFAULT 'none';`);
    console.log('Added download_status column');
  }
  if (!ficColumns.includes('download_format')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN download_format TEXT;`);
  }
  if (!ficColumns.includes('download_path')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN download_path TEXT;`);
  }
  if (!ficColumns.includes('downloaded_at')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN downloaded_at DATETIME;`);
  }
  if (!ficColumns.includes('file_size')) {
    await db.exec(`ALTER TABLE fics ADD COLUMN file_size INTEGER;`);
  }

  // Persistent chapter cache — survives server restarts (epub files do not)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS fic_chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fic_id INTEGER NOT NULL,
      chapter_number INTEGER NOT NULL,
      title TEXT,
      html TEXT,
      UNIQUE(fic_id, chapter_number),
      FOREIGN KEY (fic_id) REFERENCES fics(id) ON DELETE CASCADE
    );
  `);

  // Auth: add password_hash to users table
  const userColumnsRaw = await db.prepare("PRAGMA table_info(users)").all();
  const userColumns = userColumnsRaw.map(c => c.name);
  if (!userColumns.includes('password_hash')) {
    await db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
    console.log('Added password_hash column to users');
  }

  // Auth: add username column to users table
  if (!userColumns.includes('username')) {
    await db.exec(`ALTER TABLE users ADD COLUMN username TEXT;`);
    console.log('Added username column to users');
    // Backfill: set username from name (lowercased, no spaces) for existing users
    const users = await db.prepare('SELECT id, name FROM users WHERE username IS NULL').all();
    for (const u of users) {
      if (u.name) {
        const uname = u.name.toLowerCase().replace(/\s+/g, '');
        await db.prepare('UPDATE users SET username = ? WHERE id = ?').run(uname, u.id);
      }
    }
    console.log(`Backfilled usernames for ${users.length} users`);
  }

  // Elite Vault PIN storage (user-level)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY DEFAULT 1,
      elite_pin TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create default user if not exists
  const defaultUser = await db.prepare('SELECT id FROM users WHERE id = 1').get();
  if (!defaultUser) {
    await db.prepare('INSERT INTO users (id, email, name) VALUES (1, ?, ?)').run('default@aovault.app', 'Default User');
  }

  // Seed default smart collections
  const existingCollections = await db.prepare('SELECT COUNT(*) as count FROM collections WHERE user_id = 1').get();
  if (existingCollections.count === 0) {
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (1, ?, ?, 1, ?, ?)').run('All Fics', '📖', '{"type":"all"}', 0);
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (1, ?, ?, 1, ?, ?)').run('Favorites', '❤️', '{"type":"favorites"}', 1);
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (1, ?, ?, 1, ?, ?)').run('Currently Reading', '📕', '{"type":"reading"}', 2);
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (1, ?, ?, 1, ?, ?)').run('WIPs', '🚧', '{"type":"wip"}', 3);
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (1, ?, ?, 1, ?, ?)').run('Complete', '✅', '{"type":"complete"}', 4);
    console.log('Default smart collections created');
  }

  // Seed reaction types
  const existingReactions = await db.prepare('SELECT COUNT(*) as count FROM reaction_types').get();
  if (existingReactions.count === 0) {
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('smut', '🔥', 'SMUT', 1);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('pwp', '🍆', 'PWP', 2);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('destroyed', '😭', 'Destroyed Me', 3);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('soft', '🥺', 'So Soft', 4);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('feral', '🦝', 'Feral', 5);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('dead', '💀', 'I Am Deceased', 6);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('scream', '😱', 'SCREAMING', 7);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('genius', '🧠', 'Literary Genius', 8);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('horny', '🥵', 'Insanely Horny', 9);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('thanks', '🙏', 'Giving Thanks', 10);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('reread', '🔁', 'Will Reread', 11);
    await db.prepare('INSERT INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run('comfort', '🧸', 'Comfort Fic', 12);
    console.log('Default reaction types seeded');
  }

  // Add new reaction types if they don't exist yet (for existing databases)
  const newReactions = [
    ['horny', '🥵', 'Insanely Horny', 9],
    ['thanks', '🙏', 'Giving Thanks', 10],
    ['reread', '🔁', 'Will Reread', 11],
    ['comfort', '🧸', 'Comfort Fic', 12],
  ];
  for (const r of newReactions) {
    await db.prepare('INSERT OR IGNORE INTO reaction_types (code, emoji, label, position) VALUES (?, ?, ?, ?)').run(...r);
  }

  console.log('Database initialization complete');
}

// =====================================
// AUTH MIDDLEWARE
// =====================================

// JWT auth — no token = guest (userId 1), bad token = guest (never 401)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.userId = 1; // Guest mode
    return next();
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
  } catch {
    req.userId = 1; // Expired/invalid = guest
  }
  next();
};

// Apply auth to all /api routes
app.use('/api', authMiddleware);

// =====================================
// AUTH ROUTES
// =====================================

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    // Check if username taken
    const existingUsername = await db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(username.toLowerCase());
    if (existingUsername) {
      return res.status(409).json({ error: 'That username is taken' });
    }

    // Check if email taken (if provided)
    if (email) {
      const existingEmail = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
      if (existingEmail) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.prepare(
      'INSERT INTO users (username, email, name, password_hash) VALUES (?, ?, ?, ?)'
    ).run(username.toLowerCase(), email ? email.toLowerCase() : null, name || username, passwordHash);

    const userId = Number(Number(result.lastInsertRowid));

    // Create default smart collections for this user
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (?, ?, ?, 1, ?, ?)').run(userId, 'All Fics', '📖', '{"type":"all"}', 0);
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (?, ?, ?, 1, ?, ?)').run(userId, 'Favorites', '❤️', '{"type":"favorites"}', 1);
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (?, ?, ?, 1, ?, ?)').run(userId, 'Currently Reading', '📕', '{"type":"reading"}', 2);
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (?, ?, ?, 1, ?, ?)').run(userId, 'WIPs', '🚧', '{"type":"wip"}', 3);
    await db.prepare('INSERT INTO collections (user_id, name, icon, is_smart, smart_rules, position) VALUES (?, ?, ?, 1, ?, ?)').run(userId, 'Complete', '✅', '{"type":"complete"}', 4);

    // Create user_settings row
    await db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(userId);

    // Generate JWT (30-day expiry)
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

    const user = await db.prepare('SELECT id, username, email, name, created_at FROM users WHERE id = ?').get(userId);
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login — accepts username or email
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Try username first, then email
    const input = username.toLowerCase();
    let user = await db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(input);
    if (!user) {
      user = await db.prepare('SELECT * FROM users WHERE email = ?').get(input);
    }

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, name: user.name, created_at: user.created_at },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Get current user
app.get('/api/auth/me', async (req, res) => {
  if (req.userId === 1) {
    return res.json({ user: null, isGuest: true });
  }
  const user = await db.prepare('SELECT id, username, email, name, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) {
    return res.json({ user: null, isGuest: true });
  }
  res.json({ user, isGuest: false });
});

// Migrate guest data to authenticated user
app.post('/api/auth/migrate', async (req, res) => {
  if (req.userId === 1) {
    return res.status(400).json({ error: 'Must be logged in to migrate data' });
  }

  try {
    // Move guest fics to the new user
    await db.prepare('UPDATE fics SET user_id = ? WHERE user_id = 1').run(req.userId);
    // Move guest collections (non-smart only — smart ones were already created for the user)
    await db.prepare('UPDATE collections SET user_id = ? WHERE user_id = 1 AND is_smart = 0').run(req.userId);
    // Move reading history
    await db.prepare('UPDATE reading_history SET user_id = ? WHERE user_id = 1').run(req.userId);
    // Copy user_settings (elite PIN)
    const guestSettings = await db.prepare('SELECT elite_pin FROM user_settings WHERE user_id = 1').get();
    if (guestSettings?.elite_pin) {
      await db.prepare('UPDATE user_settings SET elite_pin = ? WHERE user_id = ?').run(guestSettings.elite_pin, req.userId);
    }

    const ficCountRow = await db.prepare('SELECT COUNT(*) as count FROM fics WHERE user_id = ?').get(req.userId);
    res.json({ message: 'Guest data migrated to your account', ficsMigrated: ficCountRow.count });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Failed to migrate data' });
  }
});

// =====================================
// AO3 PARSER
// =====================================

/**
 * Parse AO3 HTML that was already fetched (by client or server)
 */
function parseAO3Html(url, htmlString) {
  const ao3Regex = /archiveofourown\.org\/works\/(\d+)/;
  const match = url.match(ao3Regex);
  if (!match) throw new Error('Invalid AO3 URL');
  const workId = match[1];

  const root = getParseHTML()(htmlString);

  const getLinksText = (selector) => {
    const el = root.querySelector(selector);
    if (!el) return [];
    return el.querySelectorAll('a').map(a => a.text.trim()).filter(Boolean);
  };

  let title = (root.querySelector('h2.title')?.text || '').trim();
  if (!title) title = (root.querySelector('.preface .title')?.text || '').trim();
  if (!title) title = (root.querySelector('#workskin h2')?.text || '').trim();
  const authorEl = root.querySelector('a[rel="author"]');
  const author = authorEl ? authorEl.text.trim() : '';
  const authorUrl = authorEl ? authorEl.getAttribute('href') : null;
  const rating = (root.querySelector('dd.rating')?.text || '').trim();
  const warnings = getLinksText('dd.warning');
  const fandoms = getLinksText('dd.fandom');
  const ships = getLinksText('dd.relationship');
  const characters = getLinksText('dd.character');
  const tags = getLinksText('dd.freeform');
  const categories = getLinksText('dd.category');
  const language = (root.querySelector('dd.language')?.text || '').trim();
  const wordsText = root.querySelector('dd.words')?.text || '';
  const wordCountMatch = wordsText.match(/[\d,]+/);
  const wordCount = wordCountMatch ? parseInt(wordCountMatch[0].replace(/,/g, '')) : 0;
  const chapterText = (root.querySelector('dd.chapters')?.text || '').trim();
  const chapterMatch = chapterText.match(/(\d+)\/(\d+|\?)/);
  const chapterCount = chapterMatch ? parseInt(chapterMatch[1]) : 1;
  const chapterTotal = chapterMatch && chapterMatch[2] !== '?' ? parseInt(chapterMatch[2]) : null;
  const status = chapterTotal && chapterCount >= chapterTotal ? 'Complete' : 'WIP';
  const published = (root.querySelector('dd.published')?.text || '').trim();
  const updated = (root.querySelector('dd.status')?.text || '').trim() || published;
  const summaryBlock = root.querySelector('div.summary blockquote');
  const summary = summaryBlock ? summaryBlock.text.trim() : '';

  return {
    source: 'ao3', source_id: workId,
    source_url: `https://archiveofourown.org/works/${workId}`,
    title: title || 'Untitled', author: author || 'Anonymous',
    author_url: authorUrl ? `https://archiveofourown.org${authorUrl}` : null,
    fandom: fandoms.join(', '), ship: ships.join(', '), rating,
    warnings: warnings.join(', '), categories: categories.join(', '),
    characters: characters.join(', '), tags: tags.join(', '), summary,
    word_count: wordCount, chapter_count: chapterCount, chapter_total: chapterTotal,
    status, language, published_at: published, updated_at: updated,
  };
}

/**
 * Parse AO3 work page and extract metadata
 */
async function parseAO3Work(url) {
  try {
    // Validate URL
    const ao3Regex = /archiveofourown\.org\/works\/(\d+)/;
    const match = url.match(ao3Regex);
    if (!match) {
      throw new Error('Invalid AO3 URL');
    }
    const workId = match[1];

    // Always include view_adult=true to skip the interstitial page
    const cleanUrl = `https://archiveofourown.org/works/${workId}?view_adult=true`;

    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    let htmlData;

    const workerUrl = process.env.AO3_PROXY_URL || 'https://ao3-proxy.defy-gravity-24-sda.workers.dev';

    // Attempt to fetch AO3 — with one server-side retry on rate limit
    const attemptFetch = async () => {
      const strategies = [
        // Strategy 1: Direct fetch (fast when not blocked)
        getAxios().get(cleanUrl, { headers: browserHeaders, timeout: 8000 })
          .then(r => { console.log('AO3 fetch: direct succeeded'); return r.data; }),
        // Strategy 2: CF Worker proxy (worker auto-adds view_adult=true)
        getAxios().get(`${workerUrl}/?url=${encodeURIComponent(cleanUrl)}`, {
          timeout: 15000,
          validateStatus: (s) => s < 500, // Don't throw on 4xx so we can read rate limit body
        })
          .then(r => {
            // Rate limited — throw with retry info so server can wait and retry
            if (r.status === 429 || (r.data && r.data.rateLimited)) {
              const err = new Error('rate_limited');
              err.retryAfter = r.data?.retryAfter || 30;
              throw err;
            }
            if (r.status >= 400) {
              throw new Error(`CF Worker returned ${r.status}`);
            }
            if (typeof r.data === 'string' && (r.data.includes('<!DOCTYPE') || r.data.includes('<html'))) {
              console.log('AO3 fetch: CF Worker succeeded');
              return r.data;
            }
            throw new Error('CF Worker returned non-HTML');
          }),
      ];
      return Promise.any(strategies);
    };

    try {
      htmlData = await attemptFetch();
    } catch (firstErr) {
      // Check if the CF Worker got rate limited — wait and retry once
      const rateLimitErr = firstErr.errors?.find(e => e.message === 'rate_limited');
      const waitSec = rateLimitErr?.retryAfter;
      if (waitSec && waitSec <= 45) {
        console.log(`AO3 rate limited — server waiting ${waitSec}s then retrying...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        try {
          htmlData = await attemptFetch();
        } catch {
          throw new Error('All fetch strategies failed after rate limit retry');
        }
      } else {
        throw new Error('All fetch strategies failed (direct + CF Worker proxy)');
      }
    }

    const root = getParseHTML()(htmlData);

    // Helper: get text content of all matching links inside a dd element
    const getLinksText = (selector) => {
      const el = root.querySelector(selector);
      if (!el) return [];
      return el.querySelectorAll('a').map(a => a.text.trim()).filter(Boolean);
    };

    // Extract metadata
    // AO3 uses <h2 class="title heading"> — try multiple selectors
    let title = (root.querySelector('h2.title')?.text || '').trim();
    if (!title) {
      title = (root.querySelector('h2.title.heading')?.text || '').trim();
    }
    if (!title) {
      // Fallback: look for the title in the work preface group
      const prefaceTitle = root.querySelector('.preface .title');
      title = prefaceTitle ? prefaceTitle.text.trim() : '';
    }
    if (!title) {
      // Last resort: first h2 inside work meta
      const anyH2 = root.querySelector('#workskin h2');
      title = anyH2 ? anyH2.text.trim() : '';
    }
    console.log('AO3 parse: title found =', JSON.stringify(title));
    const authorEl = root.querySelector('a[rel="author"]');
    const author = authorEl ? authorEl.text.trim() : '';
    const authorUrl = authorEl ? authorEl.getAttribute('href') : null;

    // Rating
    const rating = (root.querySelector('dd.rating')?.text || '').trim();

    // Warnings, Fandoms, Ships, Characters, Tags, Categories
    const warnings = getLinksText('dd.warning');
    const fandoms = getLinksText('dd.fandom');
    const ships = getLinksText('dd.relationship');
    const characters = getLinksText('dd.character');
    const tags = getLinksText('dd.freeform');
    const categories = getLinksText('dd.category');

    // Language
    const language = (root.querySelector('dd.language')?.text || '').trim();

    // Word count
    const wordsText = root.querySelector('dd.words')?.text || '';
    const wordCountMatch = wordsText.match(/[\d,]+/);
    const wordCount = wordCountMatch ? parseInt(wordCountMatch[0].replace(/,/g, '')) : 0;

    // Chapters
    const chapterText = (root.querySelector('dd.chapters')?.text || '').trim();
    const chapterMatch = chapterText.match(/(\d+)\/(\d+|\?)/);
    const chapterCount = chapterMatch ? parseInt(chapterMatch[1]) : 1;
    const chapterTotal = chapterMatch && chapterMatch[2] !== '?' ? parseInt(chapterMatch[2]) : null;

    // Status
    const status = chapterTotal && chapterCount >= chapterTotal ? 'Complete' : 'WIP';

    // Dates
    const published = (root.querySelector('dd.published')?.text || '').trim();
    const updated = (root.querySelector('dd.status')?.text || '').trim() || published;

    // Summary
    const summaryBlock = root.querySelector('div.summary blockquote');
    const summary = summaryBlock ? summaryBlock.text.trim() : '';

    return {
      source: 'ao3',
      source_id: workId,
      source_url: `https://archiveofourown.org/works/${workId}`,
      title: title || 'Untitled',
      author: author || 'Anonymous',
      author_url: authorUrl ? `https://archiveofourown.org${authorUrl}` : null,
      fandom: fandoms.join(', '),
      ship: ships.join(', '),
      rating: rating,
      warnings: warnings.join(', '),
      categories: categories.join(', '),
      characters: characters.join(', '),
      tags: tags.join(', '),
      summary: summary,
      word_count: wordCount,
      chapter_count: chapterCount,
      chapter_total: chapterTotal,
      status: status,
      language: language,
      published_at: published,
      updated_at: updated,
    };
  } catch (error) {
    console.error('AO3 Parse Error:', error.message);
    throw new Error(`Failed to parse AO3 work: ${error.message}`);
  }
}

/**
 * Download epub from AO3
 */
async function downloadAO3Epub(workId, userId = 1) {
  // Wait for AO3 rate limit to clear before downloading (metadata fetch just happened)
  await ao3RateLimit();

  const epubUrl = `https://archiveofourown.org/downloads/${workId}/work.epub`;
  const workerUrl = process.env.AO3_PROXY_URL || 'https://ao3-proxy.defy-gravity-24-sda.workers.dev';
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  try {
    // Try direct first, fall back to CF Worker proxy (AO3 often 525s on direct)
    let data;
    try {
      const response = await getAxios().get(epubUrl, {
        responseType: 'arraybuffer',
        headers: browserHeaders,
        timeout: 15000,
      });
      data = response.data;
      console.log('EPUB download: direct succeeded');
    } catch (directErr) {
      console.log(`EPUB direct failed (${directErr.message}), trying CF Worker...`);
      const proxyResponse = await getAxios().get(
        `${workerUrl}/?url=${encodeURIComponent(epubUrl)}`,
        { responseType: 'arraybuffer', timeout: 30000 }
      );
      data = proxyResponse.data;
      console.log('EPUB download: CF Worker succeeded');
    }

    // Create storage directory
    const storageDir = path.join(__dirname, 'storage', String(userId));
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // Save epub
    const epubPath = path.join(storageDir, `${workId}.epub`);
    fs.writeFileSync(epubPath, data);

    return epubPath;
  } catch (error) {
    console.error('Epub Download Error:', error.message);
    return null; // Don't fail the whole import if epub download fails
  }
}

// =====================================
// API ROUTES
// =====================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AOVault API', version: '1.0.0' });
});

// Import a fic from URL
// Supports two modes:
// 1. Server-side fetch: { url: "https://archiveofourown.org/works/..." }
// 2. Client-side relay: { url: "...", html: "<full page HTML>" } — used when server can't reach AO3
app.post('/api/fics/import', async (req, res) => {
  try {
    const { url, html } = req.body;
    const userId = req.userId;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Determine source and parse
    let ficData;
    if (url.includes('archiveofourown.org')) {
      if (html) {
        // Client already fetched the HTML — just parse it
        ficData = parseAO3Html(url, html);
      } else {
        // Try server-side fetch, fall back to asking client to relay
        try {
          ficData = await parseAO3Work(url);
        } catch (fetchErr) {
          // Any fetch failure → ask the client to relay the HTML instead
          // This covers: 403, 429, 502, 503, 525, rate limits, CF blocks, timeouts, etc.
          console.log(`Server-side AO3 fetch failed: ${fetchErr.message} — requesting client relay`);
          return res.status(422).json({
            error: 'ao3_blocked',
            message: 'Server cannot reach AO3. Please retry — the app will fetch it directly.',
            needsClientFetch: true,
          });
        }
      }
    } else if (url.includes('fanfiction.net')) {
      return res.status(400).json({ error: 'FFN support coming soon!' });
    } else {
      return res.status(400).json({ error: 'Unsupported source. Currently supporting: AO3' });
    }

    // Check if already saved
    const existing = await db.prepare(
      'SELECT id, title FROM fics WHERE user_id = ? AND source = ? AND source_id = ?'
    ).get(userId, ficData.source, ficData.source_id);

    if (existing) {
      return res.status(409).json({
        error: 'This fic is already in your vault',
        ficId: existing.id,
        title: existing.title,
        alreadySaved: true
      });
    }

    // Download epub
    const epubPath = await downloadAO3Epub(ficData.source_id, userId);
    ficData.epub_path = epubPath;

    // Save to database
    const result = await db.prepare(`
      INSERT INTO fics (
        user_id, source, source_id, source_url, title, author, author_url,
        fandom, ship, rating, warnings, categories, characters, tags,
        summary, word_count, chapter_count, chapter_total, status,
        language, published_at, updated_at, epub_path
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      userId, ficData.source, ficData.source_id, ficData.source_url,
      ficData.title, ficData.author, ficData.author_url,
      ficData.fandom, ficData.ship, ficData.rating, ficData.warnings,
      ficData.categories, ficData.characters, ficData.tags,
      ficData.summary, ficData.word_count, ficData.chapter_count,
      ficData.chapter_total, ficData.status, ficData.language,
      ficData.published_at, ficData.updated_at, ficData.epub_path
    );

    // Return the saved fic
    const savedFic = await db.prepare('SELECT * FROM fics WHERE id = ?').get(Number(result.lastInsertRowid));
    const ficId = Number(result.lastInsertRowid);

    // Parse EPUB and cache chapters in DB so they survive server restarts
    if (epubPath && fs.existsSync(epubPath)) {
      try {
        const { chapters } = await parseEpubToChapters(epubPath);
        for (const ch of chapters) {
          await db.prepare(
            'INSERT OR IGNORE INTO fic_chapters (fic_id, chapter_number, title, html) VALUES (?, ?, ?, ?)'
          ).run(ficId, ch.number, ch.title, ch.html);
        }
        console.log(`[import] Cached ${chapters.length} chapters for fic ${ficId} in DB`);
      } catch (chErr) {
        console.warn(`[import] Chapter cache failed (non-fatal): ${chErr.message}`);
      }
    }

    res.status(201).json({
      message: 'Fic saved to vault!',
      fic: savedFic,
      epubFailed: !epubPath,
    });
  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all fics for user
app.get('/api/fics', async (req, res) => {
  const userId = req.userId;
  const { search, fandom, ship, status, rating, sort } = req.query;

  let query = 'SELECT * FROM fics WHERE user_id = ?';
  const params = [userId];

  // Search filter
  if (search) {
    query += ' AND (title LIKE ? OR author LIKE ? OR fandom LIKE ? OR ship LIKE ? OR tags LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Fandom filter
  if (fandom) {
    query += ' AND fandom LIKE ?';
    params.push(`%${fandom}%`);
  }

  // Ship filter
  if (ship) {
    query += ' AND ship LIKE ?';
    params.push(`%${ship}%`);
  }

  // Status filter
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  // Rating filter
  if (rating) {
    query += ' AND rating = ?';
    params.push(rating);
  }

  // Sorting
  switch (sort) {
    case 'title':
      query += ' ORDER BY title ASC';
      break;
    case 'author':
      query += ' ORDER BY author ASC';
      break;
    case 'words':
      query += ' ORDER BY word_count DESC';
      break;
    case 'updated':
      query += ' ORDER BY updated_at DESC';
      break;
    default:
      query += ' ORDER BY date_added DESC';
  }

  const fics = await db.prepare(query).all(...params);
  res.json({ fics, count: fics.length });
});

// Get downloaded fics (MUST be before /api/fics/:id to avoid route shadowing)
app.get('/api/fics/downloaded', async (req, res) => {
  const userId = req.userId;
  const fics = await db.prepare(
    "SELECT * FROM fics WHERE user_id = ? AND download_status = 'downloaded' ORDER BY downloaded_at DESC"
  ).all(userId);
  res.json({ fics, count: fics.length });
});

// Get single fic
app.get('/api/fics/:id', async (req, res) => {
  const { id } = req.params;
  const fic = await db.prepare('SELECT * FROM fics WHERE id = ?').get(id);

  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  res.json({ fic });
});

// Update fic (notes, personal tags, favorite, read status, elite vault, notifications)
app.patch('/api/fics/:id', async (req, res) => {
  const { id } = req.params;
  const { notes, personal_tags, favorite, read_status, read_progress,
          in_elite_vault, times_read, notify_on_complete, binge_threshold } = req.body;

  const updates = [];
  const params = [];

  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }
  if (personal_tags !== undefined) {
    updates.push('personal_tags = ?');
    params.push(personal_tags);
  }
  if (favorite !== undefined) {
    updates.push('favorite = ?');
    params.push(favorite ? 1 : 0);
  }
  if (read_status !== undefined) {
    updates.push('read_status = ?');
    params.push(read_status);
  }
  if (read_progress !== undefined) {
    updates.push('read_progress = ?');
    params.push(read_progress);
  }
  if (in_elite_vault !== undefined) {
    updates.push('in_elite_vault = ?');
    params.push(in_elite_vault ? 1 : 0);
  }
  if (times_read !== undefined) {
    updates.push('times_read = ?');
    params.push(parseInt(times_read) || 0);
  }
  if (notify_on_complete !== undefined) {
    updates.push('notify_on_complete = ?');
    params.push(notify_on_complete ? 1 : 0);
  }
  if (binge_threshold !== undefined) {
    updates.push('binge_threshold = ?');
    params.push(parseInt(binge_threshold) || 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  params.push(id);
  const query = `UPDATE fics SET ${updates.join(', ')} WHERE id = ?`;

  await db.prepare(query).run(...params);
  const fic = await db.prepare('SELECT * FROM fics WHERE id = ?').get(id);

  res.json({ message: 'Fic updated', fic });
});

// Delete fic
app.delete('/api/fics/:id', async (req, res) => {
  const { id } = req.params;
  const fic = await db.prepare('SELECT * FROM fics WHERE id = ?').get(id);

  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  // Delete epub file if exists
  if (fic.epub_path && fs.existsSync(fic.epub_path)) {
    fs.unlinkSync(fic.epub_path);
  }

  // Delete from database
  await db.prepare('DELETE FROM fics WHERE id = ?').run(id);

  res.json({ message: 'Fic removed from vault' });
});

// Get stats
app.get('/api/stats', async (req, res) => {
  const userId = req.userId;

  const totalFicsRow = await db.prepare('SELECT COUNT(*) as count FROM fics WHERE user_id = ?').get(userId);
  const totalFics = totalFicsRow.count;
  const totalWordsRow = await db.prepare('SELECT SUM(word_count) as total FROM fics WHERE user_id = ?').get(userId);
  const totalWords = totalWordsRow.total || 0;
  const favoritesRow = await db.prepare('SELECT COUNT(*) as count FROM fics WHERE user_id = ? AND favorite = 1').get(userId);
  const favorites = favoritesRow.count;
  const completeRow = await db.prepare("SELECT COUNT(*) as count FROM fics WHERE user_id = ? AND status = 'Complete'").get(userId);
  const complete = completeRow.count;
  const wipRow = await db.prepare("SELECT COUNT(*) as count FROM fics WHERE user_id = ? AND status = 'WIP'").get(userId);
  const wip = wipRow.count;

  // Top fandoms
  const topFandoms = await db.prepare(`
    SELECT fandom, COUNT(*) as count
    FROM fics WHERE user_id = ? AND fandom != ''
    GROUP BY fandom
    ORDER BY count DESC
    LIMIT 5
  `).all(userId);

  // Top ships
  const topShips = await db.prepare(`
    SELECT ship, COUNT(*) as count
    FROM fics WHERE user_id = ? AND ship != ''
    GROUP BY ship
    ORDER BY count DESC
    LIMIT 5
  `).all(userId);

  res.json({
    totalFics,
    totalWords,
    favorites,
    complete,
    wip,
    topFandoms,
    topShips,
  });
});

// Serve EPUB files for reading
app.get('/api/fics/:id/epub', async (req, res) => {
  const { id } = req.params;
  const fic = await db.prepare('SELECT epub_path FROM fics WHERE id = ?').get(id);

  if (!fic || !fic.epub_path) {
    return res.status(404).json({ error: 'EPUB not found' });
  }

  if (!fs.existsSync(fic.epub_path)) {
    return res.status(404).json({ error: 'EPUB file missing' });
  }

  res.setHeader('Content-Type', 'application/epub+zip');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(fic.epub_path);
});

// =====================================
// COLLECTIONS API
// =====================================

// Get all collections with fic counts
app.get('/api/collections', async (req, res) => {
  const userId = req.userId;

  const collections = await db.prepare(`
    SELECT c.*,
      CASE
        WHEN c.is_smart = 1 THEN (
          CASE json_extract(c.smart_rules, '$.type')
            WHEN 'all' THEN (SELECT COUNT(*) FROM fics WHERE user_id = ?)
            WHEN 'favorites' THEN (SELECT COUNT(*) FROM fics WHERE user_id = ? AND favorite = 1)
            WHEN 'reading' THEN (SELECT COUNT(*) FROM fics WHERE user_id = ? AND read_status = 'reading')
            WHEN 'wip' THEN (SELECT COUNT(*) FROM fics WHERE user_id = ? AND status = 'WIP')
            WHEN 'complete' THEN (SELECT COUNT(*) FROM fics WHERE user_id = ? AND status = 'Complete')
            ELSE 0
          END
        )
        ELSE (SELECT COUNT(*) FROM collection_fics WHERE collection_id = c.id)
      END as fic_count
    FROM collections c
    WHERE c.user_id = ?
    ORDER BY c.position ASC
  `).all(userId, userId, userId, userId, userId, userId);

  res.json({ collections });
});

// Create a custom collection
app.post('/api/collections', async (req, res) => {
  const userId = req.userId;
  const { name, description, icon } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Collection name is required' });
  }

  // Get next position
  const maxPos = await db.prepare(
    'SELECT MAX(position) as maxPos FROM collections WHERE user_id = ?'
  ).get(userId);
  const position = (maxPos?.maxPos ?? -1) + 1;

  const result = await db.prepare(
    'INSERT INTO collections (user_id, name, description, icon, is_smart, position) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(userId, name, description || null, icon || '📚', position);

  const collection = await db.prepare('SELECT * FROM collections WHERE id = ?').get(Number(result.lastInsertRowid));

  res.status(201).json({ collection });
});

// Update a collection
app.patch('/api/collections/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, icon } = req.body;

  const collection = await db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  if (collection.is_smart) {
    return res.status(400).json({ error: 'Cannot edit smart collections' });
  }

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (icon !== undefined) { updates.push('icon = ?'); params.push(icon); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  params.push(id);
  await db.prepare(`UPDATE collections SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = await db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  res.json({ collection: updated });
});

// Delete a custom collection
app.delete('/api/collections/:id', async (req, res) => {
  const { id } = req.params;

  const collection = await db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  if (collection.is_smart) {
    return res.status(400).json({ error: 'Cannot delete smart collections' });
  }

  await db.prepare('DELETE FROM collection_fics WHERE collection_id = ?').run(id);
  await db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  res.json({ message: 'Collection deleted' });
});

// Get fics in a collection
app.get('/api/collections/:id/fics', async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const collection = await db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  let fics;
  if (collection.is_smart) {
    const rules = JSON.parse(collection.smart_rules || '{}');
    switch (rules.type) {
      case 'all':
        fics = await db.prepare('SELECT * FROM fics WHERE user_id = ? ORDER BY date_added DESC').all(userId);
        break;
      case 'favorites':
        fics = await db.prepare('SELECT * FROM fics WHERE user_id = ? AND favorite = 1 ORDER BY date_added DESC').all(userId);
        break;
      case 'reading':
        fics = await db.prepare("SELECT * FROM fics WHERE user_id = ? AND read_status = 'reading' ORDER BY date_added DESC").all(userId);
        break;
      case 'wip':
        fics = await db.prepare("SELECT * FROM fics WHERE user_id = ? AND status = 'WIP' ORDER BY date_added DESC").all(userId);
        break;
      case 'complete':
        fics = await db.prepare("SELECT * FROM fics WHERE user_id = ? AND status = 'Complete' ORDER BY date_added DESC").all(userId);
        break;
      default:
        fics = [];
    }
  } else {
    fics = await db.prepare(`
      SELECT f.* FROM fics f
      JOIN collection_fics cf ON f.id = cf.fic_id
      WHERE cf.collection_id = ?
      ORDER BY cf.added_at DESC
    `).all(id);
  }

  res.json({ fics, count: fics.length, collection });
});

// Add fic to a collection
app.post('/api/collections/:id/fics/:ficId', async (req, res) => {
  const { id, ficId } = req.params;

  const collection = await db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  if (collection.is_smart) {
    return res.status(400).json({ error: 'Cannot manually add fics to smart collections' });
  }

  const fic = await db.prepare('SELECT * FROM fics WHERE id = ?').get(ficId);
  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  // Check if already in collection
  const existing = await db.prepare(
    'SELECT * FROM collection_fics WHERE collection_id = ? AND fic_id = ?'
  ).get(id, ficId);
  if (existing) {
    return res.status(409).json({ error: 'Fic already in this collection' });
  }

  await db.prepare('INSERT INTO collection_fics (collection_id, fic_id) VALUES (?, ?)').run(id, ficId);
  res.status(201).json({ message: 'Fic added to collection' });
});

// Remove fic from a collection
app.delete('/api/collections/:id/fics/:ficId', async (req, res) => {
  const { id, ficId } = req.params;

  const collection = await db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  if (collection.is_smart) {
    return res.status(400).json({ error: 'Cannot manually remove fics from smart collections' });
  }

  await db.prepare('DELETE FROM collection_fics WHERE collection_id = ? AND fic_id = ?').run(id, ficId);
  res.json({ message: 'Fic removed from collection' });
});

// =====================================
// REACTIONS
// =====================================

// Get all reaction types
app.get('/api/reactions/types', async (req, res) => {
  const types = await db.prepare('SELECT * FROM reaction_types ORDER BY position').all();
  res.json({ types });
});

// Get reactions for a fic
app.get('/api/fics/:id/reactions', async (req, res) => {
  const { id } = req.params;
  const reactions = await db.prepare(`
    SELECT fr.*, rt.emoji, rt.label
    FROM fic_reactions fr
    JOIN reaction_types rt ON fr.reaction_code = rt.code
    WHERE fr.fic_id = ?
    ORDER BY fr.created_at DESC
  `).all(id);
  res.json({ reactions });
});

// Add a reaction to a fic
app.post('/api/fics/:id/reactions', async (req, res) => {
  const { id } = req.params;
  const { reaction_code, intensity = 3, chapter_number, note } = req.body;

  if (!reaction_code) {
    return res.status(400).json({ error: 'reaction_code is required' });
  }

  // Validate reaction type exists
  const reactionType = await db.prepare('SELECT * FROM reaction_types WHERE code = ?').get(reaction_code);
  if (!reactionType) {
    return res.status(400).json({ error: 'Invalid reaction code' });
  }

  // Validate fic exists
  const fic = await db.prepare('SELECT * FROM fics WHERE id = ?').get(id);
  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  // Validate intensity
  const validIntensity = Math.max(1, Math.min(5, parseInt(intensity) || 3));

  const result = await db.prepare(`
    INSERT INTO fic_reactions (fic_id, reaction_code, intensity, chapter_number, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, reaction_code, validIntensity, chapter_number || null, note || null);

  const reaction = await db.prepare(`
    SELECT fr.*, rt.emoji, rt.label
    FROM fic_reactions fr
    JOIN reaction_types rt ON fr.reaction_code = rt.code
    WHERE fr.id = ?
  `).get(Number(result.lastInsertRowid));

  res.status(201).json({ reaction });
});

// Update a reaction
app.patch('/api/reactions/:id', async (req, res) => {
  const { id } = req.params;
  const { intensity, note } = req.body;

  const existing = await db.prepare('SELECT * FROM fic_reactions WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Reaction not found' });
  }

  const updates = [];
  const values = [];

  if (intensity !== undefined) {
    updates.push('intensity = ?');
    values.push(Math.max(1, Math.min(5, parseInt(intensity) || 3)));
  }
  if (note !== undefined) {
    updates.push('note = ?');
    values.push(note);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  await db.prepare(`UPDATE fic_reactions SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const reaction = await db.prepare(`
    SELECT fr.*, rt.emoji, rt.label
    FROM fic_reactions fr
    JOIN reaction_types rt ON fr.reaction_code = rt.code
    WHERE fr.id = ?
  `).get(id);

  res.json({ reaction });
});

// Delete a reaction
app.delete('/api/reactions/:id', async (req, res) => {
  const { id } = req.params;

  const existing = await db.prepare('SELECT * FROM fic_reactions WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Reaction not found' });
  }

  await db.prepare('DELETE FROM fic_reactions WHERE id = ?').run(id);
  res.json({ message: 'Reaction removed' });
});

// =====================================
// ELITE VAULT
// =====================================

// Get elite vault PIN status (has PIN been set?)
app.get('/api/elite-vault/status', async (req, res) => {
  const settings = await db.prepare('SELECT elite_pin FROM user_settings WHERE user_id = ?').get(req.userId);
  res.json({ hasPin: !!(settings && settings.elite_pin) });
});

// Set or update elite vault PIN
app.post('/api/elite-vault/pin', async (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 characters' });
  }

  const existing = await db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.userId);
  if (existing) {
    await db.prepare('UPDATE user_settings SET elite_pin = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(pin, req.userId);
  } else {
    await db.prepare('INSERT INTO user_settings (user_id, elite_pin) VALUES (?, ?)').run(req.userId, pin);
  }

  res.json({ message: 'PIN set successfully' });
});

// Verify elite vault PIN
app.post('/api/elite-vault/verify', async (req, res) => {
  const { pin } = req.body;
  const settings = await db.prepare('SELECT elite_pin FROM user_settings WHERE user_id = ?').get(req.userId);

  if (!settings || !settings.elite_pin) {
    return res.json({ valid: true, noPinSet: true });
  }

  res.json({ valid: pin === settings.elite_pin });
});

// Get all elite vault fics
app.get('/api/elite-vault', async (req, res) => {
  const fics = await db.prepare(
    'SELECT * FROM fics WHERE user_id = ? AND in_elite_vault = 1 ORDER BY date_added DESC'
  ).all(req.userId);
  res.json({ fics, count: fics.length });
});

// Add fic to elite vault
app.post('/api/fics/:id/elite-vault', async (req, res) => {
  const { id } = req.params;
  const { force } = req.body;

  const fic = await db.prepare('SELECT * FROM fics WHERE id = ?').get(id);
  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  // Check qualification: 5+ reads OR force add
  if (!force && (fic.times_read || 0) < 5) {
    return res.status(400).json({
      error: 'Fic needs 5+ reads to qualify for Elite Vault, or use force add',
      times_read: fic.times_read || 0,
      needed: 5,
    });
  }

  await db.prepare('UPDATE fics SET in_elite_vault = 1 WHERE id = ?').run(id);
  const updated = await db.prepare('SELECT * FROM fics WHERE id = ?').get(id);
  res.json({ message: 'Added to Elite Vault', fic: updated });
});

// Remove from elite vault
app.delete('/api/fics/:id/elite-vault', async (req, res) => {
  const { id } = req.params;
  await db.prepare('UPDATE fics SET in_elite_vault = 0 WHERE id = ?').run(id);
  res.json({ message: 'Removed from Elite Vault' });
});

// Increment times read
app.post('/api/fics/:id/read-count', async (req, res) => {
  const { id } = req.params;
  await db.prepare('UPDATE fics SET times_read = COALESCE(times_read, 0) + 1 WHERE id = ?').run(id);
  const fic = await db.prepare('SELECT id, times_read, in_elite_vault FROM fics WHERE id = ?').get(id);
  res.json({
    times_read: fic.times_read,
    qualifies_for_elite: fic.times_read >= 5,
    in_elite_vault: !!fic.in_elite_vault,
  });
});

// =====================================
// NOTIFICATION SETTINGS
// =====================================

// Get notification settings for a fic
app.get('/api/fics/:id/notifications', async (req, res) => {
  const { id } = req.params;
  const fic = await db.prepare(
    'SELECT id, notify_on_complete, binge_threshold, status, chapter_count, chapter_total, last_checked_at FROM fics WHERE id = ?'
  ).get(id);

  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  res.json({
    notify_on_complete: !!fic.notify_on_complete,
    binge_threshold: fic.binge_threshold || 0,
    status: fic.status,
    chapter_count: fic.chapter_count,
    chapter_total: fic.chapter_total,
    last_checked_at: fic.last_checked_at,
  });
});

// Update notification settings for a fic
app.patch('/api/fics/:id/notifications', async (req, res) => {
  const { id } = req.params;
  const { notify_on_complete, binge_threshold } = req.body;

  const updates = [];
  const params = [];

  if (notify_on_complete !== undefined) {
    updates.push('notify_on_complete = ?');
    params.push(notify_on_complete ? 1 : 0);
  }
  if (binge_threshold !== undefined) {
    updates.push('binge_threshold = ?');
    params.push(parseInt(binge_threshold) || 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  params.push(id);
  await db.prepare(`UPDATE fics SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json({ message: 'Notification settings updated' });
});

// Check for fic updates (re-scrape AO3 for WIPs)
// Rate limited: max 10 fics per check, with ao3RateLimit between each
app.post('/api/fics/check-updates', async (req, res) => {
  const allWips = await db.prepare(
    "SELECT * FROM fics WHERE user_id = ? AND status = 'WIP' AND source = 'ao3' ORDER BY last_checked_at ASC"
  ).all(req.userId);

  // Check at most 10 per request, oldest-checked first
  const wips = allWips.slice(0, 10);
  const results = [];
  let consecutiveFailures = 0;

  for (const fic of wips) {
    // Circuit breaker: stop if AO3 keeps failing
    if (consecutiveFailures >= 2) {
      results.push({ id: fic.id, title: fic.title, skipped: true, reason: 'AO3 rate limited' });
      continue;
    }

    try {
      await ao3RateLimit();
      const updated = await parseAO3Work(fic.source_url);

      const changes = {};
      if (updated.chapter_count !== fic.chapter_count) {
        changes.new_chapters = updated.chapter_count - fic.chapter_count;
      }
      if (updated.status !== fic.status) {
        changes.status_changed = { from: fic.status, to: updated.status };
      }
      if (updated.word_count !== fic.word_count) {
        changes.word_count_change = updated.word_count - fic.word_count;
      }

      if (Object.keys(changes).length > 0) {
        // Update the fic in database
        await db.prepare(`
          UPDATE fics SET
            chapter_count = ?, chapter_total = ?, word_count = ?,
            status = ?, updated_at = ?, last_checked_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          updated.chapter_count, updated.chapter_total, updated.word_count,
          updated.status, updated.updated_at, fic.id
        );

        results.push({
          id: fic.id,
          title: fic.title,
          changes,
          notify: fic.notify_on_complete && updated.status === 'Complete',
          binge_ready: fic.binge_threshold > 0 && changes.new_chapters >= fic.binge_threshold,
        });
      } else {
        await db.prepare('UPDATE fics SET last_checked_at = CURRENT_TIMESTAMP WHERE id = ?').run(fic.id);
      }
      consecutiveFailures = 0; // Reset on success
    } catch (err) {
      consecutiveFailures++;
      results.push({ id: fic.id, title: fic.title, error: err.message });
    }
  }

  res.json({
    checked: wips.length,
    total_wips: allWips.length,
    remaining: Math.max(0, allWips.length - 10),
    updates: results,
  });
});

// =====================================
// OFFLINE READING - FETCH FULL TEXT
// =====================================

// Read all files from an epub (zip) into a {filename: string} map
function readEpubFiles(epubPath) {
  const yauzl = require('yauzl');
  return new Promise((resolve, reject) => {
    const files = {};
    yauzl.open(epubPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.readEntry();
      zip.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) { zip.readEntry(); return; } // skip directories
        zip.openReadStream(entry, (err2, stream) => {
          if (err2) { zip.readEntry(); return; }
          const chunks = [];
          stream.on('data', c => chunks.push(c));
          stream.on('end', () => {
            // Store as utf-8 text; binary files (images) will be garbled but we won't use them
            files[entry.fileName] = Buffer.concat(chunks).toString('utf8');
            zip.readEntry();
          });
          stream.on('error', () => zip.readEntry());
        });
      });
      zip.on('end', () => resolve(files));
      zip.on('error', reject);
    });
  });
}

// Parse an AO3 epub into chapter objects.
// Fast path — epub already lives on disk from the import step, no AO3 request needed.
async function parseEpubToChapters(epubPath) {
  const files = await readEpubFiles(epubPath);

  // Find OPF path via container.xml
  const containerXml = files['META-INF/container.xml'];
  if (!containerXml) throw new Error('Missing META-INF/container.xml');
  const opfMatch = containerXml.match(/full-path="([^"]+\.opf)"/i);
  if (!opfMatch) throw new Error('Cannot find OPF path in container.xml');
  const opfPath = opfMatch[1];
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  const opfContent = files[opfPath];
  if (!opfContent) throw new Error(`OPF file not found: ${opfPath}`);

  // Build id → href map for manifest items
  const idToHref = {};
  for (const m of opfContent.matchAll(/id="([^"]+)"[^>]*href="([^"]+\.x?html?)"/gi)) {
    idToHref[m[1]] = decodeURIComponent(m[2].split('?')[0]);
  }

  // Walk spine in order
  const spineItems = [...opfContent.matchAll(/<itemref\s+idref="([^"]+)"/gi)];
  const skipPaths = /(nav|cover|title|toc|copyright|acknowledgement|preface)/i;
  const chapters = [];

  for (const m of spineItems) {
    const href = idToHref[m[1]];
    if (!href || skipPaths.test(href)) continue;

    // AO3 epubs can be flat or in a subdirectory
    const chapterHtml = files[opfDir + href] || files[href];
    if (!chapterHtml) continue;

    const bodyMatch = chapterHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    // Strip control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) that break JSON
    const bodyContent = bodyMatch
      ? bodyMatch[1].trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      : '';
    if (!bodyContent) continue;

    const titleMatch = bodyContent.match(/<h[123][^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h[123]>/i)
      || bodyContent.match(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const title = rawTitle || `Chapter ${chapters.length + 1}`;

    chapters.push({ number: chapters.length + 1, title, html: bodyContent });
  }

  return { chapters };
}

// Fetch full fic content for offline reading on device.
// Fast path: read from the epub already stored on this Mac.
// Slow path: fetch full-work HTML from AO3 (only when epub missing).
app.get('/api/fics/:id/content', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const fic = await db.prepare('SELECT * FROM fics WHERE id = ? AND user_id = ?').get(id, userId);
  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  if (fic.source !== 'ao3') {
    return res.status(400).json({ error: 'Only AO3 fics supported for now' });
  }

  // ── FASTEST PATH: chapters already cached in DB (survives server restarts) ──
  const cachedChapters = await db.prepare(
    'SELECT chapter_number, title, html FROM fic_chapters WHERE fic_id = ? ORDER BY chapter_number'
  ).all(id);

  if (cachedChapters.length > 0) {
    console.log(`[content] Serving ${cachedChapters.length} chapters from DB for fic ${id}`);
    return res.json({
      id: fic.id,
      title: fic.title,
      author: fic.author,
      chapters: cachedChapters.map(c => ({ number: c.chapter_number, title: c.title, html: c.html })),
      preNote: null,
      endNote: null,
      fetchedAt: new Date().toISOString(),
      source: 'db',
    });
  }

  // ── FAST PATH: use the epub we already downloaded at import time ──
  if (fic.epub_path && fs.existsSync(fic.epub_path)) {
    try {
      console.log(`[content] Using local epub for fic ${id}`);
      const { chapters } = await parseEpubToChapters(fic.epub_path);
      if (chapters.length > 0) {
        // Also cache chapters in DB for future requests
        try {
          for (const ch of chapters) {
            await db.prepare(
              'INSERT OR IGNORE INTO fic_chapters (fic_id, chapter_number, title, html) VALUES (?, ?, ?, ?)'
            ).run(id, ch.number, ch.title, ch.html);
          }
        } catch { /* non-fatal */ }
        return res.json({
          id: fic.id,
          title: fic.title,
          author: fic.author,
          chapters,
          preNote: null,
          endNote: null,
          fetchedAt: new Date().toISOString(),
          source: 'epub',
        });
      }
      console.log(`[content] Epub parsed but no chapters found — falling back to AO3 fetch`);
    } catch (epubErr) {
      console.warn(`[content] Epub parse failed (${epubErr.message}) — falling back to AO3 fetch`);
    }
  }

  // ── SLOW PATH: fetch full-work HTML from AO3 ──
  console.log(`[content] No usable epub for fic ${id} — fetching from AO3`);
  try {
    await ao3RateLimit();

    const fullUrl = `https://archiveofourown.org/works/${fic.source_id}?view_full_work=true&view_adult=true`;
    const workerUrl = process.env.AO3_PROXY_URL || 'https://ao3-proxy.defy-gravity-24-sda.workers.dev';
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    };

    let htmlData;
    try {
      htmlData = await Promise.any([
        getAxios().get(fullUrl, { headers: browserHeaders, timeout: 15000 })
          .then(r => { if (r.status === 429) throw new Error('rate_limited'); return r.data; }),
        getAxios().get(`${workerUrl}/?url=${encodeURIComponent(fullUrl)}`, {
          timeout: 30000,
          validateStatus: (s) => s < 500,
        }).then(r => {
          if (r.status === 429 || r.data?.rateLimited) throw new Error('rate_limited');
          if (typeof r.data === 'string' && r.data.includes('<')) return r.data;
          throw new Error('CF Worker returned non-HTML');
        }),
      ]);
    } catch (fetchErr) {
      const isRateLimit = fetchErr.errors?.some(e => e.message === 'rate_limited')
        || fetchErr.message === 'rate_limited';
      if (isRateLimit) {
        return res.status(429).json({ error: 'AO3 rate limit hit. Please try again in a minute.' });
      }
      return res.status(502).json({ error: 'Could not reach AO3. Try again in a minute.' });
    }

    if (!htmlData || typeof htmlData !== 'string') {
      return res.status(502).json({ error: 'AO3 returned empty response' });
    }

    const root = getParseHTML()(htmlData);
    const chapters = [];
    const chapterDivs = root.querySelectorAll('div#chapters > div.chapter') || [];

    if (chapterDivs.length > 0) {
      chapterDivs.forEach((div) => {
        const userstuff = div.querySelector('div.userstuff[role="article"]') || div.querySelector('div.userstuff');
        const html = userstuff ? userstuff.innerHTML.trim() : '';
        if (!html) return;
        const titleEl = div.querySelector('h3.title a') || div.querySelector('h3.title');
        const title = titleEl ? titleEl.text.trim() : `Chapter ${chapters.length + 1}`;
        chapters.push({ number: chapters.length + 1, title, html });
      });
    } else {
      const userstuff = root.querySelector('div.userstuff[role="article"]') ||
                        root.querySelector('div#chapters div.userstuff') ||
                        root.querySelector('div.userstuff');
      const html = userstuff ? userstuff.innerHTML.trim() : '';
      chapters.push({ number: 1, title: fic.title, html });
    }

    const preNote = root.querySelector('div.preface div.notes div.userstuff');
    const endNote = root.querySelector('div.end.notes div.userstuff');

    // Cache chapters in DB so the NEXT request is instant (doesn't need AO3 again)
    try {
      for (const ch of chapters) {
        await db.prepare(
          'INSERT OR IGNORE INTO fic_chapters (fic_id, chapter_number, title, html) VALUES (?, ?, ?, ?)'
        ).run(id, ch.number, ch.title, ch.html);
      }
      console.log(`[content] Cached ${chapters.length} AO3 chapters in DB for fic ${id}`);
    } catch { /* non-fatal */ }

    return res.json({
      id: fic.id,
      title: fic.title,
      author: fic.author,
      chapters,
      preNote: preNote ? preNote.innerHTML.trim() : null,
      endNote: endNote ? endNote.innerHTML.trim() : null,
      fetchedAt: new Date().toISOString(),
      source: 'ao3',
    });
  } catch (error) {
    console.error('Content fetch error:', error.message);
    res.status(500).json({ error: `Failed to fetch content: ${error.message}` });
  }
});

// =====================================
// OFFLINE DOWNLOADS
// =====================================

// Download a fic from AO3 for offline reading
app.post('/api/fics/:id/download', async (req, res) => {
  const { id } = req.params;
  const { format = 'epub' } = req.body;
  const userId = req.userId;

  const validFormats = ['epub', 'pdf', 'html', 'mobi'];
  if (!validFormats.includes(format)) {
    return res.status(400).json({ error: `Invalid format. Choose: ${validFormats.join(', ')}` });
  }

  const fic = await db.prepare('SELECT * FROM fics WHERE id = ? AND user_id = ?').get(id, userId);
  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  if (fic.download_status === 'downloaded' && fic.download_format === format) {
    return res.json({ message: 'Already downloaded', fic });
  }

  // Mark as downloading
  await db.prepare('UPDATE fics SET download_status = ? WHERE id = ?').run('downloading', id);

  try {
    // Rate limit AO3 requests
    await ao3RateLimit();

    // Use AO3's official download URL
    const slug = fic.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50);
    const downloadUrl = `https://archiveofourown.org/downloads/${fic.source_id}/${slug}.${format}`;
    const workerUrl = process.env.AO3_PROXY_URL || 'https://ao3-proxy.defy-gravity-24-sda.workers.dev';
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };

    // Try direct, fall back to CF Worker proxy (AO3 often 525s on direct)
    let response;
    try {
      response = await getAxios().get(downloadUrl, {
        responseType: 'arraybuffer', headers: browserHeaders, timeout: 15000,
        validateStatus: (s) => s < 500,
      });
      if (response.status === 429) throw new Error('429');
      if (response.status !== 200) throw new Error(`${response.status}`);
    } catch {
      console.log('Download direct failed, trying CF Worker...');
      response = await getAxios().get(
        `${workerUrl}/?url=${encodeURIComponent(downloadUrl)}`,
        { responseType: 'arraybuffer', timeout: 30000, validateStatus: (s) => s < 500 }
      );
    }

    if (response.status === 429 || (response.data?.rateLimited)) {
      await db.prepare('UPDATE fics SET download_status = ? WHERE id = ?').run('none', id);
      return res.status(429).json({ error: 'AO3 rate limit hit. Please try again in a minute.' });
    }

    if (response.status !== 200) {
      await db.prepare('UPDATE fics SET download_status = ? WHERE id = ?').run('failed', id);
      return res.status(502).json({ error: `AO3 returned status ${response.status}` });
    }

    // Save file
    const downloadDir = path.join(__dirname, 'downloads', String(userId));
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const filePath = path.join(downloadDir, `${fic.source_id}.${format}`);
    fs.writeFileSync(filePath, response.data);

    const fileSize = response.data.length;

    // Update database
    await db.prepare(`
      UPDATE fics SET
        download_status = 'downloaded',
        download_format = ?,
        download_path = ?,
        downloaded_at = CURRENT_TIMESTAMP,
        file_size = ?
      WHERE id = ?
    `).run(format, filePath, fileSize, id);

    const updated = await db.prepare('SELECT * FROM fics WHERE id = ?').get(id);
    res.json({ message: 'Download complete', fic: updated });
  } catch (error) {
    console.error('Download error:', error.message);
    await db.prepare('UPDATE fics SET download_status = ? WHERE id = ?').run('failed', id);
    res.status(500).json({ error: `Download failed: ${error.message}` });
  }
});

// Serve downloaded file for offline reading
app.get('/api/fics/:id/download/file', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const fic = await db.prepare('SELECT * FROM fics WHERE id = ? AND user_id = ?').get(id, userId);
  if (!fic || !fic.download_path) {
    return res.status(404).json({ error: 'No download found' });
  }

  if (!fs.existsSync(fic.download_path)) {
    await db.prepare("UPDATE fics SET download_status = 'none', download_path = NULL WHERE id = ?").run(id);
    return res.status(404).json({ error: 'Download file missing' });
  }

  const contentTypes = {
    epub: 'application/epub+zip',
    pdf: 'application/pdf',
    html: 'text/html',
    mobi: 'application/x-mobipocket-ebook',
  };

  res.setHeader('Content-Type', contentTypes[fic.download_format] || 'application/octet-stream');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(fic.download_path);
});

// Remove offline download
app.delete('/api/fics/:id/download', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const fic = await db.prepare('SELECT * FROM fics WHERE id = ? AND user_id = ?').get(id, userId);
  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  // Delete file if it exists
  if (fic.download_path && fs.existsSync(fic.download_path)) {
    fs.unlinkSync(fic.download_path);
  }

  await db.prepare(`
    UPDATE fics SET
      download_status = 'none',
      download_format = NULL,
      download_path = NULL,
      downloaded_at = NULL,
      file_size = NULL
    WHERE id = ?
  `).run(id);

  res.json({ message: 'Download removed' });
});

// List all downloaded fics
// =====================================
// MONITORING AGENTS
// =====================================
const monitor = require('./agents/monitor');

// Get current status (cached — instant response)
app.get('/api/monitor/status', (req, res) => {
  const results = monitor.getLastResults();
  if (!results) {
    return res.json({ status: 'starting', message: 'Agents initializing — check back in 30 seconds' });
  }
  res.json(results);
});

// Get check history from database
app.get('/api/monitor/history', async (req, res) => {
  const { agent, hours = 24, limit = 200 } = req.query;
  let query = `SELECT * FROM health_checks WHERE checked_at > datetime('now', '-${parseInt(hours)} hours')`;
  const params = [];
  if (agent) {
    query += ' AND agent = ?';
    params.push(agent);
  }
  query += ' ORDER BY checked_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const checks = await db.prepare(query).all(...params);
  res.json({ checks, count: checks.length });
});

// Trigger an immediate check (manual refresh)
app.post('/api/monitor/check', async (req, res) => {
  const results = await monitor.runAllAgents(db);
  res.json(results);
});

// In production, serve frontend for any non-API route (SPA fallback)
if (isProduction) {
  const frontendPath = path.join(__dirname, 'public');
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Global error handler — catches any unhandled errors from async routes
// Must be defined AFTER all routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Start server — initialize database first, then listen
const HOST = isProduction ? '0.0.0.0' : '0.0.0.0';
initDatabase()
  .then(() => {
    // Start monitoring agents after DB is ready
    monitor.startMonitoring(db);

    app.listen(PORT, HOST, () => {
      console.log(`AOVault API running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
