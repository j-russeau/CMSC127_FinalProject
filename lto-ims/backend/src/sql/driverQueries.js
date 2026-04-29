// driverQueries.js

module.exports = {
  list: `
    SELECT *
    FROM driver
    ORDER BY last_name, first_name
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
    SET license_type = ?,
        first_name = ?,
        middle_name = ?,
        last_name = ?,
        sex = ?,
        date_of_birth = ?,
        license_status = ?,
        license_expiration_date = ?,
        license_issuance_date = ?
    WHERE license_number = ?
  `,

  delete: `
    DELETE FROM driver
    WHERE license_number = ?
  `,
};