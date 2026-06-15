/* ------------------------------------------------------------------ */
/*  Date formatting helpers for the Import module                     */
/*  Native <input type="date"> stores ISO (YYYY-MM-DD); documents and  */
/*  displays must show DD/MM/YYYY.                                     */
/* ------------------------------------------------------------------ */

// Convert any parseable date value to "DD/MM/YYYY". Returns "" for blank,
// and the original string if it cannot be parsed.
export const formatDMY = (val) => {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  if (!s) return "";

  // Already DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;

  // ISO YYYY-MM-DD (optionally with time)
  m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) return `${m[3].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[1]}`;

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return s;
};

// Build a deduped, sorted suggestion list for a field from a set of records.
export const collectSuggestions = (records, field) => {
  const seen = new Map(); // lowercase -> original
  (records || []).forEach((r) => {
    const val = (r && r[field] != null ? String(r[field]) : "").trim();
    if (val && !seen.has(val.toLowerCase())) seen.set(val.toLowerCase(), val);
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
};
