// backend/src/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

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

// Start server here
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});