// ─────────────────────────────────────────────────────────────────────────────
// sql/violationsQueries.js — Parameterized SQL queries for the violation table
// Used by routes/violations.js
// Each violation belongs to exactly one violation_ticket (FK: ticket_id)
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

  // Fetch all violations that belong to a given ticket, ordered by ID.
  // Params: ticket_id
  listByTicket: `
    SELECT *
    FROM violation
    WHERE ticket_id = ?
    ORDER BY violation_id
  `,

  // Insert a new violation under an existing ticket.
  // Params: violation_id, name, corresponding_fine_amount, ticket_id
  create: `
    INSERT INTO violation
      (violation_id, name, corresponding_fine_amount, ticket_id)
    VALUES (?, ?, ?, ?)
  `,

  // Delete a single violation by primary key.
  // Params: violation_id
  delete: `
    DELETE FROM violation
    WHERE violation_id = ?
  `,
};
