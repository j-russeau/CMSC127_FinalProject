// vehicle queries

module.exports = {
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

  create: `
    INSERT INTO vehicle
      (plate_number, engine_number, chassis_number, \`year\`, color, model, make, vehicle_type, owner_license_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

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

  delete: `
    DELETE FROM vehicle
    WHERE plate_number = ?
  `,

  ownerExists: `
    SELECT COUNT(*) AS total
    FROM driver
    WHERE license_number = ?
  `,

  findCreateConflicts: `
    SELECT
      (SELECT COUNT(*) FROM vehicle WHERE plate_number = ?) AS plate_count,
      (SELECT COUNT(*) FROM vehicle WHERE engine_number = ?) AS engine_count,
      (SELECT COUNT(*) FROM vehicle WHERE chassis_number = ?) AS chassis_count
  `,

  countRegistrationHistory: `
    SELECT COUNT(*) AS total
    FROM registration
    WHERE plate_number = ?
  `,

  countViolationTickets: `
    SELECT COUNT(*) AS total
    FROM violation_ticket
    WHERE plate_number = ?
  `,

  search: `
    SELECT
      v.plate_number, v.engine_number, v.chassis_number,
      v.make, v.model, v.year, v.vehicle_type, v.color,
      v.owner_license_number,
      d.first_name, d.middle_name, d.last_name
    FROM vehicle v
    LEFT JOIN driver d ON d.license_number = v.owner_license_number
    WHERE
      v.plate_number LIKE ?
      OR v.make LIKE ?
      OR v.model LIKE ?
      OR v.owner_license_number LIKE ?
      OR CONCAT_WS(' ', d.first_name, d.middle_name, d.last_name) LIKE ?
    ORDER BY v.plate_number
    LIMIT ?
  `,
};