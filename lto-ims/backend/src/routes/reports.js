// report routes

const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/reportsQueries");

// gets filtered drivers
router.get("/drivers", async (req, res) => {
  try {
    const { type, status, sex, min, max } = req.query;

    if (!type || !status || !sex || !min || !max) {
      return res.status(400).json({ ok: false, error: "missing filters" });
    }

    const [rows] = await db.query(Q.driversFiltered, [type, status, sex, min, max]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// gets vehicles by driver
router.get("/vehicles", async (req, res) => {
  try {
    const { license } = req.query;

    if (!license) {
      return res.status(400).json({ ok: false, error: "license required" });
    }

    const [rows] = await db.query(Q.vehiclesByDriver, [license]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// gets expired registrations
router.get("/expired-registrations", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ ok: false, error: "date required" });
    }

    const [rows] = await db.query(Q.expiredRegistrations, [date]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// gets expired drivers
router.get("/expired-drivers", async (req, res) => {
  try {
    const [rows] = await db.query(Q.expiredDrivers);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// gets violations by driver
router.get("/violations", async (req, res) => {
  try {
    const { license, start, end } = req.query;

    if (!license || !start || !end) {
      return res.status(400).json({ ok: false, error: "license, start, and end required" });
    }

    const [rows] = await db.query(Q.violationsByDriver, [
      license,
      `${start} 00:00:00`,
      `${end} 23:59:59`,
    ]);

    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// gets violation count
router.get("/violation-count", async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ ok: false, error: "start and end required" });
    }

    const [rows] = await db.query(Q.violationCount, [
      `${start} 00:00:00`,
      `${end} 23:59:59`,
    ]);

    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// gets vehicles by region
router.get("/vehicles-region", async (req, res) => {
  try {
    const { region } = req.query;

    if (!region) {
      return res.status(400).json({ ok: false, error: "region required" });
    }

    const [rows] = await db.query(Q.vehiclesByRegion, [`%${region}%`]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;