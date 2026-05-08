const express = require("express");
const router = express.Router();
const { db } = require("../db");

/**
 * GET /api/leads
 *
 * Query params:
 *   ?status=  — exact match filter on leads.status
 *   ?search=  — case-insensitive LIKE search on leads.name
 *
 * Returns each lead joined with its most recent discussion note.
 */
router.get("/", (req, res) => {
  try {
    const { status, search } = req.query;

    // Build WHERE clauses dynamically
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push("l.status = ?");
      params.push(status);
    }

    if (search) {
      conditions.push("l.name LIKE ?");
      params.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        l.id,
        l.name,
        l.company,
        l.phone,
        l.status,
        l.follow_up_date,
        l.follow_up_time,
        l.created_at,
        d.note       AS last_note,
        d.created_at AS last_note_at
      FROM leads l
      LEFT JOIN discussions d
        ON d.id = (
          SELECT id
          FROM   discussions
          WHERE  lead_id = l.id
          ORDER  BY created_at DESC
          LIMIT  1
        )
      ${where}
      ORDER BY l.created_at DESC
    `;

    const leads = db.prepare(query).all(...params);

    return res.status(200).json(leads);
  } catch (err) {
    console.error("[GET /api/leads]", err);
    return res.status(500).json({ error: "Failed to fetch leads" });
  }
});

const VALID_STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];

/**
 * POST /api/leads
 *
 * Body: { name (required), company?, phone?, status? }
 * Returns the newly created lead with 201.
 */
router.post("/", (req, res) => {
  try {
    const { name, company = null, phone = null, status = "New" } = req.body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Name is required" });
    }

    // Validate status
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const { randomUUID } = require("crypto");
    const id = randomUUID();

    db.prepare(`
      INSERT INTO leads (id, name, company, phone, status)
      VALUES (@id, @name, @company, @phone, @status)
    `).run({ id, name: name.trim(), company, phone, status });

    // Return the full inserted row
    const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(id);

    return res.status(201).json(lead);
  } catch (err) {
    console.error("[POST /api/leads]", err);
    return res.status(500).json({ error: "Failed to create lead" });
  }
});

/**
 * PATCH /api/leads/:id/status
 *
 * Body: { status }
 * Returns 400 for invalid status, 404 if lead not found, 200 with updated lead.
 */
router.patch("/:id/status", (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status presence + enum
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // Check lead exists
    const existing = db.prepare("SELECT id FROM leads WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "Lead not found" });
    }

    db.prepare("UPDATE leads SET status = ? WHERE id = ?").run(status, id);

    const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(id);
    return res.status(200).json(updated);
  } catch (err) {
    console.error("[PATCH /api/leads/:id/status]", err);
    return res.status(500).json({ error: "Failed to update lead status" });
  }
});

module.exports = router;

