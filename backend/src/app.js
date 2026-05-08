const express = require("express");
const cors = require("cors");
const { migrate } = require("./db");

// Run DB migrations (idempotent — safe to call multiple times)
migrate();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/leads", require("./routes/leads"));

// 404 fallback
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
