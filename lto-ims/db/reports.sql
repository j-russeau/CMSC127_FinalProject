-- db/reports.sql
USE lto_ims;

-- Reports to be generated part
-- View all registered drivers filtered by: License type=Professional, License status=valid, Age range=18 to 60, Sex=M
SELECT license_number, license_type, first_name, middle_name, last_name, sex, date_of_birth, FLOOR(DATEDIFF(CURDATE(), date_of_birth)/365) AS age, license_status, license_issuance_date, license_expiration_date FROM driver WHERE license_type = "Professional" AND license_status = "valid" AND sex = "M" AND FLOOR(DATEDIFF(CURDATE(), date_of_birth)/365) BETWEEN 18 AND 60 ORDER BY last_name, first_name;

-- View all vehicles owned by a given driver licenseno = "D06-11-009385";
SELECT v.plate_number, v.engine_number, v.chassis_number, v.make, v.model, v.`year`, v.color, v.vehicle_type FROM vehicle v WHERE v.owner_license_number = "D06-11-009385";

-- View all vehicles with expired registrations as of a given date = "2025-04-12";
SELECT veh.plate_number, veh.make, veh.model, lr.registration_number, lr.registration_date, lr.expiration_date, lr.registration_status FROM vehicle veh JOIN latest_registration_vu lr ON lr.plate_number = veh.plate_number WHERE lr.expiration_date < DATE('2025-04-12');

-- View all drivers with expired or suspended licenses
SELECT license_number, first_name, middle_name, last_name, license_status, license_expiration_date
FROM driver WHERE license_status IN ("expired","suspended") OR license_expiration_date < CURDATE();

-- View all traffic violations committed by a given driver="D06-11-009385" within a specified date range ("2026-01-01 00:00:00", "2026-12-31 23:59:59")
SELECT vt.ticket_id, vt.`datetime`, vt.violation_status, vt.issued_at, vt.apprehending_officer,
  vt.plate_number, v.violation_id, v.name AS violation_type, v.corresponding_fine_amount FROM violation_ticket vt JOIN violation v ON v.ticket_id = vt.ticket_id WHERE vt.license_number = "D06-11-009385" AND vt.`datetime` BETWEEN "2026-01-01 00:00:00" AND "2026-12-31 23:59:59";

-- View the total number of violations per violation type for a given year=2026
SELECT v.name AS violation_type, COUNT(*) AS total_count FROM violation_ticket vt JOIN violation v ON v.ticket_id = vt.ticket_id WHERE YEAR(vt.`datetime`) = 2026 GROUP BY v.name ORDER BY total_count DESC;

-- View all vehicles involved in violations within a given city or region="Quezon City"
SELECT DISTINCT veh.plate_number, veh.engine_number, veh.chassis_number, veh.make, veh.model, veh.`year`, veh.color, veh.vehicle_type FROM violation_ticket vt
JOIN vehicle veh ON veh.plate_number = vt.plate_number AND veh.engine_number = vt.engine_number
AND veh.chassis_number = vt.chassis_number WHERE vt.issued_at LIKE "%Quezon City%";