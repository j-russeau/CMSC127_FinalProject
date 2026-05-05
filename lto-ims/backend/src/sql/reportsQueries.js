// report queries

module.exports = {
  // gets filtered drivers
  driversFiltered: `
    SELECT
      *,
      FLOOR(DATEDIFF(CURDATE(), date_of_birth) / 365) AS age
    FROM driver
    WHERE license_type = ?
      AND license_status = ?
      AND sex = ?
      AND FLOOR(DATEDIFF(CURDATE(), date_of_birth) / 365) BETWEEN ? AND ?
    ORDER BY last_name, first_name
  `,

  // gets vehicles by driver
  vehiclesByDriver: `
    SELECT *
    FROM vehicle
    WHERE owner_license_number = ?
    ORDER BY plate_number
  `,

  // gets expired latest registrations
  expiredRegistrations: `
    SELECT
      v.plate_number,
      v.engine_number,
      v.chassis_number,
      v.make,
      v.model,
      v.year,
      v.color,
      v.vehicle_type,
      lr.registration_number,
      lr.registration_date,
      lr.expiration_date,
      lr.registration_status
    FROM latest_registration_vu lr
    JOIN vehicle v
      ON v.plate_number = lr.plate_number
     AND v.engine_number = lr.engine_number
     AND v.chassis_number = lr.chassis_number
    WHERE lr.expiration_date < ?
    ORDER BY lr.expiration_date
  `,

  // gets expired or suspended drivers
  expiredDrivers: `
    SELECT *
    FROM driver
    WHERE license_status IN ('expired', 'suspended')
       OR license_expiration_date < CURDATE()
    ORDER BY last_name, first_name
  `,

  // gets violations by driver
  violationsByDriver: `
    SELECT
      vt.ticket_id,
      vt.datetime,
      vt.violation_status,
      vt.issued_at,
      vt.apprehending_officer,
      vt.license_number,
      vt.plate_number,
      vt.engine_number,
      vt.chassis_number,
      v.violation_id,
      v.name AS violation_type,
      v.corresponding_fine_amount
    FROM violation_ticket vt
    JOIN violation v
      ON v.ticket_id = vt.ticket_id
    WHERE vt.license_number = ?
      AND vt.datetime BETWEEN ? AND ?
    ORDER BY vt.datetime DESC
  `,


  // gets violation count
  violationCount: `
    SELECT
      v.name AS violation_type,
      COUNT(*) AS total
    FROM violation v
    JOIN violation_ticket vt
      ON vt.ticket_id = v.ticket_id
    WHERE vt.datetime BETWEEN ? AND ?
    GROUP BY v.name
    ORDER BY total DESC
  `,

  // gets vehicles by region
  vehiclesByRegion: `
    SELECT DISTINCT
      veh.plate_number,
      veh.engine_number,
      veh.chassis_number,
      veh.make,
      veh.model,
      veh.year,
      veh.color,
      veh.vehicle_type,
      vt.issued_at
    FROM violation_ticket vt
    JOIN vehicle veh
      ON veh.plate_number = vt.plate_number
     AND veh.engine_number = vt.engine_number
     AND veh.chassis_number = vt.chassis_number
    WHERE vt.issued_at LIKE ?
    ORDER BY veh.plate_number
  `,
};