import React, { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { getDashboard } from "../api/dashboard";
import { formatMoney, formatDateTime } from "../utils";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await getDashboard();
      setData(res);
    } catch (e) {
      setErr(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const metrics = data?.metrics;

  return (
    <PageShell>
      <div>
        <h1 style={{ marginBottom: 4 }}>Dashboard</h1>
        <div style={{ color: "#86868B", marginBottom: 16 }}>Overview and statistics</div>

        {err ? (
          <div className="card">
            <div style={{ color: "#FF3B30", fontWeight: 700 }}>{err}</div>
            <button className="primaryBtn" style={{ marginTop: 10 }} onClick={load}>
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="card">Loading dashboard...</div>
        ) : data ? (
          <>
            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
              <div className="card">
                <div style={{ color: "#86868B", fontSize: 12 }}>Total Drivers</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{metrics.total_drivers}</div>
              </div>
              <div className="card">
                <div style={{ color: "#86868B", fontSize: 12 }}>Total Vehicles</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{metrics.total_vehicles}</div>
              </div>
              <div className="card">
                <div style={{ color: "#86868B", fontSize: 12 }}>Unpaid Tickets</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{metrics.unpaid_tickets}</div>
              </div>
              <div className="card">
                <div style={{ color: "#86868B", fontSize: 12 }}>Expired Registrations</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{metrics.expired_registrations}</div>
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Recent Tickets</div>
              {data.recentTickets.length === 0 ? (
                <div style={{ color: "#86868B" }}>No tickets yet.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "160px 220px 160px 180px 120px", gap: 10 }}>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Ticket</div>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Driver</div>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Plate</div>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Location</div>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Fine</div>

                  {data.recentTickets.map((t) => (
                    <React.Fragment key={t.ticket_id}>
                      <div style={{ fontWeight: 800 }}>{t.ticket_id}</div>
                      <div>{t.driver_name || t.license_number}</div>
                      <div>{t.plate_number}</div>
                      <div>{t.issued_at}</div>
                      <div style={{ fontWeight: 900, color: "#FF3B30" }}>{formatMoney(t.total_fine)}</div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Expiring registrations */}
            <div className="card">
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Registrations Expiring Soon (30 days)</div>
              {data.expiringRegistrations.length === 0 ? (
                <div style={{ color: "#86868B" }}>No upcoming expirations.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "140px 140px 180px 180px 120px", gap: 10 }}>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Plate</div>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Reg #</div>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Reg Date</div>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Expiry</div>
                  <div style={{ color: "#86868B", fontSize: 12 }}>Status</div>

                  {data.expiringRegistrations.map((r) => (
                    <React.Fragment key={r.registration_number}>
                      <div style={{ fontWeight: 800 }}>{r.plate_number}</div>
                      <div>{r.registration_number}</div>
                      <div>{r.registration_date}</div>
                      <div style={{ fontWeight: 800 }}>{r.expiration_date}</div>
                      <div>{r.registration_status}</div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}