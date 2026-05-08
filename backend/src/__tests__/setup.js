// This file runs BEFORE any test modules are imported.
process.env.TURSO_DATABASE_URL = "file:test.db";
process.env.NODE_ENV = "test";
