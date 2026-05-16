import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export function listVehicles() {
  return apiGet("/api/vehicles");
}

export function createVehicle(payload) {
  return apiPost("/api/vehicles", payload);
}

// Update editable (non-key) fields for an existing vehicle.
// plate_number, engine_number, chassis_number are NOT sent — they are the composite FK key.
// payload shape: { make, model, year, color, vehicle_type, owner_license_number }
export function updateVehicle(plateNumber, payload) {
  return apiPut(`/api/vehicles/${encodeURIComponent(plateNumber)}`, payload);
}

export function deleteVehicle(plateNumber) {
  return apiDelete(`/api/vehicles/${encodeURIComponent(plateNumber)}`);
}

// Async search API wrapper
export function searchVehicles(q, limit = 10) {
  return apiGet(`/api/vehicles/search?q=${encodeURIComponent(q)}&limit=${limit}`);
}