const { createClient } = require("@libsql/client");
require("dotenv").config();

const url = process.env.TURSO_DATABASE_URL || "file:./data/leadflow.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const isMemory = url.includes(":memory:");

const db = createClient({
  url,
  authToken,
});

if (!isMemory) {
  console.log(`📦 Turso SQLite connected: ${url}`);
}

/**
 * migrate() — Creates all required tables if they don't already exist.
 * Called once at app startup (and in tests).
 */
async function migrate() {
  await db.executeMultiple(`
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
      id             TEXT PRIMARY KEY,
      lead_id        TEXT NOT NULL,
      note           TEXT,
      follow_up_date TEXT,
      follow_up_time TEXT,
      created_at     DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
    );
  `);

  // ── Additive migrations for existing DBs ────────────────────────────────
  const rs = await db.execute("PRAGMA table_info(discussions)");
  const cols = rs.rows.map((c) => c.name);

  if (!cols.includes("follow_up_date")) {
    await db.execute("ALTER TABLE discussions ADD COLUMN follow_up_date TEXT");
  }
  if (!cols.includes("follow_up_time")) {
    await db.execute("ALTER TABLE discussions ADD COLUMN follow_up_time TEXT");
  }

  if (!isMemory) {
    console.log("✅ Database migration complete (tables: leads, discussions)");
  }
}

module.exports = { db, migrate };
