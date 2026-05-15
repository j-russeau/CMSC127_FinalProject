// ─────────────────────────────────────────────────────────────────────────────
// Registrations.jsx — Vehicle Registration Management page
// Shows the latest/current registration per vehicle, registration history,
// add-registration modal, and SQL preview toggle.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from "react";
import { listVehicles } from "../api/vehicles";
import {
  listRegistrationsRaw,
  createRegistrationRaw,
} from "../api/registrations";
import PageShell from "../components/PageShell";
import { useToast, ToastList } from "../components/Toast";

// Valid values based on the database/project specification
const REGISTRATION_STATUSES = ["active", "expired", "suspended"];

// ── Date / Formatting Helpers ────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function genRegistrationNumber() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `REG-${date}-${rand}`;
}

function formatDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function driverName(v) {
  return [v.first_name, v.middle_name, v.last_name].filter(Boolean).join(" ") || "—";
}

function vehicleName(v) {
  return `${v.make || ""} ${v.model || ""}`.trim() || "Vehicle";
}

function compareDatesDesc(a, b) {
  return new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime();
}

function formatSqlPreview(sqlInfo) {
  if (!sqlInfo?.sql) {
    return "Run a registration action first to show the exact SQL used.";
  }

  const params = Array.isArray(sqlInfo.params) ? sqlInfo.params : [];

  return `${sqlInfo.sql.trim()}

-- Params
${JSON.stringify(params, null, 2)}`;
}

// ── Small UI Components ──────────────────────────────────────────────────────

function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();

  const style = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 78,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
    background: "rgba(134,134,139,0.12)",
    color: "#86868B",
  };

  if (s === "active") {
    style.background = "rgba(52,199,89,0.12)";
    style.color = "#34C759";
  }

  if (s === "expired") {
    style.background = "rgba(255,149,0,0.12)";
    style.color = "#FF9500";
  }

  if (s === "suspended") {
    style.background = "rgba(255,59,48,0.12)";
    style.color = "#FF3B30";
  }

  return <span style={style}>{s || "—"}</span>;
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="searchWrap">
      <svg className="searchIcon" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="#86868B" strokeWidth="2" />
        <path d="M16.5 16.5 21 21" stroke="#86868B" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        className="searchInput"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function HistoryButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.65)",
        background: "rgba(255,255,255,0.55)",
        color: "#4A8FF9",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12a9 9 0 1 0 3-6.7"
          stroke="#4A8FF9"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M3 4v6h6"
          stroke="#4A8FF9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 7v5l3 2"
          stroke="#4A8FF9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      History
    </button>
  );
}

// Default form state for the Add Registration modal
const emptyForm = {
  registration_number: "",
  registration_date: todayIso(),
  expiration_date: "",
  registration_status: "active",
  plate_number: "",
  engine_number: "",
  chassis_number: "",
};

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Registrations() {
  /*
   * Live clock — matches Drivers, Vehicles, and Violations top bar.
   */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Data loaded from backend
  const [vehicles, setVehicles] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  // Page state
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiErr, setApiErr] = useState("");
  const [showSql, setShowSql] = useState(false);
  const [sqlInfo, setSqlInfo] = useState(null);

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);

  // Add-registration form state
  const [form, setForm] = useState(emptyForm);
  const [formErr, setFormErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { toasts, toast, dismiss } = useToast();

  /*
   * Map vehicles by plate_number so registration rows can easily display
   * vehicle details and owner info without repeatedly searching the array.
   */
  const vehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {
      map[v.plate_number] = v;
    });
    return map;
  }, [vehicles]);

  /*
   * Convert registration history into one current/latest registration per vehicle.
   * This lets the page display "Current Registrations" like the Figma design,
   * while still keeping full history available in the History modal.
   */
  const latestRows = useMemo(() => {
    const grouped = {};

    registrations.forEach((r) => {
      const key = `${r.plate_number}|${r.engine_number}|${r.chassis_number}`;
      if (!grouped[key] || new Date(r.registration_date) > new Date(grouped[key].registration_date)) {
        grouped[key] = r;
      }
    });

    return Object.values(grouped)
      .sort((a, b) => String(a.plate_number).localeCompare(String(b.plate_number)))
      .map((r) => ({
        ...r,
        vehicle: vehicleMap[r.plate_number] || {},
      }));
  }, [registrations, vehicleMap]);

  /*
   * Search over visible current registration rows.
   * Search includes registration number, plate, status, dates, vehicle label,
   * owner name, and owner license number.
   */
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return latestRows;

    return latestRows.filter((r) => {
      const v = r.vehicle || {};
      const hay = [
        r.registration_number,
        r.plate_number,
        r.registration_status,
        r.registration_date,
        r.expiration_date,
        vehicleName(v),
        driverName(v),
        v.owner_license_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [latestRows, query]);

  // ── Data Loading ───────────────────────────────────────────────────────────

  async function refreshAll(options = {}) {
    const { preserveSql = false } = options;

    setLoading(true);
    setApiErr("");

    try {
      const [vehicleRows, registrationResponse] = await Promise.all([
        listVehicles(),
        listRegistrationsRaw(),
      ]);

      setVehicles(vehicleRows || []);
      setRegistrations(registrationResponse.data || []);

      if (!preserveSql) {
        setSqlInfo({
          label: "List all registrations",
          sql: registrationResponse.sql,
          params: registrationResponse.params,
        });
      }
    } catch (e) {
      setApiErr(e.message);
      setVehicles([]);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  // ── Form Helpers ───────────────────────────────────────────────────────────

  function patchForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setForm({
      ...emptyForm,
      registration_number: genRegistrationNumber(),
      registration_date: todayIso(),
    });
    setFormErr("");
    setAddOpen(true);
  }

  /*
   * Selecting a vehicle auto-fills engine_number and chassis_number so the user
   * does not need to manually type the composite vehicle identity.
   */
  function selectVehicle(plate) {
    const selectedVehicle = vehicleMap[plate];

    setForm((prev) => ({
      ...prev,
      plate_number: plate,
      engine_number: selectedVehicle?.engine_number || "",
      chassis_number: selectedVehicle?.chassis_number || "",
    }));
  }

  function validateForm() {
    const required = [
      ["Registration number", form.registration_number],
      ["Vehicle", form.plate_number],
      ["Engine number", form.engine_number],
      ["Chassis number", form.chassis_number],
      ["Registration date", form.registration_date],
      ["Expiration date", form.expiration_date],
      ["Registration status", form.registration_status],
    ];

    for (const [label, value] of required) {
      if (!value || !String(value).trim()) return `${label} is required.`;
    }

    if (form.expiration_date <= form.registration_date) {
      return "Expiration date must be after registration date.";
    }

    if (!REGISTRATION_STATUSES.includes(form.registration_status)) {
      return "Registration status must be active, expired, or suspended.";
    }

    return "";
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function submitAdd() {
    setFormErr("");

    const err = validateForm();
    if (err) {
      setFormErr(err);
      return;
    }

    setSubmitting(true);

    try {
      const response = await createRegistrationRaw({
        registration_number: form.registration_number.trim(),
        registration_date: form.registration_date,
        expiration_date: form.expiration_date,
        registration_status: form.registration_status,
        plate_number: form.plate_number.trim(),
        engine_number: form.engine_number.trim(),
        chassis_number: form.chassis_number.trim(),
      });

      setAddOpen(false);
      toast("Registration added successfully.");

      await refreshAll({ preserveSql: true });

      setSqlInfo({
        label: "Create registration / renewal",
        sql: response.sql,
        params: response.params,
      });
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function openHistory(row) {
    const vehicle = vehicleMap[row.plate_number] || {
      plate_number: row.plate_number,
      engine_number: row.engine_number,
      chassis_number: row.chassis_number,
    };

    setHistoryVehicle(vehicle);
    setHistoryOpen(true);

    try {
      const response = await listRegistrationsRaw(row.plate_number);
      setHistoryRows((response.data || []).sort(compareDatesDesc));
      setSqlInfo({
        label: `Registration history for ${row.plate_number}`,
        sql: response.sql,
        params: response.params,
      });
    } catch (e) {
      setHistoryRows(
        registrations
          .filter((r) => r.plate_number === row.plate_number)
          .sort(compareDatesDesc)
      );
      toast(e.message, "error");
    }
  }

  // ── Top Bar Date/Time ──────────────────────────────────────────────────────

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
  });

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <div className="topBar">
        <div className="topRight">
          <button
            className="codeBtn"
            onClick={() => setShowSql((v) => !v)}
            title="Show SQL"
          >
            {"</>"}
          </button>

          <div className="dateTime">
            <div className="dateText">{dateStr}</div>
            <div className="timeText">{timeStr}</div>
          </div>

          <div className="avatar">A</div>
        </div>
      </div>

      <div className="headerRow">
        <div>
          <div className="pageTitle">Registration Management</div>
          <div className="pageSub">Manage vehicle registrations and renewals</div>
        </div>

        <button className="primaryBtn" onClick={openAdd}>
          + Add Registration
        </button>
      </div>

      <div className="card">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search registration number, vehicle, owner, or status..."
        />
        {apiErr && (
          <div className="softNote">
            API not reachable: <span className="softNoteErr">{apiErr}</span>
          </div>
        )}
      </div>

      <div className="card tableCard">
        <div className="tableTitleRow">
          <div>
            <div className="tableTitle">
              {loading ? "Loading..." : `Current Registrations (${filteredRows.length})`}
            </div>
            <div style={{ color: "#86868B", fontSize: 13, marginTop: 4 }}>
              Latest registration record per vehicle
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "155px 1.2fr 1.2fr 135px 135px 105px 95px",
            gap: 12,
            alignItems: "center",
            padding: "12px 16px",
            fontSize: 12,
            color: "#86868B",
            fontWeight: 700,
          }}
        >
          <div>Registration No.</div>
          <div>Vehicle</div>
          <div>Owner</div>
          <div>Registration Date</div>
          <div>Expiration Date</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {loading && <div className="emptyState">Loading registrations...</div>}

        {!loading && filteredRows.length === 0 && (
          <div className="emptyState">No registrations found.</div>
        )}

        {!loading &&
          filteredRows.map((r) => {
            const v = r.vehicle || {};

            return (
              <div
                key={r.registration_number}
                style={{
                  display: "grid",
                  gridTemplateColumns: "155px 1.2fr 1.2fr 135px 135px 105px 95px",
                  gap: 12,
                  alignItems: "center",
                  padding: "14px 16px",
                  borderTop: "1px solid rgba(0,0,0,0.05)",
                  fontSize: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontWeight: 800,
                    color: "#1D1D1F",
                  }}
                >
                  {r.registration_number}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontWeight: 800, color: "#1D1D1F" }}>{r.plate_number}</div>
                  <div style={{ color: "#86868B", fontSize: 12 }}>
                    {vehicleName(v)} • {v.vehicle_type || "—"}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontWeight: 700, color: "#1D1D1F" }}>{driverName(v)}</div>
                  <div
                    style={{
                      color: "#86868B",
                      fontSize: 12,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {v.owner_license_number || "—"}
                  </div>
                </div>

                <div>{formatDate(r.registration_date)}</div>
                <div>{formatDate(r.expiration_date)}</div>
                <div>
                  <StatusPill status={r.registration_status} />
                </div>

                <div>
                  <HistoryButton onClick={() => openHistory(r)} />
                </div>
              </div>
            );
          })}
      </div>

      {/* ── SQL preview ── */}
      {showSql && (
        <div className="card codeCard">
          <div className="codeLabel">
            SQL used{sqlInfo?.label ? ` — ${sqlInfo.label}` : ""}
          </div>
          <pre className="codePre">{formatSqlPreview(sqlInfo)}</pre>
        </div>
      )}

      {/* ── Add Registration Modal ── */}
      {addOpen && (
        <div className="modalOverlay" onClick={() => setAddOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 620,
              maxWidth: "94vw",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 24,
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                padding: "24px 26px",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#1D1D1F" }}>
                  Add Registration
                </div>
                <div style={{ fontSize: 13, color: "#86868B", marginTop: 4 }}>
                  Record a new vehicle registration or renewal
                </div>
              </div>

              <button className="modalCloseBtn" onClick={() => setAddOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#4A8FF9",
                    marginBottom: 10,
                  }}
                >
                  Vehicle Information
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Vehicle
                    </label>
                    <select
                      className="input"
                      value={form.plate_number}
                      onChange={(e) => selectVehicle(e.target.value)}
                    >
                      <option value="">Select vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.plate_number} value={v.plate_number}>
                          {v.plate_number} — {vehicleName(v)} — {driverName(v)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        Engine Number
                      </label>
                      <input
                        className="input"
                        value={form.engine_number}
                        onChange={(e) => patchForm("engine_number", e.target.value)}
                        placeholder="Auto-filled"
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        Chassis Number
                      </label>
                      <input
                        className="input"
                        value={form.chassis_number}
                        onChange={(e) => patchForm("chassis_number", e.target.value)}
                        placeholder="Auto-filled"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#4A8FF9",
                    marginBottom: 10,
                  }}
                >
                  Registration Details
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Registration Number
                    </label>
                    <input
                      className="input"
                      value={form.registration_number}
                      onChange={(e) => patchForm("registration_number", e.target.value)}
                      placeholder="REG001"
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Status
                    </label>
                    <select
                      className="input"
                      value={form.registration_status}
                      onChange={(e) => patchForm("registration_status", e.target.value)}
                    >
                      {REGISTRATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Registration Date
                    </label>
                    <input
                      className="input"
                      type="date"
                      value={form.registration_date}
                      onChange={(e) => patchForm("registration_date", e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Expiration Date
                    </label>
                    <input
                      className="input"
                      type="date"
                      value={form.expiration_date}
                      onChange={(e) => patchForm("expiration_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {formErr && <div className="msgError">{formErr}</div>}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "18px 26px 24px",
                borderTop: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <button className="secondaryBtn" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button className="primaryBtn" onClick={submitAdd} disabled={submitting}>
                {submitting ? "Saving..." : "Save Registration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Registration History Modal ── */}
      {historyOpen && historyVehicle && (
        <div className="modalOverlay" onClick={() => setHistoryOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 680,
              maxWidth: "94vw",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 24,
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              padding: 24,
            }}
          >
            <div className="modalHeader">
              <div>
                <div className="modalTitle">Registration History</div>
                <div style={{ color: "#86868B", fontSize: 13, marginTop: 4 }}>
                  {historyVehicle.plate_number} — {vehicleName(historyVehicle)}
                </div>
              </div>
              <button className="modalCloseBtn" onClick={() => setHistoryOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 130px 130px 100px",
                  gap: 12,
                  padding: "10px 0",
                  fontSize: 12,
                  color: "#86868B",
                  fontWeight: 800,
                }}
              >
                <div>Registration No.</div>
                <div>Registration Date</div>
                <div>Expiration Date</div>
                <div>Status</div>
              </div>

              {historyRows.map((r) => (
                <div
                  key={r.registration_number}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "150px 130px 130px 100px",
                    gap: 12,
                    padding: "12px 0",
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 800 }}>
                    {r.registration_number}
                  </div>
                  <div>{formatDate(r.registration_date)}</div>
                  <div>{formatDate(r.expiration_date)}</div>
                  <div>
                    <StatusPill status={r.registration_status} />
                  </div>
                </div>
              ))}

              {historyRows.length === 0 && (
                <div className="emptyState">No registration history found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastList toasts={toasts} onDismiss={dismiss} />
    </PageShell>
  );
}