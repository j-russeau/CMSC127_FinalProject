// ─────────────────────────────────────────────────────────────────────────────
// api/reports.js — Report API wrappers
// Uses apiGetRaw because report routes return { ok, sql, data }.
// ─────────────────────────────────────────────────────────────────────────────

import { apiGetRaw } from "./client";

function qs(params) {
  return new URLSearchParams(params).toString();
}

// R1: Drivers filtered by license type, status, sex, and age range
export function reportDriversFiltered({ type, status, sex, min, max }) {
  return apiGetRaw(`/api/reports/drivers?${qs({ type, status, sex, min, max })}`);
}

// R2: Vehicles owned by a given driver
export function reportVehiclesByDriver(license) {
  return apiGetRaw(`/api/reports/vehicles?${qs({ license })}`);
}

// R3: Vehicles with expired latest registrations as of a given date
export function reportExpiredRegistrations(date) {
  return apiGetRaw(`/api/reports/expired-registrations?${qs({ date })}`);
}

// R4: Drivers with expired or suspended licenses
export function reportExpiredDrivers() {
  return apiGetRaw("/api/reports/expired-drivers");
}

// R5: Violations committed by a given driver within a date range
export function reportViolationsByDriver({ license, start, end }) {
  return apiGetRaw(`/api/reports/violations?${qs({ license, start, end })}`);
}

// R6: Total number of violations per violation type for a given year
export function reportViolationCount(year) {
  return apiGetRaw(`/api/reports/violation-count?${qs({ year })}`);
}

// R7: Vehicles involved in violations within a given city or region
export function reportVehiclesByRegion(region) {
  return apiGetRaw(`/api/reports/vehicles-region?${qs({ region })}`);
}
