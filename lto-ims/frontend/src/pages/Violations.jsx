import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

const demoTickets = [
  {
    ticket_id: "VIO-2024-001",
    driver_name: "Juan dela Cruz",
    driver_license: "N01-12-3456789",
    plate_number: "ABC-1234",
    vehicle_label: "Toyota Vios 2023",
    datetime: "2026-04-25 14:30:00",
    issued_at: "Makati City, NCR",
    total_fine: 7500,
    violation_status: "unpaid",
  },
  {
    ticket_id: "VIO-2024-002",
    driver_name: "Maria Santos",
    driver_license: "N02-13-4567890",
    plate_number: "XYZ-5678",
    vehicle_label: "Honda City 2022",
    datetime: "2026-04-24 10:15:00",
    issued_at: "Quezon City, NCR",
    total_fine: 1500,
    violation_status: "paid",
  },
  {
    ticket_id: "VIO-2024-003",
    driver_name: "Pedro Garcia",
    driver_license: "N03-14-5678901",
    plate_number: "DEF-9012",
    vehicle_label: "Yamaha Mio 2024",
    datetime: "2026-04-23 16:45:00",
    issued_at: "Manila, NCR",
    total_fine: 500,
    violation_status: "contested",
  },
];

function formatMoney(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return "—";
  return `₱${num.toLocaleString("en-PH")}`;
}

function formatDateTime(dtString) {
  // Accepts "YYYY-MM-DD HH:mm:ss" or ISO strings
  if (!dtString) return { date: "—", time: "" };
  const iso = dtString.includes("T") ? dtString : dtString.replace(" ", "T");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: dtString, time: "" };

  const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function StatusPill({ status }) {
  const s = (status || "").toLowerCase();

  // Colors from palette:
  // red: #FF3B30, green: #34C759, orange: #FF9500
  let bg = "rgba(134, 134, 139, 0.12)";
  let fg = "#1D1D1F";

  if (s === "unpaid") {
    bg = "rgba(255, 59, 48, 0.12)";
    fg = "#FF3B30";
  } else if (s === "paid") {
    bg = "rgba(52, 199, 89, 0.12)";
    fg = "#34C759";
  } else if (s === "contested") {
    bg = "rgba(255, 149, 0, 0.12)";
    fg = "#FF9500";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "lowercase",
        lineHeight: "12px",
        whiteSpace: "nowrap",
      }}
    >
      {s || "—"}
    </span>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(255,255,255,0.4)",
        borderRadius: 14,
        padding: "10px 12px",
        boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
          stroke="#86868B"
          strokeWidth="2"
        />
        <path d="M16.5 16.5 21 21" stroke="#86868B" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          width: "100%",
          fontSize: 14,
          color: "#1D1D1F",
        }}
      />
    </div>
  );
}

export default function Violations() {
  const [query, setQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showSql, setShowSql] = useState(false);

  // TODO: hook this to a modal later
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(`${API_BASE}/api/tickets`);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load tickets");
        }

        if (!cancelled) {
          // Map DB fields into UI-friendly fields
          // If backend doesn't provide driver_name/vehicle_label/total_fine,  show fallbacks
          const mapped = (json.data || []).map((t) => ({
            ticket_id: t.ticket_id,
            driver_name: t.driver_name || t.license_number || "—",
            driver_license: t.license_number || "—",
            plate_number: t.plate_number || "—",
            vehicle_label: t.vehicle_label || "—",
            datetime: t.datetime,
            issued_at: t.issued_at,
            total_fine: t.total_fine ?? null,
            violation_status: t.violation_status,
          }));
          setTickets(mapped);
        }
      } catch (e) {
        // If backend isn't ready, fall back to demo data
        if (!cancelled) {
          setTickets(demoTickets);
          setErr(e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;

    return tickets.filter((t) => {
      const hay = [
        t.ticket_id,
        t.driver_name,
        t.driver_license,
        t.plate_number,
        t.vehicle_label,
        t.issued_at,
        t.violation_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [tickets, query]);

  const containerStyle = {
    display: "inline-flex",
    height: "899px",
    paddingLeft: "16px",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "16px",
    width: "100%",
    background: "linear-gradient(135deg, #F5F7FA 0%, #E4E9F2 100%)",
    boxSizing: "border-box",
  };

  const sidebarStyle = {
    width: 240,
    height: "calc(899px - 32px)",
    borderRadius: 18,
    background: "#FFFFFF",
    boxShadow: "0 12px 28px rgba(0,0,0,0.06)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const mainStyle = {
    flex: 1,
    height: "calc(899px - 32px)",
    borderRadius: 18,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };

  const topBarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(255,255,255,0.4)",
    borderRadius: 18,
    boxShadow: "0 14px 35px rgba(0,0,0,0.06)",
    padding: 16,
  };

  const tableHeaderStyle = {
    display: "grid",
    gridTemplateColumns: "140px 220px 180px 160px 180px 120px 120px 90px",
    gap: 10,
    fontSize: 12,
    color: "#86868B",
    padding: "10px 8px",
  };

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "140px 220px 180px 160px 180px 120px 120px 90px",
    gap: 10,
    alignItems: "center",
    padding: "12px 8px",
    borderTop: "1px solid rgba(0,0,0,0.05)",
  };

  return (
    <div style={containerStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div>
          <div style={{ fontWeight: 800, color: "#1D1D1F" }}>LTO IMS</div>
          <div style={{ fontSize: 12, color: "#86868B", marginTop: 2 }}>
            Information Management
          </div>
        </div>

        <div style={{ height: 8 }} />

        {/* Nav (static for now) */}
        {[
          { label: "Dashboard", active: false },
          { label: "Drivers", active: false },
          { label: "Vehicles", active: false },
          { label: "Registrations", active: false },
          { label: "Violations", active: true },
          { label: "Reports", active: false },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 12,
              background: item.active ? "rgba(74, 143, 249, 0.12)" : "transparent",
              color: item.active ? "#4A8FF9" : "#1D1D1F",
              fontWeight: item.active ? 700 : 600,
              cursor: "default",
            }}
          >
            <span>{item.label}</span>
            {item.active ? <span style={{ fontSize: 16 }}>›</span> : null}
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 8 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "rgba(74, 143, 249, 0.12)",
              display: "grid",
              placeItems: "center",
              color: "#4A8FF9",
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>Admin User</div>
            <div style={{ fontSize: 12, color: "#86868B" }}>Administrator</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={mainStyle}>
        {/* Top bar */}
        <div style={topBarStyle}>
          <div style={{ flex: 1, maxWidth: 520 }}>
            <SearchInput value={query} onChange={setQuery} placeholder="Search..." />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowSql((v) => !v)}
              title="Show SQL"
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.9)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                cursor: "pointer",
                fontWeight: 800,
                color: "#4A8FF9",
              }}
            >
              {"</>"}
            </button>

            <div style={{ fontSize: 12, color: "#86868B", textAlign: "right", lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700, color: "#1D1D1F" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" })}
              </div>
              <div>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>

            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: "rgba(74, 143, 249, 0.12)",
                display: "grid",
                placeItems: "center",
                color: "#4A8FF9",
                fontWeight: 800,
              }}
            >
              A
            </div>
          </div>
        </div>

        {/* Header + Create Ticket */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1D1D1F" }}>Violation Management</div>
            <div style={{ fontSize: 13, color: "#86868B", marginTop: 4 }}>
              Track and manage traffic violation tickets
            </div>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 700,
              color: "#FFFFFF",
              background: "linear-gradient(135deg, #4F8CFF 0%, #4A87F9 60%, #4785F6 100%)",
              boxShadow: "0 14px 30px rgba(74,143,249,0.25)",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 0 }}>+</span>
            Create Ticket
          </button>
        </div>

        {/* Secondary search bar */}
        <div style={cardStyle}>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by ticket ID, driver, or vehicle..."
          />
          {err ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#86868B" }}>
              Using demo data (API not reachable): <span style={{ color: "#FF3B30" }}>{err}</span>
            </div>
          ) : null}
        </div>

        {/* Tickets table */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>
              {loading ? "Loading tickets..." : `Tickets (${filtered.length})`}
            </div>
          </div>

          <div style={tableHeaderStyle}>
            <div>Ticket ID</div>
            <div>Driver</div>
            <div>Vehicle</div>
            <div>Date/Time</div>
            <div>Location</div>
            <div>Total Fine</div>
            <div>Status</div>
            <div>Details</div>
          </div>

          {filtered.map((t) => {
            const { date, time } = formatDateTime(t.datetime);

            return (
              <div key={t.ticket_id} style={rowStyle}>
                <div style={{ fontWeight: 800, color: "#1D1D1F" }}>{t.ticket_id}</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontWeight: 700, color: "#1D1D1F" }}>{t.driver_name}</div>
                  <div style={{ fontSize: 12, color: "#86868B" }}>{t.driver_license}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontWeight: 700, color: "#1D1D1F" }}>{t.plate_number}</div>
                  <div style={{ fontSize: 12, color: "#86868B" }}>{t.vehicle_label}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontWeight: 700, color: "#1D1D1F" }}>{date}</div>
                  <div style={{ fontSize: 12, color: "#86868B" }}>{time}</div>
                </div>

                <div style={{ color: "#1D1D1F" }}>{t.issued_at}</div>

                <div style={{ fontWeight: 800, color: "#FF3B30" }}>{formatMoney(t.total_fine)}</div>

                <div>
                  <StatusPill status={t.violation_status} />
                </div>

                <div>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    style={{ color: "#4A8FF9", fontWeight: 700, textDecoration: "none" }}
                  >
                    View
                  </a>
                </div>
              </div>
            );
          })}

          {!loading && filtered.length === 0 ? (
            <div style={{ padding: 18, color: "#86868B" }}>No tickets found.</div>
          ) : null}
        </div>

        {/* SQL Preview  */}
        {showSql ? (
          <div style={{ ...cardStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
            <div style={{ fontSize: 12, color: "#86868B", marginBottom: 8 }}>SQL used (example)</div>
            <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
              {`-- List tickets
              SELECT *
              FROM violation_ticket
              ORDER BY datetime DESC;`}
            </pre>
          </div>
        ) : null}

        {/* Create Ticket modal stub (UI-only for now) */}
        {createOpen ? (
          <div
            onClick={() => setCreateOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.25)",
              display: "grid",
              placeItems: "center",
              zIndex: 50,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 520,
                maxWidth: "92vw",
                background: "#fff",
                borderRadius: 18,
                padding: 18,
                boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Create Ticket</div>
                <button
                  onClick={() => setCreateOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 18,
                    color: "#86868B",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: "#86868B" }}>
                Modal stub only (hook this to POST /api/tickets on Day 6).
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setCreateOpen(false)}
                  style={{
                    border: "none",
                    padding: "10px 14px",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    background: "#4A8FF9",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}