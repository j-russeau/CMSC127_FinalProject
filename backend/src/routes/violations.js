// ─────────────────────────────────────────────────────────────────────────────
// routes/violations.js — Individual violation CRUD endpoints
// Mounted at /api/violations in server.js
// Each violation belongs to a violation_ticket (foreign key: ticket_id)
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/violationsQueries");
const catalog = require("../constants/violationCatalog");

function hasCatalogViolation(name) {
  return Object.prototype.hasOwnProperty.call(catalog, name);
}

function normalizeUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim();
}

// ── GET /api/violations/catalog ───────────────────────────────────────────────
router.get("/catalog", (req, res) => {
  const items = Object.entries(catalog).map(([name, fine]) => ({
    name,
    corresponding_fine_amount: fine,
  }));

  res.json({ ok: true, data: items });
});

// ── GET /api/violations?ticket_id=... ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const ticketId = normalizeUpper(req.query.ticket_id);

    if (!ticketId) {
      return res.status(400).json({ ok: false, error: "ticket_id query param is required" });
    }

    const [rows] = await db.query(Q.listByTicket, [ticketId]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/violations ──────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const raw = req.body;

    const violationId = normalizeUpper(raw.violation_id);
    const name = normalizeText(raw.name);
    const ticketId = normalizeUpper(raw.ticket_id);

    if (!violationId) {
      return res.status(400).json({ ok: false, error: "violation_id is required" });
    }

    if (violationId.length > 20) {
      return res.status(400).json({ ok: false, error: "violation_id too long (max 20)" });
    }

    if (!name) {
      return res.status(400).json({ ok: false, error: "name is required" });
    }

    if (!ticketId) {
      return res.status(400).json({ ok: false, error: "ticket_id is required" });
    }

    if (!hasCatalogViolation(name)) {
      return res.status(400).json({ ok: false, error: "Invalid violation type" });
    }

    const [[ticketCheck]] = await db.query(Q.ticketExists, [ticketId]);

    if (Number(ticketCheck.total) === 0) {
      return res.status(400).json({ ok: false, error: "ticket_id does not exist" });
    }

    const catalogFine = catalog[name];

    await db.query(Q.create, [violationId, name, catalogFine, ticketId]);

    res.status(201).json({
      ok: true,
      data: {
        violation_id: violationId,
        corresponding_fine_amount: catalogFine,
      },
    });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "violation_id already exists" });
    }

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ ok: false, error: "ticket_id does not exist" });
    }

    if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      return res.status(400).json({ ok: false, error: "Violation data violates a database constraint" });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /api/violations/:violation_id ──────────────────────────────────────
// Allowed only if the ticket will still have at least one violation afterward.
router.delete("/:violation_id", async (req, res) => {
  const violationId = normalizeUpper(req.params.violation_id);

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [violationRows] = await conn.query(Q.getById, [violationId]);

    if (violationRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, error: "Violation not found" });
    }

    const ticketId = violationRows[0].ticket_id;

    const [[countRow]] = await conn.query(Q.countByTicket, [ticketId]);

    if (Number(countRow.total) <= 1) {
      await conn.rollback();
      return res.status(409).json({
        ok: false,
        error: "Cannot delete the last violation on a ticket.",
      });
    }

    await conn.query(Q.delete, [violationId]);

    await conn.commit();

    res.json({
      ok: true,
      data: {
        deleted: violationId,
        ticket_id: ticketId,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;