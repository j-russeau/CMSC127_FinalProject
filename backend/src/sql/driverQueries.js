// ─────────────────────────────────────────────────────────────────────────────
// sql/driverQueries.js — Parameterized SQL queries for the driver table
// Used by routes/drivers.js
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  list: `
    SELECT d.*, GROUP_CONCAT(da.address ORDER BY da.address SEPARATOR '||') AS addresses
    FROM driver d
    LEFT JOIN driver_has_address da ON d.license_number = da.license_number
    GROUP BY d.license_number
    ORDER BY d.last_name, d.first_name
  `,

  getByLicense: `
    SELECT *
    FROM driver
    WHERE license_number = ?
  `,

  create: `
    INSERT INTO driver
      (license_number, license_type, first_name, middle_name, last_name, sex,
       date_of_birth, license_status, license_expiration_date, license_issuance_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

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

  delete: `
    DELETE FROM driver
    WHERE license_number = ?
  `,

  createAddress: `
    INSERT INTO driver_has_address (license_number, address)
    VALUES (?, ?)
  `,

  countOwnedVehicles: `
    SELECT COUNT(*) AS total
    FROM vehicle
    WHERE owner_license_number = ?
  `,

  countViolationTickets: `
    SELECT COUNT(*) AS total
    FROM violation_ticket
    WHERE license_number = ?
  `,

  search: `
    SELECT
      license_number, first_name, middle_name, last_name,
      license_type, license_status
    FROM driver
    WHERE
      license_number LIKE ?
      OR first_name LIKE ?
      OR middle_name LIKE ?
      OR last_name LIKE ?
      OR CONCAT_WS(' ', first_name, middle_name, last_name) LIKE ?
    ORDER BY last_name, first_name
    LIMIT ?
  `,
};