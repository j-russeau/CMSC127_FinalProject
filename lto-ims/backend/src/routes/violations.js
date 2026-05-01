const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/violationsQueries");

// GET /api/violations?ticket_id=...
router.get("/", async (req, res) => {
  try {
    const { ticket_id } = req.query;
    if (!ticket_id) return res.status(400).json({ ok: false, error: "ticket_id query param is required" });

    console.log("[SQL]", Q.listByTicket.trim(), [ticket_id]);
    const [rows] = await db.query(Q.listByTicket, [ticket_id]);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/violations
router.post("/", async (req, res) => {
  try {
    const v = req.body;
    const required = ["violation_id","name","corresponding_fine_amount","ticket_id"];
    for (const f of required) {
      if (v[f] === undefined || v[f] === null || v[f] === "") {
        return res.status(400).json({ ok: false, error: `Missing required field: ${f}` });
      }
    }

    const params = [v.violation_id, v.name, v.corresponding_fine_amount, v.ticket_id];
    console.log("[SQL]", Q.create.trim(), params);

    await db.query(Q.create, params);
    res.status(201).json({ ok: true, data: { violation_id: v.violation_id } });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ ok: false, error: "violation_id already exists" });
    if (err.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ ok: false, error: "ticket_id does not exist (FK)" });

    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/violations/:violation_id
router.delete("/:violation_id", async (req, res) => {
  try {
    const { violation_id } = req.params;

    console.log("[SQL]", Q.delete.trim(), [violation_id]);
    const [result] = await db.query(Q.delete, [violation_id]);

    if (result.affectedRows === 0) return res.status(404).json({ ok: false, error: "Violation not found" });

    res.json({ ok: true, data: { deleted: violation_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;