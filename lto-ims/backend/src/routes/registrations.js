// registration routes

const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/registrationsQueries");

// gets registrations
router.get("/", async (req, res) => {
  try {
    const { plate_number } = req.query;

    const sql = plate_number ? Q.listByVehicle : Q.list;
    const params = plate_number ? [plate_number] : [];

    const [rows] = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
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

    const [rows] = await db.query(Q.latestByVehicle, [plate_number]);
    res.json({ ok: true, data: rows });
  } catch (err) {
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
      if (!r[f]) {
        return res.status(400).json({ ok: false, error: `missing ${f}` });
      }
    }

    await db.query(Q.create, [
      r.registration_number,
      r.expiration_date,
      r.registration_status,
      r.registration_date,
      r.plate_number,
      r.engine_number,
      r.chassis_number,
    ]);

    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// deletes a registration
router.delete("/:registration_number", async (req, res) => {
  try {
    const { registration_number } = req.params;

    const [result] = await db.query(Q.delete, [registration_number]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
