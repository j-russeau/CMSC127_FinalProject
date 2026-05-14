// ─────────────────────────────────────────────────────────────────────────────
// routes/tickets.js — Violation ticket CRUD endpoints
// Mounted at /api/tickets in server.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const Q       = require("../sql/ticketsQueries");

// ── GET /api/tickets ──────────────────────────────────────────────────────────
// Returns all tickets. Accepts optional ?license_number=... to filter by driver.
// The query uses (? IS NULL OR ...) so one SQL handles both cases — we always
// pass [license, license] and let null act as "no filter".
router.get("/", async (req, res) => {
  try {
    const license = req.query.license_number || null;
    const [rows]  = await db.query(Q.list, [license, license]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/tickets/:ticket_id ───────────────────────────────────────────────
router.get("/:ticket_id", async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const [rows]        = await db.query(Q.getById, [ticket_id]);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Ticket not found" });
    }

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/tickets/with-violations ────────────────────────────────────────
// Creates a ticket and all its violations in one transaction.
// If any violation insert fails, the whole thing rolls back — no orphaned ticket.
// Body: { ticket: { ticket_id, datetime, ... }, violations: [{ violation_id, name, corresponding_fine_amount }] }
router.post("/with-violations", async (req, res) => {
  const { ticket: t, violations } = req.body;

  if (!t || !Array.isArray(violations) || violations.length === 0) {
    return res.status(400).json({ ok: false, error: "ticket and at least one violation are required" });
  }

  const required = [
    "ticket_id", "datetime", "violation_status", "issued_at",
    "license_number", "plate_number", "engine_number", "chassis_number",
  ];
  for (const f of required) {
    if (!t[f]) return res.status(400).json({ ok: false, error: `Missing ticket field: ${f}` });
  }

  for (let i = 0; i < violations.length; i++) {
    const v = violations[i];
    if (!v.violation_id || !v.name || v.corresponding_fine_amount == null) {
      return res.status(400).json({ ok: false, error: `Violation ${i + 1}: violation_id, name, and corresponding_fine_amount are required` });
    }
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(Q.create, [
      t.ticket_id, t.datetime, t.violation_status, t.issued_at,
      t.apprehending_officer || null,
      t.license_number, t.plate_number, t.engine_number, t.chassis_number,
    ]);

    /*
     * Bulk-insert all violations in one query so the ticket and its violations
     * are either all committed or all rolled back. The previous two-step flow
     * (createTicket then loop createViolation) left the ticket in the DB if
     * any violation failed, with no way to clean it up automatically.
     */
    const placeholders = violations.map(() => "(?, ?, ?, ?)").join(", ");
    const values       = violations.flatMap((v) => [
      v.violation_id, v.name, Number(v.corresponding_fine_amount), t.ticket_id,
    ]);
    await conn.query(
      `INSERT INTO violation (violation_id, name, corresponding_fine_amount, ticket_id) VALUES ${placeholders}`,
      values,
    );

    await conn.commit();
    res.status(201).json({ ok: true, data: { ticket_id: t.ticket_id } });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "ticket_id or violation_id already exists" });
    }
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ ok: false, error: "Invalid driver or vehicle reference (FK)" });
    }
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ── POST /api/tickets ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const t = req.body;

    const required = [
      "ticket_id", "datetime", "violation_status", "issued_at",
      "license_number", "plate_number", "engine_number", "chassis_number",
    ];
    for (const f of required) {
      if (!t[f]) return res.status(400).json({ ok: false, error: `Missing required field: ${f}` });
    }

    await db.query(Q.create, [
      t.ticket_id,
      t.datetime,
      t.violation_status,
      t.issued_at,
      t.apprehending_officer || null,
      t.license_number,
      t.plate_number,
      t.engine_number,
      t.chassis_number,
    ]);
    res.status(201).json({ ok: true, data: { ticket_id: t.ticket_id } });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "ticket_id already exists" });
    }
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ ok: false, error: "Invalid driver or vehicle reference (FK)" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PUT /api/tickets/:ticket_id/status ───────────────────────────────────────
// Updates only violation_status — the rest of the ticket is immutable after creation.
router.put("/:ticket_id/status", async (req, res) => {
  try {
    const { ticket_id }       = req.params;
    const { violation_status } = req.body;

    const valid = ["paid", "unpaid", "contested"];
    if (!valid.includes(violation_status)) {
      return res.status(400).json({ ok: false, error: "violation_status must be paid, unpaid, or contested" });
    }

    const [result] = await db.query(Q.updateStatus, [violation_status, ticket_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Ticket not found" });
    }

    res.json({ ok: true, data: { ticket_id, violation_status } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /api/tickets/:ticket_id ────────────────────────────────────────────
router.delete("/:ticket_id", async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const [result]      = await db.query(Q.delete, [ticket_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Ticket not found" });
    }

    res.json({ ok: true, data: { deleted: ticket_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
