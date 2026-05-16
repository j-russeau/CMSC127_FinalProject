import { apiGet } from "./client";

export const getDashboard = () => apiGet("/api/dashboard");