// report routes

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const Q       = require("../sql/reportsQueries");

/*
 * Wraps an async route handler and catches errors centrally.
 * Previously every route had an identical try/catch block — changing the error
 * log format or status code required editing 6 places. Now there is one place.
 */
function asyncRoute(fn) {
  return (req, res) => fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  });
}

/*
 * Validates that a string is a YYYY-MM-DD date before it gets concatenated into
 * the datetime range params. The values are passed as parameterized query values
 * (not interpolated into SQL) so there is no injection risk, but without this
 * check garbage like "abc" would silently produce empty result sets from MySQL.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function validateDateRange(start, end, res) {
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
    res.status(400).json({ ok: false, error: "start and end must be YYYY-MM-DD" });
    return false;
  }
  if (start > end) {
    res.status(400).json({ ok: false, error: "start must be before or equal to end" });
    return false;
  }
  return true;
}

function validateDate(value, name, res) {
  if (!DATE_RE.test(String(value || ""))) {
    res.status(400).json({ ok: false, error: `${name} must be YYYY-MM-DD` });
    return false;
  }
  return true;
}

router.get("/drivers", asyncRoute(async (req, res) => {
  const { type, status, sex, min, max } = req.query;

  if (!type || !status || !sex || !min || !max) {
    return res.status(400).json({ ok: false, error: "missing filters" });
  }

  const minAge = Number(min);
  const maxAge = Number(max);
  if (!Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge < 0 || maxAge < 0 || minAge > maxAge) {
    return res.status(400).json({ ok: false, error: "min and max must be valid ages, and min must be <= max" });
  }

  const params = [type, status, sex, minAge, maxAge];
  const [rows] = await db.query(Q.driversFiltered, params);
  res.json({ ok: true, sql: Q.driversFiltered, params, data: rows });
}));

router.get("/vehicles", asyncRoute(async (req, res) => {
  const { license } = req.query;

  if (!license) {
    return res.status(400).json({ ok: false, error: "license required" });
  }

  const params = [String(license).trim()];
  const [rows] = await db.query(Q.vehiclesByDriver, params);
  res.json({ ok: true, sql: Q.vehiclesByDriver, params, data: rows });
}));

router.get("/expired-registrations", asyncRoute(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ ok: false, error: "date required" });
  }
  if (!validateDate(date, "date", res)) return;

  const params = [date];
  const [rows] = await db.query(Q.expiredRegistrations, params);
  res.json({ ok: true, sql: Q.expiredRegistrations, params, data: rows });
}));

router.get("/expired-drivers", asyncRoute(async (req, res) => {
  const [rows] = await db.query(Q.expiredDrivers);
  res.json({ ok: true, sql: Q.expiredDrivers, params: [], data: rows });
}));

router.get("/violations", asyncRoute(async (req, res) => {
  const { license, start, end } = req.query;

  if (!license || !start || !end) {
    return res.status(400).json({ ok: false, error: "license, start, and end required" });
  }
  if (!validateDateRange(start, end, res)) return;

  const params = [
    String(license).trim(),
    `${start} 00:00:00`,
    `${end} 23:59:59`,
  ];

  const [rows] = await db.query(Q.violationsByDriver, params);
  res.json({ ok: true, sql: Q.violationsByDriver, params, data: rows });
}));

router.get("/violation-count", asyncRoute(async (req, res) => {
  const { year } = req.query;

  if (!year || !/^\d{4}$/.test(String(year))) {
    return res.status(400).json({ ok: false, error: "year required, format YYYY" });
  }

  const params = [Number(year)];
  const [rows] = await db.query(Q.violationCount, params);
  res.json({ ok: true, sql: Q.violationCount, params, data: rows });
}));

router.get("/vehicles-region", asyncRoute(async (req, res) => {
  const { region } = req.query;

  if (!region || !String(region).trim()) {
    return res.status(400).json({ ok: false, error: "region required" });
  }

  /*
   * LIKE on issued_at is a full-table scan because a leading % prevents index use.
   * This is a schema limitation — issued_at is a free-text city string with no
   * dedicated region column. Adding a `region` column to violation_ticket and
   * indexing it would be the fix, but that's a schema migration out of scope here.
   */
  const params = [`%${String(region).trim()}%`];
  const [rows] = await db.query(Q.vehiclesByRegion, params);
  res.json({ ok: true, sql: Q.vehiclesByRegion, params, data: rows });
}));

module.exports = router;