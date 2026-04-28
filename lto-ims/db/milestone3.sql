-- Setup part, script for recreating your schema and your diagrams
-- DRIVER
CREATE TABLE driver (
  license_number VARCHAR(20),
  license_type VARCHAR(20) NOT NULL,  -- student permit/non-pro/pro
  first_name VARCHAR(50) NOT NULL,
  middle_name VARCHAR(50),
  last_name VARCHAR(50) NOT NULL,
  sex CHAR(1) NOT NULL, -- M/F
  date_of_birth DATE NOT NULL,
  license_status VARCHAR(20) NOT NULL,  -- valid/expired/suspended/revoked
  license_expiration_date DATE NOT NULL,
  license_issuance_date DATE NOT NULL,

  CONSTRAINT driver_license_number_pk PRIMARY KEY(license_number)
);

-- DRIVER_HAS_ADDRESS
CREATE TABLE driver_has_address (
  license_number VARCHAR(20),
  address VARCHAR(250) NOT NULL,

  CONSTRAINT driver_has_address_pk PRIMARY KEY(license_number, address), -- Composite PK to allow multiple addresses
  CONSTRAINT driver_license_number_fk FOREIGN KEY(license_number) REFERENCES driver(license_number)
);

-- VEHICLE
CREATE TABLE vehicle (
  plate_number VARCHAR(15),
  engine_number VARCHAR(30) NOT NULL,
  chassis_number VARCHAR(30) NOT NULL,
  `year` INT(4) NOT NULL,  -- to not confuse with YEAR()
  color VARCHAR(30) NOT NULL,
  model VARCHAR(40) NOT NULL,
  make VARCHAR(40) NOT NULL,
  vehicle_type VARCHAR(30) NOT NULL,
  owner_license_number VARCHAR(20) NOT NULL,

  CONSTRAINT vehicle_plate_pk PRIMARY KEY(plate_number),
  CONSTRAINT vehicle_engine_uk UNIQUE(engine_number),
  CONSTRAINT vehicle_chassis_uk UNIQUE(chassis_number),

  -- so other tables can ref (plate, engine, chassis)
  CONSTRAINT vehicle_keys_uk UNIQUE(plate_number, engine_number, chassis_number),

  CONSTRAINT vehicle_owner_fk FOREIGN KEY(owner_license_number) REFERENCES driver(license_number)
);

-- REGISTRATION
CREATE TABLE registration (
  registration_number VARCHAR(30),
  expiration_date DATE NOT NULL,
  registration_status VARCHAR(20) NOT NULL,
  registration_date DATE NOT NULL,

  -- f keys
  plate_number VARCHAR(15) NOT NULL,
  engine_number VARCHAR(30) NOT NULL,
  chassis_number VARCHAR(30) NOT NULL,

  CONSTRAINT registration_number_pk PRIMARY KEY(registration_number),
  CONSTRAINT registration_vehicle_fk FOREIGN KEY(plate_number, engine_number, chassis_number) REFERENCES vehicle(plate_number, engine_number, chassis_number)
);

-- VIOLATION_TICKET
CREATE TABLE violation_ticket (
  ticket_id VARCHAR(20),
  `datetime` DATETIME NOT NULL,  -- to differ from datetime()
  violation_status VARCHAR(20) NOT NULL,
  issued_at VARCHAR(100) NOT NULL,
  apprehending_officer VARCHAR(80),

  -- f keys
  license_number VARCHAR(20) NOT NULL,
  plate_number VARCHAR(15) NOT NULL,
  engine_number VARCHAR(30) NOT NULL,
  chassis_number VARCHAR(30) NOT NULL,

  CONSTRAINT violation_ticket_pk PRIMARY KEY(ticket_id),
  CONSTRAINT vt_driver_fk FOREIGN KEY(license_number) REFERENCES driver(license_number),
  CONSTRAINT vt_vehicle_fk FOREIGN KEY(plate_number, engine_number, chassis_number) REFERENCES vehicle(plate_number, engine_number, chassis_number)
);

-- VIOLATION
CREATE TABLE violation (
  violation_id VARCHAR(20),
  name VARCHAR(80) NOT NULL,
  corresponding_fine_amount DECIMAL(10,2) NOT NULL,

  -- f key
  ticket_id  VARCHAR(20) NOT NULL,

  CONSTRAINT violation_pk PRIMARY KEY(violation_id),
  CONSTRAINT violation_ticket_fk FOREIGN KEY(ticket_id) REFERENCES violation_ticket(ticket_id)
);

-- view for latest registration per vehicle
CREATE VIEW latest_registration_vu AS SELECT r.* FROM registration r JOIN (
  SELECT plate_number, MAX(registration_date) AS max_reg_date
  FROM registration
  GROUP BY plate_number
) veh ON r.plate_number = veh.plate_number AND r.registration_date = veh.max_reg_date;

-- Dummy data setup
-- 1. Insert into driver
-- Includes D06-11-009385 (Professional, Valid, Male, Age between 18-60) to satisfy Query 1, 2, and 5
-- Includes suspended/expired drivers to satisfy Query 4
INSERT INTO driver VALUES 
('D06-11-009385', 'Professional', 'Juan', 'Perez', 'Dela Cruz', 'M', '1985-06-15', 'valid', '2030-01-01', '2020-01-01'),
('A01-22-111111', 'Non-Professional', 'Maria', 'Santos', 'Clara', 'F', '1995-10-10', 'suspended', '2028-05-20', '2022-05-20'),
('B02-23-222222', 'Student Permit', 'Pedro', 'Reyes', 'Penduko', 'M', '2005-12-01', 'expired', '2024-12-01', '2023-12-01');

-- 2. Insert into driver_has_address
INSERT INTO driver_has_address VALUES 
('D06-11-009385', '123 Rizal St., Manila City'),
('A01-22-111111', '456 Bonifacio Ave., Quezon City'),
('B02-23-222222', '789 Mabini St., Makati City');

-- 3. Insert into vehicle
-- ABC-1234 and XYZ-9876 are owned by D06-11-009385 to satisfy Query 2
INSERT INTO vehicle VALUES 
('ABC-1234', 'ENG001', 'CHAS001', 2018, 'Red', 'Vios', 'Toyota', 'private car', 'D06-11-009385'),
('XYZ-9876', 'ENG002', 'CHAS002', 2020, 'Black', 'Civic', 'Honda', 'private car', 'D06-11-009385'),
('DEF-5678', 'ENG003', 'CHAS003', 2015, 'White', 'Hiace', 'Toyota', 'public utility vehicle', 'A01-22-111111');

-- 4. Insert into registration
-- REG002 is set to expire before 2025-04-12 to satisfy Query 3
INSERT INTO registration VALUES 
('REG001', '2027-01-15', 'active', '2026-01-15', 'ABC-1234', 'ENG001', 'CHAS001'),
('REG002', '2024-03-01', 'expired', '2023-03-01', 'XYZ-9876', 'ENG002', 'CHAS002'),
('REG003', '2025-10-10', 'active', '2024-10-10', 'DEF-5678', 'ENG003', 'CHAS003');

-- 5. Insert into violation_ticket
-- TKT-001 is for D06-11-009385, happens in 2026, and in Quezon City to satisfy Queries 5, 6, and 7
INSERT INTO violation_ticket VALUES 
('TKT-001', '2026-05-20 14:30:00', 'unpaid', 'Commonwealth Ave, Quezon City', 'Officer Bato', 'D06-11-009385', 'ABC-1234', 'ENG001', 'CHAS001'),
('TKT-002', '2026-08-15 09:00:00', 'paid', 'EDSA, Quezon City', 'Officer Dalisay', 'A01-22-111111', 'DEF-5678', 'ENG003', 'CHAS003');

-- 6. Insert into violation
INSERT INTO violation VALUES 
('V-001', 'Overspeeding', 1500.00, 'TKT-001'),
('V-002', 'Reckless Driving', 2000.00, 'TKT-001'),
('V-003', 'Overspeeding', 1500.00, 'TKT-002');


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

