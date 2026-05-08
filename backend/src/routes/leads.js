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

module.exports = router;
