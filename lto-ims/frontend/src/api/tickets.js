import { apiGet, apiPost } from "./client";

export const listTickets = () => apiGet("/api/tickets");
export const createTicket = (payload) => apiPost("/api/tickets", payload);