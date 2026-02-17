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
const axios = require('axios');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'aovault.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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

console.log('Database initialized at:', dbPath);

// Create default user if not exists
const defaultUser = db.prepare('SELECT id FROM users WHERE id = 1').get();
if (!defaultUser) {
  db.prepare('INSERT INTO users (id, email, name) VALUES (1, ?, ?)').run('default@aovault.app', 'Default User');
}

// =====================================
// AO3 PARSER
// =====================================

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

    // Fetch the page
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'AOVault/1.0 (Personal Fanfiction Library)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Extract metadata
    const title = $('h2.title').text().trim();
    const author = $('a[rel="author"]').first().text().trim();
    const authorUrl = $('a[rel="author"]').first().attr('href');

    // Rating
    const rating = $('dd.rating').text().trim();

    // Warnings
    const warnings = $('dd.warning').find('a').map((i, el) => $(el).text().trim()).get();

    // Fandoms
    const fandoms = $('dd.fandom').find('a').map((i, el) => $(el).text().trim()).get();

    // Relationships (ships)
    const ships = $('dd.relationship').find('a').map((i, el) => $(el).text().trim()).get();

    // Characters
    const characters = $('dd.character').find('a').map((i, el) => $(el).text().trim()).get();

    // Tags
    const tags = $('dd.freeform').find('a').map((i, el) => $(el).text().trim()).get();

    // Language
    const language = $('dd.language').text().trim();

    // Stats
    const statsText = $('dd.stats').text();
    const wordCountMatch = $('dd.words').text().match(/[\d,]+/);
    const wordCount = wordCountMatch ? parseInt(wordCountMatch[0].replace(/,/g, '')) : 0;

    // Chapters
    const chapterText = $('dd.chapters').text().trim();
    const chapterMatch = chapterText.match(/(\d+)\/(\d+|\?)/);
    const chapterCount = chapterMatch ? parseInt(chapterMatch[1]) : 1;
    const chapterTotal = chapterMatch && chapterMatch[2] !== '?' ? parseInt(chapterMatch[2]) : null;

    // Status
    const status = chapterTotal && chapterCount >= chapterTotal ? 'Complete' : 'WIP';

    // Dates
    const published = $('dd.published').text().trim();
    const updated = $('dd.status').text().trim() || published;

    // Summary
    const summary = $('div.summary blockquote').text().trim();

    // Categories
    const categories = $('dd.category').find('a').map((i, el) => $(el).text().trim()).get();

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
  const epubUrl = `https://archiveofourown.org/downloads/${workId}/work.epub`;

  try {
    const response = await axios.get(epubUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'AOVault/1.0 (Personal Fanfiction Library)',
      },
      timeout: 30000,
    });

    // Create storage directory
    const storageDir = path.join(__dirname, 'storage', String(userId));
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // Save epub
    const epubPath = path.join(storageDir, `${workId}.epub`);
    fs.writeFileSync(epubPath, response.data);

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
app.post('/api/fics/import', async (req, res) => {
  try {
    const { url } = req.body;
    const userId = 1; // Default user for now

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Determine source and parse
    let ficData;
    if (url.includes('archiveofourown.org')) {
      ficData = await parseAO3Work(url);
    } else if (url.includes('fanfiction.net')) {
      return res.status(400).json({ error: 'FFN support coming soon!' });
    } else {
      return res.status(400).json({ error: 'Unsupported source. Currently supporting: AO3' });
    }

    // Check if already saved
    const existing = db.prepare(
      'SELECT id FROM fics WHERE user_id = ? AND source = ? AND source_id = ?'
    ).get(userId, ficData.source, ficData.source_id);

    if (existing) {
      return res.status(409).json({ error: 'This fic is already in your vault', ficId: existing.id });
    }

    // Download epub
    const epubPath = await downloadAO3Epub(ficData.source_id, userId);
    ficData.epub_path = epubPath;

    // Save to database
    const insert = db.prepare(`
      INSERT INTO fics (
        user_id, source, source_id, source_url, title, author, author_url,
        fandom, ship, rating, warnings, categories, characters, tags,
        summary, word_count, chapter_count, chapter_total, status,
        language, published_at, updated_at, epub_path
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const result = insert.run(
      userId, ficData.source, ficData.source_id, ficData.source_url,
      ficData.title, ficData.author, ficData.author_url,
      ficData.fandom, ficData.ship, ficData.rating, ficData.warnings,
      ficData.categories, ficData.characters, ficData.tags,
      ficData.summary, ficData.word_count, ficData.chapter_count,
      ficData.chapter_total, ficData.status, ficData.language,
      ficData.published_at, ficData.updated_at, ficData.epub_path
    );

    // Return the saved fic
    const savedFic = db.prepare('SELECT * FROM fics WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Fic saved to vault!',
      fic: savedFic,
    });
  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all fics for user
app.get('/api/fics', (req, res) => {
  const userId = 1; // Default user for now
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

  const fics = db.prepare(query).all(...params);
  res.json({ fics, count: fics.length });
});

// Get single fic
app.get('/api/fics/:id', (req, res) => {
  const { id } = req.params;
  const fic = db.prepare('SELECT * FROM fics WHERE id = ?').get(id);

  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  res.json({ fic });
});

// Update fic (notes, personal tags, favorite, read status)
app.patch('/api/fics/:id', (req, res) => {
  const { id } = req.params;
  const { notes, personal_tags, favorite, read_status, read_progress } = req.body;

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

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  params.push(id);
  const query = `UPDATE fics SET ${updates.join(', ')} WHERE id = ?`;

  db.prepare(query).run(...params);
  const fic = db.prepare('SELECT * FROM fics WHERE id = ?').get(id);

  res.json({ message: 'Fic updated', fic });
});

// Delete fic
app.delete('/api/fics/:id', (req, res) => {
  const { id } = req.params;
  const fic = db.prepare('SELECT * FROM fics WHERE id = ?').get(id);

  if (!fic) {
    return res.status(404).json({ error: 'Fic not found' });
  }

  // Delete epub file if exists
  if (fic.epub_path && fs.existsSync(fic.epub_path)) {
    fs.unlinkSync(fic.epub_path);
  }

  // Delete from database
  db.prepare('DELETE FROM fics WHERE id = ?').run(id);

  res.json({ message: 'Fic removed from vault' });
});

// Get stats
app.get('/api/stats', (req, res) => {
  const userId = 1;

  const totalFics = db.prepare('SELECT COUNT(*) as count FROM fics WHERE user_id = ?').get(userId).count;
  const totalWords = db.prepare('SELECT SUM(word_count) as total FROM fics WHERE user_id = ?').get(userId).total || 0;
  const favorites = db.prepare('SELECT COUNT(*) as count FROM fics WHERE user_id = ? AND favorite = 1').get(userId).count;
  const complete = db.prepare("SELECT COUNT(*) as count FROM fics WHERE user_id = ? AND status = 'Complete'").get(userId).count;
  const wip = db.prepare("SELECT COUNT(*) as count FROM fics WHERE user_id = ? AND status = 'WIP'").get(userId).count;

  // Top fandoms
  const topFandoms = db.prepare(`
    SELECT fandom, COUNT(*) as count
    FROM fics WHERE user_id = ? AND fandom != ''
    GROUP BY fandom
    ORDER BY count DESC
    LIMIT 5
  `).all(userId);

  // Top ships
  const topShips = db.prepare(`
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
app.get('/api/fics/:id/epub', (req, res) => {
  const { id } = req.params;
  const fic = db.prepare('SELECT epub_path FROM fics WHERE id = ?').get(id);

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

// Start server - bind to all interfaces for mobile access
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AOVault API running on port ${PORT}`);
});

module.exports = app;
