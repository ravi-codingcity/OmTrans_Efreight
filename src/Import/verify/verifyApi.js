/* ------------------------------------------------------------------ */
/*  Import module — AI Document Verification API client (isolated)     */
/*                                                                      */
/*  Base URL resolution:                                               */
/*   1. VITE_API_URL (explicit override) always wins.                  */
/*   2. During `vite dev` (import.meta.env.DEV) default to a LOCAL      */
/*      backend on :5000 — the deployed host does not serve this new    */
/*      module yet, and its proxy 307-redirects the request (which      */
/*      strips CORS headers and shows up as a CORS error).             */
/*   3. In production builds, use the deployed API host.               */
/*  The backend CORS already allows all origins; the failures were the  */
/*  hosting proxy, not the Node app.                                    */
/* ------------------------------------------------------------------ */
const DEV_API_URL = "http://localhost:5000";
const PROD_API_URL = "https://papayawhip-antelope-424743.hostingersite.com";
const OVERRIDE = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const DEFAULT_BASE = import.meta.env.DEV ? DEV_API_URL : PROD_API_URL;
const API_ROOT = OVERRIDE || DEFAULT_BASE;
const API_BASE = `${API_ROOT}/api`;
const VERIFY_API = `${API_BASE}/import/verification`;

// Client-side ceiling — a bit above the backend's AI timeout so the server's
// clean error wins; if even this elapses we show a friendly timeout message.
const CLIENT_TIMEOUT_MS = 160000;

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` });

// Read a File as base64 (without the "data:...;base64," prefix).
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    reader.onerror = () => reject(new Error(`Could not read "${file.name}"`));
    reader.readAsDataURL(file);
  });

const handle = async (res) => {
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || (body && body.success === false)) {
    // Prefer the server's actual message; otherwise map common failures precisely.
    if (body && body.message) throw new Error(body.message);
    if (res.status === 404) throw new Error("Verification endpoint not found (404). The backend may not be deployed/restarted.");
    if (res.status === 504) throw new Error("Gateway timeout while reaching the verification service.");
    if (res.status === 502 || res.status === 503) throw new Error("The AI service is temporarily unavailable. Please retry in a moment.");
    if (res.status === 413) throw new Error("The uploaded files are too large. Please reduce the PDF sizes.");
    if (res.status === 401 || res.status === 403) throw new Error("You are not authorized. Please sign in again.");
    if (res.status === 500) throw new Error("Internal server error during verification. Please check the server logs.");
    throw new Error(`Request failed (${res.status})`);
  }
  return body;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const getVerifyStatus = async () => {
  const body = await handle(await fetch(`${VERIFY_API}/status`, { headers: authHeader() }));
  return body.data;
};

/* ----------------------- saved records ----------------------- */
const jsonHeaders = () => ({ ...authHeader(), "Content-Type": "application/json" });

export const saveVerification = async (payload) => {
  const body = await handle(
    await fetch(`${VERIFY_API}/records`, { method: "POST", headers: jsonHeaders(), body: JSON.stringify(payload) })
  );
  return body.data;
};

export const listVerifications = async () => {
  const body = await handle(await fetch(`${VERIFY_API}/records`, { headers: authHeader() }));
  return body.data || [];
};

export const getVerification = async (id) => {
  const body = await handle(await fetch(`${VERIFY_API}/records/${id}`, { headers: authHeader() }));
  return body.data;
};

export const deleteVerification = async (id) => {
  await handle(await fetch(`${VERIFY_API}/records/${id}`, { method: "DELETE", headers: authHeader() }));
  return true;
};

const networkError = (err) => {
  if (err instanceof TypeError) {
    const hint = import.meta.env.DEV
      ? ` Make sure the backend is running at ${API_ROOT} (npm run dev in Backend), or set VITE_API_URL.`
      : "";
    return new Error(`Could not reach the verification service at ${API_ROOT}.${hint}`);
  }
  return err;
};

// POST the documents; returns a jobId immediately (fast — never trips the proxy timeout).
const startCompare = async (checklist, systemDocs) => {
  try {
    const res = await fetch(`${VERIFY_API}/compare`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ checklist, systemDocs }),
    });
    const body = await handle(res);
    return body.data.jobId;
  } catch (err) {
    throw networkError(err);
  }
};

// Poll one status tick. Transient network blips are surfaced as null so the caller
// can keep polling rather than aborting on a single hiccup.
const pollOnce = async (jobId) => {
  const res = await fetch(`${VERIFY_API}/compare/${jobId}`, { headers: authHeader() });
  const body = await handle(res);
  return body.data; // { status: 'processing' | 'completed' | 'failed', result?, message? }
};

/**
 * Compare a CHA Checklist PDF against one or more system PDFs.
 * Uploads (base64 JSON) then polls the async job until it finishes — every HTTP
 * request is sub-second, so the hosting proxy never times out during AI processing.
 * @param {File} checklistFile
 * @param {File[]} systemFiles
 */
export const compareDocuments = async (checklistFile, systemFiles) => {
  const checklist = { name: checklistFile.name, data: await fileToBase64(checklistFile) };
  const systemDocs = await Promise.all(
    (systemFiles || []).map(async (f) => ({ name: f.name, data: await fileToBase64(f) }))
  );

  const jobId = await startCompare(checklist, systemDocs);

  const deadline = Date.now() + CLIENT_TIMEOUT_MS;
  let transientFails = 0;
  while (Date.now() < deadline) {
    await sleep(2500);
    let data;
    try {
      data = await pollOnce(jobId);
    } catch (err) {
      // Tolerate a few transient blips; a persistent one is a real error.
      if (err instanceof TypeError && ++transientFails <= 4) continue;
      throw networkError(err);
    }
    transientFails = 0;
    if (data.status === "completed") return data.result;
    if (data.status === "failed") throw new Error(data.message || "Verification failed.");
    // status === "processing" → keep polling
  }
  throw new Error("The verification is taking longer than expected. Please try again with fewer or smaller PDFs.");
};
