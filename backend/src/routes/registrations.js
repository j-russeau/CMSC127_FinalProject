// registration routes

const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/registrationsQueries");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["active", "expired", "suspended"];

function isValidDateString(value) {
  if (!DATE_RE.test(String(value || ""))) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

// gets registrations
router.get("/", async (req, res) => {
  try {
    const { plate_number } = req.query;

    const sql = plate_number ? Q.listByVehicle : Q.list;
    const params = plate_number ? [String(plate_number).trim()] : [];

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

// gets latest registration
router.get("/latest", async (req, res) => {
  try {
    const { plate_number } = req.query;

    if (!plate_number) {
      return res.status(400).json({ ok: false, error: "plate_number required" });
    }

    const params = [String(plate_number).trim()];
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

// adds a new registration
router.post("/", async (req, res) => {
  try {
    const r = req.body;

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
      if (!r[f] || !String(r[f]).trim()) {
        return res.status(400).json({ ok: false, error: `missing ${f}` });
      }
    }

    const registrationNumber = String(r.registration_number).trim();
    const registrationStatus = String(r.registration_status).trim().toLowerCase();
    const registrationDate   = String(r.registration_date).trim();
    const expirationDate     = String(r.expiration_date).trim();
    const plateNumber        = String(r.plate_number).trim();
    const engineNumber       = String(r.engine_number).trim();
    const chassisNumber      = String(r.chassis_number).trim();

    if (!VALID_STATUSES.includes(registrationStatus)) {
      return res.status(400).json({ ok: false, error: "registration_status must be active, expired, or suspended" });
    }

    if (!isValidDateString(registrationDate) || !isValidDateString(expirationDate)) {
      return res.status(400).json({ ok: false, error: "registration_date and expiration_date must be YYYY-MM-DD" });
    }

    if (expirationDate <= registrationDate) {
      return res.status(400).json({ ok: false, error: "expiration_date must be after registration_date" });
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

    await db.query(Q.create, params);

    res.status(201).json({
      ok: true,
      sql: Q.create,
      params,
      data: { registration_number: registrationNumber },
    });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "Registration number already exists" });
    }

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ ok: false, error: "Vehicle reference does not exist" });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// deletes a registration
router.delete("/:registration_number", async (req, res) => {
  try {
    const { registration_number } = req.params;
    const params = [registration_number];

    const [result] = await db.query(Q.delete, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "not found" });
    }

    res.json({
      ok: true,
      sql: Q.delete,
      params,
      data: { deleted: registration_number },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;