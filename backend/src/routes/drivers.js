// ─────────────────────────────────────────────────────────────────────────────
// routes/drivers.js — Driver CRUD endpoints
// Mounted at /api/drivers in server.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/driverQueries");

const LICENSE_TYPES = ["Student Permit", "Non-Professional", "Professional"];
const LICENSE_STATUSES = ["valid", "expired", "suspended", "revoked"];
const SEXES = ["M", "F"];

const MIN_AGE_BY_LICENSE_TYPE = {
  "Student Permit": 16,
  "Non-Professional": 17,
  "Professional": 18,
};

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;

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

function todayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function ageFromDob(dob) {
  const birth = parseDateOnly(dob);
  if (!birth) return null;

  const now = todayDateOnly();

  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())
  ) {
    age--;
  }

  return age;
}

function normalizeAddresses(rawAddresses) {
  if (!Array.isArray(rawAddresses)) return [];

  return rawAddresses
    .map((a) => String(a || "").trim())
    .filter(Boolean);
}

function validateAddresses(addresses) {
  const lowered = addresses.map((a) => a.toLowerCase());

  if (new Set(lowered).size !== lowered.length) {
    return "Duplicate address is not allowed for the same driver.";
  }

  const tooLong = addresses.find((a) => a.length > 500);
  if (tooLong) {
    return "Address is too long. Maximum length is 500 characters.";
  }

  return "";
}

function validateDriverPayload(d, options = {}) {
  const { requireLicenseNumber = true } = options;

  const required = [
    ...(requireLicenseNumber ? ["license_number"] : []),
    "license_type",
    "first_name",
    "last_name",
    "sex",
    "date_of_birth",
    "license_status",
    "license_expiration_date",
    "license_issuance_date",
  ];

  for (const f of required) {
    if (d[f] === undefined || d[f] === null || String(d[f]).trim() === "") {
      return `Missing required field: ${f}`;
    }
  }

  if (!LICENSE_TYPES.includes(d.license_type)) {
    return "Invalid license_type. Use Student Permit, Non-Professional, or Professional.";
  }

  if (!LICENSE_STATUSES.includes(d.license_status)) {
    return "Invalid license_status. Use valid, expired, suspended, or revoked.";
  }

  if (!SEXES.includes(d.sex)) {
    return "Invalid sex. Use M or F.";
  }

  const dob = parseDateOnly(d.date_of_birth);
  const issuance = parseDateOnly(d.license_issuance_date);
  const expiration = parseDateOnly(d.license_expiration_date);
  const today = todayDateOnly();

  if (!dob) return "Invalid date_of_birth. Use YYYY-MM-DD.";
  if (!issuance) return "Invalid license_issuance_date. Use YYYY-MM-DD.";
  if (!expiration) return "Invalid license_expiration_date. Use YYYY-MM-DD.";

  if (dob > today) {
    return "Date of birth cannot be in the future.";
  }

  if (issuance > expiration) {
    return "License issuance date cannot be after expiration date.";
  }

  const age = ageFromDob(d.date_of_birth);
  const minAge = MIN_AGE_BY_LICENSE_TYPE[d.license_type];

  if (age < minAge) {
    return `${d.license_type} requires the driver to be at least ${minAge} years old.`;
  }

  if (d.license_status === "expired" && expiration >= today) {
    return "License status cannot be expired while expiration date is still today or in the future.";
  }

  if (d.license_status !== "expired" && expiration < today) {
    return "License status must be expired when expiration date is already past.";
  }

  return "";
}

// ── GET /api/drivers ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(Q.list);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/drivers/search?q=...&limit=10 ───────────────────────────────────
// IMPORTANT: keep this before /:license_number
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit || 10), 25);

    if (!q) {
      return res.status(400).json({ ok: false, error: "q is required" });
    }

    if (q.length > 50) {
      return res.status(400).json({ ok: false, error: "q too long" });
    }

    const like = `%${q}%`;
    const [rows] = await db.query(Q.search, [like, like, like, like, like, limit]);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/drivers/:license_number ─────────────────────────────────────────
router.get("/:license_number", async (req, res) => {
  try {
    const license = req.params.license_number;
    const [rows] = await db.query(Q.getByLicense, [license]);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Driver not found" });
    }

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/drivers ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const d = req.body;

  const driverErr = validateDriverPayload(d, { requireLicenseNumber: true });
  if (driverErr) {
    return res.status(400).json({ ok: false, error: driverErr });
  }

  const addresses = normalizeAddresses(d.addresses);
  const addressErr = validateAddresses(addresses);
  if (addressErr) {
    return res.status(400).json({ ok: false, error: addressErr });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(Q.create, [
      d.license_number.trim(),
      d.license_type,
      d.first_name.trim(),
      d.middle_name ? d.middle_name.trim() : null,
      d.last_name.trim(),
      d.sex,
      d.date_of_birth,
      d.license_status,
      d.license_expiration_date,
      d.license_issuance_date,
    ]);

    if (addresses.length > 0) {
      const placeholders = addresses.map(() => "(?, ?)").join(", ");
      const values = addresses.flatMap((addr) => [d.license_number.trim(), addr]);

      await conn.query(
        `INSERT INTO driver_has_address (license_number, address) VALUES ${placeholders}`,
        values
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true, data: { license_number: d.license_number.trim() } });
  } catch (err) {
    await conn.rollback();
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        error: "License number or duplicate address already exists.",
      });
    }

    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ── PUT /api/drivers/:license_number ─────────────────────────────────────────
router.put("/:license_number", async (req, res) => {
  try {
    const license = req.params.license_number;
    const d = req.body;

    if (d.license_number && d.license_number !== license) {
      return res.status(400).json({
        ok: false,
        error: "License number cannot be changed.",
      });
    }

    const driverErr = validateDriverPayload(d, { requireLicenseNumber: false });
    if (driverErr) {
      return res.status(400).json({ ok: false, error: driverErr });
    }

    const [result] = await db.query(Q.update, [
      d.license_type,
      d.first_name.trim(),
      d.middle_name ? d.middle_name.trim() : null,
      d.last_name.trim(),
      d.sex,
      d.date_of_birth,
      d.license_status,
      d.license_expiration_date,
      d.license_issuance_date,
      license,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Driver not found" });
    }

    res.json({ ok: true, data: { license_number: license } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /api/drivers/:license_number ───────────────────────────────────────
router.delete("/:license_number", async (req, res) => {
  try {
    const license = req.params.license_number;

    const [driverRows] = await db.query(Q.getByLicense, [license]);
    if (driverRows.length === 0) {
      return res.status(404).json({ ok: false, error: "Driver not found" });
    }

    const [[vehicleCount]] = await db.query(Q.countOwnedVehicles, [license]);
    const [[ticketCount]] = await db.query(Q.countViolationTickets, [license]);

    const hasVehicles = Number(vehicleCount.total) > 0;
    const hasTickets = Number(ticketCount.total) > 0;

    if (hasVehicles || hasTickets) {
      const reasons = [];
      if (hasVehicles) reasons.push(`${vehicleCount.total} linked vehicle(s)`);
      if (hasTickets) reasons.push(`${ticketCount.total} linked violation ticket(s)`);

      return res.status(409).json({
        ok: false,
        error: `Cannot delete driver — ${reasons.join(" and ")} still exist.`,
      });
    }

    // driver_has_address rows are removed automatically by ON DELETE CASCADE.
    const [result] = await db.query(Q.delete, [license]);

    res.json({ ok: true, data: { deleted: license, affectedRows: result.affectedRows } });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        ok: false,
        error: "Cannot delete driver — linked records still exist.",
      });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;