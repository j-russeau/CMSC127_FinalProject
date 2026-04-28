-- db/views.sql
USE lto_db;

DROP VIEW IF EXISTS latest_registration_vu;

-- view for latest registration per vehicle
CREATE VIEW latest_registration_vu AS SELECT r.* FROM registration r JOIN (
  SELECT plate_number, MAX(registration_date) AS max_reg_date
  FROM registration
  GROUP BY plate_number
) veh ON r.plate_number = veh.plate_number AND r.registration_date = veh.max_reg_date;