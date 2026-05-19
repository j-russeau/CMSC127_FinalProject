// ─────────────────────────────────────────────────────────────────────────────
// api/violations.js — Individual violation API wrappers
// ─────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiDelete } from "./client";

export const listViolations = (ticketId) =>
  apiGet(`/api/violations?ticket_id=${encodeURIComponent(ticketId)}`);

export const getViolationCatalog = () => apiGet("/api/violations/catalog");

export const createViolation = (payload) => apiPost("/api/violations", payload);

export const deleteViolation = (violationId) =>
  apiDelete(`/api/violations/${encodeURIComponent(violationId)}`);