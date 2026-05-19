// ─────────────────────────────────────────────────────────────────────────────
// sql/ticketsQueries.js — Parameterized SQL queries for violation_ticket table
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
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
    WHERE (? IS NULL OR vt.license_number = ?)
    ORDER BY vt.\`datetime\` DESC
  `,

  getById: `
    SELECT *
    FROM violation_ticket
    WHERE ticket_id = ?
  `,

  getStatusById: `
    SELECT ticket_id, violation_status
    FROM violation_ticket
    WHERE ticket_id = ?
  `,

  driverExists: `
    SELECT COUNT(*) AS total
    FROM driver
    WHERE license_number = ?
  `,

  vehicleByCompositeForUpdate: `
    SELECT plate_number, engine_number, chassis_number
    FROM vehicle
    WHERE plate_number = ?
      AND engine_number = ?
      AND chassis_number = ?
    FOR UPDATE
  `,

  existingViolationIds: `
    SELECT violation_id
    FROM violation
    WHERE violation_id IN (?)
  `,

  create: `
    INSERT INTO violation_ticket
      (ticket_id, \`datetime\`, violation_status, issued_at, apprehending_officer,
       license_number, plate_number, engine_number, chassis_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  updateStatus: `
    UPDATE violation_ticket
    SET violation_status = ?
    WHERE ticket_id = ?
  `,

  delete: `
    DELETE FROM violation_ticket
    WHERE ticket_id = ?
  `,
};