const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const rawUrl = process.env.DATABASE_URL || "./data/leadflow.db";
const isMemory = rawUrl === ":memory:";

let db;

if (isMemory) {
  // In-memory DB for tests — no file I/O, no WAL mode
  db = new Database(":memory:");
} else {
  const dbPath = path.resolve(__dirname, "..", rawUrl);
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new Database(dbPath);
  // WAL mode improves concurrent read performance (file DBs only)
  db.pragma("journal_mode = WAL");
}

if (!isMemory) {
  console.log(`📦 SQLite connected: ${path.resolve(__dirname, "..", rawUrl)}`);
}

/**
 * migrate() — Creates all required tables if they don't already exist.
 * Called once at app startup (and in tests via the app factory).
 */
function migrate() {
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS discussions (
      id         TEXT PRIMARY KEY,
      lead_id    TEXT NOT NULL,
      note       TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
    );
  `);

  if (!isMemory) {
    console.log("✅ Database migration complete (tables: leads, discussions)");
  }
}

module.exports = { db, migrate };
