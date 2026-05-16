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

  // adds a new registration
  create: `
    INSERT INTO registration
      (registration_number, expiration_date, registration_status, registration_date,
       plate_number, engine_number, chassis_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,

  // deletes a registration
  delete: `
    DELETE FROM registration
    WHERE registration_number = ?
  `,
};
