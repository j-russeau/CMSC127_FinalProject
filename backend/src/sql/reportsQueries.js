// report queries

module.exports = {
  // gets filtered drivers
  driversFiltered: `
    SELECT
      license_number,
      license_type,
      first_name,
      middle_name,
      last_name,
      sex,
      date_of_birth,
      FLOOR(DATEDIFF(CURDATE(), date_of_birth) / 365) AS age,
      license_status,
      license_issuance_date,
      license_expiration_date
    FROM driver
    WHERE license_type = ?
      AND license_status = ?
      AND sex = ?
      AND FLOOR(DATEDIFF(CURDATE(), date_of_birth) / 365) BETWEEN ? AND ?
    ORDER BY last_name, first_name
  `,

  // gets vehicles by driver
  vehiclesByDriver: `
    SELECT
      v.plate_number,
      v.engine_number,
      v.chassis_number,
      v.make,
      v.model,
      v.\`year\`,
      v.color,
      v.vehicle_type
    FROM vehicle v
    WHERE v.owner_license_number = ?
  `,

  // gets expired latest registrations
  expiredRegistrations: `
    SELECT
      veh.plate_number,
      veh.make,
      veh.model,
      lr.registration_number,
      lr.registration_date,
      lr.expiration_date,
      lr.registration_status
    FROM vehicle veh
    JOIN latest_registration_vu lr
      ON lr.plate_number = veh.plate_number
    WHERE lr.expiration_date < DATE(?)
  `,

  // gets expired or suspended drivers
  expiredDrivers: `
    SELECT
      license_number,
      first_name,
      middle_name,
      last_name,
      license_status,
      license_expiration_date
    FROM driver
    WHERE license_status IN ('expired', 'suspended')
       OR license_expiration_date < CURDATE()
  `,

  // gets violations by driver
  violationsByDriver: `
    SELECT
      vt.ticket_id,
      vt.\`datetime\`,
      vt.violation_status,
      vt.issued_at,
      vt.apprehending_officer,
      vt.plate_number,
      v.violation_id,
      v.name AS violation_type,
      v.corresponding_fine_amount
    FROM violation_ticket vt
    JOIN violation v
      ON v.ticket_id = vt.ticket_id
    WHERE vt.license_number = ?
      AND vt.\`datetime\` BETWEEN ? AND ?
  `,

  // gets violation count
  violationCount: `
    SELECT
      v.name AS violation_type,
      COUNT(*) AS total_count
    FROM violation_ticket vt
    JOIN violation v
      ON v.ticket_id = vt.ticket_id
    WHERE YEAR(vt.\`datetime\`) = ?
    GROUP BY v.name
    ORDER BY total_count DESC
  `,

  // gets vehicles by region
  vehiclesByRegion: `
    SELECT DISTINCT
      veh.plate_number,
      veh.engine_number,
      veh.chassis_number,
      veh.make,
      veh.model,
      veh.\`year\`,
      veh.color,
      veh.vehicle_type
    FROM violation_ticket vt
    JOIN vehicle veh
      ON veh.plate_number = vt.plate_number
     AND veh.engine_number = vt.engine_number
     AND veh.chassis_number = vt.chassis_number
    WHERE vt.issued_at LIKE ?
  `,
};