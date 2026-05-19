import { Fragment, useEffect, useMemo, useState } from "react";
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from "../api/vehicles";
import PageShell from "../components/PageShell";
import { useToast, ToastList } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import { fullName } from "../utils";
import { listDrivers } from "../api/drivers";
import AutocompleteInput from "../components/AutocompleteInput";
import "./Vehicles.css";
import SearchInput from "../components/SearchInput";

const VEHICLE_TYPES = ["Sedan", "SUV", "Pickup Truck", "Van", "Motorcycle", "Bus", "Truck"];
const MAX_YEAR = new Date().getFullYear() + 1;

/* ── Small reusable components ── */

/*
 * Renders a colored circle swatch using the color name directly as a CSS value.
 * Works for standard English color names (Silver, White, Blue, Black, Red).
 */
function ColorDot({ color }) {
  return (
    <span className="vehiclesColorDot" style={{ background: color.toLowerCase() }} title={color} />
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

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const emptyForm = {
  plate_number: "", engine_number: "", chassis_number: "",
  make: "", model: "",
  year: new Date().getFullYear().toString(),
  color: "", vehicle_type: "", owner_license_number: "",
};

/* ── Main Page ── */

export default function Vehicles() {
  const [query, setQuery]         = useState("");
  const [vehicles, setVehicles]   = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driversErr, setDriversErr] = useState("");
  const [loading, setLoading]     = useState(true);
  const [apiErr, setApiErr]       = useState("");
  const [expandedPlate, setExpandedPlate] = useState(null);

  const [addOpen, setAddOpen]       = useState(false);
  const [addErr, setAddErr]         = useState("");
  const [form, setForm]             = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [editingVehicle, setEditingVehicle]   = useState(null);
  const [editForm, setEditForm]               = useState({});
  const [editErr, setEditErr]                 = useState("");
  const [editSubmitting, setEditSubmitting]   = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);

  const { toasts, toast, dismiss } = useToast();

  /*
   * Live clock — new Date() directly in JSX freezes at mount time.
   */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  /* Fetch or re-fetch the vehicle list. Falls back to demo data when the API is down. */
  async function refresh() {
    setLoading(true);
    setApiErr("");
    try {
      const rows = await listVehicles();
      setVehicles(rows || []);
    } catch (e) {
      setVehicles([]);
      setApiErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    (async () => {
      try {
        const rows = await listDrivers();
        setDrivers(rows || []);
        setDriversErr("");
      } catch (e) {
        setDrivers([]);
        setDriversErr(e.message);
      }
    })();
  }, []);

  /* Client-side search — useMemo avoids re-filtering on unrelated state changes. */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      const hay = [
        v.plate_number, fullName(v), v.owner_license_number,
        v.make, v.model, v.vehicle_type, v.color,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [vehicles, query]);

  function openAdd() {
    setForm(emptyForm);
    setAddErr("");
    setAddOpen(true);
  }

  function patchForm(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  /* Validates the form and sends a POST to create the vehicle. */
  async function submitAdd() {
    setAddErr("");

    const plate = form.plate_number.trim().toUpperCase();
    const engine = form.engine_number.trim().toUpperCase();
    const chassis = form.chassis_number.trim().toUpperCase();
    const ownerLicense = form.owner_license_number.trim();

    const required = [
      ["Plate number", plate],
      ["Engine number", engine],
      ["Chassis number", chassis],
      ["Make", form.make],
      ["Model", form.model],
      ["Year", form.year],
      ["Color", form.color],
      ["Vehicle type", form.vehicle_type],
      ["Owner (Driver License Number)", ownerLicense],
    ];

    for (const [label, val] of required) {
      if (!val || !String(val).trim()) {
        setAddErr(`${label} is required.`);
        return;
      }
    }

    const yr = parseInt(form.year, 10);

    if (isNaN(yr) || yr < 1900 || yr > MAX_YEAR) {
      setAddErr(`Year must be between 1900 and ${MAX_YEAR}.`);
      return;
    }

    if (!VEHICLE_TYPES.includes(form.vehicle_type)) {
      setAddErr("Select a valid vehicle type.");
      return;
    }

    if (plate.length > 15) {
      setAddErr("Plate number must be 15 characters or fewer.");
      return;
    }

    if (engine.length > 30) {
      setAddErr("Engine number must be 30 characters or fewer.");
      return;
    }

    if (chassis.length > 30) {
      setAddErr("Chassis number must be 30 characters or fewer.");
      return;
    }

    if (form.make.trim().length > 40) {
      setAddErr("Make must be 40 characters or fewer.");
      return;
    }

    if (form.model.trim().length > 40) {
      setAddErr("Model must be 40 characters or fewer.");
      return;
    }

    if (form.color.trim().length > 30) {
      setAddErr("Color must be 30 characters or fewer.");
      return;
    }

    if (vehicles.some((v) => v.plate_number === plate)) {
      setAddErr("Plate number already exists.");
      return;
    }

    if (vehicles.some((v) => String(v.engine_number).toUpperCase() === engine)) {
      setAddErr("Engine number already exists.");
      return;
    }

    if (vehicles.some((v) => String(v.chassis_number).toUpperCase() === chassis)) {
      setAddErr("Chassis number already exists.");
      return;
    }

    if (
      drivers.length > 0 &&
      !drivers.some((d) => d.license_number === ownerLicense)
    ) {
      setAddErr("Owner license number does not exist.");
      return;
    }

    setSubmitting(true);

    try {
      await createVehicle({
        plate_number: plate,
        engine_number: engine,
        chassis_number: chassis,
        make: form.make.trim(),
        model: form.model.trim(),
        year: yr,
        color: form.color.trim(),
        vehicle_type: form.vehicle_type,
        owner_license_number: ownerLicense,
      });

      setAddOpen(false);
      toast("Vehicle added successfully.");
      await refresh();
    } catch (e) {
      setAddErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(vehicle) {
    setEditForm({
      make:                 vehicle.make || "",
      model:                vehicle.model || "",
      year:                 String(vehicle.year || ""),
      color:                vehicle.color || "",
      vehicle_type:         vehicle.vehicle_type || "",
      owner_license_number: vehicle.owner_license_number || "",
    });
    setEditErr("");
    setEditingVehicle(vehicle);
  }

  function patchEditForm(key, val) {
    setEditForm((prev) => ({ ...prev, [key]: val }));
  }

  /*
   * Sends a PUT for the non-key fields only. plate_number, engine_number, and
   * chassis_number are omitted — they are the composite FK that links to
   * violation_ticket and registration and cannot safely change.
   */
  async function submitEdit() {
    setEditErr("");

    const ownerLicense = editForm.owner_license_number.trim();
    const yr = parseInt(editForm.year, 10);

    if (!editForm.make.trim()) {
      setEditErr("Make is required.");
      return;
    }

    if (!editForm.model.trim()) {
      setEditErr("Model is required.");
      return;
    }

    if (isNaN(yr) || yr < 1900 || yr > MAX_YEAR) {
      setEditErr(`Year must be between 1900 and ${MAX_YEAR}.`);
      return;
    }

    if (!editForm.color.trim()) {
      setEditErr("Color is required.");
      return;
    }

    if (!editForm.vehicle_type) {
      setEditErr("Vehicle type is required.");
      return;
    }

    if (!VEHICLE_TYPES.includes(editForm.vehicle_type)) {
      setEditErr("Select a valid vehicle type.");
      return;
    }

    if (!ownerLicense) {
      setEditErr("Owner license number is required.");
      return;
    }

    if (editForm.make.trim().length > 40) {
      setEditErr("Make must be 40 characters or fewer.");
      return;
    }

    if (editForm.model.trim().length > 40) {
      setEditErr("Model must be 40 characters or fewer.");
      return;
    }

    if (editForm.color.trim().length > 30) {
      setEditErr("Color must be 30 characters or fewer.");
      return;
    }

    if (
      drivers.length > 0 &&
      !drivers.some((d) => d.license_number === ownerLicense)
    ) {
      setEditErr("Owner license number does not exist.");
      return;
    }

    setEditSubmitting(true);

    try {
      await updateVehicle(editingVehicle.plate_number, {
        make: editForm.make.trim(),
        model: editForm.model.trim(),
        year: yr,
        color: editForm.color.trim(),
        vehicle_type: editForm.vehicle_type,
        owner_license_number: ownerLicense,
      });

      setEditingVehicle(null);
      toast("Vehicle updated successfully.");
      await refresh();
    } catch (e) {
      setEditErr(e.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  function handleDelete(plateNumber) {
    setPendingDelete(plateNumber);
  }

  async function confirmDelete() {
    const plateNumber = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteVehicle(plateNumber);
      if (expandedPlate === plateNumber) setExpandedPlate(null);
      await refresh();
      toast("Vehicle deleted.");
    } catch (e) {
      toast(e.message, "error");
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
          <div className="pageTitle">Vehicle Management</div>
          <div className="pageSub">Manage vehicle registrations and ownership</div>
        </div>
        <button className="primaryBtn" onClick={openAdd}>+ Add Vehicle</button>
      </div>

      <div className="card">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by plate number, owner, or make/model..." />
        {apiErr && <div className="softNote">API not reachable: <span className="softNoteErr">{apiErr}</span></div>}
        {driversErr && <div className="softNote">Driver list not reachable: <span className="softNoteErr">{driversErr}</span></div>}
      </div>

      <div className="card tableCard">
        <div className="tableTitleRow">
          <div className="tableTitle">
            {loading ? "Loading..." : `Vehicles (${filtered.length})`}
          </div>
        </div>

        <div className="tableScroll"><div className="vehiclesTableHeader">
          <div>Plate Number</div>
          <div>Owner</div>
          <div>Vehicle Type</div>
          <div>Make / Model</div>
          <div>Year</div>
          <div>Color</div>
          <div>Details</div>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="emptyState">No vehicles found.</div>
        )}

        {filtered.map((v) => {
          const expanded = expandedPlate === v.plate_number;
          return (
            <Fragment key={v.plate_number}>
              <div className="vehiclesTableRow">
                <div className="vehiclesCellMono">{v.plate_number}</div>
                <div className="vehiclesOwnerCell">
                  <span className="vehiclesOwnerName">{fullName(v)}</span>
                  <span className="vehiclesOwnerLicense">{v.owner_license_number}</span>
                </div>
                <div className="vehiclesCell">{v.vehicle_type}</div>
                <div className="vehiclesCell">{v.make} {v.model}</div>
                <div className="vehiclesCell">{v.year}</div>
                <div className="vehiclesColorCell">
                  <ColorDot color={v.color} />
                  <span>{v.color}</span>
                </div>
                <div className="vehiclesExpandCell">
                  <button className="vehiclesExpandBtn"
                    onClick={() => setExpandedPlate(expanded ? null : v.plate_number)}>
                    {expanded ? <ChevronUp /> : <ChevronDown />}
                    {expanded ? "Collapse" : "Expand"}
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="vehiclesExpandedRow">
                  <div className="vehiclesExpandedGrid">
                    <div className="vehiclesExpandedItem">
                      <div className="vehiclesExpandedLabel">Engine Number</div>
                      <div className="vehiclesExpandedValue vehiclesMono">{v.engine_number}</div>
                    </div>
                    <div className="vehiclesExpandedItem">
                      <div className="vehiclesExpandedLabel">Chassis Number</div>
                      <div className="vehiclesExpandedValue vehiclesMono">{v.chassis_number}</div>
                    </div>
                    <div className="vehiclesExpandedItem">
                      <div className="vehiclesExpandedLabel">Owner License</div>
                      <div className="vehiclesExpandedValue vehiclesMono">{v.owner_license_number}</div>
                    </div>
                  </div>
                  <div className="vehiclesExpandedActions">
                    <button className="vehiclesEditBtn" onClick={() => openEdit(v)}>
                      <PencilIcon /> Edit
                    </button>
                    <button className="vehiclesDeleteBtn" onClick={() => handleDelete(v.plate_number)}>
                      <TrashIcon /> Delete
                    </button>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}</div>

        {loading && <div className="emptyState">Loading...</div>}
      </div>

      {/* ── Edit Modal ── */}
      {editingVehicle && (
        <div className="modalOverlay" onClick={() => setEditingVehicle(null)}>
          <div className="vehiclesAddModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">Edit Vehicle</div>
              <button className="modalCloseBtn" onClick={() => setEditingVehicle(null)}>✕</button>
            </div>

            <div className="formSection">
              <div className="vehiclesIdentitySection">
                <div className="vehiclesIdentitySectionLabel">Composite Vehicle Identity (read-only)</div>
                <div className="fieldFull">
                  <label style={{ color: "#86868B" }}>Plate Number</label>
                  <input className="input" value={editingVehicle.plate_number} disabled style={{ opacity: 0.5 }} />
                </div>
                <div className="fieldFull">
                  <label style={{ color: "#86868B" }}>Engine Number</label>
                  <input className="input" value={editingVehicle.engine_number} disabled style={{ opacity: 0.5 }} />
                </div>
                <div className="fieldFull">
                  <label style={{ color: "#86868B" }}>Chassis Number</label>
                  <input className="input" value={editingVehicle.chassis_number} disabled style={{ opacity: 0.5 }} />
                </div>
              </div>

              <div className="field2">
                <div>
                  <label>Make</label>
                  <input className="input" placeholder="Toyota"
                    value={editForm.make} onChange={(e) => patchEditForm("make", e.target.value)} />
                </div>
                <div>
                  <label>Model</label>
                  <input className="input" placeholder="Vios"
                    value={editForm.model} onChange={(e) => patchEditForm("model", e.target.value)} />
                </div>
              </div>

              <div className="field3">
                <div>
                  <label>Year</label>
                  <input className="input" type="number" placeholder="2024"
                    value={editForm.year} onChange={(e) => patchEditForm("year", e.target.value)} />
                </div>
                <div>
                  <label>Color</label>
                  <input className="input" placeholder="Silver"
                    value={editForm.color} onChange={(e) => patchEditForm("color", e.target.value)} />
                </div>
                <div>
                  <label>Vehicle Type</label>
                  <select className="input" value={editForm.vehicle_type} onChange={(e) => patchEditForm("vehicle_type", e.target.value)}>
                    <option value="">Select type</option>
                    {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="fieldFull">
                <label>Owner (Driver License Number)</label>
                <AutocompleteInput
                  value={editForm.owner_license_number}
                  onChange={(v) => patchEditForm("owner_license_number", v)}
                  placeholder="Search owner name or license..."
                  options={drivers}
                  getLabel={(d) => `${[d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ")} — ${d.license_number}`}
                  getValue={(d) => d.license_number}
                  onPick={(license) => patchEditForm("owner_license_number", license)}
                />
              </div>

              {editErr && <div className="msgError">{editErr}</div>}
            </div>

            <div className="modalFooter">
              <button className="secondaryBtn" onClick={() => setEditingVehicle(null)}>Cancel</button>
              <button className="primaryBtn" onClick={submitEdit} disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      {addOpen && (
        <div className="modalOverlay" onClick={() => setAddOpen(false)}>
          <div className="vehiclesAddModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">Add New Vehicle</div>
              <button className="modalCloseBtn" onClick={() => setAddOpen(false)}>✕</button>
            </div>

            <div className="formSection">
              {/*
               * Composite Vehicle Identity — plate, engine, chassis together form the
               * composite unique key that links vehicle → registration → violation_ticket.
               */}
              <div className="vehiclesIdentitySection">
                <div className="vehiclesIdentitySectionLabel">Composite Vehicle Identity</div>
                <div className="fieldFull">
                  <label>Plate Number</label>
                  <input className="input" placeholder="ABC-1234"
                    value={form.plate_number} onChange={(e) => patchForm("plate_number", e.target.value)} />
                </div>
                <div className="fieldFull">
                  <label>Engine Number</label>
                  <input className="input" placeholder="ENG-2024-001"
                    value={form.engine_number} onChange={(e) => patchForm("engine_number", e.target.value)} />
                </div>
                <div className="fieldFull">
                  <label>Chassis Number</label>
                  <input className="input" placeholder="CHS-2024-001"
                    value={form.chassis_number} onChange={(e) => patchForm("chassis_number", e.target.value)} />
                </div>
              </div>

              <div className="field2">
                <div>
                  <label>Make</label>
                  <input className="input" placeholder="Toyota"
                    value={form.make} onChange={(e) => patchForm("make", e.target.value)} />
                </div>
                <div>
                  <label>Model</label>
                  <input className="input" placeholder="Vios"
                    value={form.model} onChange={(e) => patchForm("model", e.target.value)} />
                </div>
              </div>

              <div className="field3">
                <div>
                  <label>Year</label>
                  <input className="input" type="number" placeholder="2024"
                    value={form.year} onChange={(e) => patchForm("year", e.target.value)} />
                </div>
                <div>
                  <label>Color</label>
                  <input className="input" placeholder="Silver"
                    value={form.color} onChange={(e) => patchForm("color", e.target.value)} />
                </div>
                <div>
                  <label>Vehicle Type</label>
                  <select className="input" value={form.vehicle_type} onChange={(e) => patchForm("vehicle_type", e.target.value)}>
                    <option value="">Select type</option>
                    {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="fieldFull">
                <label>Owner (Driver License Number)</label>
                <AutocompleteInput
                  value={form.owner_license_number}
                  onChange={(v) => patchForm("owner_license_number", v)}
                  placeholder="Search owner name or license..."
                  options={drivers}
                  getLabel={(d) => `${[d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ")} — ${d.license_number}`}
                  getValue={(d) => d.license_number}
                  onPick={(license) => patchForm("owner_license_number", license)}
                />
              </div>

              {addErr && <div className="msgError">{addErr}</div>}
            </div>

            <div className="modalFooter">
              <button className="secondaryBtn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="primaryBtn" onClick={submitAdd} disabled={submitting}>
                {submitting ? "Saving..." : "Add Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {pendingDelete && (
        <ConfirmModal
          message={`Delete vehicle ${pendingDelete}? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <ToastList toasts={toasts} onDismiss={dismiss} />
    </PageShell>
  );
}
