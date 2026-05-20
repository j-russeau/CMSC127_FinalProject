import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCarSide,
  FaExclamationTriangle,
  FaFileAlt,
  FaSyncAlt,
  FaTicketAlt,
  FaUsers,
} from "react-icons/fa";
import PageShell from "../components/PageShell";
import { getDashboard } from "../api/dashboard";
import { formatMoney } from "../utils";
import "./Dashboard.css";

const PH_TIMEZONE = "Asia/Manila";

function formatDashboardDate(value) {
  if (!value) return "—";

  const raw = String(value);
  let date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    date = new Date(`${raw}T00:00:00+08:00`);
  } else {
    date = new Date(raw);
  }

  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TIMEZONE,
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getDateOnlyUtcMs(value) {
  if (!value) return null;

  const raw = String(value);
  let date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    date = new Date(`${raw}T00:00:00+08:00`);
  } else {
    date = new Date(raw);
  }

  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);

  if (!y || !m || !d) return null;

  return Date.UTC(y, m - 1, d);
}

function daysUntil(value) {
  const expiryMs = getDateOnlyUtcMs(value);
  if (expiryMs === null) return null;

  const now = new Date();
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = Number(todayParts.find((p) => p.type === "year")?.value);
  const m = Number(todayParts.find((p) => p.type === "month")?.value);
  const d = Number(todayParts.find((p) => p.type === "day")?.value);

  const todayMs = Date.UTC(y, m - 1, d);
  return Math.ceil((expiryMs - todayMs) / 86_400_000);
}

function formatTicketLocation(value) {
  if (!value) return "—";
  return String(value);
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();

  if (s === "active") return "dashboardStatus dashboardStatus--active";
  if (s === "expired") return "dashboardStatus dashboardStatus--expired";
  if (s === "suspended") return "dashboardStatus dashboardStatus--suspended";
  if (s === "paid") return "dashboardStatus dashboardStatus--paid";
  if (s === "unpaid") return "dashboardStatus dashboardStatus--unpaid";
  if (s === "contested") return "dashboardStatus dashboardStatus--contested";

  return "dashboardStatus";
}

function MetricCard({ label, value, icon, tone, note }) {
  return (
    <div className={`dashboardMetric dashboardMetric--${tone}`}>
      <div className="dashboardMetricIcon">{icon}</div>

      <div>
        <div className="dashboardMetricLabel">{label}</div>
        <div className="dashboardMetricValue">{value ?? 0}</div>
        {note ? <div className="dashboardMetricNote">{note}</div> : null}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  const metrics = data?.metrics || {};

  const recentTickets = useMemo(
    () => data?.recentTickets || [],
    [data]
  );

  const expiringRegistrations = useMemo(
    () => data?.expiringRegistrations || [],
    [data]
  );

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
  });

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <PageShell>
      <div className="dashboardPage">
        <div className="dashboardBg" />

        <div className="dashboardContent">
          <div className="topBar dashboardTopBar">
            <div className="topRight">
              <div className="dateTime dashboardDateTime">
                <div className="dateText dashboardDateText">{dateStr}</div>
                <div className="timeText dashboardTimeText">{timeStr}</div>
              </div>

              <div className="avatar dashboardAvatar">A</div>
            </div>
          </div>

          <div className="dashboardHero">
            <div>
              <div className="dashboardEyebrow">LTO Information Management</div>
              <h1 className="dashboardTitle">Dashboard</h1>
              <div className="dashboardSub">
                Overview of drivers, vehicles, registrations, and violation tickets
              </div>
            </div>

            <button className="dashboardRefreshBtn" onClick={load} disabled={loading}>
              <FaSyncAlt />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {err ? (
            <div className="dashboardErrorCard">
              <div>
                <div className="dashboardErrorTitle">Could not load dashboard</div>
                <div className="dashboardErrorText">{err}</div>
              </div>

              <button className="primaryBtn" onClick={load}>
                Retry
              </button>
            </div>
          ) : null}

          {loading ? (
            <>
              <div className="dashboardMetricsGrid">
                <div className="dashboardSkeleton" />
                <div className="dashboardSkeleton" />
                <div className="dashboardSkeleton" />
                <div className="dashboardSkeleton" />
              </div>

              <div className="dashboardPanel dashboardPanelLoading">
                Loading dashboard...
              </div>
            </>
          ) : data ? (
            <>
              <div className="dashboardMetricsGrid">
                <MetricCard
                  label="Total Drivers"
                  value={metrics.total_drivers}
                  icon={<FaUsers />}
                  tone="blue"
                  note="Registered license holders"
                />

                <MetricCard
                  label="Total Vehicles"
                  value={metrics.total_vehicles}
                  icon={<FaCarSide />}
                  tone="green"
                  note="Vehicles in the system"
                />

                <MetricCard
                  label="Unpaid Tickets"
                  value={metrics.unpaid_tickets}
                  icon={<FaExclamationTriangle />}
                  tone="red"
                  note="Needs settlement"
                />

                <MetricCard
                  label="Expired Registrations"
                  value={metrics.expired_registrations}
                  icon={<FaFileAlt />}
                  tone="orange"
                  note="Requires renewal"
                />
              </div>

              <div className="dashboardGrid">
                <section className="dashboardPanel dashboardPanelLarge">
                  <div className="dashboardPanelHeader">
                    <div>
                      <div className="dashboardPanelTitle">
                        <FaTicketAlt />
                        Recent Tickets
                      </div>
                      <div className="dashboardPanelSub">
                        Latest violation tickets recorded in the system
                      </div>
                    </div>

                    <div className="dashboardPanelCount">
                      {recentTickets.length}
                    </div>
                  </div>

                  {recentTickets.length === 0 ? (
                    <div className="dashboardEmpty">No tickets yet.</div>
                  ) : (
                    <div className="dashboardTable dashboardTicketsTable">
                      <div className="dashboardTableHead">
                        <div>Ticket</div>
                        <div>Driver</div>
                        <div>Plate</div>
                        <div>Location</div>
                        <div>Fine</div>
                      </div>

                      {recentTickets.map((t) => (
                        <div className="dashboardTableRow" key={t.ticket_id}>
                          <div className="dashboardMono dashboardStrong">
                            {t.ticket_id}
                          </div>

                          <div className="dashboardStack">
                            <div className="dashboardStrong">
                              {t.driver_name || t.license_number || "—"}
                            </div>
                            <div className="dashboardMuted">
                              {t.license_number || "—"}
                            </div>
                          </div>

                          <div className="dashboardPlate">
                            {t.plate_number || "—"}
                          </div>

                          <div className="dashboardLocation">
                            {formatTicketLocation(t.issued_at)}
                          </div>

                          <div className="dashboardFine">
                            {formatMoney(t.total_fine || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="dashboardPanel dashboardPanelLarge">
                  <div className="dashboardPanelHeader">
                    <div>
                      <div className="dashboardPanelTitle">
                        <FaCalendarAlt />
                        Registrations Expiring Soon
                      </div>
                      <div className="dashboardPanelSub">
                        Active registrations expiring within 30 days
                      </div>
                    </div>

                    <div className="dashboardPanelCount">
                      {expiringRegistrations.length}
                    </div>
                  </div>

                  {expiringRegistrations.length === 0 ? (
                    <div className="dashboardEmpty">No upcoming expirations.</div>
                  ) : (
                    <div className="dashboardTable dashboardRegistrationsTable">
                      <div className="dashboardTableHead">
                        <div>Plate</div>
                        <div>Registration #</div>
                        <div>Reg Date</div>
                        <div>Expiry</div>
                        <div>Status</div>
                      </div>

                      {expiringRegistrations.map((r) => {
                        const left = daysUntil(r.expiration_date);

                        return (
                          <div className="dashboardTableRow" key={r.registration_number}>
                            <div className="dashboardPlate">
                              {r.plate_number || "—"}
                            </div>

                            <div className="dashboardStack">
                              <div className="dashboardMono dashboardStrong">
                                {r.registration_number || "—"}
                              </div>

                              {left !== null ? (
                                <div className="dashboardMuted">
                                  {left < 0
                                    ? `${Math.abs(left)} day${Math.abs(left) === 1 ? "" : "s"} overdue`
                                    : left === 0
                                      ? "Expires today"
                                      : `${left} day${left === 1 ? "" : "s"} left`}
                                </div>
                              ) : null}
                            </div>

                            <div>
                              {formatDashboardDate(r.registration_date)}
                            </div>

                            <div className="dashboardExpiry">
                              {formatDashboardDate(r.expiration_date)}
                            </div>

                            <div>
                              <span className={statusClass(r.registration_status)}>
                                {r.registration_status || "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}