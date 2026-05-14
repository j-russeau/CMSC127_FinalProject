// ─────────────────────────────────────────────────────────────────────────────
// api/tickets.js — Violation ticket API wrappers
// Thin functions over the base client — keeps route strings out of components.
// ─────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiPut } from "./client";

// Fetch all violation tickets (joined with driver name, vehicle, and total fine)
export const listTickets = () => apiGet("/api/tickets");

// Create a ticket (no violations). Prefer createTicketWithViolations for normal use.
export const createTicket = (payload) => apiPost("/api/tickets", payload);

/*
 * Creates a ticket and all its violations atomically in one backend transaction.
 * Use this instead of calling createTicket + createViolation separately — the
 * two-step approach left orphaned tickets in the DB when a violation insert failed.
 * payload: { ticket: { ticket_id, datetime, ... }, violations: [{ violation_id, name, corresponding_fine_amount }] }
 */
export const createTicketWithViolations = (payload) => apiPost("/api/tickets/with-violations", payload);

// Update only the violation_status of an existing ticket.
export const updateTicketStatus = (ticketId, status) =>
  apiPut(`/api/tickets/${encodeURIComponent(ticketId)}/status`, { violation_status: status });
