// ─────────────────────────────────────────────────────────────────────────────
// sql/violationsQueries.js — Parameterized SQL queries for the violation table
// Used by routes/violations.js
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  listByTicket: `
    SELECT *
    FROM violation
    WHERE ticket_id = ?
    ORDER BY violation_id
  `,

  getById: `
    SELECT violation_id, ticket_id
    FROM violation
    WHERE violation_id = ?
  `,

  ticketExists: `
    SELECT COUNT(*) AS total
    FROM violation_ticket
    WHERE ticket_id = ?
  `,

  existingNameByTicket: `
    SELECT violation_id
    FROM violation
    WHERE ticket_id = ?
      AND name = ?
  `,

  countByTicket: `
    SELECT COUNT(*) AS total
    FROM violation
    WHERE ticket_id = ?
  `,

  create: `
    INSERT INTO violation
      (violation_id, name, corresponding_fine_amount, ticket_id)
    VALUES (?, ?, ?, ?)
  `,

  delete: `
    DELETE FROM violation
    WHERE violation_id = ?
  `,
};