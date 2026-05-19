import { useEffect, useMemo, useState } from "react";
import { listDrivers, createDriver, updateDriver, deleteDriver } from "../api/drivers";
import PageShell from "../components/PageShell";
import { useToast, ToastList } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import { fullName, initials, computeAge, formatDate, parseAddresses } from "../utils";
import "./Drivers.css";
import SearchInput from "../components/SearchInput";

const LICENSE_TYPES = ["Student Permit", "Non-Professional", "Professional"];
const LICENSE_STATUSES = ["valid", "expired", "suspended", "revoked"];

/* ── Small reusable components ── */

function StatusPill({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "driversStatusPill";
  if (s === "valid")       cls += " driversStatusValid";
  else if (s === "expired")    cls += " driversStatusExpired";
  else if (s === "suspended")  cls += " driversStatusSuspended";
  else if (s === "revoked")    cls += " driversStatusRevoked";
  return <span className={cls}>{s || "—"}</span>;
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  license_number: "", license_type: "",
  first_name: "", middle_name: "", last_name: "",
  sex: "M", date_of_birth: "",
  license_status: "valid",
  license_issuance_date: "", license_expiration_date: "",
  addresses: [emptyAddress()],
};

const MIN_AGE_BY_LICENSE_TYPE = {
  "Student Permit": 16,
  "Non-Professional": 17,
  "Professional": 18,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function ageFromDob(dob) {
  if (!dob) return null;

  const birth = new Date(`${dob}T00:00:00`);
  const today = new Date(`${todayIso()}T00:00:00`);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function buildAddressStrings(addressRows) {
  return addressRows
    .map((a) => [a.street, a.city, a.region].map((s) => s.trim()).filter(Boolean).join(", "))
    .filter(Boolean);
}

function validateAddressStrings(addresses) {
  const lowered = addresses.map((a) => a.toLowerCase());

  if (new Set(lowered).size !== lowered.length) {
    return "Duplicate address is not allowed for the same driver.";
  }

  if (addresses.some((a) => a.length > 500)) {
    return "Address is too long. Maximum length is 500 characters.";
  }

  return "";
}

function validateDriverFormData(d, options = {}) {
  const { requireLicenseNumber = true, addresses = [] } = options;

  const required = [
    ...(requireLicenseNumber ? [["License number", d.license_number]] : []),
    ["License type", d.license_type],
    ["First name", d.first_name],
    ["Last name", d.last_name],
    ["Sex", d.sex],
    ["Date of birth", d.date_of_birth],
    ["License status", d.license_status],
    ["Issuance date", d.license_issuance_date],
    ["Expiration date", d.license_expiration_date],
  ];

  for (const [label, val] of required) {
    if (!val || !String(val).trim()) return `${label} is required.`;
  }

  if (requireLicenseNumber && !/^[A-Za-z0-9][A-Za-z0-9-]{4,19}$/.test(String(d.license_number).trim())) {
    return "License number must be 5–20 characters (letters, numbers, and hyphens only).";
  }

  if (String(d.first_name).trim().length > 50) return "First name is too long (max 50 characters).";
  if (String(d.last_name).trim().length > 50)  return "Last name is too long (max 50 characters).";
  if (d.middle_name && String(d.middle_name).trim().length > 50) return "Middle name is too long (max 50 characters).";

  if (!LICENSE_TYPES.includes(d.license_type)) {
    return "Select a valid license type.";
  }

  if (!LICENSE_STATUSES.includes(d.license_status)) {
    return "Select a valid license status.";
  }

  if (!["M", "F"].includes(d.sex)) {
    return "Select a valid sex.";
  }

  if (d.date_of_birth > todayIso()) {
    return "Date of birth cannot be in the future.";
  }

  if (d.license_issuance_date > todayIso()) {
    return "Issuance date cannot be in the future.";
  }

  if (d.license_issuance_date >= d.license_expiration_date) {
    return "Issuance date must be before expiration date.";
  }

  const age = ageFromDob(d.date_of_birth);
  const minAge = MIN_AGE_BY_LICENSE_TYPE[d.license_type];

  if (age < minAge) {
    return `${d.license_type} requires the driver to be at least ${minAge} years old.`;
  }

  if (d.license_status === "expired" && d.license_expiration_date >= todayIso()) {
    return "Status cannot be expired while expiration date is still today or in the future.";
  }

  if (d.license_status !== "expired" && d.license_expiration_date < todayIso()) {
    return "Status must be expired when expiration date is already past.";
  }

  const addressErr = validateAddressStrings(addresses);
  if (addressErr) return addressErr;

  return "";
}

/* ── Driver Summary Modal ── */

/*
 * Renders a read-only card with all driver details.
 * Addresses come in as a "||"-delimited string from GROUP_CONCAT — parseAddresses
 * from utils.js handles splitting so this component doesn't need to know the format.
 */
function DriverSummaryModal({ driver, onClose }) {
  const addrs = parseAddresses(driver.addresses);
  return (
    <div className="modalOverlay">
      <div className="driversSummaryModal" onClick={(e) => e.stopPropagation()}>
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

          <div className="driversSummarySection">
            <div className="driversSummarySectionTitle">License Information</div>
            <div className="driversSummaryGrid">
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">License Number</div>
                <div className="driversSummaryItemValue" style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
                  {driver.license_number}
                </div>
              </div>
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">License Type</div>
                <div className="driversSummaryItemValue">{driver.license_type || "—"}</div>
              </div>
              <div className="driversSummaryItem">
                <div className="driversSummaryItemLabel">Status</div>
                <div className="driversSummaryItemValue"><StatusPill status={driver.license_status} /></div>
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
          <button className="primaryBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function Drivers() {
  const [query, setQuery]     = useState("");
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiErr, setApiErr]   = useState("");

  const [viewDriver, setViewDriver]   = useState(null);
  const [addOpen, setAddOpen]         = useState(false);
  const [addErr, setAddErr]           = useState("");
  const [form, setForm]               = useState(emptyForm);
  const [submitting, setSubmitting]   = useState(false);

  const [editingDriver, setEditingDriver]     = useState(null);
  const [editForm, setEditForm]               = useState({});
  const [editErr, setEditErr]                 = useState("");
  const [editSubmitting, setEditSubmitting]   = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);

  const { toasts, toast, dismiss } = useToast();

  /*
   * Live clock — calling new Date() directly in JSX freezes the displayed time
   * at the render that first mounted the component.
   */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  async function refresh() {
    setLoading(true);
    setApiErr("");
    try {
      const rows = await listDrivers();
      setDrivers(rows || []);
    } catch (e) {
      setDrivers([]);
      setApiErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  /* Client-side search filter — useMemo avoids re-filtering on unrelated renders. */
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
    setAddErr("");
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

  /*
   * Validates the form then calls createDriver.
   * Addresses are joined into "Street, City, Region" strings before sending.
   */
  async function submitAdd() {
    setAddErr("");

    const addresses = buildAddressStrings(form.addresses);

    const err = validateDriverFormData(form, {
      requireLicenseNumber: true,
      addresses,
    });

    if (err) {
      setAddErr(err);
      return;
    }

    setSubmitting(true);

    try {
      await createDriver({
        license_number:          form.license_number.trim().toUpperCase(),
        license_type:            form.license_type,
        first_name:              form.first_name.trim(),
        middle_name:             form.middle_name.trim() || null,
        last_name:               form.last_name.trim(),
        sex:                     form.sex,
        date_of_birth:           form.date_of_birth,
        license_status:          form.license_status,
        license_issuance_date:   form.license_issuance_date,
        license_expiration_date: form.license_expiration_date,
        addresses,
      });

      setAddOpen(false);
      toast("Driver added successfully.");
      await refresh();
    } catch (e) {
      setAddErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* Show confirm modal instead of browser dialog. */
  function handleDelete(licenseNumber) {
    setPendingDelete(licenseNumber);
  }

  async function confirmDelete() {
    const licenseNumber = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteDriver(licenseNumber);
      if (viewDriver?.license_number === licenseNumber) setViewDriver(null);
      await refresh();
      toast("Driver deleted.");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  function openEdit(driver) {
    setEditForm({
      license_type:             driver.license_type || "",
      first_name:               driver.first_name || "",
      middle_name:              driver.middle_name || "",
      last_name:                driver.last_name || "",
      sex:                      driver.sex || "M",
      date_of_birth:            driver.date_of_birth ? driver.date_of_birth.slice(0, 10) : "",
      license_status:           driver.license_status || "valid",
      license_issuance_date:    driver.license_issuance_date ? driver.license_issuance_date.slice(0, 10) : "",
      license_expiration_date:  driver.license_expiration_date ? driver.license_expiration_date.slice(0, 10) : "",
    });
    setEditErr("");
    setEditingDriver(driver);
  }

  function patchEditForm(key, val) {
    setEditForm((prev) => ({ ...prev, [key]: val }));
  }

  /*
   * Sends a PUT with the edited fields. Addresses are excluded — the backend
   * PUT endpoint only updates the driver row itself.
   */
  async function submitEdit() {
    setEditErr("");

    const err = validateDriverFormData(editForm, {
      requireLicenseNumber: false,
      addresses: [],
    });

    if (err) {
      setEditErr(err);
      return;
    }

    setEditSubmitting(true);

    try {
      await updateDriver(editingDriver.license_number, {
        license_type:             editForm.license_type,
        first_name:               editForm.first_name.trim(),
        middle_name:              editForm.middle_name.trim() || null,
        last_name:                editForm.last_name.trim(),
        sex:                      editForm.sex,
        date_of_birth:            editForm.date_of_birth,
        license_status:           editForm.license_status,
        license_issuance_date:    editForm.license_issuance_date,
        license_expiration_date:  editForm.license_expiration_date,
      });

      setEditingDriver(null);
      toast("Driver updated successfully.");
      await refresh();
    } catch (e) {
      setEditErr(e.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <PageShell>
      <div className="topBar">
        <div className="topRight">
          <div className="dateTime">
            <div className="dateText">{dateStr}</div>
            <div className="timeText">{timeStr}</div>
          </div>
          <div className="avatar">A</div>
        </div>
      </div>

      <div className="headerRow">
        <div>
          <div className="pageTitle">Driver Management</div>
          <div className="pageSub">Manage driver licenses and information</div>
        </div>
        <button className="primaryBtn" onClick={openAdd}>+ Add Driver</button>
      </div>

      <div className="card">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by license number, name, or status..." />
        {apiErr && <div className="softNote">Using demo data (API not reachable): {apiErr}</div>}
      </div>

      <div className="card tableCard">
        <div className="tableTitleRow">
          <div className="tableTitle">
            {loading ? "Loading..." : `Drivers (${filtered.length})`}
          </div>
        </div>
        <div className="tableScroll"><div className="driversTableHeader">
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
              <button className="iconBtn" title="View summary" onClick={() => setViewDriver(d)}>
                <EyeIcon />
              </button>
              <button className="iconBtn" title="Edit" onClick={() => openEdit(d)}>
                <PencilIcon />
              </button>
              <button className="iconBtn danger" title="Delete" onClick={() => handleDelete(d.license_number)}>
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}</div>
        
        {!loading && filtered.length === 0 && (
          <div className="emptyState">No drivers found.</div>
        )}
      </div>

      {viewDriver && <DriverSummaryModal driver={viewDriver} onClose={() => setViewDriver(null)} />}

      {/* ── Add Modal ── */}
      {addOpen && (
        <div className="modalOverlay">
          <div className="driversAddModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">Add New Driver</div>
              <button className="modalCloseBtn" onClick={() => setAddOpen(false)}>✕</button>
            </div>

            <div className="formSection">
              <div className="driversFormGroup">
                <div className="driversFormGroupLabel">Personal Information</div>
                <div className="field3">
                  <div>
                    <label>First Name</label>
                    <input className="input" placeholder="Juan"
                      value={form.first_name} onChange={(e) => patchForm("first_name", e.target.value)} />
                  </div>
                  <div>
                    <label>Middle Name</label>
                    <input className="input" placeholder="Santos"
                      value={form.middle_name} onChange={(e) => patchForm("middle_name", e.target.value)} />
                  </div>
                  <div>
                    <label>Last Name</label>
                    <input className="input" placeholder="dela Cruz"
                      value={form.last_name} onChange={(e) => patchForm("last_name", e.target.value)} />
                  </div>
                </div>
                <div className="fieldFull">
                  <label>Sex</label>
                  <div className="driversSexToggle">
                    <button type="button" className={`driversSexBtn${form.sex === "M" ? " driversSexBtnActive" : ""}`}
                      onClick={() => patchForm("sex", "M")}>Male</button>
                    <button type="button" className={`driversSexBtn${form.sex === "F" ? " driversSexBtnActive" : ""}`}
                      onClick={() => patchForm("sex", "F")}>Female</button>
                  </div>
                </div>
                <div className="fieldFull">
                  <label>Date of Birth</label>
                  <input className="input" type="date"
                    value={form.date_of_birth} onChange={(e) => patchForm("date_of_birth", e.target.value)} />
                </div>
              </div>

              <div className="driversFormGroup">
                <div className="driversFormGroupLabel">License Information</div>
                <div className="fieldFull">
                  <label>License Number</label>
                  <input className="input" placeholder="N01-12-345678"
                    value={form.license_number} onChange={(e) => patchForm("license_number", e.target.value)} />
                </div>
                <div className="fieldFull">
                  <label>License Type</label>
                  <select
                    className="input"
                    value={form.license_type}
                    onChange={(e) => patchForm("license_type", e.target.value)}
                  >
                    <option value="">Select license type</option>
                    {LICENSE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fieldFull">
                  <label>License Status</label>
                  <div className="driversStatusChips">
                    {LICENSE_STATUSES.map((s) => (
                      <button key={s} type="button"
                        className={`driversStatusChip${form.license_status === s ? " driversStatusChipActive" : ""}`}
                        onClick={() => patchForm("license_status", s)}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="field2">
                  <div>
                    <label>Issuance Date</label>
                    <input className="input" type="date"
                      value={form.license_issuance_date} onChange={(e) => patchForm("license_issuance_date", e.target.value)} />
                  </div>
                  <div>
                    <label>Expiration Date</label>
                    <input className="input" type="date"
                      value={form.license_expiration_date} onChange={(e) => patchForm("license_expiration_date", e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <div className="driversAddressSectionHeader">
                  <span className="driversAddressSectionLabel">Addresses</span>
                  <button type="button" className="driversAddAddressBtn" onClick={addAddressRow}>+ Add Address</button>
                </div>
                {form.addresses.map((addr, idx) => (
                  <div key={idx} className="driversAddressBlock">
                    <div className="driversAddressBlockHeader">
                      <div className="driversAddressBlockLabel"><PinIcon /> Address {idx + 1}</div>
                      {form.addresses.length > 1 && (
                        <button type="button" className="driversAddressRemoveBtn" onClick={() => removeAddress(idx)}>Remove</button>
                      )}
                    </div>
                    <div className="driversAddressBlockFields">
                      <input className="input" placeholder="Street"
                        value={addr.street} onChange={(e) => patchAddress(idx, "street", e.target.value)} />
                      <div className="driversAddressCityRow">
                        <input className="input" placeholder="City"
                          value={addr.city} onChange={(e) => patchAddress(idx, "city", e.target.value)} />
                        <input className="input" placeholder="Region"
                          value={addr.region} onChange={(e) => patchAddress(idx, "region", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {addErr && <div className="msgError">{addErr}</div>}
            </div>

            <div className="modalFooter">
              <button className="secondaryBtn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="primaryBtn" onClick={submitAdd} disabled={submitting}>
                {submitting ? "Saving..." : "Add Driver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingDriver && (
        <div className="modalOverlay">
          <div className="driversAddModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">Edit Driver</div>
              <button className="modalCloseBtn" onClick={() => setEditingDriver(null)}>✕</button>
            </div>

            <div className="formSection">
              <div className="fieldFull">
                <label style={{ color: "#86868B" }}>License Number (cannot be changed)</label>
                <input className="input" value={editingDriver.license_number} disabled style={{ opacity: 0.5 }} />
              </div>

              <div className="driversFormGroup">
                <div className="driversFormGroupLabel">Personal Information</div>
                <div className="field3">
                  <div>
                    <label>First Name</label>
                    <input className="input" placeholder="Juan"
                      value={editForm.first_name} onChange={(e) => patchEditForm("first_name", e.target.value)} />
                  </div>
                  <div>
                    <label>Middle Name</label>
                    <input className="input" placeholder="Santos"
                      value={editForm.middle_name} onChange={(e) => patchEditForm("middle_name", e.target.value)} />
                  </div>
                  <div>
                    <label>Last Name</label>
                    <input className="input" placeholder="dela Cruz"
                      value={editForm.last_name} onChange={(e) => patchEditForm("last_name", e.target.value)} />
                  </div>
                </div>
                <div className="fieldFull">
                  <label>Sex</label>
                  <div className="driversSexToggle">
                    <button type="button" className={`driversSexBtn${editForm.sex === "M" ? " driversSexBtnActive" : ""}`}
                      onClick={() => patchEditForm("sex", "M")}>Male</button>
                    <button type="button" className={`driversSexBtn${editForm.sex === "F" ? " driversSexBtnActive" : ""}`}
                      onClick={() => patchEditForm("sex", "F")}>Female</button>
                  </div>
                </div>
                <div className="fieldFull">
                  <label>Date of Birth</label>
                  <input className="input" type="date"
                    value={editForm.date_of_birth} onChange={(e) => patchEditForm("date_of_birth", e.target.value)} />
                </div>
              </div>

              <div className="driversFormGroup">
                <div className="driversFormGroupLabel">License Information</div>
                <div className="fieldFull">
                  <label>License Type</label>
                  <select
                    className="input"
                    value={editForm.license_type}
                    onChange={(e) => patchEditForm("license_type", e.target.value)}
                  >
                    <option value="">Select license type</option>
                    {LICENSE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fieldFull">
                  <label>License Status</label>
                  <div className="driversStatusChips">
                    {LICENSE_STATUSES.map((s) => (
                      <button key={s} type="button"
                        className={`driversStatusChip${editForm.license_status === s ? " driversStatusChipActive" : ""}`}
                        onClick={() => patchEditForm("license_status", s)}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="field2">
                  <div>
                    <label>Issuance Date</label>
                    <input className="input" type="date"
                      value={editForm.license_issuance_date} onChange={(e) => patchEditForm("license_issuance_date", e.target.value)} />
                  </div>
                  <div>
                    <label>Expiration Date</label>
                    <input className="input" type="date"
                      value={editForm.license_expiration_date} onChange={(e) => patchEditForm("license_expiration_date", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="softNote" style={{ marginTop: 0 }}>
                Addresses cannot be edited here. Use the driver record directly to update addresses.
              </div>

              {editErr && <div className="msgError">{editErr}</div>}
            </div>

            <div className="modalFooter">
              <button className="secondaryBtn" onClick={() => setEditingDriver(null)}>Cancel</button>
              <button className="primaryBtn" onClick={submitEdit} disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {pendingDelete && (
        <ConfirmModal
          message={`Delete driver ${pendingDelete}? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <ToastList toasts={toasts} onDismiss={dismiss} />
    </PageShell>
  );
}
