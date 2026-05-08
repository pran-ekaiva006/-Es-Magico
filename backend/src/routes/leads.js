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

// ─── Discussions ────────────────────────────────────────────────────────────

/**
 * GET /api/leads/:id/discussions
 * Returns all discussions for a lead sorted by created_at DESC.
 * 404 if the lead doesn't exist.
 */
router.get("/:id/discussions", (req, res) => {
  try {
    const { id } = req.params;

    const lead = db.prepare("SELECT id FROM leads WHERE id = ?").get(id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const discussions = db
      .prepare(
        `SELECT * FROM discussions
         WHERE lead_id = ?
         ORDER BY created_at DESC`
      )
      .all(id);

    return res.status(200).json(discussions);
  } catch (err) {
    console.error("[GET /api/leads/:id/discussions]", err);
    return res.status(500).json({ error: "Failed to fetch discussions" });
  }
});

/**
 * POST /api/leads/:id/discussions
 *
 * Body: { note (required), follow_up_date?, follow_up_time? }
 * - Inserts a new discussion linked to the lead.
 * - If follow_up_date is provided, also updates the lead's follow_up_date
 *   and follow_up_time (both ops run in a single transaction).
 * Returns 201 with the new discussion object.
 */
router.post("/:id/discussions", (req, res) => {
  try {
    const { id } = req.params;
    const { note, follow_up_date = null, follow_up_time = null } = req.body;

    // Validate note
    if (!note || typeof note !== "string" || note.trim() === "") {
      return res.status(400).json({ error: "Note is required" });
    }

    // Check lead exists
    const lead = db.prepare("SELECT id FROM leads WHERE id = ?").get(id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const { randomUUID } = require("crypto");
    const discussionId = randomUUID();

    const insertAndSync = db.transaction(() => {
      // Insert discussion
      db.prepare(`
        INSERT INTO discussions (id, lead_id, note)
        VALUES (@id, @lead_id, @note)
      `).run({ id: discussionId, lead_id: id, note: note.trim() });

      // Sync follow-up back onto the lead if provided
      if (follow_up_date) {
        db.prepare(`
          UPDATE leads
          SET follow_up_date = @follow_up_date,
              follow_up_time = @follow_up_time
          WHERE id = @id
        `).run({ follow_up_date, follow_up_time, id });
      }
    });

    insertAndSync();

    const discussion = db
      .prepare("SELECT * FROM discussions WHERE id = ?")
      .get(discussionId);

    return res.status(201).json(discussion);
  } catch (err) {
    console.error("[POST /api/leads/:id/discussions]", err);
    return res.status(500).json({ error: "Failed to create discussion" });
  }
});

module.exports = router;
