// ─────────────────────────────────────────────────────────────────────────────
// Reports.jsx — SQL-based Reports page
// Lets the user select one of the 7 required reports, provide filters,
// generate report output, and show the exact SQL used.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import {
  reportDriversFiltered,
  reportVehiclesByDriver,
  reportExpiredRegistrations,
  reportExpiredDrivers,
  reportViolationsByDriver,
  reportViolationCount,
  reportVehiclesByRegion,
} from "../api/reports";
import { searchDrivers } from "../api/drivers";
import PageShell from "../components/PageShell";
import { useToast, ToastList } from "../components/Toast";
import AsyncAutocompleteInput from "../components/AsyncAutocompleteInput";
import {
  FaUser,
  FaCar,
  FaCalendarDays,
  FaTriangleExclamation,
  FaReceipt,
  FaChartColumn,
  FaLocationDot,
} from "react-icons/fa6";
import "./Reports.css";

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
    <div className="reportsTableScroll">
      <table className="reportsTable">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{labelForKey(c)}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td key={c}>{formatCell(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="reportsFieldLabel">{children}</label>;
}

function DriverSearchInput({ value, onChange, onPick }) {
  return (
    <AsyncAutocompleteInput
      value={value}
      onChange={onChange}
      placeholder="Type at least 2 chars (name or license)..."
      fetchOptions={(q) => searchDrivers(q, 10)}
      getLabel={(d) => `${driverName(d)} — ${d.license_number}`}
      getValue={(d) => d.license_number}
      onPick={onPick}
    />
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
        <div className="reportsFormGrid reportsFormGridTwo">
          <div>
            <FieldLabel>License Type</FieldLabel>
            <select className="input" value={f.type} onChange={(e) => patchForm("r1", "type", e.target.value)}>
              {LICENSE_TYPES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>License Status</FieldLabel>
            <select className="input" value={f.status} onChange={(e) => patchForm("r1", "status", e.target.value)}>
              {LICENSE_STATUSES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Age Range (years)</FieldLabel>

            <div className="reportsAgeRange">
              <span>From</span>

              <input
                className="input"
                type="number"
                min="0"
                placeholder="18"
                value={f.min}
                onChange={(e) => patchForm("r1", "min", e.target.value)}
              />

              <span>to</span>

              <input
                className="input"
                type="number"
                min="0"
                placeholder="60"
                value={f.max}
                onChange={(e) => patchForm("r1", "max", e.target.value)}
              />
            </div>

            <div className="reportsHelpText">
              Age is computed from Date of Birth as of today.
            </div>
          </div>

          <div>
            <FieldLabel>Sex</FieldLabel>
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
        <div className="reportsNarrowField">
          <FieldLabel>Driver (Search by name or license)</FieldLabel>

          <DriverSearchInput
            value={f.license}
            onChange={(v) => patchForm("r2", "license", v)}
            onPick={(license) => patchForm("r2", "license", license)}
          />

          <div className="reportsHelpText">
            Tip: You can type “Juan” or “D06-11-009385”.
          </div>
        </div>
      );
    }

    if (selectedReport === "r3") {
      return (
        <div className="reportsSmallField">
          <FieldLabel>As of Date</FieldLabel>
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
        <div className="reportsFormGrid reportsViolationDriverGrid">
          <div>
            <FieldLabel>Driver (Search by name or license)</FieldLabel>

            <DriverSearchInput
              value={f.license}
              onChange={(v) => patchForm("r5", "license", v)}
              onPick={(license) => patchForm("r5", "license", license)}
            />
          </div>

          <div>
            <FieldLabel>Start Date</FieldLabel>
            <input
              className="input"
              type="date"
              value={f.start}
              onChange={(e) => patchForm("r5", "start", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>End Date</FieldLabel>
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
        <div className="reportsTinyField">
          <FieldLabel>Year</FieldLabel>
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
        <div className="reportsMediumField">
          <FieldLabel>City or Region</FieldLabel>
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
            className="codeBtn reportsCodeBtn"
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
          <div className="pageTitle">Reports</div>
          <div className="pageSub">Generate SQL-based LTO reports</div>
        </div>
      </div>

      <div className="card reportsSelectorCard">
        <div className="reportsSectionIntro">
          <div className="reportsSectionTitle">Select Report Type</div>
          <div className="reportsSectionSub">Choose one report to configure and generate.</div>
        </div>

        <div className="reportsCardGrid">
          {REPORTS.map((report) => {
            const active = selectedReport === report.id;
            const Icon = report.icon;

            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`reportsReportCard${active ? " active" : ""}`}
              >
                <div className="reportsReportCardInner">
                  <div className="reportsReportIcon">
                    <Icon size={20} />
                  </div>

                  <div>
                    <div className="reportsReportTitle">{report.title}</div>
                    <div className="reportsReportDescription">{report.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card reportsOutputCard">
        <div className="tableTitleRow">
          <div>
            <div className="tableTitle">{activeReport.title}</div>
            <div className="reportsActiveDescription">{activeReport.description}</div>
          </div>
        </div>

        <div className="reportsFormArea">{renderForm()}</div>

        <div className="reportsActionRow">
          <button className="primaryBtn" onClick={runReport} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {activeResult?.error && (
          <div className="msgError reportsResultError">
            {activeResult.error}
          </div>
        )}

        {activeResult && (
          <div className="reportsResultArea">
            <ReportTable rows={activeResult.data || []} />
          </div>
        )}

        {/* ── SQL preview ── */}
        {showSql && (
          <div className="card codeCard reportsCodeCard">
            <div className="codeLabel reportsCodeLabel">SQL used</div>
            <pre className="codePre reportsCodePre">
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
