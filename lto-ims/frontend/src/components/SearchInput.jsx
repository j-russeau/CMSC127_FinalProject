import React from "react";
import "./SearchInput.css";

export default function SearchInput({ value, onChange, placeholder }) {
  const showClear = String(value || "").length > 0;

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

      <input
        className="searchInput"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      {showClear ? (
        <button
          type="button"
          className="searchClearBtn"
          onClick={() => onChange("")}
          aria-label="Clear search"
          title="Clear"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}