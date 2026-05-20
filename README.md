# LTO IMS — Information Management System

A full-stack Information Management System for managing Land Transportation Office (LTO)-style records, including drivers, vehicles, registrations, violation tickets, violations, and reports.

This project was built for **CMSC 127** as a database-driven application using **React**, **Node.js/Express**, and **MySQL**.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Database Design](#database-design)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Core Modules](#core-modules)
- [Validation and Edge Case Handling](#validation-and-edge-case-handling)
- [Security Notes](#security-notes)
- [Demo Testing Checklist](#demo-testing-checklist)
- [Team Members](#team-members)

---

## Project Overview

The **LTO IMS** is a web-based system designed to manage records related to drivers, vehicles, registrations, and traffic violations.

The system supports CRUD operations, relational data validation, transaction-safe ticket creation, registration history tracking, and report generation.

Main entities include:

- Drivers
- Driver addresses
- Vehicles
- Vehicle registrations
- Violation tickets
- Violations
- Reports and dashboard summaries

---

## Features

### Dashboard

- Displays total drivers
- Displays total vehicles
- Displays unpaid tickets
- Displays expired registrations
- Shows recent violation tickets
- Shows registrations expiring soon
- Uses formatted dates and status indicators
- Uses a dark blue dashboard design with React icons

### Driver Management

- Add, view, edit, and delete drivers
- Supports multiple addresses per driver
- Validates license type, sex, status, birth date, issuance date, and expiration date
- Blocks deletion when the driver owns vehicles or has violation tickets
- Cascades driver address deletion when a driver is deleted

### Vehicle Management

- Add, view, edit, and delete vehicles
- Validates plate number, engine number, chassis number, year, color, make, model, type, and owner
- Prevents duplicate plate, engine, and chassis numbers
- Blocks deletion if a vehicle has registration history or violation tickets
- Prevents editing vehicle identity fields once created

### Registration Management

- Add registration and renewal records
- View latest/current registration per vehicle
- View full registration history
- Validates expiration date, registration date, status, and vehicle identity
- Prevents more than one active registration per vehicle
- Disables deletion of registration records for audit/history safety

### Violation Ticket Management

- Create violation tickets with one or more violations
- Ticket and violations are inserted atomically in one transaction
- If one violation insert fails, the entire ticket creation rolls back
- Validates driver reference and vehicle reference
- Validates ticket date/time, location length, status, and duplicate IDs
- Allows status updates only
- Prevents invalid status transitions such as paid → unpaid
- Prevents deletion of tickets because tickets are historical records
- Includes a regenerate ticket ID button in case a duplicate ID is generated

### Violation Management

- Uses a violation catalog
- Automatically matches violation fine amounts to catalog values
- Prevents invalid violation names
- Prevents duplicate violation IDs
- Prevents duplicate violation types inside one ticket
- Prevents deleting the last violation on a ticket

### Reports

- Supports summary and filtered report views
- Uses query-based reporting over driver, vehicle, registration, and violation data
- Designed for demo and database query presentation

---

## Tech Stack

### Frontend

- React
- Vite
- React Router
- React Icons
- CSS modules/page-specific CSS
- Fetch API

### Backend

- Node.js
- Express.js
- MySQL2
- REST API routes
- Parameterized SQL queries
- Transaction handling

### Database

- MySQL
- SQL DDL
- SQL seed data
- SQL views
- Foreign keys
- Check constraints
- Unique constraints
- Generated column for active-registration enforcement

---

## Database Design

The database is named:

```sql
lto_ims