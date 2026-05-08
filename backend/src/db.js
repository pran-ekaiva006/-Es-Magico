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

module.exports = db;
