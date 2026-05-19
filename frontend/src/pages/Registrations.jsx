// ─────────────────────────────────────────────────────────────────────────────
// Registrations.jsx — Vehicle Registration Management page
// Shows the latest/current registration per vehicle, registration history,
// add-registration modal, and SQL preview toggle.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { listVehicles } from "../api/vehicles";
import {
  listRegistrationsRaw,
  createRegistrationRaw,
} from "../api/registrations";
import PageShell from "../components/PageShell";
import { useToast, ToastList } from "../components/Toast";
import SearchInput from "../components/SearchInput";
import AutocompleteInput from "../components/AutocompleteInput";
import "./Registrations.css";

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

function normalizeVehicleKey(value) {
  return String(value || "").trim().toUpperCase();
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
  let cls = "registrationStatusPill";

  if (s === "active") cls += " registrationStatusPill--active";
  if (s === "expired") cls += " registrationStatusPill--expired";
  if (s === "suspended") cls += " registrationStatusPill--suspended";

  return <span className={cls}>{s || "—"}</span>;
}

function HistoryButton({ onClick }) {
  return (
    <button className="registrationHistoryBtn" onClick={onClick}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12a9 9 0 1 0 3-6.7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M3 4v6h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 7v5l3 2"
          stroke="currentColor"
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
    const normalizedPlate = normalizeVehicleKey(plate);
    const selectedVehicle = vehicleMap[normalizedPlate];

    setForm((prev) => ({
      ...prev,
      plate_number: normalizedPlate,
      engine_number: normalizeVehicleKey(selectedVehicle?.engine_number || ""),
      chassis_number: normalizeVehicleKey(selectedVehicle?.chassis_number || ""),
    }));
  }

  function validateForm() {
    const plateNumber = normalizeVehicleKey(form.plate_number);
    const engineNumber = normalizeVehicleKey(form.engine_number);
    const chassisNumber = normalizeVehicleKey(form.chassis_number);
    const registrationStatus = String(form.registration_status || "").trim().toLowerCase();

    const required = [
      ["Registration number", form.registration_number],
      ["Vehicle", plateNumber],
      ["Engine number", engineNumber],
      ["Chassis number", chassisNumber],
      ["Registration date", form.registration_date],
      ["Expiration date", form.expiration_date],
      ["Registration status", registrationStatus],
    ];

    for (const [label, value] of required) {
      if (!value || !String(value).trim()) return `${label} is required.`;
    }

    if (form.expiration_date <= form.registration_date) {
      return "Expiration date must be after registration date.";
    }

    if (!REGISTRATION_STATUSES.includes(registrationStatus)) {
      return "Registration status must be active, expired, or suspended.";
    }

    const selectedVehicle = vehicleMap[plateNumber];

    if (!selectedVehicle) {
      return "Vehicle not found. Choose a vehicle from the search suggestions.";
    }

    if (
      normalizeVehicleKey(selectedVehicle.engine_number) !== engineNumber ||
      normalizeVehicleKey(selectedVehicle.chassis_number) !== chassisNumber
    ) {
      return "Vehicle identity mismatch. Plate, engine, and chassis must belong to the same vehicle.";
    }

    if (
      registrationStatus === "active" &&
      registrations.some(
        (r) =>
          normalizeVehicleKey(r.plate_number) === plateNumber &&
          normalizeVehicleKey(r.engine_number) === engineNumber &&
          normalizeVehicleKey(r.chassis_number) === chassisNumber &&
          String(r.registration_status || "").toLowerCase() === "active"
      )
    ) {
      return "This vehicle already has an active registration.";
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

    const registrationStatus = String(form.registration_status || "").trim().toLowerCase();

    setSubmitting(true);

    try {
      const response = await createRegistrationRaw({
        registration_number: normalizeVehicleKey(form.registration_number),
        registration_date: form.registration_date,
        expiration_date: form.expiration_date,
        registration_status: registrationStatus,
        plate_number: normalizeVehicleKey(form.plate_number),
        engine_number: normalizeVehicleKey(form.engine_number),
        chassis_number: normalizeVehicleKey(form.chassis_number),
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
            <div className="registrationTableSubtitle">
              Latest registration record per vehicle
            </div>
          </div>
        </div>

        <div className="registrationTableScroll">
          <div className="registrationTableHeader registrationStickyHeader">
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
                <div className="registrationTableRow" key={r.registration_number}>
                  <div className="registrationMono registrationStrong">
                    {r.registration_number}
                  </div>

                  <div className="registrationStack">
                    <div className="registrationStrong">{r.plate_number}</div>
                    <div className="registrationMuted">
                      {vehicleName(v)} • {v.vehicle_type || "—"}
                    </div>
                  </div>

                  <div className="registrationStack">
                    <div className="registrationOwnerName">{driverName(v)}</div>
                    <div className="registrationMuted registrationMono">
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
        <div className="modalOverlay">
          <div className="registrationModal" onClick={(e) => e.stopPropagation()}>
            <div className="registrationModalHeader">
              <div>
                <div className="registrationModalTitle">
                  Add Registration
                </div>
                <div className="registrationModalSub">
                  Record a new vehicle registration or renewal
                </div>
              </div>

              <button className="modalCloseBtn" onClick={() => setAddOpen(false)}>
                ✕
              </button>
            </div>

            <div className="registrationModalBody">
              <div>
                <div className="registrationSectionTitle">
                  Vehicle Information
                </div>

                <div className="registrationFormStack">
                  <div>
                    <label className="registrationLabel">
                      Vehicle (Search by plate / make-model / owner)
                    </label>

                    <AutocompleteInput
                      value={form.plate_number}
                      onChange={(text) => {
                        const plate = normalizeVehicleKey(text);
                        patchForm("plate_number", plate);
                        if (vehicleMap[plate]) selectVehicle(plate);
                      }}
                      placeholder="Type plate (e.g. ABC-1234) or owner name..."
                      options={vehicles}
                      getLabel={(v) => `${v.plate_number} — ${vehicleName(v)} — ${driverName(v)}`}
                      getValue={(v) => v.plate_number}
                      onPick={(plate) => selectVehicle(plate)}
                    />
                  </div>

                  <div className="registrationFormGrid2">
                    <div>
                      <label className="registrationLabel">
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
                      <label className="registrationLabel">
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
                <div className="registrationSectionTitle">
                  Registration Details
                </div>

                <div className="registrationFormGrid2">
                  <div>
                    <label className="registrationLabel">
                      Registration Number
                    </label>
                    <input
                      className="input"
                      value={form.registration_number}
                      onChange={(e) => patchForm("registration_number", e.target.value)}
                      placeholder="REG-20260515-Y62J"
                    />
                  </div>

                  <div>
                    <label className="registrationLabel">
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
                    <label className="registrationLabel">
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
                    <label className="registrationLabel">
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

            <div className="registrationModalFooter">
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
        <div className="modalOverlay">
          <div className="registrationHistoryModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="modalTitle">Registration History</div>
                <div className="registrationHistorySub">
                  {historyVehicle.plate_number} — {vehicleName(historyVehicle)}
                </div>
              </div>
              <button className="modalCloseBtn" onClick={() => setHistoryOpen(false)}>
                ✕
              </button>
            </div>

            <div className="registrationHistoryTableWrap">
              <div className="registrationHistoryHeader">
                <div>Registration No.</div>
                <div>Registration Date</div>
                <div>Expiration Date</div>
                <div>Status</div>
              </div>

              {historyRows.map((r) => (
                <div className="registrationHistoryRow" key={r.registration_number}>
                  <div className="registrationMono registrationStrong">
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
