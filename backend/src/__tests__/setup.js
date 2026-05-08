// This file runs BEFORE any test modules are imported.
// Setting DATABASE_URL here ensures db.js opens an in-memory DB
// instead of the on-disk file, giving each test run a clean slate.
process.env.DATABASE_URL = ":memory:";
process.env.NODE_ENV = "test";
