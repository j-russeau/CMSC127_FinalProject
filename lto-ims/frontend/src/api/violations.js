import { apiGet, apiPost } from "./client";

export const listViolations = (ticketId) => apiGet(`/api/violations?ticket_id=${encodeURIComponent(ticketId)}`);

export const createViolation = (payload) => apiPost("/api/violations", payload);