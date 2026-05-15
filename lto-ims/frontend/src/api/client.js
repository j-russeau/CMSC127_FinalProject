// ─────────────────────────────────────────────────────────────────────────────
// api/client.js — Base HTTP client
// All API modules (drivers, tickets, violations) import from here.
// Reads VITE_API_BASE from the environment so the backend URL is configurable.
// ─────────────────────────────────────────────────────────────────────────────

// Base URL for every API call — falls back to localhost during development
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

// Parse the response JSON and throw a readable error if the request failed.
// All routes return { ok: boolean, data?, error? } — this enforces that shape.
async function handle(res) {
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Request failed");
  return json.data;
}

// Parse the response JSON but keep the full payload.
// Used by Reports because report routes return both { sql, data }.
async function handleRaw(res) {
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Request failed");
  return json;
}

// Send a GET request and return the parsed data payload
export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return handle(res);
}

// Send a GET request and return the full parsed payload
export async function apiGetRaw(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return handleRaw(res);
}

// Send a POST request with a JSON body and return the parsed data payload
export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return handle(res);
}

// Send a PUT request with a JSON body and return the parsed data payload
export async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return handle(res);
}

// Send a DELETE request and return the parsed data payload
export async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  return handle(res);
}
