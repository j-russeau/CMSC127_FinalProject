module.exports = {
  list: `
    SELECT *
    FROM violation_ticket
    ORDER BY \`datetime\` DESC
  `,

  listByDriver: `
    SELECT *
    FROM violation_ticket
    WHERE license_number = ?
    ORDER BY \`datetime\` DESC
  `,

  getById: `
    SELECT *
    FROM violation_ticket
    WHERE ticket_id = ?
  `,

  create: `
    INSERT INTO violation_ticket
    (ticket_id, \`datetime\`, violation_status, issued_at, apprehending_officer,
     license_number, plate_number, engine_number, chassis_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  delete: `
    DELETE FROM violation_ticket
    WHERE ticket_id = ?
  `
};