// drivers.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/driverQueries");

// GET /api/drivers
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(Q.list);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/drivers/:license_number
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

// POST /api/drivers
router.post("/", async (req, res) => {
  try {
    const d = req.body;

    // validate required fields
    if (!d.license_number || !d.license_type || !d.first_name || !d.last_name || !d.sex ||
        !d.date_of_birth || !d.license_status || !d.license_expiration_date || !d.license_issuance_date) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    await db.query(Q.create, [
      d.license_number,
      d.license_type,
      d.first_name,
      d.middle_name || null,
      d.last_name,
      d.sex,
      d.date_of_birth,
      d.license_status,
      d.license_expiration_date,
      d.license_issuance_date,
    ]);

    res.status(201).json({ ok: true, data: { license_number: d.license_number } });
  } catch (err) {
    console.error(err);

    // check for duplicate PK
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "License number already exists" });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/drivers/:license_number
router.put("/:license_number", async (req, res) => {
  try {
    const license = req.params.license_number;
    const d = req.body;

    const [result] = await db.query(Q.update, [
      d.license_type,
      d.first_name,
      d.middle_name || null,
      d.last_name,
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

// DELETE /api/drivers/:license_number
router.delete("/:license_number", async (req, res) => {
  try {
    const license = req.params.license_number;

    const [result] = await db.query(Q.delete, [license]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Driver not found" });
    }

    res.json({ ok: true, data: { deleted: license } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;