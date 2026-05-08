const request = require("supertest");
const { randomUUID } = require("crypto");

// app.js triggers migrate() → tables exist in :memory: DB
const app = require("../app");
const { db } = require("../db");

// ─── Shared test state ────────────────────────────────────────────────────────

let seededLeadId;

beforeAll(() => {
  // Seed one known lead so ID-based tests have a real target
  seededLeadId = randomUUID();
  db.prepare(`
    INSERT INTO leads (id, name, company, phone, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(seededLeadId, "Ada Lovelace", "Babbage Co", "+1-555-9999", "New");
});

afterAll(() => {
  db.close();
});

// ─── GET /api/leads ───────────────────────────────────────────────────────────

describe("GET /api/leads", () => {
  test("returns 200 and an array", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("contains the seeded lead", async () => {
    const res = await request(app).get("/api/leads");
    const names = res.body.map((l) => l.name);
    expect(names).toContain("Ada Lovelace");
  });

  test("?status= filters results", async () => {
    const res = await request(app).get("/api/leads?status=New");
    expect(res.status).toBe(200);
    res.body.forEach((l) => expect(l.status).toBe("New"));
  });

  test("?search= filters by name", async () => {
    const res = await request(app).get("/api/leads?search=lovelace");
    expect(res.status).toBe(200);
    expect(res.body.some((l) => l.name === "Ada Lovelace")).toBe(true);
  });
});

// ─── POST /api/leads ──────────────────────────────────────────────────────────

describe("POST /api/leads", () => {
  test("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({})
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Name is required");
  });

  test("returns 400 when name is empty string", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ name: "   " })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Name is required");
  });

  test("returns 201 with id and defaults when valid body supplied", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ name: "Grace Hopper", company: "Navy" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Grace Hopper",
      company: "Navy",
      status: "New",
    });
    expect(res.body.id).toBeDefined();
    expect(typeof res.body.id).toBe("string");
  });

  test("returns 400 for invalid status value", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ name: "Test User", status: "Maybe" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid status/);
  });
});

// ─── PATCH /api/leads/:id/status ─────────────────────────────────────────────

describe("PATCH /api/leads/:id/status", () => {
  test("returns 400 for invalid status", async () => {
    const res = await request(app)
      .patch(`/api/leads/${seededLeadId}/status`)
      .send({ status: "Bogus" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid status/);
  });

  test("returns 404 for unknown lead id", async () => {
    const res = await request(app)
      .patch(`/api/leads/${randomUUID()}/status`)
      .send({ status: "Won" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(404);
  });

  test("returns 200 with updated lead on valid request", async () => {
    const res = await request(app)
      .patch(`/api/leads/${seededLeadId}/status`)
      .send({ status: "Qualified" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Qualified");
    expect(res.body.id).toBe(seededLeadId);
  });
});

// ─── POST /api/leads/:id/discussions ─────────────────────────────────────────

describe("POST /api/leads/:id/discussions — follow_up_date sync", () => {
  test("creates discussion and syncs follow_up_date + time onto lead", async () => {
    const followUpDate = "2026-06-01";
    const followUpTime = "09:30";

    const res = await request(app)
      .post(`/api/leads/${seededLeadId}/discussions`)
      .send({
        note: "Discussed pricing. Will get back by June 1.",
        follow_up_date: followUpDate,
        follow_up_time: followUpTime,
      })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.lead_id).toBe(seededLeadId);
    expect(res.body.note).toBe("Discussed pricing. Will get back by June 1.");

    // Verify follow-up metadata is stored ON the discussion row
    expect(res.body.follow_up_date).toBe(followUpDate);
    expect(res.body.follow_up_time).toBe(followUpTime);

    // Verify the lead's follow_up fields were also synced atomically
    const lead = db
      .prepare("SELECT follow_up_date, follow_up_time FROM leads WHERE id = ?")
      .get(seededLeadId);

    expect(lead.follow_up_date).toBe(followUpDate);
    expect(lead.follow_up_time).toBe(followUpTime);
  });

  test("returns 400 when note is missing", async () => {
    const res = await request(app)
      .post(`/api/leads/${seededLeadId}/discussions`)
      .send({})
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Note is required");
  });

  test("returns 404 for unknown lead", async () => {
    const res = await request(app)
      .post(`/api/leads/${randomUUID()}/discussions`)
      .send({ note: "This lead doesn't exist." })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(404);
  });
});
