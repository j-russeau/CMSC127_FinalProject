// vehicle queries

module.exports = {

  /*
   * Fetch vehicles with owner name joined from driver.
   * The (? IS NULL OR ...) pattern lets one query serve both the list endpoint
   * (pass null) and the single-vehicle lookup (pass plate_number) so the 12-column
   * SELECT and JOIN are not duplicated. Previously `list` and `getByPlate` were
   * copy-pasted — adding a column required editing both.
   * Params: [plateNumber, plateNumber] — pass null for both to get all rows.
   */
  list: `
    SELECT
      v.plate_number,
      v.engine_number,
      v.chassis_number,
      v.year,
      v.color,
      v.model,
      v.make,
      v.vehicle_type,
      v.owner_license_number,
      d.first_name,
      d.middle_name,
      d.last_name
    FROM vehicle v
    JOIN driver d ON v.owner_license_number = d.license_number
    WHERE (? IS NULL OR v.plate_number = ?)
    ORDER BY v.plate_number
  `,

  // Insert a new vehicle.
  create: `
    INSERT INTO vehicle
      (plate_number, engine_number, chassis_number, \`year\`, color, model, make, vehicle_type, owner_license_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  // Update editable fields on an existing vehicle.
  // plate_number, engine_number, chassis_number are NOT updated — they form the
  // composite key that violation_ticket and registration reference via FK.
  // Params: make, model, year, color, vehicle_type, owner_license_number, plate_number (WHERE)
  update: `
    UPDATE vehicle
    SET make                  = ?,
        model                 = ?,
        \`year\`              = ?,
        color                 = ?,
        vehicle_type          = ?,
        owner_license_number  = ?
    WHERE plate_number = ?
  `,

  // Delete vehicle by plate.
  delete: `DELETE FROM vehicle WHERE plate_number = ?`,
};
