/**
 * Database abstraction layer
 *
 * Uses better-sqlite3 for local development (synchronous, fast)
 * Uses @libsql/client for production with Turso (async, persistent)
 *
 * Provides a unified API that matches better-sqlite3's interface
 * but works with both backends.
 */

const path = require('path');

const isTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

let db;

if (isTurso) {
  // Production: Use Turso via libsql
  console.log('[DB] Using Turso (remote SQLite)');
  const { createClient } = require('@libsql/client');

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Create a wrapper that mimics better-sqlite3's API but is async-compatible
  // Since route handlers are already async, we use a pattern where:
  // - db.exec() returns a promise
  // - db.prepare(sql) returns an object with .get(), .all(), .run() that return promises
  db = {
    _client: client,

    exec: async function(sql) {
      // Split multiple statements and execute each
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await client.execute(stmt);
      }
    },

    prepare: function(sql) {
      return {
        get: async function(...params) {
          const result = await client.execute({ sql, args: params });
          return result.rows[0] || undefined;
        },
        all: async function(...params) {
          const result = await client.execute({ sql, args: params });
          return result.rows;
        },
        run: async function(...params) {
          const result = await client.execute({ sql, args: params });
          return {
            changes: result.rowsAffected,
            lastInsertRowid: result.lastInsertRowid,
          };
        },
      };
    },

    // For PRAGMA calls
    pragma: async function(sql) {
      const result = await client.execute(`PRAGMA ${sql}`);
      return result.rows;
    },

    isTurso: true,
  };
} else {
  // Local development: Use better-sqlite3
  console.log('[DB] Using better-sqlite3 (local file)');
  const Database = require('better-sqlite3');
  const dataDir = process.env.DATA_DIR || __dirname;
  const dbPath = path.join(dataDir, 'aovault.db');

  const sqliteDb = new Database(dbPath);

  // Wrap better-sqlite3 to have the same async-compatible interface
  // The sync methods are wrapped in promises for consistency
  db = {
    _raw: sqliteDb,

    exec: function(sql) {
      return sqliteDb.exec(sql);
    },

    prepare: function(sql) {
      const stmt = sqliteDb.prepare(sql);
      return {
        get: function(...params) {
          return stmt.get(...params);
        },
        all: function(...params) {
          return stmt.all(...params);
        },
        run: function(...params) {
          return stmt.run(...params);
        },
      };
    },

    pragma: function(sql) {
      return sqliteDb.pragma(sql);
    },

    isTurso: false,
  };
}

module.exports = db;
