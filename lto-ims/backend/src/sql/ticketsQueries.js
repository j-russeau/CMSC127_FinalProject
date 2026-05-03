// ─────────────────────────────────────────────────────────────────────────────
// sql/ticketsQueries.js — Parameterized SQL queries for violation_ticket table
// Used by routes/tickets.js
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

  // Fetch all tickets with joined driver name, vehicle label, and summed fines.
  // The subquery (vsum) pre-aggregates violation amounts per ticket so the
  // main query only needs a single LEFT JOIN instead of an aggregate over rows.
  list: `
    SELECT
      vt.ticket_id,
      vt.\`datetime\`,
      vt.violation_status,
      vt.issued_at,
      vt.apprehending_officer,
      vt.license_number,
      CONCAT_WS(' ', d.first_name, d.middle_name, d.last_name) AS driver_name,
      vt.plate_number,
      vt.engine_number,
      vt.chassis_number,
      CONCAT_WS(' ', veh.make, veh.model, veh.\`year\`) AS vehicle_label,
      COALESCE(vsum.total_fine, 0) AS total_fine
    FROM violation_ticket vt
    LEFT JOIN driver d
      ON d.license_number = vt.license_number
    LEFT JOIN vehicle veh
      ON  veh.plate_number   = vt.plate_number
      AND veh.engine_number  = vt.engine_number
      AND veh.chassis_number = vt.chassis_number
    LEFT JOIN (
      SELECT ticket_id, SUM(corresponding_fine_amount) AS total_fine
      FROM violation
      GROUP BY ticket_id
    ) vsum ON vsum.ticket_id = vt.ticket_id
    ORDER BY vt.\`datetime\` DESC
  `,

  // Same as `list` but filtered to a specific driver.
  // Params: license_number
  listByDriver: `
    SELECT
      vt.ticket_id,
      vt.\`datetime\`,
      vt.violation_status,
      vt.issued_at,
      vt.apprehending_officer,
      vt.license_number,
      CONCAT_WS(' ', d.first_name, d.middle_name, d.last_name) AS driver_name,
      vt.plate_number,
      vt.engine_number,
      vt.chassis_number,
      CONCAT_WS(' ', veh.make, veh.model, veh.\`year\`) AS vehicle_label,
      COALESCE(vsum.total_fine, 0) AS total_fine
    FROM violation_ticket vt
    LEFT JOIN driver d
      ON d.license_number = vt.license_number
    LEFT JOIN vehicle veh
      ON  veh.plate_number   = vt.plate_number
      AND veh.engine_number  = vt.engine_number
      AND veh.chassis_number = vt.chassis_number
    LEFT JOIN (
      SELECT ticket_id, SUM(corresponding_fine_amount) AS total_fine
      FROM violation
      GROUP BY ticket_id
    ) vsum ON vsum.ticket_id = vt.ticket_id
    WHERE vt.license_number = ?
    ORDER BY vt.\`datetime\` DESC
  `,

  // Fetch a single ticket by primary key (no joins — raw row only).
  // Params: ticket_id
  getById: `
    SELECT *
    FROM violation_ticket
    WHERE ticket_id = ?
  `,

  // Insert a new violation ticket.
  // Params: ticket_id, datetime, violation_status, issued_at,
  //         apprehending_officer, license_number,
  //         plate_number, engine_number, chassis_number
  create: `
    INSERT INTO violation_ticket
      (ticket_id, \`datetime\`, violation_status, issued_at, apprehending_officer,
       license_number, plate_number, engine_number, chassis_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  // Delete a ticket by primary key.
  // Params: ticket_id
  delete: `
    DELETE FROM violation_ticket
    WHERE ticket_id = ?
  `,
};
