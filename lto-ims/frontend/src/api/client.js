export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

async function handle(res) {
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Request failed");
  return json.data;
}

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return handle(res);
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle(res);
}