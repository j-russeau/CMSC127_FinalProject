// ─────────────────────────────────────────────────────────────────────────────
// api/drivers.js — Driver API wrappers
// Thin functions over the base client — keeps route strings out of components.
// ─────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiDelete } from "./client";

// Fetch all drivers (with aggregated addresses) from the backend
export function listDrivers() {
  return apiGet("/api/drivers");
}

// Create a new driver record.
// payload shape: { license_number, license_type, first_name, middle_name?,
//                  last_name, sex, date_of_birth, license_status,
//                  license_issuance_date, license_expiration_date,
//                  addresses?: string[] }
export function createDriver(payload) {
  return apiPost("/api/drivers", payload);
}

// Delete a driver by license number.
// Will fail (409) if the driver still has linked vehicles or violation tickets.
export function deleteDriver(licenseNumber) {
  return apiDelete(`/api/drivers/${encodeURIComponent(licenseNumber)}`);
}
