-- db/seed.sql
USE lto_db;

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