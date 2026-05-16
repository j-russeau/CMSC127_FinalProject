/*
 * Shared utility functions used across all page components.
 * Previously each page defined its own copy of fullName, formatDate, etc.
 * Having N copies meant changing a date format required editing N files,
 * and the copies had already started drifting (formatDate vs formatDateTime).
 */

export function fullName(person) {
  return [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");
}

export function initials(person) {
  return ((person.first_name || "")[0] || "").toUpperCase();
}

/* Age in years from a date-of-birth string. */
export function computeAge(dob) {
  if (!dob) return "—";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/*
 * Formats a date-only string (YYYY-MM-DD) or ISO datetime.
 * MySQL DATE columns arrive without a time component, so appending T00:00:00
 * forces the browser to parse it as local time instead of UTC midnight
 * (which would display as the previous day in timezones west of UTC).
 */
export function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

/*
 * Formats a MySQL DATETIME string ("YYYY-MM-DD HH:MM:SS") into separate
 * date and time strings. The space-to-T replacement is needed because
 * MySQL sends a space instead of T, which some browsers reject as invalid ISO.
 */
export function formatDateTime(dtString) {
  if (!dtString) return { date: "—", time: "" };
  const iso = dtString.includes("T") ? dtString : dtString.replace(" ", "T");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: dtString, time: "" };
  const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

/* Philippine peso formatting. */
export function formatMoney(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return "—";
  return `₱${num.toLocaleString("en-PH")}`;
}

/*
 * Splits the GROUP_CONCAT "||"-delimited address string the backend returns.
 * The delimiter was chosen to be unlikely in real addresses. Splitting here
 * keeps the backend query simple (no JSON_ARRAYAGG which requires MySQL 5.7.22+).
 */
export function parseAddresses(raw) {
  if (!raw) return [];
  return String(raw).split("||").map((a) => a.trim()).filter(Boolean);
}
