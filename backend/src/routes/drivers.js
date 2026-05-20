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

const LICENSE_VALIDITY_YEARS_BY_TYPE = {
  "Student Permit": 1,
  "Non-Professional": 5,
  "Professional": 5,
};

// LTO Office Code = D06
const GENERATED_LICENSE_PREFIX = "D06";

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

function formatDateOnlyUTC(dt) {
  return [
    dt.getUTCFullYear(),
    String(dt.getUTCMonth() + 1).padStart(2, "0"),
    String(dt.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addYearsToDateOnly(dateValue, years) {
  const base = parseDateOnly(dateValue);
  if (!base) return "";

  const originalMonth = base.getUTCMonth();

  const result = new Date(Date.UTC(
    base.getUTCFullYear() + years,
    base.getUTCMonth(),
    base.getUTCDate()
  ));

  // Handles Feb 29 safely by clamping to Feb 28 on non-leap target years.
  if (result.getUTCMonth() !== originalMonth) {
    result.setUTCDate(0);
  }

  return formatDateOnlyUTC(result);
}

function expectedExpirationForLicense(licenseType, issuanceDate) {
  const years = LICENSE_VALIDITY_YEARS_BY_TYPE[licenseType];
  if (!years) return "";
  return addYearsToDateOnly(issuanceDate, years);
}

function generateLicenseNumber(issueDateValue) {
  const issueDate = parseDateOnly(issueDateValue) || todayDateOnly();
  const yy = String(issueDate.getUTCFullYear()).slice(-2);
  const serial = String(Math.floor(100000 + Math.random() * 900000));

  return `${GENERATED_LICENSE_PREFIX}-${yy}-${serial}`;
}

async function generateAvailableLicenseNumber(issueDateValue) {
  for (let i = 0; i < 20; i++) {
    const licenseNumber = generateLicenseNumber(issueDateValue);
    const [rows] = await db.query(Q.getByLicense, [licenseNumber]);

    if (rows.length === 0) {
      return licenseNumber;
    }
  }

  throw new Error("Could not generate a unique license number. Please try again.");
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

  if (
    requireLicenseNumber &&
    !/^[A-Za-z0-9][A-Za-z0-9-]{4,19}$/.test(String(d.license_number).trim())
  ) {
    return "License number must be 5–20 characters (letters, numbers, and hyphens only).";
  }

  if (String(d.first_name).trim().length > 50) {
    return "First name exceeds maximum length of 50 characters.";
  }

  if (String(d.last_name).trim().length > 50) {
    return "Last name exceeds maximum length of 50 characters.";
  }

  if (d.middle_name && String(d.middle_name).trim().length > 50) {
    return "Middle name exceeds maximum length of 50 characters.";
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

  if (issuance > today) {
    return "License issuance date cannot be in the future.";
  }

  if (issuance >= expiration) {
    return "License issuance date must be before expiration date.";
  }

  const expectedExpiration = expectedExpirationForLicense(
    d.license_type,
    d.license_issuance_date
  );

  if (!expectedExpiration) {
    return "Could not calculate license expiration date.";
  }

  if (d.license_expiration_date !== expectedExpiration) {
    const years = LICENSE_VALIDITY_YEARS_BY_TYPE[d.license_type];

    return `${d.license_type} expiration date must be exactly ${expectedExpiration} based on the issuance date. Validity is ${years} year${years === 1 ? "" : "s"}.`;
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

// ── GET /api/drivers/generate-license-number?issue_date=YYYY-MM-DD ───────────
// Generates a D06-YY-XXXXXX license number and checks that it does not exist.
router.get("/generate-license-number", async (req, res) => {
  try {
    const issueDate = String(req.query.issue_date || "").trim();
    const licenseNumber = await generateAvailableLicenseNumber(issueDate);

    res.json({
      ok: true,
      data: {
        license_number: licenseNumber,
      },
    });
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

    const licenseNumber = d.license_number.trim().toUpperCase();

    await conn.query(Q.create, [
      licenseNumber,
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
      const values = addresses.flatMap((addr) => [licenseNumber, addr]);

      await conn.query(
        `INSERT INTO driver_has_address (license_number, address) VALUES ${placeholders}`,
        values
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true, data: { license_number: licenseNumber } });
  } catch (err) {
    await conn.rollback();
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      const msg = err.sqlMessage || err.message || "";
      if (msg.includes("driver_has_address_pk")) {
        return res.status(409).json({ ok: false, error: "Duplicate address already exists for this driver." });
      }
      return res.status(409).json({ ok: false, error: "License number already exists." });
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