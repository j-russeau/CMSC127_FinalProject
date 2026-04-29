// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");

const app = express();

// Middleware here
app.use(cors());
app.use(express.json());

// Health endpoint here
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "LTO backend running",
    time: new Date().toISOString(),
  });
});

// Default root here
app.get("/", (req, res) => {
  res.send("Backend is running. Try /api/health");
});

// Start server
const PORT = process.env.PORT || 3001;

// Mount routes to server
const driversRouter = require("./routes/drivers");
app.use("/api/drivers", driversRouter);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

// after app.use():
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows1] = await db.query("SELECT 1 AS ok");
    const [rows2] = await db.query("SELECT * FROM driver LIMIT 5");
    res.json({ select1: rows1, drivers: rows2 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB test failed", details: err.message });
  }
});

