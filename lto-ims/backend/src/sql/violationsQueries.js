module.exports = {
  listByTicket: `
    SELECT *
    FROM violation
    WHERE ticket_id = ?
    ORDER BY violation_id
  `,

  create: `
    INSERT INTO violation
    (violation_id, name, corresponding_fine_amount, ticket_id)
    VALUES (?, ?, ?, ?)
  `,

  delete: `
    DELETE FROM violation
    WHERE violation_id = ?
  `
};