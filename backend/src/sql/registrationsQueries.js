// registration queries

module.exports = {
  // gets all registrations
  list: `
    SELECT *
    FROM registration
    ORDER BY registration_date DESC
  `,

  // gets registrations by vehicle
  listByVehicle: `
    SELECT *
    FROM registration
    WHERE plate_number = ?
    ORDER BY registration_date DESC
  `,

  // gets latest registration
  latestByVehicle: `
    SELECT *
    FROM latest_registration_vu
    WHERE plate_number = ?
  `,

  // locks the exact vehicle row during registration creation
  vehicleByCompositeForUpdate: `
    SELECT plate_number, engine_number, chassis_number
    FROM vehicle
    WHERE plate_number = ?
      AND engine_number = ?
      AND chassis_number = ?
    FOR UPDATE
  `,

  // locks existing active registrations for this vehicle during insert
  activeByVehicleForUpdate: `
    SELECT registration_number
    FROM registration
    WHERE plate_number = ?
      AND engine_number = ?
      AND chassis_number = ?
      AND registration_status = 'active'
    FOR UPDATE
  `,

  // adds a new registration
  create: `
    INSERT INTO registration
      (registration_number, expiration_date, registration_status, registration_date,
       plate_number, engine_number, chassis_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,

  // kept here for compatibility, but DELETE route will now return 405
  delete: `
    DELETE FROM registration
    WHERE registration_number = ?
  `,
};