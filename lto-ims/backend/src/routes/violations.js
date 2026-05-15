// ─────────────────────────────────────────────────────────────────────────────
// routes/violations.js — Individual violation CRUD endpoints
// Mounted at /api/violations in server.js
// Each violation belongs to a violation_ticket (foreign key: ticket_id)
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const Q       = require("../sql/violationsQueries");

// Expose violation catalog to frontend
const catalog = require("../constants/violationCatalog");

router.get("/catalog", (req, res) => {
  const items = Object.entries(catalog).map(([name, fine]) => ({
    name,
    corresponding_fine_amount: fine,
  }));
  res.json({ ok: true, data: items });
});

// ── GET /api/violations?ticket_id=... ────────────────────────────────────────
// Returns all violations that belong to a given ticket.
// ticket_id is required — violations are always fetched in the context of a ticket.
router.get("/", async (req, res) => {
  try {
    const { ticket_id } = req.query;

    if (!ticket_id) {
      return res.status(400).json({ ok: false, error: "ticket_id query param is required" });
    }

    const [rows] = await db.query(Q.listByTicket, [ticket_id]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/violations ──────────────────────────────────────────────────────
// Creates a new violation record under an existing ticket.
// Expects body: { violation_id, name, corresponding_fine_amount, ticket_id }
router.post("/", async (req, res) => {
  try {
    const v = req.body;

    // Required fields
    const required = ["violation_id", "name", "corresponding_fine_amount", "ticket_id"];
    for (const f of required) {
      if (v[f] === undefined || v[f] === null || v[f] === "") {
        return res.status(400).json({ ok: false, error: `Missing required field: ${f}` });
      }
    }

    // Validate violation type exists in catalog
    if (!catalog[v.name]) {
      return res.status(400).json({ ok: false, error: "Invalid violation type" });
    }

    // Force fine amount to catalog fine (realistic)
    v.corresponding_fine_amount = catalog[v.name];

    // Safety length check
    if (String(v.violation_id).length > 20) {
      return res.status(400).json({ ok: false, error: "violation_id too long (max 20)" });
    }

    const params = [v.violation_id, v.name, v.corresponding_fine_amount, v.ticket_id];
    await db.query(Q.create, params);

    res.status(201).json({ ok: true, data: { violation_id: v.violation_id } });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "violation_id already exists" });
    }
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ ok: false, error: "ticket_id does not exist (FK)" });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /api/violations/:violation_id ──────────────────────────────────────
// Deletes a single violation by primary key.
router.delete("/:violation_id", async (req, res) => {
  try {
    const { violation_id } = req.params;
    const [result]         = await db.query(Q.delete, [violation_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Violation not found" });
    }

    res.json({ ok: true, data: { deleted: violation_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
