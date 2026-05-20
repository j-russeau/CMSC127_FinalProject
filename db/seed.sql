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

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 1) DRIVERS
-- Coverage:
-- - Report 1 has multiple Professional, valid, male drivers aged 18-60.
-- - Report 4 has expired, suspended, and revoked licenses.
-- - Some "valid" licenses are near expiry to make date-sensitive UI realistic.
-- ---------------------------------------------------------------------------
INSERT INTO driver
  (license_number, license_type, first_name, middle_name, last_name, sex,
   date_of_birth, license_status, license_expiration_date, license_issuance_date)
VALUES
('D06-11-009385','Professional','Juan','Perez','Dela Cruz','M','1985-06-15','valid','2030-01-01','2025-01-01'),
('D07-12-009386','Professional','Ana','Luna','Reyes','F','1990-02-20','valid','2029-02-20','2024-02-20'),
('A01-22-111111','Non-Professional','Maria','Santos','Clara','F','1995-10-10','suspended','2028-05-20','2023-05-20'),
('B02-23-222222','Student Permit','Pedro','Reyes','Penduko','M','2005-12-01','expired','2024-12-01','2023-12-01'),
('C03-20-333333','Non-Professional','Rogelio',NULL,'Cruz','M','1960-07-07','valid','2027-07-07','2022-07-07'),
('D04-21-444444','Professional','Ben',NULL,'Torres','M','1988-03-03','revoked','2027-03-03','2022-03-03'),
('E05-22-555555','Student Permit','Liza',NULL,'Garcia','F','2007-01-15','expired','2025-01-15','2024-01-15'),
('F06-19-666666','Non-Professional','Karla','M.','Lopez','F','1999-11-11','expired','2024-11-11','2019-11-11'),
('G07-18-777777','Professional','Mark',NULL,'Santos','M','2000-08-08','valid','2030-08-08','2025-08-08'),
('H08-17-888888','Non-Professional','Anthony',NULL,'Rojo','M','1978-04-04','valid','2028-04-04','2023-04-04'),
('I09-16-999999','Professional','Jericho',NULL,'Gabion','M','1982-09-09','suspended','2029-09-09','2024-09-09'),
('J10-15-000001','Student Permit','Lakeisha','Mae','Austria','F','2004-05-05','valid','2027-05-05','2026-05-05'),
('K11-14-000002','Professional','Sofia','Ramos','Mendoza','F','1992-12-12','valid','2031-05-12','2026-05-12'),
('L12-13-000003','Non-Professional','Noel','Dizon','Bautista','M','1975-01-30','valid','2027-01-30','2022-01-30'),
('M13-12-000004','Professional','Carlo','Vega','Villanueva','M','1970-06-18','expired','2025-06-18','2020-06-18'),
('N14-11-000005','Professional','Patricia','Uy','Flores','F','1987-09-25','suspended','2028-09-25','2023-09-25'),
('O15-10-000006','Student Permit','Miguel','Lim','Navarro','M','2006-04-14','valid','2027-04-14','2026-04-14'),
('P16-09-000007','Non-Professional','Rosa','Cruz','Aquino','F','1968-02-02','valid','2026-12-31','2021-12-31'),
('Q17-08-000008','Professional','Victor','Tan','Lim','M','1998-07-19','valid','2030-07-19','2025-07-19'),
('R18-07-000009','Non-Professional','Nina','Sy','Tan','F','1983-11-27','revoked','2027-11-27','2022-11-27'),
('S19-06-000010','Professional','Arnel','Diaz','Ramos','M','1991-03-08','valid','2030-03-08','2025-03-08'),
('T20-05-000011','Professional','Bianca','Lee','Sy','F','1996-08-21','valid','2030-08-21','2025-08-21');

-- ---------------------------------------------------------------------------
-- 2) DRIVER ADDRESSES
-- Multi-valued addresses are included for several drivers.
-- ---------------------------------------------------------------------------
INSERT INTO driver_has_address (license_number, address) VALUES
('D06-11-009385','123 Rizal St., Manila City'),
('D06-11-009385','Unit 4B, 88 Commonwealth Ave., Quezon City'),
('D07-12-009386','45 P. Burgos St., Cebu City'),
('D07-12-009386','21 Mango Ave., Cebu City'),
('A01-22-111111','456 Bonifacio Ave., Quezon City'),
('B02-23-222222','789 Mabini St., Makati City'),
('C03-20-333333','12 Aguinaldo Hwy, Cavite'),
('D04-21-444444','901 Lopez Jaena St., Iloilo City'),
('E05-22-555555','33 Rizal Ave., Davao City'),
('F06-19-666666','67 Quezon Ave., Quezon City'),
('G07-18-777777','88 Taft Ave., Manila City'),
('H08-17-888888','102 Session Rd., Baguio City'),
('I09-16-999999','77 EDSA, Mandaluyong City'),
('J10-15-000001','15 JP Laurel, Batangas City'),
('K11-14-000002','14 Katipunan Ave., Quezon City'),
('K11-14-000002','Greenbelt Residences, Makati City'),
('L12-13-000003','230 Ortigas Ave., Pasig City'),
('M13-12-000004','61 Governor Drive, Dasmarinas, Cavite'),
('N14-11-000005','89 Matina Crossing, Davao City'),
('O15-10-000006','72 Lacson St., Bacolod City'),
('P16-09-000007','19 Leonard Wood Rd., Baguio City'),
('Q17-08-000008','41 BGC 5th Ave., Taguig City'),
('R18-07-000009','55 Boni Ave., Mandaluyong City'),
('S19-06-000010','11 Osmena Blvd., Cebu City'),
('T20-05-000011','27 M.H. del Pilar St., Manila City');

-- ---------------------------------------------------------------------------
-- 3) VEHICLES
-- Coverage:
-- - Report 2: D06-11-009385 owns three vehicles.
-- - Report 7: vehicles appear in tickets across NCR, Cebu, Davao, Baguio,
--   Batangas, Cavite, Iloilo, and Bulacan locations.
-- ---------------------------------------------------------------------------
INSERT INTO vehicle
  (plate_number, engine_number, chassis_number, `year`, color, model, make,
   vehicle_type, owner_license_number)
VALUES
('ABC-1234','ENG-2018-001','CHS-2018-001',2018,'Red','Vios','Toyota','Sedan','D06-11-009385'),
('XYZ-9876','ENG-2020-002','CHS-2020-002',2020,'Black','Civic','Honda','Sedan','D06-11-009385'),
('QWE-4567','ENG-2022-004','CHS-2022-004',2022,'White','Raize','Toyota','SUV','D06-11-009385'),
('DEF-5678','ENG-2015-003','CHS-2015-003',2015,'White','Hiace','Toyota','Van','A01-22-111111'),
('GHI-1111','ENG-2019-005','CHS-2019-005',2019,'Silver','Fortuner','Toyota','SUV','D07-12-009386'),
('JKL-2222','ENG-2017-006','CHS-2017-006',2017,'Blue','NMAX','Yamaha','Motorcycle','C03-20-333333'),
('MNO-3333','ENG-2016-007','CHS-2016-007',2016,'Gray','L300','Mitsubishi','Van','D04-21-444444'),
('PQR-4444','ENG-2021-008','CHS-2021-008',2021,'Green','Click','Honda','Motorcycle','E05-22-555555'),
('STU-5555','ENG-2014-009','CHS-2014-009',2014,'White','Wigo','Toyota','Sedan','F06-19-666666'),
('VWX-6666','ENG-2023-010','CHS-2023-010',2023,'Black','Navara','Nissan','Pickup Truck','G07-18-777777'),
('YZA-7777','ENG-2020-011','CHS-2020-011',2020,'Red','Mirage','Mitsubishi','Sedan','H08-17-888888'),
('BCD-8888','ENG-2019-012','CHS-2019-012',2019,'Blue','Aerox','Yamaha','Motorcycle','I09-16-999999'),
('CDE-9012','ENG-2021-013','CHS-2021-013',2021,'White','Innova','Toyota','Van','K11-14-000002'),
('EFG-2345','ENG-2018-014','CHS-2018-014',2018,'Gray','City','Honda','Sedan','L12-13-000003'),
('HIJ-3456','ENG-2024-015','CHS-2024-015',2024,'Blue','Yaris Cross','Toyota','SUV','K11-14-000002'),
('KLM-4567','ENG-2016-016','CHS-2016-016',2016,'Yellow','Canter','Fuso','Truck','M13-12-000004'),
('NOP-5678','ENG-2022-017','CHS-2022-017',2022,'Orange','Burgman','Suzuki','Motorcycle','N14-11-000005'),
('QRS-6789','ENG-2020-018','CHS-2020-018',2020,'White','Xpander','Mitsubishi','Van','P16-09-000007'),
('TUV-7890','ENG-2019-019','CHS-2019-019',2019,'Black','Ranger','Ford','Pickup Truck','Q17-08-000008'),
('WXY-8901','ENG-2017-020','CHS-2017-020',2017,'Red','Almera','Nissan','Sedan','R18-07-000009'),
('ZAB-9012','ENG-2023-021','CHS-2023-021',2023,'Silver','Corolla Cross','Toyota','SUV','S19-06-000010'),
('CBA-1122','ENG-2022-022','CHS-2022-022',2022,'Black','XMAX','Yamaha','Motorcycle','T20-05-000011'),
('LTO-2026','ENG-2026-023','CHS-2026-023',2026,'White','Vios','Toyota','Sedan','D07-12-009386'),
('NCR-4321','ENG-2021-024','CHS-2021-024',2021,'Green','Urvan','Nissan','Van','I09-16-999999'),
('CEB-2468','ENG-2020-025','CHS-2020-025',2020,'Blue','Raider','Suzuki','Motorcycle','B02-23-222222'),
('DVO-1357','ENG-2018-026','CHS-2018-026',2018,'Black','Montero','Mitsubishi','SUV','O15-10-000006');

-- ---------------------------------------------------------------------------
-- 4) REGISTRATION HISTORY
-- Rich registration history is the main purpose of this seed.
-- - Latest registrations are selected by MAX(registration_date) in
--   latest_registration_vu.
-- - Several vehicles have expired latest registrations.
-- - Several vehicles expire within 30 days of 2026-05-19 for the dashboard.
-- ---------------------------------------------------------------------------
INSERT INTO registration
  (registration_number, expiration_date, registration_status, registration_date,
   plate_number, engine_number, chassis_number)
VALUES
-- ABC-1234: long clean renewal history, active latest
('REG-20220115-LT7Z','2023-01-15','expired','2022-01-15','ABC-1234','ENG-2018-001','CHS-2018-001'),
('REG-20230115-WR2I','2024-01-15','expired','2023-01-15','ABC-1234','ENG-2018-001','CHS-2018-001'),
('REG-20240115-A9Q4','2025-01-15','expired','2024-01-15','ABC-1234','ENG-2018-001','CHS-2018-001'),
('REG-20250115-B6MN','2026-01-15','expired','2025-01-15','ABC-1234','ENG-2018-001','CHS-2018-001'),
('REG-20260115-C3RX','2027-01-15','active','2026-01-15','ABC-1234','ENG-2018-001','CHS-2018-001'),

-- XYZ-9876: missed 2025/2026 renewal, expired latest
('REG-20210301-D8KP','2022-03-01','expired','2021-03-01','XYZ-9876','ENG-2020-002','CHS-2020-002'),
('REG-20220301-E2VH','2023-03-01','expired','2022-03-01','XYZ-9876','ENG-2020-002','CHS-2020-002'),
('REG-20230301-F5TY','2024-03-01','expired','2023-03-01','XYZ-9876','ENG-2020-002','CHS-2020-002'),
('REG-20240301-G7LC','2025-03-01','expired','2024-03-01','XYZ-9876','ENG-2020-002','CHS-2020-002'),

-- QWE-4567: active, renewed mid-year
('REG-20230620-H1NS','2024-06-20','expired','2023-06-20','QWE-4567','ENG-2022-004','CHS-2022-004'),
('REG-20240620-J4PD','2025-06-20','expired','2024-06-20','QWE-4567','ENG-2022-004','CHS-2022-004'),
('REG-20250620-K9ZE','2026-06-20','active','2025-06-20','QWE-4567','ENG-2022-004','CHS-2022-004'),

-- DEF-5678: expired PUV latest
('REG-20220110-L2QA','2023-01-10','expired','2022-01-10','DEF-5678','ENG-2015-003','CHS-2015-003'),
('REG-20230110-M6WV','2024-01-10','expired','2023-01-10','DEF-5678','ENG-2015-003','CHS-2015-003'),
('REG-20240110-N3BX','2025-01-10','expired','2024-01-10','DEF-5678','ENG-2015-003','CHS-2015-003'),

-- GHI-1111: active latest
('REG-20230202-P8RF','2024-02-02','expired','2023-02-02','GHI-1111','ENG-2019-005','CHS-2019-005'),
('REG-20240202-Q5YU','2025-02-02','expired','2024-02-02','GHI-1111','ENG-2019-005','CHS-2019-005'),
('REG-20250202-R1CM','2026-02-02','expired','2025-02-02','GHI-1111','ENG-2019-005','CHS-2019-005'),
('REG-20260202-S7DN','2027-02-02','active','2026-02-02','GHI-1111','ENG-2019-005','CHS-2019-005'),

-- JKL-2222: expires soon around the 2026 demo date
('REG-20230606-T4HL','2024-06-06','expired','2023-06-06','JKL-2222','ENG-2017-006','CHS-2017-006'),
('REG-20240606-U9JK','2025-06-06','expired','2024-06-06','JKL-2222','ENG-2017-006','CHS-2017-006'),
('REG-20250606-V2GS','2026-06-06','active','2025-06-06','JKL-2222','ENG-2017-006','CHS-2017-006'),

-- MNO-3333: old utility vehicle, expired latest
('REG-20211212-W6XA','2022-12-12','expired','2021-12-12','MNO-3333','ENG-2016-007','CHS-2016-007'),
('REG-20221212-X3PE','2023-12-12','expired','2022-12-12','MNO-3333','ENG-2016-007','CHS-2016-007'),
('REG-20231212-Y8TR','2024-12-12','expired','2023-12-12','MNO-3333','ENG-2016-007','CHS-2016-007'),

-- PQR-4444: active motorcycle
('REG-20240303-Z5NB','2025-03-03','expired','2024-03-03','PQR-4444','ENG-2021-008','CHS-2021-008'),
('REG-20250303-A2FC','2026-03-03','expired','2025-03-03','PQR-4444','ENG-2021-008','CHS-2021-008'),
('REG-20260303-B7LD','2027-03-03','active','2026-03-03','PQR-4444','ENG-2021-008','CHS-2021-008'),

-- STU-5555: expired latest
('REG-20220215-C4KM','2023-02-15','expired','2022-02-15','STU-5555','ENG-2014-009','CHS-2014-009'),
('REG-20230215-D9QY','2024-02-15','expired','2023-02-15','STU-5555','ENG-2014-009','CHS-2014-009'),
('REG-20240215-E6VP','2025-02-15','expired','2024-02-15','STU-5555','ENG-2014-009','CHS-2014-009'),

-- VWX-6666: active pickup
('REG-20240808-F3RW','2025-08-08','expired','2024-08-08','VWX-6666','ENG-2023-010','CHS-2023-010'),
('REG-20250808-G8TS','2026-08-08','active','2025-08-08','VWX-6666','ENG-2023-010','CHS-2023-010'),

-- YZA-7777: active
('REG-20230909-H5UN','2024-09-09','expired','2023-09-09','YZA-7777','ENG-2020-011','CHS-2020-011'),
('REG-20240909-J2BC','2025-09-09','expired','2024-09-09','YZA-7777','ENG-2020-011','CHS-2020-011'),
('REG-20250909-K7MD','2026-09-09','active','2025-09-09','YZA-7777','ENG-2020-011','CHS-2020-011'),

-- BCD-8888: expired latest, suspended-owner vehicle
('REG-20220707-L4NE','2023-07-07','expired','2022-07-07','BCD-8888','ENG-2019-012','CHS-2019-012'),
('REG-20230707-M9PF','2024-07-07','expired','2023-07-07','BCD-8888','ENG-2019-012','CHS-2019-012'),
('REG-20240707-N6QG','2025-07-07','expired','2024-07-07','BCD-8888','ENG-2019-012','CHS-2019-012'),

-- CDE-9012: expires soon
('REG-20220525-P3RH','2023-05-25','expired','2022-05-25','CDE-9012','ENG-2021-013','CHS-2021-013'),
('REG-20230525-Q8SJ','2024-05-25','expired','2023-05-25','CDE-9012','ENG-2021-013','CHS-2021-013'),
('REG-20240525-R5TK','2025-05-25','expired','2024-05-25','CDE-9012','ENG-2021-013','CHS-2021-013'),
('REG-20250525-S2UL','2026-05-25','active','2025-05-25','CDE-9012','ENG-2021-013','CHS-2021-013'),

-- EFG-2345: expires soon
('REG-20230615-T7VM','2024-06-15','expired','2023-06-15','EFG-2345','ENG-2018-014','CHS-2018-014'),
('REG-20240615-U4WN','2025-06-15','expired','2024-06-15','EFG-2345','ENG-2018-014','CHS-2018-014'),
('REG-20250615-V9XP','2026-06-15','active','2025-06-15','EFG-2345','ENG-2018-014','CHS-2018-014'),

-- HIJ-3456: new vehicle, current active registration
('REG-20240420-W6XA','2025-04-20','expired','2024-04-20','HIJ-3456','ENG-2024-015','CHS-2024-015'),
('REG-20250420-X3PE','2026-04-20','expired','2025-04-20','HIJ-3456','ENG-2024-015','CHS-2024-015'),
('REG-20260420-Y8TR','2027-04-20','active','2026-04-20','HIJ-3456','ENG-2024-015','CHS-2024-015'),

-- KLM-4567: truck with expired latest
('REG-20211001-Z5NB','2022-10-01','expired','2021-10-01','KLM-4567','ENG-2016-016','CHS-2016-016'),
('REG-20221001-A1EF','2023-10-01','expired','2022-10-01','KLM-4567','ENG-2016-016','CHS-2016-016'),
('REG-20231001-B6GH','2024-10-01','expired','2023-10-01','KLM-4567','ENG-2016-016','CHS-2016-016'),
('REG-20241001-C3JK','2025-10-01','expired','2024-10-01','KLM-4567','ENG-2016-016','CHS-2016-016'),

-- NOP-5678: expired recently
('REG-20230430-D8LM','2024-04-30','expired','2023-04-30','NOP-5678','ENG-2022-017','CHS-2022-017'),
('REG-20240430-E5NP','2025-04-30','expired','2024-04-30','NOP-5678','ENG-2022-017','CHS-2022-017'),
('REG-20250430-F2QR','2026-04-30','expired','2025-04-30','NOP-5678','ENG-2022-017','CHS-2022-017'),

-- QRS-6789: active latest
('REG-20240501-G7ST','2025-05-01','expired','2024-05-01','QRS-6789','ENG-2020-018','CHS-2020-018'),
('REG-20250501-H4UV','2026-05-01','expired','2025-05-01','QRS-6789','ENG-2020-018','CHS-2020-018'),
('REG-20260501-J9WX','2027-05-01','active','2026-05-01','QRS-6789','ENG-2020-018','CHS-2020-018'),

-- TUV-7890: active
('REG-20230701-K6YZ','2024-07-01','expired','2023-07-01','TUV-7890','ENG-2019-019','CHS-2019-019'),
('REG-20240701-L3A2','2025-07-01','expired','2024-07-01','TUV-7890','ENG-2019-019','CHS-2019-019'),
('REG-20250701-M8B4','2026-07-01','active','2025-07-01','TUV-7890','ENG-2019-019','CHS-2019-019'),

-- WXY-8901: expired latest
('REG-20220530-N5C6','2023-05-30','expired','2022-05-30','WXY-8901','ENG-2017-020','CHS-2017-020'),
('REG-20230530-P2D8','2024-05-30','expired','2023-05-30','WXY-8901','ENG-2017-020','CHS-2017-020'),
('REG-20240530-Q7E1','2025-05-30','expired','2024-05-30','WXY-8901','ENG-2017-020','CHS-2017-020'),

-- ZAB-9012: active
('REG-20240130-R4F3','2025-01-30','expired','2024-01-30','ZAB-9012','ENG-2023-021','CHS-2023-021'),
('REG-20250130-S9G5','2026-01-30','expired','2025-01-30','ZAB-9012','ENG-2023-021','CHS-2023-021'),
('REG-20260130-T6H7','2027-01-30','active','2026-01-30','ZAB-9012','ENG-2023-021','CHS-2023-021'),

-- CBA-1122: expires very soon
('REG-20230522-U3J9','2024-05-22','expired','2023-05-22','CBA-1122','ENG-2022-022','CHS-2022-022'),
('REG-20240522-V8K1','2025-05-22','expired','2024-05-22','CBA-1122','ENG-2022-022','CHS-2022-022'),
('REG-20250522-W5L3','2026-05-22','active','2025-05-22','CBA-1122','ENG-2022-022','CHS-2022-022'),

-- LTO-2026: new taxi
('REG-20260401-X2M5','2027-04-01','active','2026-04-01','LTO-2026','ENG-2026-023','CHS-2026-023'),

-- NCR-4321: expires on the 2026-05-19 demo date
('REG-20230519-Y7N7','2024-05-19','expired','2023-05-19','NCR-4321','ENG-2021-024','CHS-2021-024'),
('REG-20240519-Z4P9','2025-05-19','expired','2024-05-19','NCR-4321','ENG-2021-024','CHS-2021-024'),
('REG-20250519-A8Q1','2026-05-19','active','2025-05-19','NCR-4321','ENG-2021-024','CHS-2021-024'),

-- CEB-2468: expired latest
('REG-20221112-B5R3','2023-11-12','expired','2022-11-12','CEB-2468','ENG-2020-025','CHS-2020-025'),
('REG-20231112-C2S5','2024-11-12','expired','2023-11-12','CEB-2468','ENG-2020-025','CHS-2020-025'),
('REG-20241112-D7T7','2025-11-12','expired','2024-11-12','CEB-2468','ENG-2020-025','CHS-2020-025'),

-- DVO-1357: active
('REG-20231205-E4U9','2024-12-05','expired','2023-12-05','DVO-1357','ENG-2018-026','CHS-2018-026'),
('REG-20241205-F9V1','2025-12-05','expired','2024-12-05','DVO-1357','ENG-2018-026','CHS-2018-026'),
('REG-20251205-G6W3','2026-12-05','active','2025-12-05','DVO-1357','ENG-2018-026','CHS-2018-026');

-- ---------------------------------------------------------------------------
-- 5) VIOLATION TICKETS
-- Coverage:
-- - Report 5: D06-11-009385 has several 2026 tickets.
-- - Report 6: 2026 includes every violation catalog type at least once.
-- - Report 7: issued_at contains many searchable city/region strings.
-- ---------------------------------------------------------------------------
INSERT INTO violation_ticket
  (ticket_id, `datetime`, violation_status, issued_at, apprehending_officer,
   license_number, plate_number, engine_number, chassis_number)
VALUES
('TKT-20260518-Q8SJ','2026-05-18 14:30:00','unpaid','Commonwealth Ave, Quezon City, NCR','Officer Bato','D06-11-009385','ABC-1234','ENG-2018-001','CHS-2018-001'),
('TKT-20260517-R5TK','2026-05-17 09:00:00','paid','EDSA, Quezon City, NCR','Officer Dalisay','A01-22-111111','DEF-5678','ENG-2015-003','CHS-2015-003'),
('TKT-20260411-S2UL','2026-04-11 10:00:00','unpaid','Katipunan Ave, Quezon City, NCR','Officer Aquino','D06-11-009385','ABC-1234','ENG-2018-001','CHS-2018-001'),
('TKT-20260320-T7VM','2026-03-20 08:20:00','contested','Taft Ave, Manila City, NCR','Officer Cruz','D06-11-009385','XYZ-9876','ENG-2020-002','CHS-2020-002'),
('TKT-20260315-U4WN','2026-03-15 19:10:00','unpaid','Commonwealth Ave, Quezon City, NCR','Officer Reyes','A01-22-111111','DEF-5678','ENG-2015-003','CHS-2015-003'),
('TKT-20260228-V9XP','2026-02-28 13:05:00','paid','Osmena Blvd, Cebu City, Cebu','Officer Santos','D07-12-009386','GHI-1111','ENG-2019-005','CHS-2019-005'),
('TKT-20260215-W6YQ','2026-02-15 22:10:00','unpaid','Quezon Ave, Quezon City, NCR','Officer Lim','C03-20-333333','JKL-2222','ENG-2017-006','CHS-2017-006'),
('TKT-20251230-X3ZR','2025-12-30 09:45:00','paid','Mindanao Ave, Quezon City, NCR','Officer Diaz','D06-11-009385','QWE-4567','ENG-2022-004','CHS-2022-004'),
('TKT-20250405-Y8AB','2025-04-05 17:30:00','unpaid','Ayala Ave, Makati City, NCR','Officer Go','F06-19-666666','STU-5555','ENG-2014-009','CHS-2014-009'),
('TKT-20240909-Z5CD','2024-09-09 11:00:00','paid','Roxas Blvd, Manila City, NCR','Officer Pineda','H08-17-888888','YZA-7777','ENG-2020-011','CHS-2020-011'),
('TKT-20260112-A1EF','2026-01-12 07:40:00','contested','Buendia Ave, Makati City, NCR','Officer Uy','G07-18-777777','VWX-6666','ENG-2023-010','CHS-2023-010'),
('TKT-20260505-B6GH','2026-05-05 16:25:00','unpaid','Espana Blvd, Manila City, NCR','Officer Rivera','D06-11-009385','XYZ-9876','ENG-2020-002','CHS-2020-002'),
('TKT-20260422-C3JK','2026-04-22 06:50:00','paid','Aurora Blvd, Quezon City, NCR','Officer Santos','K11-14-000002','CDE-9012','ENG-2021-013','CHS-2021-013'),
('TKT-20260301-D8LM','2026-03-01 12:00:00','unpaid','Ortigas Ave, Pasig City, NCR','Officer Mariano','L12-13-000003','EFG-2345','ENG-2018-014','CHS-2018-014'),
('TKT-20260409-E5NP','2026-04-09 15:45:00','unpaid','Aguinaldo Hwy, Dasmarinas, Cavite','Officer Tolentino','M13-12-000004','KLM-4567','ENG-2016-016','CHS-2016-016'),
('TKT-20260502-F2QR','2026-05-02 20:05:00','paid','Matina Crossing, Davao City, Davao del Sur','Officer Garcia','N14-11-000005','NOP-5678','ENG-2022-017','CHS-2022-017'),
('TKT-20260205-G7ST','2026-02-05 10:30:00','unpaid','Session Rd, Baguio City, Benguet','Officer Ramos','P16-09-000007','QRS-6789','ENG-2020-018','CHS-2020-018'),
('TKT-20260510-H4UV','2026-05-10 18:15:00','paid','C5 Road, Taguig City, NCR','Officer Enriquez','Q17-08-000008','TUV-7890','ENG-2019-019','CHS-2019-019'),
('TKT-20251117-J9WX','2025-11-17 08:35:00','contested','Boni Ave, Mandaluyong City, NCR','Officer Co','R18-07-000009','WXY-8901','ENG-2017-020','CHS-2017-020'),
('TKT-20260125-K6YZ','2026-01-25 23:05:00','unpaid','Quezon Memorial Circle, Quezon City, NCR','Officer Velasco','D06-11-009385','QWE-4567','ENG-2022-004','CHS-2022-004'),
('TKT-20240314-L3A2','2024-03-14 09:15:00','paid','Mango Ave, Cebu City, Cebu','Officer Mercado','S19-06-000010','ZAB-9012','ENG-2023-021','CHS-2023-021'),
('TKT-20260512-M8B4','2026-05-12 07:20:00','unpaid','Del Pilar St, Manila City, NCR','Officer Bautista','T20-05-000011','CBA-1122','ENG-2022-022','CHS-2022-022'),
('TKT-20260418-N5C6','2026-04-18 11:40:00','paid','Quezon Ave, Quezon City, NCR','Officer Villar','D07-12-009386','LTO-2026','ENG-2026-023','CHS-2026-023'),
('TKT-20260327-P2D8','2026-03-27 17:55:00','unpaid','EDSA Shaw, Mandaluyong City, NCR','Officer Ang','I09-16-999999','NCR-4321','ENG-2021-024','CHS-2021-024'),
('TKT-20250819-Q7E1','2025-08-19 14:10:00','paid','Colon St, Cebu City, Cebu','Officer Chua','B02-23-222222','CEB-2468','ENG-2020-025','CHS-2020-025'),
('TKT-20260501-R4F3','2026-05-01 06:35:00','paid','JP Laurel Ave, Davao City, Davao del Sur','Officer Valencia','O15-10-000006','DVO-1357','ENG-2018-026','CHS-2018-026'),
('TKT-20260222-S9G5','2026-02-22 21:50:00','unpaid','JP Laurel Hwy, Batangas City, Batangas','Officer Luna','J10-15-000001','PQR-4444','ENG-2021-008','CHS-2021-008'),
('TKT-20250603-T6H7','2025-06-03 12:25:00','paid','Tandang Sora Ave, Quezon City, NCR','Officer Beltran','C03-20-333333','JKL-2222','ENG-2017-006','CHS-2017-006'),
('TKT-20241201-U3J9','2024-12-01 07:30:00','unpaid','Lopez Jaena St, Iloilo City, Iloilo','Officer Robles','D04-21-444444','MNO-3333','ENG-2016-007','CHS-2016-007'),
('TKT-20260430-V8K1','2026-04-30 13:15:00','unpaid','Chino Roces Ave, Makati City, NCR','Officer Castro','F06-19-666666','STU-5555','ENG-2014-009','CHS-2014-009'),
('TKT-20260509-W5L3','2026-05-09 09:05:00','paid','Kennon Rd, Baguio City, Benguet','Officer Padilla','H08-17-888888','YZA-7777','ENG-2020-011','CHS-2020-011'),
('TKT-20260319-X2M5','2026-03-19 18:45:00','contested','NLEX Bocaue, Bulacan','Officer Serrano','G07-18-777777','VWX-6666','ENG-2023-010','CHS-2023-010');

-- ---------------------------------------------------------------------------
-- 6) VIOLATIONS
-- Names and fines must match backend/src/constants/violationCatalog.js.
-- IDs are kept below VARCHAR(20).
-- ---------------------------------------------------------------------------
INSERT INTO violation
  (violation_id, name, corresponding_fine_amount, ticket_id)
VALUES
('V001','Overspeeding',1500.00,'TKT-20260518-Q8SJ'),
('V002','Reckless Driving',2000.00,'TKT-20260518-Q8SJ'),
('V003','No Seatbelt',1000.00,'TKT-20260518-Q8SJ'),
('V004','No Helmet',1000.00,'TKT-20260517-R5TK'),
('V005','Using Mobile Phone While Driving',1000.00,'TKT-20260517-R5TK'),
('V006','Overspeeding',1500.00,'TKT-20260411-S2UL'),
('V007','Illegal Parking',500.00,'TKT-20260411-S2UL'),
('V008','Beating the Red Light',1500.00,'TKT-20260320-T7VM'),
('V009','Disregarding Traffic Signs',1500.00,'TKT-20260320-T7VM'),
('V010','No Helmet',1000.00,'TKT-20260315-U4WN'),
('V011','Driving Without License',3000.00,'TKT-20260315-U4WN'),
('V012','Driving Without License',3000.00,'TKT-20260228-V9XP'),
('V013','Smoke Belching',2000.00,'TKT-20260215-W6YQ'),
('V014','Defective Lights',500.00,'TKT-20260215-W6YQ'),
('V015','Counterflow',2000.00,'TKT-20260215-W6YQ'),
('V016','Improper Overtaking',1000.00,'TKT-20251230-X3ZR'),
('V017','Illegal Parking',500.00,'TKT-20250405-Y8AB'),
('V018','Reckless Driving',2000.00,'TKT-20240909-Z5CD'),
('V019','Overspeeding',1500.00,'TKT-20260112-A1EF'),
('V020','Using Mobile Phone While Driving',1000.00,'TKT-20260112-A1EF'),
('V021','Illegal Parking',500.00,'TKT-20260112-A1EF'),
('V022','Failure to Carry OR/CR',1000.00,'TKT-20260112-A1EF'),
('V023','Obstruction',1000.00,'TKT-20260505-B6GH'),
('V024','Illegal U-Turn',1000.00,'TKT-20260505-B6GH'),
('V025','Overloading',1500.00,'TKT-20260422-C3JK'),
('V026','Failure to Carry OR/CR',1000.00,'TKT-20260422-C3JK'),
('V027','Illegal U-Turn',1000.00,'TKT-20260301-D8LM'),
('V028','Smoke Belching',2000.00,'TKT-20260409-E5NP'),
('V029','Overloading',1500.00,'TKT-20260409-E5NP'),
('V030','No Helmet',1000.00,'TKT-20260502-F2QR'),
('V031','No Seatbelt',1000.00,'TKT-20260502-F2QR'),
('V032','No Child Restraint',1000.00,'TKT-20260205-G7ST'),
('V033','Using Mobile Phone While Driving',1000.00,'TKT-20260205-G7ST'),
('V034','Counterflow',2000.00,'TKT-20260510-H4UV'),
('V035','Reckless Driving',2000.00,'TKT-20260510-H4UV'),
('V036','Illegal Passing',1500.00,'TKT-20251117-J9WX'),
('V037','Driving Under the Influence',5000.00,'TKT-20260125-K6YZ'),
('V038','Reckless Driving',2000.00,'TKT-20260125-K6YZ'),
('V039','Overspeeding',1500.00,'TKT-20240314-L3A2'),
('V040','Illegal Parking',500.00,'TKT-20260512-M8B4'),
('V041','Obstruction',1000.00,'TKT-20260512-M8B4'),
('V042','Disregarding Traffic Signs',1500.00,'TKT-20260418-N5C6'),
('V043','Failure to Carry OR/CR',1000.00,'TKT-20260327-P2D8'),
('V044','Defective Lights',500.00,'TKT-20260327-P2D8'),
('V045','No Helmet',1000.00,'TKT-20250819-Q7E1'),
('V046','No Seatbelt',1000.00,'TKT-20250819-Q7E1'),
('V047','Overspeeding',1500.00,'TKT-20260501-R4F3'),
('V048','Illegal Passing',1500.00,'TKT-20260501-R4F3'),
('V049','Driving Without License',3000.00,'TKT-20260222-S9G5'),
('V050','Beating the Red Light',1500.00,'TKT-20250603-T6H7'),
('V051','Smoke Belching',2000.00,'TKT-20241201-U3J9'),
('V052','Illegal Parking',500.00,'TKT-20260430-V8K1'),
('V053','Using Mobile Phone While Driving',1000.00,'TKT-20260430-V8K1'),
('V054','No Seatbelt',1000.00,'TKT-20260509-W5L3'),
('V055','Counterflow',2000.00,'TKT-20260319-X2M5'),
('V056','Obstruction',1000.00,'TKT-20260319-X2M5');

COMMIT;
