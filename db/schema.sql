-- schema.sql
DROP DATABASE IF EXISTS lto_ims;
CREATE DATABASE lto_ims;
USE lto_ims;

-- DRIVER
CREATE TABLE driver (
  license_number VARCHAR(20),
  license_type VARCHAR(20) NOT NULL,  -- Student Permit / Non-Professional / Professional
  first_name VARCHAR(50) NOT NULL,
  middle_name VARCHAR(50),
  last_name VARCHAR(50) NOT NULL,
  sex CHAR(1) NOT NULL, -- M/F
  date_of_birth DATE NOT NULL,
  license_status VARCHAR(20) NOT NULL,  -- valid/expired/suspended/revoked
  license_expiration_date DATE NOT NULL,
  license_issuance_date DATE NOT NULL,

  CONSTRAINT driver_license_number_pk PRIMARY KEY(license_number),
  CONSTRAINT driver_license_type_chk CHECK (license_type IN ('Student Permit', 'Non-Professional', 'Professional')),
  CONSTRAINT driver_sex_chk CHECK (sex IN ('M', 'F')),
  CONSTRAINT driver_license_status_chk CHECK (license_status IN ('valid', 'expired', 'suspended', 'revoked')),
  CONSTRAINT driver_license_dates_chk CHECK (
    (
      license_type = 'Student Permit'
      AND license_expiration_date = DATE_ADD(license_issuance_date, INTERVAL 1 YEAR)
    )
    OR
    (
      license_type IN ('Non-Professional', 'Professional')
      AND license_expiration_date = DATE_ADD(license_issuance_date, INTERVAL 5 YEAR)
    )
  )
);

-- DRIVER_HAS_ADDRESS
CREATE TABLE driver_has_address (
  license_number VARCHAR(20),
  address VARCHAR(500) NOT NULL,

  CONSTRAINT driver_has_address_pk PRIMARY KEY(license_number, address),
  CONSTRAINT driver_license_number_fk
    FOREIGN KEY(license_number)
    REFERENCES driver(license_number)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
);

-- VEHICLE
CREATE TABLE vehicle (
  plate_number VARCHAR(15),
  engine_number VARCHAR(30) NOT NULL,
  chassis_number VARCHAR(30) NOT NULL,
  `year` INT NOT NULL,
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

  CONSTRAINT vehicle_year_chk CHECK (`year` BETWEEN 1900 AND 2100),
  CONSTRAINT vehicle_type_chk CHECK (
    vehicle_type IN ('Sedan', 'SUV', 'Pickup Truck', 'Van', 'Motorcycle', 'Bus', 'Truck')
  ),

  CONSTRAINT vehicle_owner_fk
    FOREIGN KEY(owner_license_number)
    REFERENCES driver(license_number)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
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

  -- Allows only one ACTIVE registration per vehicle.
  -- Expired/suspended rows produce NULL here, and MySQL allows many NULLs in UNIQUE indexes.
  active_vehicle_key VARCHAR(100)
    GENERATED ALWAYS AS (
      CASE
        WHEN registration_status = 'active'
        THEN CONCAT(plate_number, '|', engine_number, '|', chassis_number)
        ELSE NULL
      END
    ) STORED,

  CONSTRAINT registration_number_pk PRIMARY KEY(registration_number),

  CONSTRAINT registration_status_chk
    CHECK (registration_status IN ('active', 'expired', 'suspended')),

  CONSTRAINT registration_dates_chk
    CHECK (expiration_date > registration_date),

  CONSTRAINT registration_active_vehicle_uk UNIQUE(active_vehicle_key),

  CONSTRAINT registration_vehicle_fk
    FOREIGN KEY(plate_number, engine_number, chassis_number)
    REFERENCES vehicle(plate_number, engine_number, chassis_number)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
);

-- VIOLATION_TICKET
CREATE TABLE violation_ticket (
  ticket_id VARCHAR(20),
  `datetime` DATETIME NOT NULL,
  violation_status VARCHAR(20) NOT NULL,
  issued_at VARCHAR(100) NOT NULL,
  apprehending_officer VARCHAR(80),

  -- f keys
  license_number VARCHAR(20) NOT NULL,
  plate_number VARCHAR(15) NOT NULL,
  engine_number VARCHAR(30) NOT NULL,
  chassis_number VARCHAR(30) NOT NULL,

  CONSTRAINT violation_ticket_pk PRIMARY KEY(ticket_id),

  CONSTRAINT vt_status_chk
    CHECK (violation_status IN ('paid', 'unpaid', 'contested')),

  CONSTRAINT vt_driver_fk
    FOREIGN KEY(license_number)
    REFERENCES driver(license_number)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,

  CONSTRAINT vt_vehicle_fk
    FOREIGN KEY(plate_number, engine_number, chassis_number)
    REFERENCES vehicle(plate_number, engine_number, chassis_number)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
);

-- VIOLATION
CREATE TABLE violation (
  violation_id VARCHAR(20),
  name VARCHAR(80) NOT NULL,
  corresponding_fine_amount DECIMAL(10,2) NOT NULL,

  -- f key
  ticket_id VARCHAR(20) NOT NULL,

  CONSTRAINT violation_pk PRIMARY KEY(violation_id),

  CONSTRAINT violation_fine_chk
    CHECK (corresponding_fine_amount >= 0),

  -- Prevents the same violation type from appearing twice in one ticket
  CONSTRAINT violation_ticket_name_uk UNIQUE(ticket_id, name),

  CONSTRAINT violation_ticket_fk
    FOREIGN KEY(ticket_id)
    REFERENCES violation_ticket(ticket_id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
);