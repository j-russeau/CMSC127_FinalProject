// registration routes

const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/registrationsQueries");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["active", "expired", "suspended"];

function normalizeUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function parseDateOnly(value) {
  if (!DATE_RE.test(String(value || ""))) return null;

  const [y, m, d] = String(value).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }

  return dt;
}

function validateRegistrationPayload(r) {
  const required = [
    "registration_number",
    "expiration_date",
    "registration_status",
    "registration_date",
    "plate_number",
    "engine_number",
    "chassis_number",
  ];

  for (const f of required) {
    if (r[f] === undefined || r[f] === null || String(r[f]).trim() === "") {
      return `Missing required field: ${f}`;
    }
  }

  const registrationNumber = normalizeUpper(r.registration_number);
  const registrationStatus = normalizeStatus(r.registration_status);
  const registrationDate = String(r.registration_date).trim();
  const expirationDate = String(r.expiration_date).trim();
  const plateNumber = normalizeUpper(r.plate_number);
  const engineNumber = normalizeUpper(r.engine_number);
  const chassisNumber = normalizeUpper(r.chassis_number);

  if (registrationNumber.length > 30) {
    return "Registration number must be 30 characters or fewer.";
  }

  if (plateNumber.length > 15) {
    return "Plate number must be 15 characters or fewer.";
  }

  if (engineNumber.length > 30) {
    return "Engine number must be 30 characters or fewer.";
  }

  if (chassisNumber.length > 30) {
    return "Chassis number must be 30 characters or fewer.";
  }

  if (!VALID_STATUSES.includes(registrationStatus)) {
    return "Registration status must be active, expired, or suspended.";
  }

  const regDate = parseDateOnly(registrationDate);
  const expDate = parseDateOnly(expirationDate);

  if (!regDate || !expDate) {
    return "Registration date and expiration date must be valid YYYY-MM-DD dates.";
  }

  if (expDate <= regDate) {
    return "Expiration date must be after registration date.";
  }

  return "";
}

// ── GET /api/registrations ───────────────────────────────────────────────────
// Gets all registrations, or one vehicle history using ?plate_number=ABC-1234
router.get("/", async (req, res) => {
  try {
    const { plate_number } = req.query;

    const normalizedPlate = plate_number ? normalizeUpper(plate_number) : "";
    const sql = normalizedPlate ? Q.listByVehicle : Q.list;
    const params = normalizedPlate ? [normalizedPlate] : [];

    const [rows] = await db.query(sql, params);

    res.json({
      ok: true,
      sql,
      params,
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/registrations/latest?plate_number=ABC-1234 ─────────────────────
router.get("/latest", async (req, res) => {
  try {
    const { plate_number } = req.query;

    if (!plate_number) {
      return res.status(400).json({ ok: false, error: "plate_number is required" });
    }

    const params = [normalizeUpper(plate_number)];
    const [rows] = await db.query(Q.latestByVehicle, params);

    res.json({
      ok: true,
      sql: Q.latestByVehicle,
      params,
      data: rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/registrations ──────────────────────────────────────────────────
// Adds a new registration / renewal.
// Notes:
// - plate/engine/chassis are uppercased before lookup and insert.
// - exact vehicle must exist.
// - expiration_date must be after registration_date.
// - only one active registration may exist per vehicle.
router.post("/", async (req, res) => {
  const r = req.body;

  const validationErr = validateRegistrationPayload(r);
  if (validationErr) {
    return res.status(400).json({ ok: false, error: validationErr });
  }

  const registrationNumber = normalizeUpper(r.registration_number);
  const registrationStatus = normalizeStatus(r.registration_status);
  const registrationDate = String(r.registration_date).trim();
  const expirationDate = String(r.expiration_date).trim();
  const plateNumber = normalizeUpper(r.plate_number);
  const engineNumber = normalizeUpper(r.engine_number);
  const chassisNumber = normalizeUpper(r.chassis_number);

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [vehicleRows] = await conn.query(Q.vehicleByCompositeForUpdate, [
      plateNumber,
      engineNumber,
      chassisNumber,
    ]);

    if (vehicleRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        error: "Vehicle not found. Check plate, engine, and chassis number.",
      });
    }

    if (registrationStatus === "active") {
      const [activeRows] = await conn.query(Q.activeByVehicleForUpdate, [
        plateNumber,
        engineNumber,
        chassisNumber,
      ]);

      if (activeRows.length > 0) {
        await conn.rollback();
        return res.status(409).json({
          ok: false,
          error:
            "Vehicle already has an active registration. Add an expired/suspended record or update the current active record first.",
        });
      }
    }

    const params = [
      registrationNumber,
      expirationDate,
      registrationStatus,
      registrationDate,
      plateNumber,
      engineNumber,
      chassisNumber,
    ];

    await conn.query(Q.create, params);

    await conn.commit();

    res.status(201).json({
      ok: true,
      sql: Q.create,
      params,
      data: { registration_number: registrationNumber },
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      const msg = err.sqlMessage || err.message || "";

      if (msg.includes("registration_active_vehicle_uk")) {
        return res.status(409).json({
          ok: false,
          error:
            "Vehicle already has an active registration. Only one active registration is allowed per vehicle.",
        });
      }

      return res.status(409).json({
        ok: false,
        error: "Registration number already exists.",
      });
    }

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        ok: false,
        error: "Vehicle reference does not exist.",
      });
    }

    if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      return res.status(400).json({
        ok: false,
        error: "Registration data violates a database constraint.",
      });
    }

    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ── DELETE /api/registrations/:registration_number ───────────────────────────
// Realistic LTO behavior: registration records are historical/audit records.
// Do not delete them because it can break latest-registration views and reports.
router.delete("/:registration_number", async (req, res) => {
  return res.status(405).json({
    ok: false,
    error: "Registration records are historical and cannot be deleted.",
  });
});

module.exports = router;