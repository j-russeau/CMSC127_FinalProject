const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/ticketsQueries");

// GET /api/tickets?license_number=...
router.get("/", async (req, res) => {
  try {
    const { license_number } = req.query;

    const sql = license_number ? Q.listByDriver : Q.list;
    const params = license_number ? [license_number] : [];

    console.log("[SQL]", sql.trim(), params);

    const [rows] = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/tickets/:ticket_id
router.get("/:ticket_id", async (req, res) => {
  try {
    const { ticket_id } = req.params;
    console.log("[SQL]", Q.getById.trim(), [ticket_id]);

    const [rows] = await db.query(Q.getById, [ticket_id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "Ticket not found" });

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/tickets
router.post("/", async (req, res) => {
  try {
    const t = req.body;

    // minimal validation
    const required = ["ticket_id","datetime","violation_status","issued_at","license_number","plate_number","engine_number","chassis_number"];
    for (const f of required) {
      if (!t[f]) return res.status(400).json({ ok: false, error: `Missing required field: ${f}` });
    }

    const params = [
      t.ticket_id,
      t.datetime,
      t.violation_status,
      t.issued_at,
      t.apprehending_officer || null,
      t.license_number,
      t.plate_number,
      t.engine_number,
      t.chassis_number
    ];

    console.log("[SQL]", Q.create.trim(), params);

    await db.query(Q.create, params);
    res.status(201).json({ ok: true, data: { ticket_id: t.ticket_id } });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ ok: false, error: "ticket_id already exists" });
    if (err.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ ok: false, error: "Invalid driver or vehicle reference (FK)" });

    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/tickets/:ticket_id
router.delete("/:ticket_id", async (req, res) => {
  try {
    const { ticket_id } = req.params;
    console.log("[SQL]", Q.delete.trim(), [ticket_id]);

    const [result] = await db.query(Q.delete, [ticket_id]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, error: "Ticket not found" });

    res.json({ ok: true, data: { deleted: ticket_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;