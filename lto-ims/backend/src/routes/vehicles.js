// vehicle routes — mounted at /api/vehicles

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const Q       = require("../sql/vehicleQueries");

// ── GET /api/vehicles ─────────────────────────────────────────────────────────
// The query accepts an optional plate filter via (? IS NULL OR ...).
// Passing [null, null] returns all vehicles; the single-vehicle GET reuses the
// same query with [plate, plate] rather than maintaining a separate getByPlate.
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(Q.list, [null, null]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/vehicles/search?q=...&limit=10
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit || 10), 25);

    if (!q) return res.status(400).json({ ok: false, error: "q is required" });
    if (q.length > 50) return res.status(400).json({ ok: false, error: "q too long" });

    const like = `%${q}%`;
    const [rows] = await db.query(Q.search, [like, like, like, like, like, limit]);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/vehicles/:plate_number ──────────────────────────────────────────
router.get("/:plate_number", async (req, res) => {
  try {
    const plate  = req.params.plate_number;
    const [rows] = await db.query(Q.list, [plate, plate]);

    if (rows.length === 0) return res.status(404).json({ ok: false, error: "Vehicle not found" });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/vehicles ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const v = req.body;
    const required = [
      "plate_number", "engine_number", "chassis_number",
      "year", "color", "model", "make", "vehicle_type", "owner_license_number",
    ];
    for (const f of required) {
      if (!v[f] && v[f] !== 0) {
        return res.status(400).json({ ok: false, error: `Missing required field: ${f}` });
      }
    }

    await db.query(Q.create, [
      v.plate_number.trim(),
      v.engine_number.trim(),
      v.chassis_number.trim(),
      Number(v.year),
      v.color.trim(),
      v.model.trim(),
      v.make.trim(),
      v.vehicle_type.trim(),
      v.owner_license_number.trim(),
    ]);

    res.status(201).json({ ok: true, data: { plate_number: v.plate_number } });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "Plate number, engine number, or chassis number already exists." });
    }
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(409).json({ ok: false, error: "Owner license number does not exist." });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PUT /api/vehicles/:plate_number ───────────────────────────────────────────
// Updates only the non-key fields. plate_number, engine_number, and chassis_number
// are part of the composite FK that violation_ticket and registration reference,
// so changing them would break those FK constraints — they stay immutable.
router.put("/:plate_number", async (req, res) => {
  try {
    const plate = req.params.plate_number;
    const v     = req.body;

    const required = ["make", "model", "year", "color", "vehicle_type", "owner_license_number"];
    for (const f of required) {
      if (!v[f] && v[f] !== 0) {
        return res.status(400).json({ ok: false, error: `Missing required field: ${f}` });
      }
    }

    const [result] = await db.query(Q.update, [
      v.make.trim(),
      v.model.trim(),
      Number(v.year),
      v.color.trim(),
      v.vehicle_type.trim(),
      v.owner_license_number.trim(),
      plate,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Vehicle not found" });
    }

    res.json({ ok: true, data: { plate_number: plate } });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(409).json({ ok: false, error: "Owner license number does not exist." });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /api/vehicles/:plate_number ────────────────────────────────────────
router.delete("/:plate_number", async (req, res) => {
  try {
    const [result] = await db.query(Q.delete, [req.params.plate_number]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, error: "Vehicle not found" });
    res.json({ ok: true, data: { deleted: req.params.plate_number } });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        ok: false,
        error: "Cannot delete vehicle — it still has linked registrations or violation tickets.",
      });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
