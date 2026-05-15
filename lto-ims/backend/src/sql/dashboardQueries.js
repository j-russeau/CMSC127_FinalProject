module.exports = {
  metrics: `
    SELECT
      (SELECT COUNT(*) FROM driver) AS total_drivers,
      (SELECT COUNT(*) FROM vehicle) AS total_vehicles,
      (SELECT COUNT(*) FROM violation_ticket) AS total_tickets,
      (SELECT COUNT(*) FROM violation) AS total_violations,
      (SELECT COUNT(*) FROM violation_ticket WHERE violation_status = 'unpaid') AS unpaid_tickets,
      (SELECT COUNT(*) FROM latest_registration_vu WHERE expiration_date < CURDATE()) AS expired_registrations,
      (SELECT COUNT(*) FROM driver
         WHERE license_status IN ('expired','suspended','revoked')
            OR license_expiration_date < CURDATE()
      ) AS drivers_with_problem_license
  `,

  recentTickets: `
    SELECT
      vt.ticket_id,
      vt.\`datetime\`,
      vt.issued_at,
      vt.violation_status,
      vt.license_number,
      CONCAT_WS(' ', d.first_name, d.middle_name, d.last_name) AS driver_name,
      vt.plate_number,
      CONCAT_WS(' ', veh.make, veh.model, veh.\`year\`) AS vehicle_label,
      COALESCE(vsum.total_fine, 0) AS total_fine
    FROM violation_ticket vt
    LEFT JOIN driver d
      ON d.license_number = vt.license_number
    LEFT JOIN vehicle veh
      ON veh.plate_number = vt.plate_number
     AND veh.engine_number = vt.engine_number
     AND veh.chassis_number = vt.chassis_number
    LEFT JOIN (
      SELECT ticket_id, SUM(corresponding_fine_amount) AS total_fine
      FROM violation
      GROUP BY ticket_id
    ) vsum ON vsum.ticket_id = vt.ticket_id
    ORDER BY vt.\`datetime\` DESC
    LIMIT 5
  `,

  expiringRegistrations: `
    SELECT
      lr.plate_number,
      lr.registration_number,
      lr.registration_date,
      lr.expiration_date,
      lr.registration_status
    FROM latest_registration_vu lr
    WHERE lr.expiration_date >= CURDATE()
      AND lr.expiration_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    ORDER BY lr.expiration_date ASC
    LIMIT 5
  `,
};