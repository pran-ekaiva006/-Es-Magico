require("dotenv").config();
const { randomUUID } = require("crypto");
const { db, migrate } = require("./db");

// Ensure tables exist before seeding
migrate();

function seed() {
  // Guard: skip if any leads already exist
  const { count } = db.prepare("SELECT COUNT(*) as count FROM leads").get();
  if (count > 0) {
    console.log(`⏭️  Seed skipped — ${count} lead(s) already in database.`);
    return;
  }

  // Today's date (YYYY-MM-DD) for Sarah's follow-up
  const today = new Date().toISOString().slice(0, 10);

  const leadsData = [
    {
      id: randomUUID(),
      name: "Sarah Connor",
      company: "Acme Corp",
      phone: "+1-555-0101",
      status: "Proposal Sent",
      follow_up_date: today,
      follow_up_time: "14:00",
      created_at: "2026-04-10 09:15:00",
    },
    {
      id: randomUUID(),
      name: "Hank Scorpio",
      company: "Globex",
      phone: "+1-555-0202",
      status: "New",
      follow_up_date: null,
      follow_up_time: null,
      created_at: "2026-04-18 11:30:00",
    },
    {
      id: randomUUID(),
      name: "Bill Lumbergh",
      company: "Initech",
      phone: "+1-555-0303",
      status: "Contacted",
      follow_up_date: null,
      follow_up_time: null,
      created_at: "2026-04-22 14:00:00",
    },
    {
      id: randomUUID(),
      name: "Bruce Wayne",
      company: "Wayne Enterprises",
      phone: "+1-555-0404",
      status: "Won",
      follow_up_date: null,
      follow_up_time: null,
      created_at: "2026-04-25 10:45:00",
    },
    {
      id: randomUUID(),
      name: "Tony Stark",
      company: "Stark Industries",
      phone: "+1-555-0505",
      status: "Qualified",
      follow_up_date: null,
      follow_up_time: null,
      created_at: "2026-05-01 16:20:00",
    },
  ];

  const insertLead = db.prepare(`
    INSERT INTO leads (id, name, company, phone, status, follow_up_date, follow_up_time, created_at)
    VALUES (@id, @name, @company, @phone, @status, @follow_up_date, @follow_up_time, @created_at)
  `);

  const insertDiscussion = db.prepare(`
    INSERT INTO discussions (id, lead_id, note, created_at)
    VALUES (@id, @lead_id, @note, @created_at)
  `);

  const discussionsData = [
    // Sarah Connor — Acme Corp
    {
      lead: "Sarah Connor",
      notes: [
        { note: "Initial call — Sarah is evaluating 3 vendors. She liked our pricing model and asked for a full proposal.", created_at: "2026-04-10 09:30:00" },
        { note: "Sent proposal via email. Highlighted our enterprise tier and 30-day onboarding support.", created_at: "2026-04-15 14:00:00" },
        { note: "Follow-up call scheduled for today. Sarah mentioned budget approval is pending sign-off from her CFO.", created_at: "2026-04-28 10:00:00" },
      ],
    },
    // Hank Scorpio — Globex
    {
      lead: "Hank Scorpio",
      notes: [
        { note: "Inbound inquiry via website. Hank is looking for a CRM replacement for his sales team of 12.", created_at: "2026-04-18 11:45:00" },
        { note: "Sent product overview deck. He opened it twice — good engagement signal.", created_at: "2026-04-20 09:00:00" },
      ],
    },
    // Bill Lumbergh — Initech
    {
      lead: "Bill Lumbergh",
      notes: [
        { note: "Cold outreach — left voicemail. Bill's EA replied to email saying he'd review by end of week.", created_at: "2026-04-22 14:15:00" },
        { note: "Second follow-up email sent. Mentioned the Q2 discount offer ending May 15.", created_at: "2026-04-29 10:30:00" },
        { note: "Brief chat — Bill asked about TPS report integration. Forwarding to technical team for a compatibility check.", created_at: "2026-05-03 15:00:00" },
      ],
    },
    // Bruce Wayne — Wayne Enterprises
    {
      lead: "Bruce Wayne",
      notes: [
        { note: "Enterprise demo completed. Bruce and his team were impressed by the automation workflows.", created_at: "2026-04-25 11:00:00" },
        { note: "Legal team reviewed the MSA. Minor redlines on data retention clause — resolved in our favour.", created_at: "2026-04-30 16:00:00" },
        { note: "Contract signed. Onboarding kickoff scheduled for May 12. 🎉", created_at: "2026-05-05 09:00:00" },
      ],
    },
    // Tony Stark — Stark Industries
    {
      lead: "Tony Stark",
      notes: [
        { note: "Referral from Bruce Wayne. Tony wants API access and custom webhook support — priority lead.", created_at: "2026-05-01 16:30:00" },
        { note: "Technical call with Tony's engineering lead (Pepper's team). They need SSO via Okta — we confirmed support.", created_at: "2026-05-05 14:00:00" },
      ],
    },
  ];

  // Insert all leads and discussions in a single transaction
  const seedAll = db.transaction(() => {
    for (const lead of leadsData) {
      insertLead.run(lead);
    }

    for (const { lead: leadName, notes } of discussionsData) {
      const { id: leadId } = db
        .prepare("SELECT id FROM leads WHERE name = ?")
        .get(leadName);

      for (const { note, created_at } of notes) {
        insertDiscussion.run({
          id: randomUUID(),
          lead_id: leadId,
          note,
          created_at,
        });
      }
    }
  });

  seedAll();

  const totalLeads = db.prepare("SELECT COUNT(*) as c FROM leads").get().c;
  const totalDisc  = db.prepare("SELECT COUNT(*) as c FROM discussions").get().c;
  console.log(`🌱 Seeded ${totalLeads} leads and ${totalDisc} discussions successfully.`);
}

seed();
