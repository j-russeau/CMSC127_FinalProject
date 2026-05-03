// ─────────────────────────────────────────────────────────────────────────────
// api/tickets.js — Violation ticket API wrappers
// Thin functions over the base client — keeps route strings out of components.
// ─────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost } from "./client";

// Fetch all violation tickets (joined with driver name, vehicle, and total fine)
export const listTickets = () => apiGet("/api/tickets");

// Create a new violation ticket.
// payload shape: { ticket_id, datetime, violation_status, issued_at,
//                  apprehending_officer?, license_number,
//                  plate_number, engine_number, chassis_number }
export const createTicket = (payload) => apiPost("/api/tickets", payload);
