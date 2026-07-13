/* ------------------------------------------------------------------ */
/*  Import module — HAWB API client (independent from MAWB)            */
/* ------------------------------------------------------------------ */

const API_BASE = "https://papayawhip-antelope-424743.hostingersite.com/api";
const HAWB_API = `${API_BASE}/import/hawb`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
});

const handle = async (res) => {
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || (body && body.success === false)) {
    throw new Error((body && body.message) || `Request failed (${res.status})`);
  }
  return body;
};

export const listHawb = async (status) => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const body = await handle(await fetch(`${HAWB_API}${qs}`, { headers: authHeaders() }));
  return Array.isArray(body) ? body : body.data || [];
};

export const getHawb = async (id) => {
  const body = await handle(await fetch(`${HAWB_API}/${id}`, { headers: authHeaders() }));
  return body.data;
};

export const createHawb = async (payload) => {
  const body = await handle(
    await fetch(HAWB_API, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) })
  );
  return body.data;
};

export const updateHawb = async (id, payload) => {
  const body = await handle(
    await fetch(`${HAWB_API}/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(payload) })
  );
  return body.data;
};

export const deleteHawb = async (id) => {
  await handle(await fetch(`${HAWB_API}/${id}`, { method: "DELETE", headers: authHeaders() }));
  return true;
};

/* ------------------------------------------------------------------ */
/*  Handling Information                                               */
/*  The standard boilerplate is pre-printed on the HAWB template. The  */
/*  No. of Pieces (RCP) value is prefixed to it, e.g. 25 ->            */
/*  "25 BOXES ADDED AND MKD.// …". It stays auto-derived until the     */
/*  user edits the text by hand, after which it is left alone.         */
/* ------------------------------------------------------------------ */
export const DEFAULT_HANDLING =
  "BOXES ADDED AND MKD.// ONE ENV CONTG DOCS ( H.AWB, MANIFEST, INVOICE, PACKING LIST ) ATTD WITH THE SHPT.";

/** Handling Information for a given No. of Pieces (RCP) value. */
export const buildHandlingInformation = (pieces) => {
  const n = String(pieces ?? "").trim();
  return n ? `${n} ${DEFAULT_HANDLING}` : DEFAULT_HANDLING;
};

/**
 * True while the Handling Information is still the auto-derived text (blank, the bare
 * boilerplate, or the boilerplate with a piece-count prefix) — i.e. the user has not
 * hand-edited it, so it is safe to regenerate when No. of Pieces (RCP) changes.
 */
export const isAutoHandlingInformation = (text) => {
  const s = String(text ?? "").trim();
  if (s === "" || s === DEFAULT_HANDLING) return true;
  return /^\d+\s+/.test(s) && s.replace(/^\d+\s+/, "") === DEFAULT_HANDLING;
};

/* Empty HAWB factory — the 19 user-fillable fields */
export const emptyHawb = () => ({
  airport_of_departure: "",
  airport_of_destination: "",
  master_awb_number: "",
  house_awb_number: "",
  shipper: "",
  consignee: "",
  notify: "",
  notify_party_2: "",
  accounting_information: "",
  destination_agent_detail: "",
  routing_airport_of_departure: "",
  routing_to: "",
  routing_airport_of_destination: "",
  freight: "",
  handling_information: DEFAULT_HANDLING,
  no_of_pieces: "",
  gross_weight: "",
  chargeable_weight: "",
  nature_of_goods: "",
  invoice_no: "",
  invoice_date: "",
  hsn_code: "",
  dimension: "",
  volume_wt: "",
  shipping_bill_no: "",
  shipping_bill_date: "",
  dated: "",
  status: "draft",
});
