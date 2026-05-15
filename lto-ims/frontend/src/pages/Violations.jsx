import React, { useEffect, useMemo, useState } from "react";
import { listTickets, createTicketWithViolations, updateTicketStatus } from "../api/tickets";
import { listViolations, getViolationCatalog } from "../api/violations";
import { listVehicles } from "../api/vehicles";
import PageShell from "../components/PageShell";
import { useToast, ToastList } from "../components/Toast";
import { formatDateTime, formatMoney } from "../utils";
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

const SHOW_SQL = (import.meta.env.VITE_SHOW_SQL || "false") === "true";

function toMysqlDateTime(datetimeLocalValue) {
  if (!datetimeLocalValue) return "";
  const s = datetimeLocalValue.replace("T", " ");
  return s.length === 16 ? `${s}:00` : s;
}

function genViolationId(ticketId, idx) {
  // Use last 8 digits from ticket (usually date), a 2-digit sequence, and a 4-char random suffix
  const digits = String(ticketId || "").replace(/\D/g, "").slice(-8) || "00000000";
  const seq = String(idx + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase(); // 4 chars
  // Length: 1 + 8 + 2 + 4 = 15 (fits in VARCHAR(20))
  return `V${digits}${seq}${rand}`;
}

/*
 * Generates a unique ticket ID using the current date + a 4-char random suffix.
 * The user can still edit it if they need a specific format.
 */
function genTicketId() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VIO-${date}-${rand}`;
}

const STATUS_LABELS = { paid: "Paid", unpaid: "Unpaid", contested: "Contested" };

function StatusPill({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "statusPill";
  if (s === "unpaid") cls += " statusUnpaid";
  else if (s === "paid") cls += " statusPaid";
  else if (s === "contested") cls += " statusContested";
  return <span className={cls}>{STATUS_LABELS[s] || s || "—"}</span>;
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="searchWrap">
      <svg className="searchIcon" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="#86868B" strokeWidth="2" />
        <path d="M16.5 16.5 21 21" stroke="#86868B" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input className="searchInput" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

const emptyTicketForm = {
  ticket_id: "",
  datetime_local: "",
  issued_at: "",
  apprehending_officer: "",
  license_number: "",
  plate_number: "",
  engine_number: "",
  chassis_number: "",
  violation_status: "unpaid",
};

export default function Violations() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [query, setQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [apiErr, setApiErr] = useState("");
  const [showSql, setShowSql] = useState(false);

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [violations, setViolations] = useState([]);
  const [loadingViolations, setLoadingViolations] = useState(false);

  // details popup
  const [detailsOpen, setDetailsOpen] = useState(false);

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState(emptyTicketForm);
  const [modalViolations, setModalViolations] = useState([{ name: "", fine: "" }]);
  const [modalErr, setModalErr] = useState("");
  const [creating, setCreating] = useState(false);

  // Vehicles list used for plate → engine/chassis auto-fill
  const [vehicleMap, setVehicleMap] = useState({});

  const { toasts, toast, dismiss } = useToast();

  const modalTotalFine = useMemo(
    () =>
      modalViolations.reduce((sum, v) => {
        const n = Number(v.fine);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [modalViolations]
  );

  async function refreshTickets() {
    setLoadingTickets(true);
    setApiErr("");
    try {
      const rows = await listTickets();
      setTickets(
        (rows || []).map((t) => ({
          ticket_id: t.ticket_id,
          driver_name: t.driver_name || t.license_number || "—",
          driver_license: t.license_number || "—",
          plate_number: t.plate_number || "—",
          vehicle_label: t.vehicle_label || "—",
          datetime: t.datetime,
          issued_at: t.issued_at,
          total_fine: t.total_fine ?? 0,
          violation_status: t.violation_status,
          engine_number: t.engine_number,
          chassis_number: t.chassis_number,
          apprehending_officer: t.apprehending_officer || "",
        }))
      );
    } catch (e) {
      setTickets(demoTickets);
      setApiErr(e.message);
    } finally {
      setLoadingTickets(false);
    }
  }

  /*
   * Pre-load vehicles on mount and build a plate → vehicle map.
   */
  async function loadVehicleMap() {
    try {
      const rows = await listVehicles();
      const map = {};
      (rows || []).forEach((v) => {
        map[v.plate_number] = v;
      });
      setVehicleMap(map);
    } catch {
      // non-critical
    }
  }

  const [catalog, setCatalog] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const items = await getViolationCatalog();
        setCatalog(items);
      } catch {
        // non-critical: fallback to manual entry if catalog fails
      }
    })();
  }, []);

  async function loadViolations(ticketId) {
    if (!ticketId) return;
    setLoadingViolations(true);
    try {
      const rows = await listViolations(ticketId);
      setViolations(rows || []);
    } catch (e) {
      setViolations([]);
      toast(e.message, "error");
    } finally {
      setLoadingViolations(false);
    }
  }

  useEffect(() => {
    refreshTickets();
    loadVehicleMap();
  }, []);

  // Auto-fill engine/chassis when plate matches known vehicle
  useEffect(() => {
    const match = vehicleMap[ticketForm.plate_number?.trim()];
    if (match) {
      setTicketForm((prev) => ({
        ...prev,
        engine_number: match.engine_number,
        chassis_number: match.chassis_number,
      }));
    }
  }, [ticketForm.plate_number, vehicleMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) => {
      const hay = [t.ticket_id, t.driver_name, t.driver_license, t.plate_number, t.vehicle_label, t.issued_at, t.violation_status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tickets, query]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.ticket_id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  function openCreateModal() {
    setModalErr("");
    setTicketForm({ ...emptyTicketForm, ticket_id: genTicketId() });
    setModalViolations([{ name: "", fine: "" }]);
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

  async function submitCreateTicket() {
    setModalErr("");

    const required = [
      ["Ticket ID", ticketForm.ticket_id],
      ["Date & Time", ticketForm.datetime_local],
      ["Issued at", ticketForm.issued_at],
      ["License number", ticketForm.license_number],
      ["Plate number", ticketForm.plate_number],
      ["Engine number", ticketForm.engine_number],
      ["Chassis number", ticketForm.chassis_number],
    ];
    for (const [label, value] of required) {
      if (!value || String(value).trim() === "") {
        setModalErr(`${label} is required.`);
        return;
      }
    }

    const cleaned = modalViolations
      .map((v) => ({ name: (v.name || "").trim(), fine: (v.fine || "").trim() }))
      .filter((v) => v.name.length > 0 || v.fine.length > 0);

    if (cleaned.length === 0) {
      setModalErr("Add at least one violation.");
      return;
    }

    for (let i = 0; i < cleaned.length; i++) {
      const v = cleaned[i];
      if (!v.name) {
        setModalErr(`Violation ${i + 1}: name is required.`);
        return;
      }
      const fine = Number(v.fine);
      if (!Number.isFinite(fine) || fine < 0) {
        setModalErr(`Violation ${i + 1}: fine must be ≥ 0.`);
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

    setCreating(true);
    try {
      await createTicketWithViolations({
        ticket: ticketPayload,
        violations: cleaned.map((v, i) => ({
          violation_id: genViolationId(ticketPayload.ticket_id, i),
          name: v.name,
          corresponding_fine_amount: Number(v.fine),
        })),
      });

      setCreateOpen(false);
      toast("Ticket created successfully.");
      await refreshTickets();

      // Open details modal for the newly created ticket
      setSelectedTicketId(ticketPayload.ticket_id);
      setDetailsOpen(true);
      await loadViolations(ticketPayload.ticket_id);
    } catch (e) {
      setModalErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateStatus(newStatus) {
    if (!selectedTicketId) return;
    try {
      await updateTicketStatus(selectedTicketId, newStatus);
      toast(`Ticket marked as ${newStatus}.`);
      await refreshTickets();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  return (
    <PageShell>
      <>
        <div className="topBar">
          <div className="topRight">
            {SHOW_SQL && (
              <button className="codeBtn" onClick={() => setShowSql(v => !v)} title="Show SQL">
                {"</>"}
              </button>
            )}
            <div className="dateTime">
              <div className="dateText">{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" })}</div>
              <div className="timeText">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div className="avatar">A</div>
          </div>
        </div>

        <div className="headerRow">
          <div>
            <div className="pageTitle">Violation Management</div>
            <div className="pageSub">Track and manage traffic violation tickets</div>
          </div>
          <button className="primaryBtn" onClick={openCreateModal}>
            <span className="plus">+</span> Create Ticket
          </button>
        </div>

        <div className="card">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by ticket ID, driver, plate, or location..." />
          {apiErr && (
            <div className="softNote">
              Using demo data (API not reachable): <span className="softNoteErr">{apiErr}</span>
            </div>
          )}
        </div>

        <div className="card tableCard">
          <div className="tableTitleRow">
            <div className="tableTitle">{loadingTickets ? "Loading tickets..." : `Tickets (${filtered.length})`}</div>
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
            const isSelected = t.ticket_id === selectedTicketId;
            return (
              <div className={`tableRow${isSelected ? " selectedRow" : ""}`} key={t.ticket_id}>
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
                      setDetailsOpen(true);
                      await loadViolations(t.ticket_id);
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}

          {!loadingTickets && filtered.length === 0 && <div className="emptyState">No tickets found.</div>}
        </div>

        {/* Details Modal */}
        {detailsOpen && selectedTicketId ? (
          <div className="detailOverlay" onClick={() => setDetailsOpen(false)}>
            <div className="detailModal" onClick={(e) => e.stopPropagation()}>
              <div className="detailHeader">
                <div className="detailHeaderTitle">
                  Ticket Details: <span className="detailId">{selectedTicketId}</span>
                </div>

                <button className="detailClose" onClick={() => setDetailsOpen(false)} title="Close">
                  ✕
                </button>
              </div>

              <div className="detailDivider" />

              <div className="detailGrid">
                <div className="detailBlock">
                  <div className="detailBlockTitle">Driver</div>
                  <div className="detailStrong">{selectedTicket?.driver_name || "—"}</div>
                  <div className="detailMuted">{selectedTicket?.driver_license || "—"}</div>
                </div>

                <div className="detailBlock">
                  <div className="detailBlockTitle">Vehicle</div>
                  <div className="detailStrong">{selectedTicket?.plate_number || "—"}</div>
                  <div className="detailMuted">{selectedTicket?.vehicle_label || "—"}</div>
                </div>

                <div className="detailBlock">
                  <div className="detailBlockTitle">Date & Time</div>
                  {(() => {
                    const { date, time } = formatDateTime(selectedTicket?.datetime);
                    return (
                      <>
                        <div className="detailStrong">{date}</div>
                        <div className="detailMuted">{time}</div>
                      </>
                    );
                  })()}
                </div>

                <div className="detailBlock">
                  <div className="detailBlockTitle">Location</div>
                  <div className="detailStrong">{selectedTicket?.issued_at || "—"}</div>
                  <div className="detailMuted">Officer: {selectedTicket?.apprehending_officer || "—"}</div>
                </div>

                <div className="detailBlock">
                  <div className="detailBlockTitle">Status</div>
                  <div className="detailStrong">
                    <StatusPill status={selectedTicket?.violation_status} />
                  </div>
                  <div className="detailMuted">&nbsp;</div>
                </div>

                <div className="detailBlock">
                  <div className="detailBlockTitle">Total Fine</div>
                  <div className="detailFine">{formatMoney(selectedTicket?.total_fine ?? 0)}</div>
                  <div className="detailMuted">&nbsp;</div>
                </div>
              </div>

              {/* Status change buttons */}
              {selectedTicket ? (
                <div className="statusUpdateRow">
                  {["paid", "unpaid", "contested"]
                    .filter((s) => s !== selectedTicket.violation_status)
                    .map((s) => (
                      <button
                        key={s}
                        className={`statusUpdateBtn statusUpdateBtn--${s}`}
                        onClick={() => handleUpdateStatus(s)}
                      >
                        Mark as {s}
                      </button>
                    ))}
                </div>
              ) : null}

              <div className="detailSectionTitle">Violations</div>

              {loadingViolations ? (
                <div className="detailNote">Loading violations...</div>
              ) : violations.length === 0 ? (
                <div className="detailNote">No violations recorded for this ticket.</div>
              ) : (
                <div className="violTable">
                  <div className="violHead">
                    <div>Violation</div>
                    <div>Fine</div>
                  </div>

                  {violations.map((v) => (
                    <div className="violRow" key={v.violation_id}>
                      <div className="violName">{v.name}</div>
                      <div className="violFine">₱{Number(v.corresponding_fine_amount).toLocaleString("en-PH")}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="detailFooter">
                <button className="secondaryBtn" onClick={() => setDetailsOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* SQL preview */}
        {SHOW_SQL && showSql && (
          <div className="card codeCard">
            <div className="codeLabel">SQL used</div>
            <pre className="codePre">{`-- List tickets
        SELECT * FROM violation_ticket ORDER BY datetime DESC;

        -- Create ticket + violations (atomic)
        INSERT INTO violation_ticket (...) VALUES (...);
        INSERT INTO violation (...) VALUES (...), (...);

        -- Update status
        UPDATE violation_ticket SET violation_status = ? WHERE ticket_id = ?;

        -- List violations by ticket
        SELECT * FROM violation WHERE ticket_id = ?;`}</pre>
          </div>
        )}

        {/* Create Ticket Modal */}
        {createOpen && (
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
                      placeholder="VIO-20240101-XXXX"
                      value={ticketForm.ticket_id}
                      onChange={(e) => setTicketForm({ ...ticketForm, ticket_id: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Date &amp; Time</label>
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
                    <label>Driver License Number</label>
                    <input
                      className="input"
                      placeholder="N01-12-345678"
                      value={ticketForm.license_number}
                      onChange={(e) => setTicketForm({ ...ticketForm, license_number: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Plate Number</label>
                    <input
                      className="input"
                      placeholder="ABC-1234"
                      value={ticketForm.plate_number}
                      onChange={(e) => setTicketForm({ ...ticketForm, plate_number: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Engine Number</label>
                    <input
                      className="input"
                      placeholder="Auto-filled from plate"
                      value={ticketForm.engine_number}
                      onChange={(e) => setTicketForm({ ...ticketForm, engine_number: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Chassis Number</label>
                    <input
                      className="input"
                      placeholder="Auto-filled from plate"
                      value={ticketForm.chassis_number}
                      onChange={(e) => setTicketForm({ ...ticketForm, chassis_number: e.target.value })}
                    />
                  </div>
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
                        {modalViolations.length > 1 && (
                          <button className="removeBtn" onClick={() => removeViolationRow(idx)}>
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="violationInputs">
                        {catalog.length > 0 ? (
                          <select
                            className="input"
                            value={v.name}
                            onChange={(e) => {
                              const name = e.target.value;
                              const match = catalog.find((x) => x.name === name);
                              updateViolationRow(idx, {
                                name,
                                fine: match ? String(match.corresponding_fine_amount) : "",
                              });
                            }}
                          >
                            <option value="">Select violation...</option>
                            {catalog.map((x) => (
                              <option key={x.name} value={x.name}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            className="input"
                            value={v.name}
                            onChange={(e) => {
                              const name = e.target.value;
                              const match = catalog.find((x) => x.name === name);
                              updateViolationRow(idx, {
                                name,
                                fine: match ? String(match.corresponding_fine_amount) : "",
                              });
                            }}
                          >
                            <option value="">Select violation...</option>
                            {catalog.map((x) => (
                              <option key={x.name} value={x.name}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <input
                          className="input"
                          placeholder="Fine Amount"
                          value={v.fine}
                          readOnly={catalog.length > 0}
                          onChange={(e) => {
                            // allow manual entry only if catalog failed to load
                            if (catalog.length === 0) updateViolationRow(idx, { fine: e.target.value });
                          }}
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

              {modalErr && <div className="msgError modalMsg">{modalErr}</div>}

              <div className="modalFooter">
                <button className="secondaryBtn" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button className="primaryBtn" onClick={submitCreateTicket} disabled={creating}>
                  {creating ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastList toasts={toasts} onDismiss={dismiss} />
      </>
    </PageShell>
  );
}