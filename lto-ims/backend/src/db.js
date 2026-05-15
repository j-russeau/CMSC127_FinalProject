// ─────────────────────────────────────────────────────────────────────────────
// db.js — MySQL connection pool
// Creates and exports a shared pool that all route handlers import.
// Credentials are read from environment variables defined in .env
// ─────────────────────────────────────────────────────────────────────────────

const mysql = require("mysql2/promise");
require("dotenv").config();

// A pool reuses connections instead of opening a new one per query,
// which is more efficient under concurrent requests.
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     Number(process.env.DB_PORT || 3306),

  waitForConnections: true,  // queue requests when all connections are busy
  connectionLimit:    10,    // maximum simultaneous connections
  queueLimit:         0,     // unlimited queue (0 = no limit)
});

module.exports = pool;
