// ─────────────────────────────────────────────────────────────────────────────
// sql/driverQueries.js — Parameterized SQL queries for the driver table
// Used by routes/drivers.js
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

  // Fetch all drivers with their addresses aggregated into one column.
  // GROUP_CONCAT joins multiple address rows into a single "||"-delimited string
  // so the frontend can split them back into an array.
  list: `
    SELECT d.*, GROUP_CONCAT(da.address ORDER BY da.address SEPARATOR '||') AS addresses
    FROM driver d
    LEFT JOIN driver_has_address da ON d.license_number = da.license_number
    GROUP BY d.license_number
    ORDER BY d.last_name, d.first_name
  `,

  // Fetch a single driver by their license number (primary key).
  getByLicense: `
    SELECT *
    FROM driver
    WHERE license_number = ?
  `,

  // Insert a new driver row.
  // Params: license_number, license_type, first_name, middle_name, last_name,
  //         sex, date_of_birth, license_status,
  //         license_expiration_date, license_issuance_date
  create: `
    INSERT INTO driver
      (license_number, license_type, first_name, middle_name, last_name, sex,
       date_of_birth, license_status, license_expiration_date, license_issuance_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  // Update all editable fields on an existing driver.
  // Params: license_type, first_name, middle_name, last_name, sex,
  //         date_of_birth, license_status, license_expiration_date,
  //         license_issuance_date, license_number (WHERE)
  update: `
    UPDATE driver
    SET license_type             = ?,
        first_name               = ?,
        middle_name              = ?,
        last_name                = ?,
        sex                      = ?,
        date_of_birth            = ?,
        license_status           = ?,
        license_expiration_date  = ?,
        license_issuance_date    = ?
    WHERE license_number = ?
  `,

  // Delete a driver by primary key.
  // The caller must delete driver_has_address rows first (no CASCADE defined).
  delete: `
    DELETE FROM driver
    WHERE license_number = ?
  `,

  // Insert one address for a driver.
  // INSERT IGNORE skips silently if the (license_number, address) pair already exists.
  createAddress: `
    INSERT IGNORE INTO driver_has_address (license_number, address) VALUES (?, ?)
  `,
};
