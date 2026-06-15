/* ------------------------------------------------------------------ */
/*  Import module — MAWB API client                                   */
/*  Isolated helper for all Import/MAWB backend calls. Sends the      */
/*  Bearer token so the backend can enforce role-based authorization. */
/* ------------------------------------------------------------------ */

const API_BASE = "https://papayawhip-antelope-424743.hostingersite.com/api";
const MAWB_API = `${API_BASE}/import/mawb`;

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
    const msg = (body && body.message) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
};

export const listMawb = async (status) => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const body = await handle(
    await fetch(`${MAWB_API}${qs}`, { headers: authHeaders() })
  );
  return Array.isArray(body) ? body : body.data || [];
};

export const getMawb = async (id) => {
  const body = await handle(
    await fetch(`${MAWB_API}/${id}`, { headers: authHeaders() })
  );
  return body.data;
};

export const createMawb = async (payload) => {
  const body = await handle(
    await fetch(MAWB_API, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
  );
  return body.data;
};

export const updateMawb = async (id, payload) => {
  const body = await handle(
    await fetch(`${MAWB_API}/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
  );
  return body.data;
};

export const deleteMawb = async (id) => {
  await handle(
    await fetch(`${MAWB_API}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    })
  );
  return true;
};

// Download the backend-rendered Word (.doc) document for a saved record.
export const downloadMawbWordFromServer = async (id, fileName) => {
  const res = await fetch(`${MAWB_API}/${id}/download`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || `AWB-Instruction-${id}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/* ------------------------------------------------------------------ */
/*  Empty MAWB factory — the 16 user-fillable AWB-Instruction fields  */
/* ------------------------------------------------------------------ */
export const emptyMawb = () => ({
  shipper: "",
  consignee: "",
  notify: "",
  from_routing: "",
  to_routing: "",
  freight: "PP",
  hawb_nos: "",
  airport_of_destination: "",
  handling_information: "",
  no_of_pcs: "",
  gross_weight: "",
  chargeable_weight: "",
  nature_of_goods: "",
  hsn_code: "",
  goods_dimension: "",
  date: "",
  status: "draft",
});
