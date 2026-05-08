const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Resolve the DB path from DATABASE_URL env var (relative to project root)
const dbPath = path.resolve(
  __dirname,
  "..",
  process.env.DATABASE_URL || "./data/leadflow.db"
);

// Ensure the data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open (or create) the SQLite database
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

console.log(`📦 SQLite connected: ${dbPath}`);

/**
 * migrate() — Creates all required tables if they don't already exist.
 * Called once at app startup.
 *
 * IDs are UUIDs generated via crypto.randomUUID() at insert time.
 */
function migrate() {
  db.exec(`
    -- Leads table
    CREATE TABLE IF NOT EXISTS leads (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      company        TEXT,
      phone          TEXT,
      status         TEXT NOT NULL DEFAULT 'New',
      follow_up_date TEXT,
      follow_up_time TEXT,
      created_at     DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    -- Discussions table (linked to a lead)
    CREATE TABLE IF NOT EXISTS discussions (
      id         TEXT PRIMARY KEY,
      lead_id    TEXT NOT NULL,
      note       TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
    );
  `);

  console.log("✅ Database migration complete (tables: leads, discussions)");
}

module.exports = { db, migrate };
