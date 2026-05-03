// ─────────────────────────────────────────────────────────────────────────────
// routes/tickets.js — Violation ticket CRUD endpoints
// Mounted at /api/tickets in server.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const Q       = require("../sql/ticketsQueries");

// ── GET /api/tickets ──────────────────────────────────────────────────────────
// Returns all tickets, joined with driver name, vehicle label, and total fine.
// Accepts optional query param ?license_number=... to filter by driver.
router.get("/", async (req, res) => {
  try {
    const { license_number } = req.query;

    // Choose the appropriate query based on whether a filter is provided
    const sql    = license_number ? Q.listByDriver : Q.list;
    const params = license_number ? [license_number] : [];

    const [rows] = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/tickets/:ticket_id ───────────────────────────────────────────────
// Returns a single ticket by primary key.
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

// ── POST /api/tickets ─────────────────────────────────────────────────────────
// Creates a new violation ticket.
// Expects body: { ticket_id, datetime, violation_status, issued_at,
//                 apprehending_officer?, license_number,
//                 plate_number, engine_number, chassis_number }
router.post("/", async (req, res) => {
  try {
    const t = req.body;

    // All fields below are required by the database schema
    const required = [
      "ticket_id", "datetime", "violation_status", "issued_at",
      "license_number", "plate_number", "engine_number", "chassis_number",
    ];
    for (const f of required) {
      if (!t[f]) return res.status(400).json({ ok: false, error: `Missing required field: ${f}` });
    }

    const params = [
      t.ticket_id,
      t.datetime,
      t.violation_status,
      t.issued_at,
      t.apprehending_officer || null, // optional
      t.license_number,
      t.plate_number,
      t.engine_number,
      t.chassis_number,
    ];

    await db.query(Q.create, params);
    res.status(201).json({ ok: true, data: { ticket_id: t.ticket_id } });
  } catch (err) {
    console.error(err);

    // Duplicate ticket_id
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "ticket_id already exists" });
    }
    // Driver or vehicle FK does not exist
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ ok: false, error: "Invalid driver or vehicle reference (FK)" });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /api/tickets/:ticket_id ────────────────────────────────────────────
// Deletes a ticket by primary key.
// Note: associated violation rows must be deleted first if FK constraints apply.
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
