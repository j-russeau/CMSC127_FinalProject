// ─────────────────────────────────────────────────────────────────────────────
// server.js — Express application entry point
// Loads environment variables, sets up middleware, mounts all route handlers,
// and starts the HTTP server.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const cors    = require("cors");
const db      = require("./db");
require("dotenv").config(); // load .env into process.env

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors());          // allow cross-origin requests from the Vite frontend
app.use(express.json());  // parse JSON bodies on all incoming requests

// ── Route Handlers ────────────────────────────────────────────────────────────

const driversRouter    = require("./routes/drivers");
const ticketsRouter    = require("./routes/tickets");
const violationsRouter = require("./routes/violations");

app.use("/api/drivers",    driversRouter);    // CRUD for drivers + addresses
app.use("/api/tickets",    ticketsRouter);    // CRUD for violation tickets
app.use("/api/violations", violationsRouter); // CRUD for individual violations

// ── Utility Endpoints ─────────────────────────────────────────────────────────

// Health check — used to verify the server is reachable
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status:  "ok",
    message: "LTO backend running",
    time:    new Date().toISOString(),
  });
});

// Database connectivity test — pings MySQL and returns a sample of driver rows
app.get("/api/db-test", async (req, res) => {
  try {
    const [ping]    = await db.query("SELECT 1 AS ok");
    const [drivers] = await db.query("SELECT * FROM driver LIMIT 5");
    res.json({ ping, drivers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB test failed", details: err.message });
  }
});

// Fallback root — visible when visiting the backend URL directly in a browser
app.get("/", (req, res) => {
  res.send("Backend is running. Try /api/health");
});

// ── Start Server ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
