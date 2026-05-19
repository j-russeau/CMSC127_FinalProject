// ─────────────────────────────────────────────────────────────────────────────
// routes/tickets.js — Violation ticket CRUD endpoints
// Mounted at /api/tickets in server.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/ticketsQueries");
const catalog = require("../constants/violationCatalog");

const TICKET_STATUSES = ["paid", "unpaid", "contested"];

const ALLOWED_STATUS_TRANSITIONS = {
  unpaid: ["paid", "contested"],
  contested: ["paid", "unpaid"],
  paid: [],
};

function hasCatalogViolation(name) {
  return Object.prototype.hasOwnProperty.call(catalog, name);
}

function normalizeUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMysqlDateTime(value) {
  const s = String(value || "").trim().replace("T", " ");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);

  if (!m) return "";

  const [, yy, mm, dd, hh, mi, ss = "00"] = m;
  const y = Number(yy);
  const month = Number(mm);
  const day = Number(dd);
  const hour = Number(hh);
  const minute = Number(mi);
  const second = Number(ss);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    return "";
  }

  const dt = new Date(Date.UTC(y, month - 1, day, hour, minute, second));

  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day ||
    dt.getUTCHours() !== hour ||
    dt.getUTCMinutes() !== minute ||
    dt.getUTCSeconds() !== second
  ) {
    return "";
  }

  return `${yy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function validateAndNormalizeTicket(t) {
  if (!t || typeof t !== "object") {
    return { error: "ticket is required" };
  }

  const required = [
    "ticket_id",
    "datetime",
    "violation_status",
    "issued_at",
    "license_number",
    "plate_number",
    "engine_number",
    "chassis_number",
  ];

  for (const f of required) {
    if (t[f] === undefined || t[f] === null || String(t[f]).trim() === "") {
      return { error: `Missing ticket field: ${f}` };
    }
  }

  const ticket = {
    ticket_id: normalizeUpper(t.ticket_id),
    datetime: normalizeMysqlDateTime(t.datetime),
    violation_status: normalizeStatus(t.violation_status),
    issued_at: normalizeText(t.issued_at),
    apprehending_officer: t.apprehending_officer ? normalizeText(t.apprehending_officer) : null,
    license_number: normalizeUpper(t.license_number),
    plate_number: normalizeUpper(t.plate_number),
    engine_number: normalizeUpper(t.engine_number),
    chassis_number: normalizeUpper(t.chassis_number),
  };

  if (ticket.ticket_id.length > 20) {
    return { error: "ticket_id too long (max 20)" };
  }

  if (!ticket.datetime) {
    return { error: "datetime must be a valid YYYY-MM-DD HH:MM:SS value" };
  }

  if (!TICKET_STATUSES.includes(ticket.violation_status)) {
    return { error: "violation_status must be paid, unpaid, or contested" };
  }

  if (ticket.issued_at.length > 100) {
    return { error: "issued_at must be 100 characters or fewer" };
  }

  if (ticket.apprehending_officer && ticket.apprehending_officer.length > 80) {
    return { error: "apprehending_officer must be 80 characters or fewer" };
  }

  if (ticket.license_number.length > 20) {
    return { error: "license_number must be 20 characters or fewer" };
  }

  if (ticket.plate_number.length > 15) {
    return { error: "plate_number must be 15 characters or fewer" };
  }

  if (ticket.engine_number.length > 30) {
    return { error: "engine_number must be 30 characters or fewer" };
  }

  if (ticket.chassis_number.length > 30) {
    return { error: "chassis_number must be 30 characters or fewer" };
  }

  return { ticket };
}

function validateAndNormalizeViolations(violations) {
  if (!Array.isArray(violations) || violations.length === 0) {
    return { error: "at least one violation is required" };
  }

  const seenIds = new Set();
  const seenNames = new Set();
  const cleaned = [];

  for (let i = 0; i < violations.length; i++) {
    const raw = violations[i] || {};
    const violation_id = normalizeUpper(raw.violation_id);
    const name = normalizeText(raw.name);

    if (!violation_id) {
      return { error: `Violation ${i + 1}: violation_id is required` };
    }

    if (violation_id.length > 20) {
      return { error: `Violation ${i + 1}: violation_id too long (max 20)` };
    }

    if (seenIds.has(violation_id)) {
      return { error: `Violation ${i + 1}: duplicate violation_id in request` };
    }

    seenIds.add(violation_id);

    if (!name) {
      return { error: `Violation ${i + 1}: name is required` };
    }

    if (!hasCatalogViolation(name)) {
      return { error: `Violation ${i + 1}: invalid violation type` };
    }

    if (seenNames.has(name)) {
      return {
        error: `Violation ${i + 1}: duplicate violation type "${name}" in the same ticket is not allowed`,
      };
    }

    seenNames.add(name);

    cleaned.push({
      violation_id,
      name,
      corresponding_fine_amount: catalog[name],
    });
  }

  return { violations: cleaned };
}

// ── GET /api/tickets ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const license = req.query.license_number ? normalizeUpper(req.query.license_number) : null;
    const [rows] = await db.query(Q.list, [license, license]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/tickets/:ticket_id ───────────────────────────────────────────────
router.get("/:ticket_id", async (req, res) => {
  try {
    const ticketId = normalizeUpper(req.params.ticket_id);
    const [rows] = await db.query(Q.getById, [ticketId]);

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
router.post("/with-violations", async (req, res) => {
  const { ticket: rawTicket, violations: rawViolations } = req.body;

  const ticketResult = validateAndNormalizeTicket(rawTicket);
  if (ticketResult.error) {
    return res.status(400).json({ ok: false, error: ticketResult.error });
  }

  const violationResult = validateAndNormalizeViolations(rawViolations);
  if (violationResult.error) {
    return res.status(400).json({ ok: false, error: violationResult.error });
  }

  const t = ticketResult.ticket;
  const violations = violationResult.violations;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [existingTicketRows] = await conn.query(Q.getById, [t.ticket_id]);
    if (existingTicketRows.length > 0) {
      await conn.rollback();
      return res.status(409).json({ ok: false, error: "ticket_id already exists" });
    }

    const [[driverCheck]] = await conn.query(Q.driverExists, [t.license_number]);
    if (Number(driverCheck.total) === 0) {
      await conn.rollback();
      return res.status(400).json({ ok: false, error: "Driver license number does not exist" });
    }

    const [vehicleRows] = await conn.query(Q.vehicleByCompositeForUpdate, [
      t.plate_number,
      t.engine_number,
      t.chassis_number,
    ]);

    if (vehicleRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        error: "Vehicle reference does not exist or plate/engine/chassis do not match",
      });
    }

    const violationIds = violations.map((v) => v.violation_id);
    const [existingViolationRows] = await conn.query(Q.existingViolationIds, [violationIds]);

    if (existingViolationRows.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        ok: false,
        error: `violation_id already exists: ${existingViolationRows.map((v) => v.violation_id).join(", ")}`,
      });
    }

    await conn.query(Q.create, [
      t.ticket_id,
      t.datetime,
      t.violation_status,
      t.issued_at,
      t.apprehending_officer,
      t.license_number,
      t.plate_number,
      t.engine_number,
      t.chassis_number,
    ]);

    const placeholders = violations.map(() => "(?, ?, ?, ?)").join(", ");
    const values = violations.flatMap((v) => [
      v.violation_id,
      v.name,
      Number(v.corresponding_fine_amount),
      t.ticket_id,
    ]);

    await conn.query(
      `INSERT INTO violation (violation_id, name, corresponding_fine_amount, ticket_id) VALUES ${placeholders}`,
      values
    );

    await conn.commit();
    res.status(201).json({ ok: true, data: { ticket_id: t.ticket_id } });
  } catch (err) {
    await conn.rollback();
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      const msg = err.sqlMessage || err.message || "";

      if (msg.includes("violation_ticket_name_uk")) {
        return res.status(409).json({
          ok: false,
          error: "The same violation type cannot appear twice in one ticket.",
        });
      }

      return res.status(409).json({
        ok: false,
        error: "ticket_id or violation_id already exists",
      });
    }

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ ok: false, error: "Invalid driver or vehicle reference" });
    }

    if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      return res.status(400).json({ ok: false, error: "Ticket data violates a database constraint" });
    }

    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ── POST /api/tickets ─────────────────────────────────────────────────────────
// Force normal ticket creation to include at least one violation.
router.post("/", async (req, res) => {
  return res.status(405).json({
    ok: false,
    error: "Use POST /api/tickets/with-violations so a ticket always has at least one violation.",
  });
});

// ── PUT /api/tickets/:ticket_id/status ───────────────────────────────────────
router.put("/:ticket_id/status", async (req, res) => {
  try {
    const ticketId = normalizeUpper(req.params.ticket_id);
    const newStatus = normalizeStatus(req.body.violation_status);

    if (!TICKET_STATUSES.includes(newStatus)) {
      return res.status(400).json({ ok: false, error: "violation_status must be paid, unpaid, or contested" });
    }

    const [rows] = await db.query(Q.getStatusById, [ticketId]);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Ticket not found" });
    }

    const currentStatus = normalizeStatus(rows[0].violation_status);

    if (currentStatus === newStatus) {
      return res.json({ ok: true, data: { ticket_id: ticketId, violation_status: newStatus } });
    }

    const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(newStatus)) {
      return res.status(409).json({
        ok: false,
        error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
      });
    }

    const [result] = await db.query(Q.updateStatus, [newStatus, ticketId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Ticket not found" });
    }

    res.json({ ok: true, data: { ticket_id: ticketId, violation_status: newStatus } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /api/tickets/:ticket_id ────────────────────────────────────────────
// Realistic behavior: tickets are historical enforcement records.
router.delete("/:ticket_id", async (req, res) => {
  return res.status(405).json({
    ok: false,
    error: "Violation tickets are historical records and cannot be deleted.",
  });
});

module.exports = router;