import React, { useEffect, useMemo, useState } from "react";
import "./AutocompleteInput.css"; // reuse same dropdown styles

export default function AsyncAutocompleteInput({
  value,
  onChange,
  placeholder,
  fetchOptions,   // async (q) => rows
  getLabel,
  getValue,
  onPick,
  minChars = 2,
  debounceMs = 250,
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = String(value || "").trim();
    if (!open) return;
    if (q.length < minChars) {
      setOptions([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const rows = await fetchOptions(q);
        setOptions(rows || []);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(t);
  }, [value, open, fetchOptions, minChars, debounceMs]);

  const shown = useMemo(() => options.slice(0, 8), [options]);

  return (
    <div className="acWrap">
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />

      {open && (loading || shown.length > 0) ? (
        <div className="acList">
          {loading ? (
            <div style={{ padding: 10, color: "#86868B", fontSize: 12 }}>Searching...</div>
          ) : (
            shown.map((o) => (
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
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}