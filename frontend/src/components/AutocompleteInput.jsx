import { useMemo, useState } from "react";
import "./AutocompleteInput.css";

export default function AutocompleteInput({
  value,
  onChange,
  placeholder,
  options,
  getLabel,
  getValue,
  onPick,
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = String(value || "").toLowerCase().trim();
    const rows = options || [];
    if (!q) return rows.slice(0, 8);

    return rows
      .filter((o) => {
        const label = getLabel(o).toLowerCase();
        const val = String(getValue(o)).toLowerCase();
        return label.includes(q) || val.includes(q);
      })
      .slice(0, 8);
  }, [value, options, getLabel, getValue]);

  return (
    <div className="acWrap">
      <input
        className="input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
      />

      {open && filtered.length > 0 ? (
        <div className="acList">
          {filtered.map((o) => (
            <button
              key={getValue(o)}
              type="button"
              className="acItem"
              onClick={() => {
                onPick(getValue(o), o);
                setOpen(false);
              }}
            >
              {getLabel(o)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
