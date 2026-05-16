const express = require("express");
const router = express.Router();
const db = require("../db");
const Q = require("../sql/dashboardQueries");

// GET /api/dashboard
router.get("/", async (req, res) => {
  try {
    const [m] = await db.query(Q.metrics);
    const metrics = m[0];

    const [recentTickets] = await db.query(Q.recentTickets);
    const [expiringRegistrations] = await db.query(Q.expiringRegistrations);

    res.json({
      ok: true,
      data: {
        metrics,
        recentTickets,
        expiringRegistrations,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;