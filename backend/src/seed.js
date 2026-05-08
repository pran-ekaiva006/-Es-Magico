require("dotenv").config();
const { randomUUID } = require("crypto");
const { db, migrate } = require("./db");

async function seed() {
  // Ensure tables exist before seeding
  await migrate();

  // Guard: skip if any leads already exist
  const res = await db.execute("SELECT COUNT(*) as count FROM leads");
  const count = res.rows[0].count;
  
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

  const discussionsData = [
    // Sarah Connor — Acme Corp
    {
      lead: "Sarah Connor",
      notes: [
        { note: "Initial call — Sarah is evaluating 3 vendors. She liked our pricing model and asked for a full proposal.", created_at: "2026-04-10 09:30:00", follow_up_date: null, follow_up_time: null },
        { note: "Sent proposal via email. Highlighted our enterprise tier and 30-day onboarding support.", created_at: "2026-04-15 14:00:00", follow_up_date: null, follow_up_time: null },
        { note: "Follow-up call scheduled for today. Sarah mentioned budget approval is pending sign-off from her CFO.", created_at: "2026-04-28 10:00:00", follow_up_date: today, follow_up_time: "14:00" },
      ],
    },
    // Hank Scorpio — Globex
    {
      lead: "Hank Scorpio",
      notes: [
        { note: "Inbound inquiry via website. Hank is looking for a CRM replacement for his sales team of 12.", created_at: "2026-04-18 11:45:00", follow_up_date: null, follow_up_time: null },
        { note: "Sent product overview deck. He opened it twice — good engagement signal.", created_at: "2026-04-20 09:00:00", follow_up_date: null, follow_up_time: null },
      ],
    },
    // Bill Lumbergh — Initech
    {
      lead: "Bill Lumbergh",
      notes: [
        { note: "Cold outreach — left voicemail. Bill's EA replied to email saying he'd review by end of week.", created_at: "2026-04-22 14:15:00", follow_up_date: null, follow_up_time: null },
        { note: "Second follow-up email sent. Mentioned the Q2 discount offer ending May 15.", created_at: "2026-04-29 10:30:00", follow_up_date: "2026-05-06", follow_up_time: "10:00" },
        { note: "Brief chat — Bill asked about TPS report integration. Forwarding to technical team for a compatibility check.", created_at: "2026-05-03 15:00:00", follow_up_date: null, follow_up_time: null },
      ],
    },
    // Bruce Wayne — Wayne Enterprises
    {
      lead: "Bruce Wayne",
      notes: [
        { note: "Enterprise demo completed. Bruce and his team were impressed by the automation workflows.", created_at: "2026-04-25 11:00:00", follow_up_date: null, follow_up_time: null },
        { note: "Legal team reviewed the MSA. Minor redlines on data retention clause — resolved in our favour.", created_at: "2026-04-30 16:00:00", follow_up_date: null, follow_up_time: null },
        { note: "Contract signed. Onboarding kickoff scheduled for May 12. 🎉", created_at: "2026-05-05 09:00:00", follow_up_date: "2026-05-12", follow_up_time: "09:00" },
      ],
    },
    // Tony Stark — Stark Industries
    {
      lead: "Tony Stark",
      notes: [
        { note: "Referral from Bruce Wayne. Tony wants API access and custom webhook support — priority lead.", created_at: "2026-05-01 16:30:00", follow_up_date: null, follow_up_time: null },
        { note: "Technical call with Tony's engineering lead (Pepper's team). They need SSO via Okta — we confirmed support.", created_at: "2026-05-05 14:00:00", follow_up_date: null, follow_up_time: null },
      ],
    },
  ];

  const tx = await db.transaction("write");

  try {
    for (const lead of leadsData) {
      await tx.execute({
        sql: `
          INSERT INTO leads (id, name, company, phone, status, follow_up_date, follow_up_time, created_at)
          VALUES (:id, :name, :company, :phone, :status, :follow_up_date, :follow_up_time, :created_at)
        `,
        args: lead
      });
    }

    for (const { lead: leadName, notes } of discussionsData) {
      const res = await tx.execute({
        sql: "SELECT id FROM leads WHERE name = ?",
        args: [leadName]
      });
      const leadId = res.rows[0].id;

      for (const { note, created_at, follow_up_date = null, follow_up_time = null } of notes) {
        await tx.execute({
          sql: `
            INSERT INTO discussions (id, lead_id, note, follow_up_date, follow_up_time, created_at)
            VALUES (:id, :lead_id, :note, :follow_up_date, :follow_up_time, :created_at)
          `,
          args: {
            id: randomUUID(),
            lead_id: leadId,
            note,
            follow_up_date,
            follow_up_time,
            created_at,
          }
        });
      }
    }
    
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    console.error("Failed to seed database", e);
    process.exit(1);
  }

  const resLeads = await db.execute("SELECT COUNT(*) as c FROM leads");
  const resDisc = await db.execute("SELECT COUNT(*) as c FROM discussions");
  
  console.log(`🌱 Seeded ${resLeads.rows[0].c} leads and ${resDisc.rows[0].c} discussions successfully.`);
}

seed().catch(console.error);
