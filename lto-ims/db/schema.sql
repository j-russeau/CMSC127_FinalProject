-- schema.sql
DROP DATABASE IF EXISTS lto_db;
CREATE DATABASE lto_db;
USE lto_db;

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