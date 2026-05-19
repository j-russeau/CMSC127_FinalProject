// vehicle routes — mounted at /api/vehicles

const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/vehicleQueries");

const VEHICLE_TYPES = ["Sedan", "SUV", "Pickup Truck", "Van", "Motorcycle", "Bus", "Truck"];
const MAX_YEAR = new Date().getFullYear() + 1;

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizePlate(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function validateCreatePayload(v) {
  const required = [
    "plate_number",
    "engine_number",
    "chassis_number",
    "year",
    "color",
    "model",
    "make",
    "vehicle_type",
    "owner_license_number",
  ];

  for (const f of required) {
    if (v[f] === undefined || v[f] === null || String(v[f]).trim() === "") {
      return `Missing required field: ${f}`;
    }
  }

  return "";
}

function validateUpdatePayload(v) {
  const immutableFields = ["plate_number", "engine_number", "chassis_number"].filter((f) =>
    hasOwn(v, f)
  );

  if (immutableFields.length > 0) {
    return `Vehicle identity fields cannot be changed: ${immutableFields.join(", ")}.`;
  }

  const required = ["make", "model", "year", "color", "vehicle_type", "owner_license_number"];

  for (const f of required) {
    if (v[f] === undefined || v[f] === null || String(v[f]).trim() === "") {
      return `Missing required field: ${f}`;
    }
  }

  return "";
}

function validateCommonFields(v) {
  const yr = Number(v.year);

  if (!Number.isInteger(yr) || yr < 1900 || yr > MAX_YEAR) {
    return `Year must be between 1900 and ${MAX_YEAR}.`;
  }

  if (!VEHICLE_TYPES.includes(v.vehicle_type)) {
    return `Invalid vehicle type. Must be one of: ${VEHICLE_TYPES.join(", ")}.`;
  }

  if (normalizeText(v.make).length > 40) return "Make must be 40 characters or fewer.";
  if (normalizeText(v.model).length > 40) return "Model must be 40 characters or fewer.";
  if (normalizeText(v.color).length > 30) return "Color must be 30 characters or fewer.";

  return "";
}

function validateIdentityFields(v) {
  const plate = normalizePlate(v.plate_number);
  const engine = normalizeUpper(v.engine_number);
  const chassis = normalizeUpper(v.chassis_number);

  if (plate.length > 15) return "Plate number must be 15 characters or fewer.";
  if (engine.length > 30) return "Engine number must be 30 characters or fewer.";
  if (chassis.length > 30) return "Chassis number must be 30 characters or fewer.";

  return "";
}

// ── GET /api/vehicles ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(Q.list, [null, null]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/vehicles/search?q=...&limit=10 ──────────────────────────────────
// IMPORTANT: keep this before /:plate_number
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
    const plate = req.params.plate_number;
    const [rows] = await db.query(Q.list, [plate, plate]);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Vehicle not found" });
    }

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

    const requiredErr = validateCreatePayload(v);
    if (requiredErr) {
      return res.status(400).json({ ok: false, error: requiredErr });
    }

    const identityErr = validateIdentityFields(v);
    if (identityErr) {
      return res.status(400).json({ ok: false, error: identityErr });
    }

    const commonErr = validateCommonFields(v);
    if (commonErr) {
      return res.status(400).json({ ok: false, error: commonErr });
    }

    const plate = normalizePlate(v.plate_number);
    const engine = normalizeUpper(v.engine_number);
    const chassis = normalizeUpper(v.chassis_number);
    const ownerLicense = normalizeText(v.owner_license_number);
    const yr = Number(v.year);

    const [[ownerCheck]] = await db.query(Q.ownerExists, [ownerLicense]);
    if (Number(ownerCheck.total) === 0) {
      return res.status(409).json({ ok: false, error: "Owner license number does not exist." });
    }

    const [[conflicts]] = await db.query(Q.findCreateConflicts, [plate, engine, chassis]);

    if (Number(conflicts.plate_count) > 0) {
      return res.status(409).json({ ok: false, error: "Plate number already exists." });
    }

    if (Number(conflicts.engine_count) > 0) {
      return res.status(409).json({ ok: false, error: "Engine number already exists." });
    }

    if (Number(conflicts.chassis_count) > 0) {
      return res.status(409).json({ ok: false, error: "Chassis number already exists." });
    }

    await db.query(Q.create, [
      plate,
      engine,
      chassis,
      yr,
      normalizeText(v.color),
      normalizeText(v.model),
      normalizeText(v.make),
      v.vehicle_type,
      ownerLicense,
    ]);

    res.status(201).json({ ok: true, data: { plate_number: plate } });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      const msg = err.sqlMessage || err.message || "";

      if (msg.includes("vehicle_engine_uk")) {
        return res.status(409).json({ ok: false, error: "Engine number already exists." });
      }

      if (msg.includes("vehicle_chassis_uk")) {
        return res.status(409).json({ ok: false, error: "Chassis number already exists." });
      }

      return res.status(409).json({ ok: false, error: "Plate number already exists." });
    }

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(409).json({ ok: false, error: "Owner license number does not exist." });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PUT /api/vehicles/:plate_number ───────────────────────────────────────────
router.put("/:plate_number", async (req, res) => {
  try {
    const plate = req.params.plate_number;
    const v = req.body;

    const updateErr = validateUpdatePayload(v);
    if (updateErr) {
      return res.status(400).json({ ok: false, error: updateErr });
    }

    const commonErr = validateCommonFields(v);
    if (commonErr) {
      return res.status(400).json({ ok: false, error: commonErr });
    }

    const ownerLicense = normalizeText(v.owner_license_number);
    const yr = Number(v.year);

    const [[ownerCheck]] = await db.query(Q.ownerExists, [ownerLicense]);
    if (Number(ownerCheck.total) === 0) {
      return res.status(409).json({ ok: false, error: "Owner license number does not exist." });
    }

    const [result] = await db.query(Q.update, [
      normalizeText(v.make),
      normalizeText(v.model),
      yr,
      normalizeText(v.color),
      v.vehicle_type,
      ownerLicense,
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
    const plate = req.params.plate_number;

    const [vehicleRows] = await db.query(Q.list, [plate, plate]);
    if (vehicleRows.length === 0) {
      return res.status(404).json({ ok: false, error: "Vehicle not found" });
    }

    const [[registrationCount]] = await db.query(Q.countRegistrationHistory, [plate]);
    const [[ticketCount]] = await db.query(Q.countViolationTickets, [plate]);

    const hasRegistrations = Number(registrationCount.total) > 0;
    const hasTickets = Number(ticketCount.total) > 0;

    if (hasRegistrations || hasTickets) {
      const reasons = [];

      if (hasRegistrations) {
        reasons.push(`${registrationCount.total} registration record(s)`);
      }

      if (hasTickets) {
        reasons.push(`${ticketCount.total} violation ticket(s)`);
      }

      return res.status(409).json({
        ok: false,
        error: `Cannot delete vehicle — ${reasons.join(" and ")} still exist.`,
      });
    }

    const [result] = await db.query(Q.delete, [plate]);

    res.json({
      ok: true,
      data: {
        deleted: plate,
        affectedRows: result.affectedRows,
      },
    });
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