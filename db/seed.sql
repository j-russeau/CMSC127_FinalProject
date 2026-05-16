-- db/seed.sql
USE lto_ims;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE violation;
TRUNCATE TABLE violation_ticket;
TRUNCATE TABLE registration;
TRUNCATE TABLE vehicle;
TRUNCATE TABLE driver_has_address;
TRUNCATE TABLE driver;

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) DRIVERS
-- Coverage:
-- - Query 1: Professional + valid + M + age 18–60 (D06-11-009385, G07-18-777777)
-- - Query 4: expired/suspended/revoked drivers included
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO driver VALUES
('D06-11-009385','Professional','Juan','Perez','Dela Cruz','M','1985-06-15','valid','2030-01-01','2020-01-01'),
('D07-12-009386','Professional','Ana','Luna','Reyes','F','1990-02-20','valid','2029-02-20','2019-02-20'),
('A01-22-111111','Non-Professional','Maria','Santos','Clara','F','1995-10-10','suspended','2028-05-20','2022-05-20'),
('B02-23-222222','Student Permit','Pedro','Reyes','Penduko','M','2005-12-01','expired','2024-12-01','2023-12-01'),
('C03-20-333333','Non-Professional','Rogelio',NULL,'Cruz','M','1960-07-07','valid','2027-07-07','2022-07-07'),
('D04-21-444444','Professional','Ben',NULL,'Torres','M','1988-03-03','revoked','2026-03-03','2021-03-03'),
('E05-22-555555','Student Permit','Liza',NULL,'Garcia','F','2007-01-15','valid','2025-01-15','2024-01-15'),
('F06-19-666666','Non-Professional','Karla','M.','Lopez','F','1999-11-11','expired','2024-11-11','2019-11-11'),
('G07-18-777777','Professional','Mark',NULL,'Santos','M','2000-08-08','valid','2030-08-08','2020-08-08'),
('H08-17-888888','Non-Professional','Anthony',NULL,'Rojo','M','1978-04-04','valid','2028-04-04','2023-04-04'),
('I09-16-999999','Professional','Jericho',NULL,'Gabion','M','1982-09-09','suspended','2029-09-09','2019-09-09'),
('J10-15-000001','Student Permit','Lakeisha','Mae','Austria','F','2004-05-05','valid','2026-05-05','2025-05-05');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) ADDRESSES (multi-valued OK: (license_number, address) composite PK)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO driver_has_address VALUES
('D06-11-009385','123 Rizal St., Manila City'),
('D06-11-009385','Unit 4B, 88 Commonwealth Ave., Quezon City'),
('D07-12-009386','45 P. Burgos St., Cebu City'),
('A01-22-111111','456 Bonifacio Ave., Quezon City'),
('B02-23-222222','789 Mabini St., Makati City'),
('C03-20-333333','12 Aguinaldo Hwy, Cavite'),
('D04-21-444444','901 Lopez Jaena St., Iloilo City'),
('E05-22-555555','33 Rizal Ave., Davao City'),
('F06-19-666666','67 Quezon Ave., Quezon City'),
('G07-18-777777','88 Taft Ave., Manila City'),
('H08-17-888888','102 Session Rd., Baguio City'),
('I09-16-999999','77 EDSA, Mandaluyong City'),
('J10-15-000001','15 JP Laurel, Batangas City');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) VEHICLES
-- Coverage:
-- - Query 2: multiple vehicles owned by D06-11-009385
-- - Query 7: vehicles appear in tickets across multiple cities
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO vehicle VALUES
('ABC-1234','ENG001','CHAS001',2018,'Red','Vios','Toyota','private car','D06-11-009385'),
('XYZ-9876','ENG002','CHAS002',2020,'Black','Civic','Honda','private car','D06-11-009385'),
('QWE-4567','ENG004','CHAS004',2022,'White','Raize','Toyota','private car','D06-11-009385'),

('DEF-5678','ENG003','CHAS003',2015,'White','Hiace','Toyota','public utility vehicle','A01-22-111111'),
('GHI-1111','ENG005','CHAS005',2019,'Silver','Fortuner','Toyota','private car','D07-12-009386'),
('JKL-2222','ENG006','CHAS006',2017,'Blue','NMAX','Yamaha','motorcycle','C03-20-333333'),

('MNO-3333','ENG007','CHAS007',2016,'Gray','L300','Mitsubishi','utility vehicle','D04-21-444444'),
('PQR-4444','ENG008','CHAS008',2021,'Green','Click','Honda','motorcycle','E05-22-555555'),
('STU-5555','ENG009','CHAS009',2014,'White','Wigo','Toyota','private car','F06-19-666666'),

('VWX-6666','ENG010','CHAS010',2023,'Black','Navara','Nissan','pickup','G07-18-777777'),
('YZA-7777','ENG011','CHAS011',2020,'Red','Mirage','Mitsubishi','private car','H08-17-888888'),
('BCD-8888','ENG012','CHAS012',2019,'Blue','Aerox','Yamaha','motorcycle','I09-16-999999');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) REGISTRATIONS (history + latest view behavior)
-- Coverage:
-- - Query 3: expired latest registrations as of 2025-04-12:
--    XYZ-9876 latest exp 2025-03-01
--    DEF-5678 latest exp 2025-01-10
--    STU-5555 latest exp 2025-02-15
-- ─────────────────────────────────────────────────────────────────────────────

-- ABC-1234 (active latest)
INSERT INTO registration VALUES
('REG001','2027-01-15','active','2026-01-15','ABC-1234','ENG001','CHAS001'),
('REG015','2026-01-15','expired','2025-01-15','ABC-1234','ENG001','CHAS001');

-- XYZ-9876 (expired latest as of 2025-04-12)
INSERT INTO registration VALUES
('REG002','2024-03-01','expired','2023-03-01','XYZ-9876','ENG002','CHAS002'),
('REG004','2025-03-01','expired','2024-03-01','XYZ-9876','ENG002','CHAS002');

-- QWE-4567 (active)
INSERT INTO registration VALUES
('REG005','2026-06-20','active','2025-06-20','QWE-4567','ENG004','CHAS004');

-- DEF-5678 (expired latest as of 2025-04-12)
INSERT INTO registration VALUES
('REG003','2025-01-10','expired','2024-01-10','DEF-5678','ENG003','CHAS003');

-- Others (mix of active/expired)
INSERT INTO registration VALUES
('REG007','2027-02-02','active','2026-02-02','GHI-1111','ENG005','CHAS005'),
('REG008','2025-06-06','active','2024-06-06','JKL-2222','ENG006','CHAS006'),
('REG009','2024-12-12','expired','2023-12-12','MNO-3333','ENG007','CHAS007'),
('REG010','2027-03-03','active','2026-03-03','PQR-4444','ENG008','CHAS008'),
('REG011','2025-02-15','expired','2024-02-15','STU-5555','ENG009','CHAS009'),
('REG012','2027-08-08','active','2026-08-08','VWX-6666','ENG010','CHAS010'),
('REG013','2026-09-09','active','2025-09-09','YZA-7777','ENG011','CHAS011'),
('REG014','2025-07-07','active','2024-07-07','BCD-8888','ENG012','CHAS012');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) VIOLATION TICKETS
-- Coverage:
-- - Query 5: multiple tickets for D06 in 2026 (TKT-001,003,004)
-- - Query 6: multiple types in year 2026
-- - Query 7: multiple cities in issued_at (Quezon City, Manila, Cebu, Makati)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO violation_ticket VALUES
('TKT-001','2026-05-20 14:30:00','unpaid','Commonwealth Ave, Quezon City','Officer Bato','D06-11-009385','ABC-1234','ENG001','CHAS001'),
('TKT-002','2026-08-15 09:00:00','paid','EDSA, Quezon City','Officer Dalisay','A01-22-111111','DEF-5678','ENG003','CHAS003'),
('TKT-003','2026-06-01 10:00:00','unpaid','Quezon City','Officer A','D06-11-009385','ABC-1234','ENG001','CHAS001'),
('TKT-004','2026-02-10 08:20:00','contested','Taft Ave, Manila City','Officer Cruz','D06-11-009385','XYZ-9876','ENG002','CHAS002'),
('TKT-005','2026-03-15 19:10:00','unpaid','Commonwealth Ave, Quezon City','Officer Reyes','A01-22-111111','DEF-5678','ENG003','CHAS003'),
('TKT-006','2026-07-07 13:05:00','paid','Cebu City, Cebu','Officer Santos','D07-12-009386','GHI-1111','ENG005','CHAS005'),
('TKT-007','2026-11-22 22:10:00','unpaid','Quezon City, NCR','Officer Lim','C03-20-333333','JKL-2222','ENG006','CHAS006'),
('TKT-008','2025-12-30 09:45:00','paid','Quezon City, NCR','Officer Diaz','D06-11-009385','QWE-4567','ENG004','CHAS004'),
('TKT-009','2025-04-05 17:30:00','unpaid','Makati City, NCR','Officer Go','F06-19-666666','STU-5555','ENG009','CHAS009'),
('TKT-010','2024-09-09 11:00:00','paid','Manila City, NCR','Officer Pineda','H08-17-888888','YZA-7777','ENG011','CHAS011'),
('TKT-011','2026-08-18 07:40:00','contested','Makati City, NCR','Officer Uy','G07-18-777777','VWX-6666','ENG010','CHAS010');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) VIOLATIONS (must match violationCatalog.js names + fines)
-- IDs kept short (<= 20 chars)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO violation VALUES
('V-001','Overspeeding',1500.00,'TKT-001'),
('V-002','Reckless Driving',2000.00,'TKT-001'),
('V-020','No Seatbelt',1000.00,'TKT-001'),

('V-003','Overspeeding',1500.00,'TKT-002'),

('V-004','Overspeeding',1500.00,'TKT-003'),
('V-005','Illegal Parking',500.00,'TKT-003'),

('V-006','Beating the Red Light',1500.00,'TKT-004'),

('V-007','No Helmet',1000.00,'TKT-005'),
('V-008','Using Mobile Phone While Driving',1000.00,'TKT-005'),

('V-009','Driving Without License',3000.00,'TKT-006'),

('V-010','Smoke Belching',2000.00,'TKT-007'),
('V-011','Defective Lights',500.00,'TKT-007'),
('V-021','Counterflow',2000.00,'TKT-007'),

('V-012','Improper Overtaking',1000.00,'TKT-008'),

('V-013','Illegal Parking',500.00,'TKT-009'),

('V-014','Reckless Driving',2000.00,'TKT-010'),

('V-015','Overspeeding',1500.00,'TKT-011'),
('V-016','Using Mobile Phone While Driving',1000.00,'TKT-011'),
('V-017','Illegal Parking',500.00,'TKT-011'),
('V-022','Failure to Carry OR/CR',1000.00,'TKT-011');