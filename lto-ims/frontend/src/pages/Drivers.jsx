import React, { useEffect, useMemo, useState } from "react";
import { listDrivers, createDriver, deleteDriver } from "../api/drivers";
import PageShell from "../components/PageShell";
import "./Drivers.css";

const demoDrivers = [
  {
    license_number: "N01-12-345678",
    first_name: "Juan",
    middle_name: "Santos",
    last_name: "dela Cruz",
    sex: "M",
    date_of_birth: "1989-04-15",
    license_type: "Professional",
    license_status: "valid",
    license_expiration_date: "2027-04-15",
    license_issuance_date: "2021-04-15",
    addresses: "123 Rizal Ave, Makati City, NCR",
  },
  {
    license_number: "N02-13-456789",
    first_name: "Maria",
    middle_name: "Cruz",
    last_name: "Santos",
    sex: "F",
    date_of_birth: "1984-08-22",
    license_type: "Non-Professional",
    license_status: "valid",
    license_expiration_date: "2026-08-22",
    license_issuance_date: "2020-08-22",
    addresses: null,
  },
  {
    license_number: "N03-14-567890",
    first_name: "Pedro",
    middle_name: "Lopez",
    last_name: "Garcia",
    sex: "M",
    date_of_birth: "1994-11-03",
    license_type: "Student Permit",
    license_status: "expired",
    license_expiration_date: "2023-11-03",
    license_issuance_date: "2022-11-03",
    addresses: null,
  },
];

const LICENSE_STATUSES = ["valid", "expired", "suspended", "revoked"];

function computeAge(dob) {
  if (!dob) return "—";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fullName(d) {
  return [d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ");
}

function initials(d) {
  return ((d.first_name || "")[0] || "").toUpperCase();
}

function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function parseAddresses(raw) {
  if (!raw) return [];
  return String(raw).split("||").map((a) => a.trim()).filter(Boolean);
}

function StatusPill({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "driversStatusPill";
  if (s === "valid") cls += " driversStatusValid";
  else if (s === "expired") cls += " driversStatusExpired";
  else if (s === "suspended") cls += " driversStatusSuspended";
  else if (s === "revoked") cls += " driversStatusRevoked";
  return <span className={cls}>{s || "—"}</span>;
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="driversSearchWrap">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="#86868B" strokeWidth="2" />
        <path d="M16.5 16.5 21 21" stroke="#86868B" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input className="driversSearchInput" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const emptyAddress = () => ({ street: "", city: "", region: "" });

const emptyForm = {
  license_number: "",
  license_type: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  sex: "M",
  date_of_birth: "",
  license_status: "valid",
  license_issuance_date: "",
  license_expiration_date: "",
  addresses: [emptyAddress()],
};

/* ── Summary Modal ── */
function DriverSummaryModal({ driver, onClose }) {
  const addrs = parseAddresses(driver.addresses);
  return (
    <div className="driversModalOverlay" onClick={onClose}>
      <div className="driversSummaryModal" onClick={(e) => e.stopPropagation()}>
        {/* Hero */}
        <div className="driversSummaryHero">
          <div className="driversSummaryAvatarLarge">{initials(driver)}</div>
          <div className="driversSummaryHeroInfo">
            <div className="driversSummaryName">{fullName(driver)}</div>
            <div className="driversSummaryLicense">{driver.license_number}</div>
            <div style={{ marginTop: 8 }}><StatusPill status={driver.license_status} /></div>
          </div>
          <button className="driversSummaryCloseBtn" onClick={onClose}>✕</button>
        </div>

        <div className="driversSummaryBody">
          {/* Personal Information */}
          <div className="driversSummarySection">
            <div className="driversSummarySectionTitle">Personal Information</div>
            <div className="driversSummaryGrid">
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">Sex</div>
                <div className="driversSummaryItemValue">{driver.sex === "M" ? "Male" : driver.sex === "F" ? "Female" : driver.sex}</div>
              </div>
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">Date of Birth</div>
                <div className="driversSummaryItemValue">{formatDate(driver.date_of_birth)}</div>
              </div>
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">Age</div>
                <div className="driversSummaryItemValue">{computeAge(driver.date_of_birth)}</div>
              </div>
            </div>
          </div>

          <div className="driversSummaryDivider" />

          {/* License Information */}
          <div className="driversSummarySection">
            <div className="driversSummarySectionTitle">License Information</div>
            <div className="driversSummaryGrid">
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">License Type</div>
                <div className="driversSummaryItemValue">{driver.license_type || "—"}</div>
              </div>
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">Status</div>
                <div className="driversSummaryItemValue"><StatusPill status={driver.license_status} /></div>
              </div>
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">License Number</div>
                <div className="driversSummaryItemValue" style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
                  {driver.license_number}
                </div>
              </div>
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">Date Issued</div>
                <div className="driversSummaryItemValue">{formatDate(driver.license_issuance_date)}</div>
              </div>
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">Expiration Date</div>
                <div className="driversSummaryItemValue">{formatDate(driver.license_expiration_date)}</div>
              </div>
            </div>
          </div>

          <div className="driversSummaryDivider" />

          {/* Addresses */}
          <div className="driversSummarySection">
            <div className="driversSummarySectionTitle">Addresses</div>
            {addrs.length === 0 ? (
              <div className="driversSummaryNoAddress">No addresses on record.</div>
            ) : (
              <div className="driversSummaryAddresses">
                {addrs.map((addr, i) => (
                  <div key={i} className="driversSummaryAddress">
                    <span className="driversSummaryAddressPin"><PinIcon /></span>
                    <span>{addr}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="driversSummaryFooter">
          <button className="driversPrimaryBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function Drivers() {
  const [query, setQuery] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiErr, setApiErr] = useState("");

  const [viewDriver, setViewDriver] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");
  const [msgErr, setMsgErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  async function refresh() {
    setLoading(true);
    setApiErr("");
    try {
      const rows = await listDrivers();
      setDrivers(rows || []);
    } catch (e) {
      setDrivers(demoDrivers);
      setApiErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => {
      const hay = [d.license_number, fullName(d), d.license_type, d.license_status]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [drivers, query]);

  function openAdd() {
    setForm(emptyForm);
    setMsg("");
    setMsgErr("");
    setAddOpen(true);
  }

  function patchForm(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function addAddressRow() {
    setForm((prev) => ({ ...prev, addresses: [...prev.addresses, emptyAddress()] }));
  }

  function patchAddress(idx, key, val) {
    setForm((prev) => {
      const updated = prev.addresses.map((a, i) => i === idx ? { ...a, [key]: val } : a);
      return { ...prev, addresses: updated };
    });
  }

  function removeAddress(idx) {
    setForm((prev) => ({ ...prev, addresses: prev.addresses.filter((_, i) => i !== idx) }));
  }

  async function submitAdd() {
    setMsg("");
    setMsgErr("");

    const required = [
      ["License number", form.license_number],
      ["First name", form.first_name],
      ["Last name", form.last_name],
      ["Date of birth", form.date_of_birth],
      ["Issuance date", form.license_issuance_date],
      ["Expiration date", form.license_expiration_date],
    ];
    for (const [label, val] of required) {
      if (!val || !String(val).trim()) { setMsgErr(`${label} is required.`); return; }
    }

    const addresses = form.addresses
      .map((a) => [a.street, a.city, a.region].map((s) => s.trim()).filter(Boolean).join(", "))
      .filter(Boolean);

    setSubmitting(true);
    try {
      await createDriver({
        license_number: form.license_number.trim(),
        license_type: form.license_type.trim(),
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim() || null,
        last_name: form.last_name.trim(),
        sex: form.sex,
        date_of_birth: form.date_of_birth,
        license_status: form.license_status,
        license_issuance_date: form.license_issuance_date,
        license_expiration_date: form.license_expiration_date,
        addresses,
      });
      setMsg("Driver added successfully.");
      setAddOpen(false);
      await refresh();
    } catch (e) {
      setMsgErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(licenseNumber) {
    setDeleteErr("");
    if (!window.confirm(`Delete driver ${licenseNumber}? This cannot be undone.`)) return;
    try {
      await deleteDriver(licenseNumber);
      if (viewDriver?.license_number === licenseNumber) setViewDriver(null);
      await refresh();
    } catch (e) {
      setDeleteErr(e.message);
    }
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <PageShell>
        <div className="driversTopBar">
          <div className="driversTopSearch">
            <SearchInput value={query} onChange={setQuery} placeholder="Search..." />
          </div>
          <div className="driversTopRight">
            <div className="driversDateTime">
              <div className="driversDateText">{dateStr}</div>
              <div className="driversTimeText">{timeStr}</div>
            </div>
            <div className="driversAvatar">A</div>
          </div>
        </div>

        <div className="driversHeaderRow">
          <div>
            <div className="driversPageTitle">Driver Management</div>
            <div className="driversPageSub">Manage driver licenses and information</div>
          </div>
          <button className="driversPrimaryBtn" onClick={openAdd}>+ Add Driver</button>
        </div>

        <div className="driversCard">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by license number or name..." />
          {apiErr && <div className="driversSoftNote">Using demo data (API not reachable): {apiErr}</div>}
          {deleteErr && <div className="driversMsgError" style={{ marginTop: 8 }}>{deleteErr}</div>}
          {msg && <div className="driversMsgSuccess" style={{ marginTop: 8 }}>{msg}</div>}
        </div>

        <div className="driversCard driversTableCard">
          <div className="driversTableTitleRow">
            <div className="driversTableTitle">
              {loading ? "Loading..." : `Drivers (${filtered.length})`}
            </div>
          </div>
          <div className="driversTableHeader">
            <div>License Number</div>
            <div>Full Name</div>
            <div>Sex</div>
            <div>Age</div>
            <div>License Type</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {filtered.map((d) => (
            <div className="driversTableRow" key={d.license_number}>
              <div className="driversCellMono">{d.license_number}</div>
              <div className="driversCellStrong">{fullName(d)}</div>
              <div className="driversCell">{d.sex}</div>
              <div className="driversCell">{computeAge(d.date_of_birth)}</div>
              <div className="driversCell">{d.license_type}</div>
              <div className="driversCell"><StatusPill status={d.license_status} /></div>
              <div className="driversActionsCell">
                <button className="driversIconBtn" title="View summary" onClick={() => setViewDriver(d)}>
                  <EyeIcon />
                </button>
                <button className="driversIconBtn danger" title="Delete" onClick={() => handleDelete(d.license_number)}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="driversEmptyState">No drivers found.</div>
          )}
        </div>

      {/* Driver Summary Modal */}
      {viewDriver && <DriverSummaryModal driver={viewDriver} onClose={() => setViewDriver(null)} />}

      {/* Add New Driver Modal */}
      {addOpen && (
        <div className="driversModalOverlay" onClick={() => setAddOpen(false)}>
          <div className="driversAddModal" onClick={(e) => e.stopPropagation()}>
            <div className="driversModalHeader">
              <div className="driversModalTitle">Add New Driver</div>
              <button className="driversModalCloseBtn" onClick={() => setAddOpen(false)}>✕</button>
            </div>

            <div className="driversFormSection">
              {/* License Number */}
              <div className="driversFieldFull">
                <label>License Number</label>
                <input className="driversInput" placeholder="N01-12-345678"
                  value={form.license_number} onChange={(e) => patchForm("license_number", e.target.value)} />
              </div>

              {/* First / Middle / Last */}
              <div className="driversField3">
                <div>
                  <label>First Name</label>
                  <input className="driversInput" placeholder="Juan"
                    value={form.first_name} onChange={(e) => patchForm("first_name", e.target.value)} />
                </div>
                <div>
                  <label>Middle Name</label>
                  <input className="driversInput" placeholder="Santos"
                    value={form.middle_name} onChange={(e) => patchForm("middle_name", e.target.value)} />
                </div>
                <div>
                  <label>Last Name</label>
                  <input className="driversInput" placeholder="dela Cruz"
                    value={form.last_name} onChange={(e) => patchForm("last_name", e.target.value)} />
                </div>
              </div>

              {/* Sex toggle */}
              <div className="driversFieldFull">
                <label>Sex</label>
                <div className="driversSexToggle">
                  <button type="button"
                    className={`driversSexBtn${form.sex === "M" ? " driversSexBtnActive" : ""}`}
                    onClick={() => patchForm("sex", "M")}>
                    Male
                  </button>
                  <button type="button"
                    className={`driversSexBtn${form.sex === "F" ? " driversSexBtnActive" : ""}`}
                    onClick={() => patchForm("sex", "F")}>
                    Female
                  </button>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="driversFieldFull">
                <label>Date of Birth</label>
                <input className="driversInput" type="date"
                  value={form.date_of_birth} onChange={(e) => patchForm("date_of_birth", e.target.value)} />
              </div>

              {/* License Type */}
              <div className="driversFieldFull">
                <label>License Type</label>
                <input className="driversInput" placeholder="e.g. Professional, Non-Professional, Student Permit"
                  value={form.license_type} onChange={(e) => patchForm("license_type", e.target.value)} />
              </div>

              {/* License Status chips */}
              <div className="driversFieldFull">
                <label>License Status</label>
                <div className="driversStatusChips">
                  {LICENSE_STATUSES.map((s) => (
                    <button key={s} type="button"
                      className={`driversStatusChip${form.license_status === s ? " driversStatusChipActive" : ""}`}
                      onClick={() => patchForm("license_status", s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Issuance + Expiration */}
              <div className="driversField2">
                <div>
                  <label>Issuance Date</label>
                  <input className="driversInput" type="date"
                    value={form.license_issuance_date} onChange={(e) => patchForm("license_issuance_date", e.target.value)} />
                </div>
                <div>
                  <label>Expiration Date</label>
                  <input className="driversInput" type="date"
                    value={form.license_expiration_date} onChange={(e) => patchForm("license_expiration_date", e.target.value)} />
                </div>
              </div>

              {/* Addresses */}
              <div>
                <div className="driversAddressSectionHeader">
                  <span className="driversAddressSectionLabel">Addresses</span>
                  <button type="button" className="driversAddAddressBtn" onClick={addAddressRow}>
                    + Add Address
                  </button>
                </div>

                {form.addresses.map((addr, idx) => (
                  <div key={idx} className="driversAddressBlock">
                    <div className="driversAddressBlockHeader">
                      <div className="driversAddressBlockLabel">
                        <PinIcon /> Address {idx + 1}
                      </div>
                      {form.addresses.length > 1 && (
                        <button type="button" className="driversAddressRemoveBtn" onClick={() => removeAddress(idx)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="driversAddressBlockFields">
                      <input className="driversInput" placeholder="Street"
                        value={addr.street} onChange={(e) => patchAddress(idx, "street", e.target.value)} />
                      <div className="driversAddressCityRow">
                        <input className="driversInput" placeholder="City"
                          value={addr.city} onChange={(e) => patchAddress(idx, "city", e.target.value)} />
                        <input className="driversInput" placeholder="Region"
                          value={addr.region} onChange={(e) => patchAddress(idx, "region", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {msgErr && <div className="driversMsgError">{msgErr}</div>}
              {msg && <div className="driversMsgSuccess">{msg}</div>}
            </div>

            <div className="driversModalFooter">
              <button className="driversSecondaryBtn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="driversPrimaryBtn" onClick={submitAdd} disabled={submitting}>
                {submitting ? "Saving..." : "Add Driver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
