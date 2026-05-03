// ─────────────────────────────────────────────────────────────────────────────
// api/violations.js — Individual violation API wrappers
// Thin functions over the base client — keeps route strings out of components.
// ─────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost } from "./client";

// Fetch all violations belonging to a specific ticket.
// ticketId is URL-encoded to handle special characters safely.
export const listViolations = (ticketId) =>
  apiGet(`/api/violations?ticket_id=${encodeURIComponent(ticketId)}`);

// Create a new violation under an existing ticket.
// payload shape: { violation_id, name, corresponding_fine_amount, ticket_id }
export const createViolation = (payload) => apiPost("/api/violations", payload);
