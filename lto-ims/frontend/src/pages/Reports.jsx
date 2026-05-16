// ─────────────────────────────────────────────────────────────────────────────
// Reports.jsx — SQL-based Reports page
// Lets the user select one of the 7 required reports, provide filters,
// generate report output, and show the exact SQL used.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from "react";
import { listDrivers } from "../api/drivers";
import {
  reportDriversFiltered,
  reportVehiclesByDriver,
  reportExpiredRegistrations,
  reportExpiredDrivers,
  reportViolationsByDriver,
  reportViolationCount,
  reportVehiclesByRegion,
} from "../api/reports";
import PageShell from "../components/PageShell";
import { useToast, ToastList } from "../components/Toast";
import SearchInput from "../components/SearchInput";
import AutocompleteInput from "../components/AutocompleteInput";
import AsyncAutocompleteInput from "../components/AsyncAutocompleteInput";
import { searchDrivers } from "../api/drivers";
import {
  FaUser,
  FaCar,
  FaCalendarDays,
  FaTriangleExclamation,
  FaReceipt,
  FaChartColumn,
  FaLocationDot,
} from "react-icons/fa6";

// Filter dropdown values used by Report #1
const LICENSE_TYPES = ["Professional", "Non-Professional", "Student Permit"];
const LICENSE_STATUSES = ["valid", "expired", "suspended", "revoked"];
const SEXES = ["M", "F"];

/*
 * Report definitions.
 * Each entry controls the report selection card shown at the top of the page.
 */
const REPORTS = [
  {
    id: "r1",
    icon: FaUser,
    title: "Driver Filter Report",
    description: "Filter registered drivers by license type, status, age range, and sex.",
  },
  {
    id: "r2",
    icon: FaCar,
    title: "Vehicles by Driver",
    description: "View all vehicles owned by a given driver.",
  },
  {
    id: "r3",
    icon: FaCalendarDays,
    title: "Expired Registrations",
    description: "Find vehicles with expired registrations as of a selected date.",
  },
  {
    id: "r4",
    icon: FaTriangleExclamation,
    title: "Invalid Drivers",
    description: "View drivers with expired or suspended licenses.",
  },
  {
    id: "r5",
    icon: FaReceipt,
    title: "Violations by Driver",
    description: "View violations committed by a driver within a date range.",
  },
  {
    id: "r6",
    icon: FaChartColumn,
    title: "Violations per Type",
    description: "Count violations per violation type for a given year.",
  },
  {
    id: "r7",
    icon: FaLocationDot,
    title: "Vehicles in Violations",
    description: "View vehicles involved in violations within a city or region.",
  },
];

// ── Date / Formatting Helpers ────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentYear() {
  return String(new Date().getFullYear());
}

function currentYearStartIso() {
  return `${currentYear()}-01-01`;
}

function currentYearEndIso() {
  return `${currentYear()}-12-31`;
}

function driverName(d) {
  return [d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ");
}

function labelForKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString("en-PH");

  const s = String(value);

  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);

  return s;
}

// ── Small UI Components ──────────────────────────────────────────────────────

function ReportTable({ rows }) {
  if (!rows) return null;

  if (!rows.length) {
    return <div className="emptyState">No rows returned.</div>;
  }

  const columns = Object.keys(rows[0]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                style={{
                  textAlign: "left",
                  color: "#86868B",
                  fontSize: 12,
                  padding: "12px 10px",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  whiteSpace: "nowrap",
                }}
              >
                {labelForKey(c)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td
                  key={c}
                  style={{
                    padding: "12px 10px",
                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                    color: "#1D1D1F",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatCell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ── Main Page ────────────────────────────────────────────────────────────────

export default function Reports() {
  /*
   * Live clock — matches Drivers, Vehicles, and Violations top bar.
   */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Selected report and report filter form state
  const [selectedReport, setSelectedReport] = useState("r1");
  const [forms, setForms] = useState({
    r1: { type: "Professional", status: "valid", sex: "M", min: "18", max: "60" },
    r2: { license: "" },
    r3: { date: todayIso() },
    r4: {},
    r5: { license: "", start: currentYearStartIso(), end: currentYearEndIso() },
    r6: { year: currentYear() },
    r7: { region: "Quezon City" },
  });

  // Driver list is used only for datalist suggestions in driver-license filters
  const [drivers, setDrivers] = useState([]);
  const [driverLoadError, setDriverLoadError] = useState("");

  // Results are stored per report so switching report cards does not erase output
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSql, setShowSql] = useState(false);

  const { toasts, toast, dismiss } = useToast();

  const activeReport = useMemo(
    () => REPORTS.find((r) => r.id === selectedReport) || REPORTS[0],
    [selectedReport]
  );

  const activeResult = results[selectedReport];

  // ── Data Loading ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadDrivers() {
      try {
        const rows = await listDrivers();
        setDrivers(rows || []);
      } catch (e) {
        setDriverLoadError(e.message);
      }
    }

    loadDrivers();
  }, []);

  // ── Form Helpers ───────────────────────────────────────────────────────────

  function patchForm(reportId, key, value) {
    setForms((prev) => ({
      ...prev,
      [reportId]: {
        ...prev[reportId],
        [key]: value,
      },
    }));
  }

  /*
   * Validate report filters before sending requests to the backend.
   * Backend also validates these, but frontend validation gives faster feedback.
   */
  function validate(reportId) {
    const f = forms[reportId] || {};

    if (reportId === "r1") {
      const min = Number(f.min);
      const max = Number(f.max);

      if (!f.type || !f.status || !f.sex) {
        return "License type, status, and sex are required.";
      }

      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < 0 || min > max) {
        return "Age Range is invalid. Use whole numbers and make sure From ≤ To.";
      }
    }

    if (reportId === "r2" && !String(f.license || "").trim()) {
      return "Driver license number is required.";
    }

    if (reportId === "r3" && !f.date) {
      return "As-of date is required.";
    }

    if (reportId === "r5") {
      if (!String(f.license || "").trim() || !f.start || !f.end) {
        return "Driver license, start date, and end date are required.";
      }

      if (f.start > f.end) {
        return "Start date must be before or equal to end date.";
      }
    }

    if (reportId === "r6" && !/^\d{4}$/.test(String(f.year || ""))) {
      return "Year must be in YYYY format.";
    }

    if (reportId === "r7" && !String(f.region || "").trim()) {
      return "City or region is required.";
    }

    return "";
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function runReport() {
    const reportId = selectedReport;
    const err = validate(reportId);

    if (err) {
      toast(err, "error");
      return;
    }

    setLoading(true);

    try {
      const f = forms[reportId] || {};
      let response;

      if (reportId === "r1") response = await reportDriversFiltered(f);
      if (reportId === "r2") response = await reportVehiclesByDriver(f.license.trim());
      if (reportId === "r3") response = await reportExpiredRegistrations(f.date);
      if (reportId === "r4") response = await reportExpiredDrivers();
      if (reportId === "r5") {
        response = await reportViolationsByDriver({
          license: f.license.trim(),
          start: f.start,
          end: f.end,
        });
      }
      if (reportId === "r6") response = await reportViolationCount(f.year);
      if (reportId === "r7") response = await reportVehiclesByRegion(f.region.trim());

      setResults((prev) => ({
        ...prev,
        [reportId]: response,
      }));

      toast("Report generated.");
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [reportId]: {
          data: [],
          sql: "",
          error: e.message,
        },
      }));

      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Dynamic Report Form Renderer ───────────────────────────────────────────

  function renderForm() {
    const f = forms[selectedReport] || {};

    if (selectedReport === "r1") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              License Type
            </label>
            <select className="input" value={f.type} onChange={(e) => patchForm("r1", "type", e.target.value)}>
              {LICENSE_TYPES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              License Status
            </label>
            <select className="input" value={f.status} onChange={(e) => patchForm("r1", "status", e.target.value)}>
              {LICENSE_STATUSES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Age Range (years)
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#86868B", fontWeight: 700 }}>From</span>

              <input
                className="input"
                type="number"
                min="0"
                placeholder="18"
                value={f.min}
                onChange={(e) => patchForm("r1", "min", e.target.value)}
              />

              <span style={{ fontSize: 12, color: "#86868B", fontWeight: 700 }}>to</span>

              <input
                className="input"
                type="number"
                min="0"
                placeholder="60"
                value={f.max}
                onChange={(e) => patchForm("r1", "max", e.target.value)}
              />
            </div>

            <div style={{ marginTop: 6, fontSize: 12, color: "#86868B" }}>
              Age is computed from Date of Birth as of today.
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Sex
            </label>
            <select className="input" value={f.sex} onChange={(e) => patchForm("r1", "sex", e.target.value)}>
              {SEXES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    if (selectedReport === "r2") {
      return (
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            Driver (Search by name or license)
          </label>

          <AsyncAutocompleteInput
            value={f.license}
            onChange={(v) => patchForm("r2", "license", v)}
            placeholder="Type at least 2 chars (name or license)..."
            fetchOptions={(q) => searchDrivers(q, 10)}
            getLabel={(d) => `${driverName(d)} — ${d.license_number}`}
            getValue={(d) => d.license_number}
            onPick={(license) => patchForm("r2", "license", license)}
          />

          <div style={{ marginTop: 6, fontSize: 12, color: "#86868B" }}>
            Tip: You can type “Juan” or “D06-11-009385”.
          </div>
        </div>
      );
    }

    if (selectedReport === "r3") {
      return (
        <div style={{ maxWidth: 280 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            As of Date
          </label>
          <input
            className="input"
            type="date"
            value={f.date}
            onChange={(e) => patchForm("r3", "date", e.target.value)}
          />
        </div>
      );
    }

    if (selectedReport === "r4") {
      return (
        <div className="softNote">
          No filters required. Click Generate Report to view all expired or suspended drivers.
        </div>
      );
    }

    if (selectedReport === "r5") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Driver (Search by name or license)
            </label>

            <AsyncAutocompleteInput
              value={f.license}
              onChange={(v) => patchForm("r5", "license", v)}
              placeholder="Type at least 2 chars (name or license)..."
              fetchOptions={(q) => searchDrivers(q, 10)}
              getLabel={(d) => `${driverName(d)} — ${d.license_number}`}
              getValue={(d) => d.license_number}
              onPick={(license) => patchForm("r5", "license", license)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Start Date
            </label>
            <input
              className="input"
              type="date"
              value={f.start}
              onChange={(e) => patchForm("r5", "start", e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              End Date
            </label>
            <input
              className="input"
              type="date"
              value={f.end}
              onChange={(e) => patchForm("r5", "end", e.target.value)}
            />
          </div>
        </div>
      );
    }

    if (selectedReport === "r6") {
      return (
        <div style={{ maxWidth: 220 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            Year
          </label>
          <input
            className="input"
            placeholder="2026"
            value={f.year}
            onChange={(e) => patchForm("r6", "year", e.target.value)}
          />
        </div>
      );
    }

    if (selectedReport === "r7") {
      return (
        <div style={{ maxWidth: 360 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            City or Region
          </label>
          <input
            className="input"
            placeholder="Quezon City"
            value={f.region}
            onChange={(e) => patchForm("r7", "region", e.target.value)}
          />
        </div>
      );
    }

    return null;
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

          <div className="dateTime">
            <div className="dateText">{dateStr}</div>
            <div className="timeText">{timeStr}</div>
          </div>

          <div className="avatar">A</div>
        </div>
      </div>

      <div className="headerRow">
        <div>
          <div className="pageTitle">Reports</div>
          <div className="pageSub">Generate SQL-based LTO reports</div>
        </div>
      </div>

      {driverLoadError && (
        <div className="card">
          <div className="softNote softNoteErr">
            Driver suggestions could not be loaded: {driverLoadError}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 22 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#1D1D1F" }}>
            Select Report Type
          </div>
          <div style={{ color: "#86868B", fontSize: 13, marginTop: 4 }}>
            Choose one report to configure and generate.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          {REPORTS.map((report) => {
            const active = selectedReport === report.id;

            return (
              <button
                key={report.id}
                onClick={() => {
                  setSelectedReport(report.id);
                }}
                style={{
                  textAlign: "left",
                  border: active ? "2px solid #4A8FF9" : "1.5px solid #E5E5EA",
                  background: active ? "rgba(74,143,249,0.08)" : "#fff",
                  borderRadius: 18,
                  padding: 16,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: active ? "0 12px 28px rgba(74,143,249,0.12)" : "none",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: active ? "#4A8FF9" : "#F5F7FA",
                      color: active ? "#fff" : "#4A8FF9",
                    }}
                  >
                    {(() => {
                      const Icon = report.icon;
                      return <Icon size={20} />;
                    })()}
                  </div>

                  <div>
                    <div
                      style={{
                        color: active ? "#4A8FF9" : "#1D1D1F",
                        fontWeight: 900,
                        fontSize: 14,
                      }}
                    >
                      {report.title}
                    </div>
                    <div style={{ color: "#86868B", fontSize: 12, marginTop: 5, lineHeight: 1.35 }}>
                      {report.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div className="tableTitleRow">
          <div>
            <div className="tableTitle">{activeReport.title}</div>
            <div style={{ color: "#86868B", fontSize: 13, marginTop: 4 }}>
              {activeReport.description}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>{renderForm()}</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <button className="primaryBtn" onClick={runReport} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {activeResult?.error && (
          <div className="msgError" style={{ marginTop: 14 }}>
            {activeResult.error}
          </div>
        )}

        {activeResult && (
          <div style={{ marginTop: 18 }}>
            <ReportTable rows={activeResult.data || []} />
          </div>
        )}

        {/* ── SQL preview ── */}
        {showSql && (
          <div
            className="card codeCard"
            style={{
              marginTop: 14,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          >
            <div className="codeLabel" style={{ fontSize: 12, color: "#86868B", marginBottom: 8 }}>
              SQL used
            </div>
            <pre className="codePre" style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
              {activeResult?.sql
                ? activeResult.sql.trim()
                : "Generate a report first to show the exact SQL used."}
            </pre>
          </div>
        )}
      </div>

      <ToastList toasts={toasts} onDismiss={dismiss} />
    </PageShell>
  );
}