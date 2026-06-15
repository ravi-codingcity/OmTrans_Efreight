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

/* Empty HAWB factory — the 19 user-fillable fields */
export const emptyHawb = () => ({
  airport_of_departure: "",
  airport_of_destination: "",
  master_awb_number: "",
  house_awb_number: "",
  shipper: "",
  consignee: "",
  notify: "",
  routing_airport_of_departure: "",
  routing_to: "",
  routing_airport_of_destination: "",
  handling_information:
    "BOXES ADDED AND MKD.// ONE ENV CONTG DOCS ( H.AWB, MANIFEST, INVOICE, PACKING LIST ) ATTD WITH THE SHPT.",
  no_of_pieces: "",
  gross_weight: "",
  chargeable_weight: "",
  nature_of_goods: "",
  invoice_no: "",
  invoice_date: "",
  hsn_code: "",
  dimension: "",
  volume_wt: "",
  dated: "",
  status: "draft",
});
