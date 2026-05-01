import React, { useEffect, useMemo, useState } from "react";
import { listTickets, createTicket } from "../api/tickets";
import { listViolations, createViolation } from "../api/violations";
import "./Violations.css";

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
  if (!dtString) return { date: "—", time: "" };
  const iso = dtString.includes("T") ? dtString : dtString.replace(" ", "T");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: dtString, time: "" };

  const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function toMysqlDateTime(datetimeLocalValue) {
  // input type="datetime-local" gives "YYYY-MM-DDTHH:MM"
  // backend expects "YYYY-MM-DD HH:MM:SS"
  if (!datetimeLocalValue) return "";
  const s = datetimeLocalValue.replace("T", " ");
  return s.length === 16 ? `${s}:00` : s; // add seconds if missing
}

function safeIdPart(s) {
  return String(s || "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function genViolationId(ticketId, idx) {
  const t = safeIdPart(ticketId);
  return `V-${t}-${idx + 1}`;
}

function StatusPill({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "statusPill";
  if (s === "unpaid") cls += " statusUnpaid";
  else if (s === "paid") cls += " statusPaid";
  else if (s === "contested") cls += " statusContested";
  return <span className={cls}>{s || "—"}</span>;
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="searchWrap">
      <svg className="searchIcon" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
          stroke="#86868B"
          strokeWidth="2"
        />
        <path d="M16.5 16.5 21 21" stroke="#86868B" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input className="searchInput" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function Violations() {
  const [query, setQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [err, setErr] = useState("");
  const [showSql, setShowSql] = useState(false);

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [violations, setViolations] = useState([]);
  const [loadingViolations, setLoadingViolations] = useState(false);

  const [msg, setMsg] = useState("");
  const [msgErr, setMsgErr] = useState("");

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);

  // Step 1: Ticket form 
  const [ticketForm, setTicketForm] = useState({
    ticket_id: "",
    datetime_local: "", // for input type datetime-local
    issued_at: "",
    apprehending_officer: "",
    license_number: "",
    plate_number: "",
    engine_number: "",
    chassis_number: "",
    violation_status: "unpaid", // required by backend
  });

  // Step 2: Violations list in modal 
  const [modalViolations, setModalViolations] = useState([
    { name: "", fine: "" }, // start with 1 row
  ]);

  const modalTotalFine = useMemo(() => {
    return modalViolations.reduce((sum, v) => {
      const n = Number(v.fine);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [modalViolations]);

  async function refreshTickets() {
    setLoadingTickets(true);
    setErr("");
    try {
      const rows = await listTickets();
      const mapped = (rows || []).map((t) => ({
        ticket_id: t.ticket_id,
        driver_name: t.driver_name || t.license_number || "—",
        driver_license: t.license_number || "—",
        plate_number: t.plate_number || "—",
        vehicle_label: t.vehicle_label || "—",
        datetime: t.datetime,
        issued_at: t.issued_at,
        total_fine: t.total_fine ?? null,
        violation_status: t.violation_status,
        engine_number: t.engine_number,
        chassis_number: t.chassis_number,
      }));
      setTickets(mapped);
    } catch (e) {
      setTickets(demoTickets);
      setErr(e.message);
    } finally {
      setLoadingTickets(false);
    }
  }

  async function loadViolations(ticketId) {
    if (!ticketId) return;
    setLoadingViolations(true);
    setMsg("");
    setMsgErr("");
    try {
      const rows = await listViolations(ticketId);
      setViolations(rows || []);
    } catch (e) {
      setViolations([]);
      setMsgErr(e.message);
    } finally {
      setLoadingViolations(false);
    }
  }

  useEffect(() => {
    refreshTickets();
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

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return tickets.find((t) => t.ticket_id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  function resetCreateModal() {
    setTicketForm({
      ticket_id: "",
      datetime_local: "",
      issued_at: "",
      apprehending_officer: "",
      license_number: "",
      plate_number: "",
      engine_number: "",
      chassis_number: "",
      violation_status: "unpaid",
    });
    setModalViolations([{ name: "", fine: "" }]);
  }

  function openCreateModal() {
    setMsg("");
    setMsgErr("");
    resetCreateModal();
    setCreateOpen(true);
  }

  function addViolationRow() {
    setModalViolations((prev) => [...prev, { name: "", fine: "" }]);
  }

  function updateViolationRow(idx, patch) {
    setModalViolations((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }

  function removeViolationRow(idx) {
    setModalViolations((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitCreateTicketWithViolations() {
    setMsg("");
    setMsgErr("");

    // Validate Step 1 required fields
    const required = [
      ["ticket_id", ticketForm.ticket_id],
      ["datetime", ticketForm.datetime_local],
      ["issued_at", ticketForm.issued_at],
      ["license_number", ticketForm.license_number],
      ["plate_number", ticketForm.plate_number],
      ["engine_number", ticketForm.engine_number],
      ["chassis_number", ticketForm.chassis_number],
    ];
    for (const [label, value] of required) {
      if (!value || String(value).trim() === "") {
        setMsgErr(`Missing required field: ${label}`);
        return;
      }
    }

    // Validate Step 2: at least one valid violation
    const cleaned = modalViolations
      .map((v) => ({ name: (v.name || "").trim(), fine: (v.fine || "").trim() }))
      .filter((v) => v.name.length > 0 || v.fine.length > 0);

    if (cleaned.length === 0) {
      setMsgErr("Please add at least one violation (name + fine).");
      return;
    }

    for (let i = 0; i < cleaned.length; i++) {
      const v = cleaned[i];
      if (!v.name) {
        setMsgErr(`Violation ${i + 1}: name is required.`);
        return;
      }
      const fine = Number(v.fine);
      if (!Number.isFinite(fine) || fine < 0) {
        setMsgErr(`Violation ${i + 1}: fine must be a valid number (>= 0).`);
        return;
      }
    }

    const ticketPayload = {
      ticket_id: ticketForm.ticket_id.trim(),
      datetime: toMysqlDateTime(ticketForm.datetime_local),
      violation_status: ticketForm.violation_status,
      issued_at: ticketForm.issued_at.trim(),
      apprehending_officer: ticketForm.apprehending_officer.trim() || null,
      license_number: ticketForm.license_number.trim(),
      plate_number: ticketForm.plate_number.trim(),
      engine_number: ticketForm.engine_number.trim(),
      chassis_number: ticketForm.chassis_number.trim(),
    };

    try {
      // 1) Create ticket
      await createTicket(ticketPayload);

      // 2) Create violations under ticket 
      for (let i = 0; i < cleaned.length; i++) {
        const v = cleaned[i];
        await createViolation({
          violation_id: genViolationId(ticketPayload.ticket_id, i),
          name: v.name,
          corresponding_fine_amount: Number(v.fine),
          ticket_id: ticketPayload.ticket_id,
        });
      }

      setMsg("Ticket created with violations.");
      setCreateOpen(false);

      // Refresh UI
      await refreshTickets();
      setSelectedTicketId(ticketPayload.ticket_id);
      await loadViolations(ticketPayload.ticket_id);
    } catch (e) {
      setMsgErr(e.message);
    }
  }

  return (
    <div className="violationsContainer">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brandTitle">LTO IMS</div>
          <div className="brandSub">Information Management</div>
        </div>

        <div className="nav">
          {[
            { label: "Dashboard", active: false },
            { label: "Drivers", active: false },
            { label: "Vehicles", active: false },
            { label: "Registrations", active: false },
            { label: "Violations", active: true },
            { label: "Reports", active: false },
          ].map((item) => (
            <div key={item.label} className={`navItem ${item.active ? "navItemActive" : ""}`}>
              <span>{item.label}</span>
              {item.active ? <span className="navChevron">›</span> : null}
            </div>
          ))}
        </div>

        <div className="sidebarFooter">
          <div className="avatarCircle">A</div>
          <div>
            <div className="userName">Admin User</div>
            <div className="userRole">Administrator</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Top bar */}
        <div className="topBar">
          <div className="topSearch">
            <SearchInput value={query} onChange={setQuery} placeholder="Search..." />
          </div>

          <div className="topRight">
            <button className="codeBtn" onClick={() => setShowSql((v) => !v)} title="Show SQL">
              {"</>"}
            </button>

            <div className="dateTime">
              <div className="dateText">
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" })}
              </div>
              <div className="timeText">
                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            <div className="avatarCircle small">A</div>
          </div>
        </div>

        {/* Header */}
        <div className="headerRow">
          <div>
            <div className="pageTitle">Violation Management</div>
            <div className="pageSub">Track and manage traffic violation tickets</div>
          </div>

          <button className="primaryBtn" onClick={openCreateModal}>
            <span className="plus">+</span> Create Ticket
          </button>
        </div>

        {/* Secondary Search */}
        <div className="card">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by ticket ID, driver, or vehicle..." />
          {err ? (
            <div className="softNote">
              Using demo data (API not reachable): <span className="softNoteErr">{err}</span>
            </div>
          ) : null}
        </div>

        {/* Tickets table */}
        <div className="card tableCard">
          <div className="tableTitleRow">
            <div className="tableTitle">{loadingTickets ? "Loading tickets..." : `Tickets (${filtered.length})`}</div>
            {msg ? <div className="msgSuccess">{msg}</div> : null}
            {msgErr ? <div className="msgError">{msgErr}</div> : null}
          </div>

          <div className="tableHeader">
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
              <div className="tableRow" key={t.ticket_id}>
                <div className="ticketId">{t.ticket_id}</div>

                <div className="cellCol">
                  <div className="cellStrong">{t.driver_name}</div>
                  <div className="cellMuted">{t.driver_license}</div>
                </div>

                <div className="cellCol">
                  <div className="cellStrong">{t.plate_number}</div>
                  <div className="cellMuted">{t.vehicle_label}</div>
                </div>

                <div className="cellCol">
                  <div className="cellStrong">{date}</div>
                  <div className="cellMuted">{time}</div>
                </div>

                <div className="cell">{t.issued_at}</div>

                <div className="fineCell">{formatMoney(t.total_fine)}</div>

                <div className="cell">
                  <StatusPill status={t.violation_status} />
                </div>

                <div className="cell">
                  <button
                    className="linkBtn"
                    onClick={async () => {
                      setSelectedTicketId(t.ticket_id);
                      await loadViolations(t.ticket_id);
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}

          {!loadingTickets && filtered.length === 0 ? <div className="emptyState">No tickets found.</div> : null}
        </div>

        {/* Details panel */}
        {selectedTicketId ? (
          <div className="card">
            <div className="detailsHeader">
              <div className="detailsTitle">
                Ticket Details: <span className="detailsId">{selectedTicketId}</span>
              </div>
              <button
                className="linkBtn muted"
                onClick={() => {
                  setSelectedTicketId(null);
                  setViolations([]);
                }}
              >
                Close
              </button>
            </div>

            {selectedTicket ? (
              <div className="detailsMeta">
                <div>
                  <span className="metaLabel">Driver:</span> {selectedTicket.driver_license}
                </div>
                <div>
                  <span className="metaLabel">Vehicle:</span> {selectedTicket.plate_number}
                </div>
                <div>
                  <span className="metaLabel">Location:</span> {selectedTicket.issued_at}
                </div>
                <div>
                  <span className="metaLabel">Status:</span> {selectedTicket.violation_status}
                </div>
              </div>
            ) : null}

            <div className="detailsBody">
              <div className="detailsSectionTitle">Violations</div>

              {loadingViolations ? (
                <div className="softNote">Loading violations...</div>
              ) : violations.length === 0 ? (
                <div className="softNote">No violations yet.</div>
              ) : (
                <ul className="violationList">
                  {violations.map((v) => (
                    <li key={v.violation_id}>
                      <b>{v.name}</b> — ₱{Number(v.corresponding_fine_amount).toLocaleString("en-PH")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {/* SQL preview */}
        {showSql ? (
          <div className="card codeCard">
            <div className="codeLabel">SQL used</div>
            <pre className="codePre">
{`-- List tickets
SELECT *
FROM violation_ticket
ORDER BY datetime DESC;

-- Create ticket
INSERT INTO violation_ticket (...) VALUES (...);

-- Add violation
INSERT INTO violation (...) VALUES (...);

-- List violations by ticket
SELECT *
FROM violation
WHERE ticket_id = ?;`}
            </pre>
          </div>
        ) : null}

        {/* Create Ticket Modal */}
        {createOpen ? (
          <div className="modalOverlay" onClick={() => setCreateOpen(false)}>
            <div className="modal wide" onClick={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <div className="modalTitle">Create Violation Ticket</div>
                <button className="modalClose" onClick={() => setCreateOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modalDivider" />

              {/* Step 1 */}
              <div className="stepBox stepBlue">
                <div className="stepTitle">Step 1: Ticket Information</div>

                <div className="formGrid2">
                  <div className="field">
                    <label>Ticket ID</label>
                    <input
                      className="input"
                      placeholder="VIO-2024-001"
                      value={ticketForm.ticket_id}
                      onChange={(e) => setTicketForm({ ...ticketForm, ticket_id: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Date & Time</label>
                    <input
                      className="input"
                      type="datetime-local"
                      value={ticketForm.datetime_local}
                      onChange={(e) => setTicketForm({ ...ticketForm, datetime_local: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Issued At (City/Region)</label>
                    <input
                      className="input"
                      placeholder="Makati City, NCR"
                      value={ticketForm.issued_at}
                      onChange={(e) => setTicketForm({ ...ticketForm, issued_at: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Apprehending Officer (Optional)</label>
                    <input
                      className="input"
                      placeholder="Officer Name"
                      value={ticketForm.apprehending_officer}
                      onChange={(e) => setTicketForm({ ...ticketForm, apprehending_officer: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Driver (License Number)</label>
                    <input
                      className="input"
                      placeholder="D06-11-009385"
                      value={ticketForm.license_number}
                      onChange={(e) => setTicketForm({ ...ticketForm, license_number: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Vehicle (Plate / Engine / Chassis)</label>
                    <div className="vehicleTriple">
                      <input
                        className="input"
                        placeholder="Plate"
                        value={ticketForm.plate_number}
                        onChange={(e) => setTicketForm({ ...ticketForm, plate_number: e.target.value })}
                      />
                      <input
                        className="input"
                        placeholder="Engine"
                        value={ticketForm.engine_number}
                        onChange={(e) => setTicketForm({ ...ticketForm, engine_number: e.target.value })}
                      />
                      <input
                        className="input"
                        placeholder="Chassis"
                        value={ticketForm.chassis_number}
                        onChange={(e) => setTicketForm({ ...ticketForm, chassis_number: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* keep status hidden but still controllable */}
                <div className="hiddenRow">
                  <label>Status</label>
                  <select
                    className="input"
                    value={ticketForm.violation_status}
                    onChange={(e) => setTicketForm({ ...ticketForm, violation_status: e.target.value })}
                  >
                    <option value="unpaid">unpaid</option>
                    <option value="paid">paid</option>
                    <option value="contested">contested</option>
                  </select>
                </div>
              </div>

              {/* Step 2 */}
              <div className="stepBox stepRed">
                <div className="stepRow">
                  <div className="stepTitle red">Step 2: Add Violations</div>
                  <button className="addBtn" onClick={addViolationRow}>
                    + Add Violation
                  </button>
                </div>

                <div className="violationsRows">
                  {modalViolations.map((v, idx) => (
                    <div className="violationRow" key={idx}>
                      <div className="violationRowTop">
                        <div className="violationLabel">
                          <span className="warnIcon">⚠</span> Violation {idx + 1}
                        </div>
                        {modalViolations.length > 1 ? (
                          <button className="removeBtn" onClick={() => removeViolationRow(idx)}>
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <div className="violationInputs">
                        <input
                          className="input"
                          placeholder="Violation Name"
                          value={v.name}
                          onChange={(e) => updateViolationRow(idx, { name: e.target.value })}
                        />
                        <input
                          className="input"
                          placeholder="Fine Amount"
                          value={v.fine}
                          onChange={(e) => updateViolationRow(idx, { fine: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="totalFine">
                  <div className="totalFineLabel">Total Fine Amount</div>
                  <div className="totalFineValue">{formatMoney(modalTotalFine)}</div>
                </div>
              </div>

              {/* Messages */}
              {msgErr ? <div className="msgError modalMsg">{msgErr}</div> : null}
              {msg ? <div className="msgSuccess modalMsg">{msg}</div> : null}

              <div className="modalFooter">
                <button
                  className="secondaryBtn"
                  onClick={() => {
                    setCreateOpen(false);
                    resetCreateModal();
                  }}
                >
                  Cancel
                </button>
                <button className="primaryBtn" onClick={submitCreateTicketWithViolations}>
                  Create Ticket
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}