// ─────────────────────────────────────────────────────────────────────────────
// routes/drivers.js — Driver CRUD endpoints
// Mounted at /api/drivers in server.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const Q       = require("../sql/driverQueries");

// ── GET /api/drivers ──────────────────────────────────────────────────────────
// Returns all drivers ordered by last name, with their addresses aggregated
// as a "||"-delimited string in the `addresses` column.
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(Q.list);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/drivers/:license_number ─────────────────────────────────────────
// Returns a single driver record by primary key.
router.get("/:license_number", async (req, res) => {
  try {
    const license = req.params.license_number;
    const [rows]  = await db.query(Q.getByLicense, [license]);

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
// Creates a new driver record and optionally inserts their addresses.
// Expects body: { license_number, license_type, first_name, middle_name?,
//                 last_name, sex, date_of_birth, license_status,
//                 license_expiration_date, license_issuance_date,
//                 addresses?: string[] }
router.post("/", async (req, res) => {
  try {
    const d = req.body;

    // Validate all required fields before touching the database
    if (
      !d.license_number || !d.license_type  || !d.first_name ||
      !d.last_name      || !d.sex           || !d.date_of_birth ||
      !d.license_status || !d.license_expiration_date || !d.license_issuance_date
    ) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    // Insert the driver row
    await db.query(Q.create, [
      d.license_number,
      d.license_type,
      d.first_name,
      d.middle_name || null, // optional field
      d.last_name,
      d.sex,
      d.date_of_birth,
      d.license_status,
      d.license_expiration_date,
      d.license_issuance_date,
    ]);

    // Insert each address string into driver_has_address (if any provided)
    const addresses = Array.isArray(d.addresses) ? d.addresses : [];
    for (const addr of addresses) {
      const trimmed = String(addr || "").trim();
      if (trimmed) await db.query(Q.createAddress, [d.license_number, trimmed]);
    }

    res.status(201).json({ ok: true, data: { license_number: d.license_number } });
  } catch (err) {
    console.error(err);

    // Duplicate license_number
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "License number already exists" });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PUT /api/drivers/:license_number ─────────────────────────────────────────
// Updates all editable fields on an existing driver (does not touch addresses).
router.put("/:license_number", async (req, res) => {
  try {
    const license = req.params.license_number;
    const d       = req.body;

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
      license, // WHERE clause
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
// Deletes a driver and their addresses.
// Will fail (409) if the driver still has linked vehicles or violation tickets
// because those tables reference driver via a foreign key.
router.delete("/:license_number", async (req, res) => {
  try {
    const license = req.params.license_number;

    // Delete addresses first — driver_has_address has no ON DELETE CASCADE
    await db.query("DELETE FROM driver_has_address WHERE license_number = ?", [license]);

    const [result] = await db.query(Q.delete, [license]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Driver not found" });
    }

    res.json({ ok: true, data: { deleted: license } });
  } catch (err) {
    console.error(err);

    // FK constraint — driver still referenced by vehicle or violation_ticket
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        ok:    false,
        error: "Cannot delete driver — they still have linked vehicles or violation tickets.",
      });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
