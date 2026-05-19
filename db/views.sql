-- db/views.sql
USE lto_ims;

DROP VIEW IF EXISTS latest_registration_vu;

-- view for latest registration per vehicle
CREATE VIEW latest_registration_vu AS
SELECT r.*
FROM registration r
JOIN (
  SELECT
    plate_number,
    engine_number,
    chassis_number,
    MAX(registration_date) AS max_reg_date
  FROM registration
  GROUP BY plate_number, engine_number, chassis_number
) latest
  ON r.plate_number = latest.plate_number
 AND r.engine_number = latest.engine_number
 AND r.chassis_number = latest.chassis_number
 AND r.registration_date = latest.max_reg_date;