// ─────────────────────────────────────────────────────────────────────────────
// api/registrations.js — Vehicle registration API wrappers
// Thin functions over the base client — keeps route strings out of components.
// ─────────────────────────────────────────────────────────────────────────────

import { API_BASE, apiGet, apiGetRaw, apiPost, apiDelete } from "./client";

// Fetch all registrations, or pass a plate number to fetch one vehicle's history.
export function listRegistrations(plateNumber = "") {
  const qs = plateNumber ? `?plate_number=${encodeURIComponent(plateNumber)}` : "";
  return apiGet(`/api/registrations${qs}`);
}

// Fetch all registrations with SQL metadata.
// Used by Registrations.jsx because the </> button must show the exact SQL used.
export function listRegistrationsRaw(plateNumber = "") {
  const qs = plateNumber ? `?plate_number=${encodeURIComponent(plateNumber)}` : "";
  return apiGetRaw(`/api/registrations${qs}`);
}

// Fetch the latest registration record for one vehicle.
export function getLatestRegistration(plateNumber) {
  return apiGet(`/api/registrations/latest?plate_number=${encodeURIComponent(plateNumber)}`);
}

// Fetch the latest registration record with SQL metadata.
export function getLatestRegistrationRaw(plateNumber) {
  return apiGetRaw(`/api/registrations/latest?plate_number=${encodeURIComponent(plateNumber)}`);
}

// Create a new registration/renewal.
// payload shape: { registration_number, expiration_date, registration_status,
//                  registration_date, plate_number, engine_number, chassis_number }
export function createRegistration(payload) {
  return apiPost("/api/registrations", payload);
}

// Create a new registration/renewal and keep SQL metadata.
// This is local here so client.js does not need to be changed.
export async function createRegistrationRaw(payload) {
  const res = await fetch(`${API_BASE}/api/registrations`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Request failed");
  return json;
}

// Delete a registration by registration number.
export function deleteRegistration(registrationNumber) {
  return apiDelete(`/api/registrations/${encodeURIComponent(registrationNumber)}`);
}