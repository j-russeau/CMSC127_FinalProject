// ─────────────────────────────────────────────────────────────────────────────
// routes/drivers.js — Driver CRUD endpoints
// Mounted at /api/drivers in server.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/driverQueries");

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

// GET /api/drivers/search?q=...&limit=10
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
router.post("/", async (req, res) => {
  const d = req.body;

  if (
    !d.license_number || !d.license_type  || !d.first_name ||
    !d.last_name      || !d.sex           || !d.date_of_birth ||
    !d.license_status || !d.license_expiration_date || !d.license_issuance_date
  ) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  const addresses = Array.isArray(d.addresses)
    ? d.addresses.map((a) => String(a || "").trim()).filter(Boolean)
    : [];

  /*
   * Use a transaction so the driver row and all address rows are committed
   * atomically. Previously addresses were inserted in a for-loop with no
   * transaction — if the 3rd address failed, the driver existed in the DB
   * with only 2 addresses and there was no way to roll back the partial state.
   *
   * Addresses are now bulk-inserted in a single query instead of N separate
   * queries. N addresses used to mean N+1 round-trips; now it's always 2.
   */
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(Q.create, [
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

    if (addresses.length > 0) {
      const placeholders = addresses.map(() => "(?, ?)").join(", ");
      const values       = addresses.flatMap((addr) => [d.license_number, addr]);
      await conn.query(
        `INSERT IGNORE INTO driver_has_address (license_number, address) VALUES ${placeholders}`,
        values,
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true, data: { license_number: d.license_number } });
  } catch (err) {
    await conn.rollback();
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "License number already exists" });
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

    await db.query("DELETE FROM driver_has_address WHERE license_number = ?", [license]);

    const [result] = await db.query(Q.delete, [license]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Driver not found" });
    }

    res.json({ ok: true, data: { deleted: license } });
  } catch (err) {
    console.error(err);

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
