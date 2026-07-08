import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud, FileText, X, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ShieldCheck, ScanSearch, Info, Trash2, FilePlus2, Package, Container, Award,
  ReceiptText, ListChecks, FileWarning, ArrowRight, Save,
} from "lucide-react";
import { compareDocuments, getVerifyStatus, saveVerification } from "./verifyApi";

const MAX_MB = 15;
const fmtBytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const isPdf = (f) => f && (f.type === "application/pdf" || /\.pdf$/i.test(f.name));

// Row status → color + label (shared across all comparison tables).
const STATUS_META = {
  match: { label: "Match", chip: "bg-emerald-100 text-emerald-700", row: "" },
  mismatch: { label: "Mismatch", chip: "bg-red-100 text-red-700", row: "bg-red-50/50" },
  missing_in_system: { label: "Missing in System", chip: "bg-amber-100 text-amber-700", row: "bg-amber-50/50" },
  missing_in_checklist: { label: "Missing in Checklist", chip: "bg-sky-100 text-sky-700", row: "bg-sky-50/50" },
  not_present: { label: "Not Present", chip: "bg-gray-100 text-gray-500", row: "" },
  extra_in_system: { label: "Extra in System", chip: "bg-sky-100 text-sky-700", row: "bg-sky-50/50" },
};

const PROGRESS_STAGES = [
  "Uploading documents…",
  "Extracting text from the CHA Checklist…",
  "Extracting data from your system documents…",
  "Consolidating information across documents…",
  "Comparing values with AI…",
  "Finalizing the verification report…",
];

const DocVerify = ({ onSaved }) => {
  const [checklist, setChecklist] = useState(null);
  const [systemDocs, setSystemDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [stage, setStage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const checklistRef = useRef(null);
  const systemRef = useRef(null);

  useEffect(() => {
    getVerifyStatus().then(setStatus).catch(() => {});
  }, []);

  // Advance the progress message while the AI runs (it can take 20-90s).
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, PROGRESS_STAGES.length - 1)), 6000);
    return () => clearInterval(t);
  }, [busy]);

  const reject = (msg) => { setError(msg); setTimeout(() => setError(null), 4000); };

  const onChecklist = (files) => {
    const f = files && files[0];
    if (!f) return;
    if (!isPdf(f)) return reject("The CHA Checklist must be a PDF.");
    if (f.size > MAX_MB * 1048576) return reject(`Checklist exceeds ${MAX_MB} MB.`);
    setChecklist(f);
  };

  const onSystem = (files) => {
    const incoming = Array.from(files || []).filter(Boolean);
    const bad = incoming.find((f) => !isPdf(f));
    if (bad) return reject("All system documents must be PDFs.");
    const tooBig = incoming.find((f) => f.size > MAX_MB * 1048576);
    if (tooBig) return reject(`"${tooBig.name}" exceeds ${MAX_MB} MB.`);
    setSystemDocs((prev) => {
      const map = new Map(prev.map((f) => [f.name + f.size, f]));
      incoming.forEach((f) => map.set(f.name + f.size, f));
      const max = status?.maxSystemDocs || 8;
      const next = [...map.values()];
      if (next.length > max) { reject(`At most ${max} system documents.`); return next.slice(0, max); }
      return next;
    });
  };

  const removeSystem = (key) => setSystemDocs((prev) => prev.filter((f) => f.name + f.size !== key));

  const reset = () => { setResult(null); setError(null); };

  const compare = async () => {
    if (!checklist) return reject("Please upload the CHA Checklist PDF.");
    if (systemDocs.length === 0) return reject("Please upload at least one system PDF.");
    setBusy(true); setError(null); setResult(null); setStage(0); setSaved(false);
    try {
      const res = await compareDocuments(checklist, systemDocs);
      setResult(res);
    } catch (err) {
      setError(err.message || "Comparison failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!result) return;
    setSaving(true); setError(null);
    try {
      await saveVerification({
        result,
        checklistFileName: checklist?.name || "",
        systemDocuments: systemDocs.map((f) => f.name),
      });
      setSaved(true);
      onSaved && onSaved();
    } catch (err) {
      setError(err.message || "Could not save the verification record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <ScanSearch size={16} className="text-teal-600" /> AI Document Verification
          </h2>
          <p className="text-[11px] text-gray-500">
            Compare the CHA <span className="font-semibold">Check List – Bill of Entry for Home Consumption</span> against your system documents.
          </p>
        </div>
        {status?.mockMode && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
            <Info size={12} /> Demo mode (AI key not configured)
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Upload area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CHA checklist */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-2">1. CHA Checklist (PDF)</h3>
          <input ref={checklistRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => onChecklist(e.target.files)} />
          {!checklist ? (
            <button onClick={() => checklistRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-8 hover:border-teal-400 hover:bg-teal-50/40 transition">
              <UploadCloud size={26} className="text-teal-500" />
              <span className="text-xs font-medium text-gray-600">Upload CHA Checklist</span>
              <span className="text-[10px] text-gray-400">PDF · max {MAX_MB} MB</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/60 p-2.5">
              <FileText size={18} className="text-teal-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700">{checklist.name}</p>
                <p className="text-[10px] text-gray-400">{fmtBytes(checklist.size)}</p>
              </div>
              <button onClick={() => setChecklist(null)} className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-500"><X size={15} /></button>
            </div>
          )}
        </div>

        {/* System documents */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">2. System Document(s) (PDF)</h3>
            {systemDocs.length > 0 && (
              <button onClick={() => systemRef.current?.click()} className="flex items-center gap-1 text-[10px] font-semibold text-teal-700 hover:underline">
                <FilePlus2 size={12} /> Add more
              </button>
            )}
          </div>
          <input ref={systemRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => onSystem(e.target.files)} />
          {systemDocs.length === 0 ? (
            <button onClick={() => systemRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-8 hover:border-teal-400 hover:bg-teal-50/40 transition">
              <UploadCloud size={26} className="text-teal-500" />
              <span className="text-xs font-medium text-gray-600">Upload system PDF(s)</span>
              <span className="text-[10px] text-gray-400">One or more PDFs · max {MAX_MB} MB each</span>
            </button>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {systemDocs.map((f) => {
                const key = f.name + f.size;
                return (
                  <div key={key} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2">
                    <FileText size={16} className="text-indigo-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-700">{f.name}</p>
                      <p className="text-[10px] text-gray-400">{fmtBytes(f.size)}</p>
                    </div>
                    <button onClick={() => removeSystem(key)} className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-2">
        {(checklist || systemDocs.length > 0) && (
          <button onClick={() => { setChecklist(null); setSystemDocs([]); reset(); }} disabled={busy} className="text-xs font-medium text-gray-500 hover:text-red-600 px-3 py-2 disabled:opacity-50">
            Clear all
          </button>
        )}
        <button onClick={compare} disabled={busy || !checklist || systemDocs.length === 0} className="flex items-center gap-2 bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-teal-700 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {busy ? "Analyzing with AI…" : "Compare Documents"}
        </button>
      </div>

      {/* Loading */}
      {busy && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm flex flex-col items-center justify-center gap-3 text-gray-500">
          <Loader2 size={28} className="animate-spin text-teal-500" />
          <p className="text-sm font-medium text-gray-700">{PROGRESS_STAGES[stage]}</p>
          <div className="h-1.5 w-56 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-teal-500 transition-all duration-700" style={{ width: `${((stage + 1) / PROGRESS_STAGES.length) * 100}%` }} />
          </div>
          <p className="text-[11px] text-gray-400">Large PDFs can take up to a minute — please keep this page open.</p>
        </div>
      )}

      {/* Results */}
      {result && !busy && (
        <>
          <ResultsPanel result={result} />
          {/* Save the verification report */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {saved ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={15} /> Verification saved
              </span>
            ) : (
              <button
                onClick={submit}
                disabled={saving}
                className="flex items-center gap-2 bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving…" : "Submit & Save Report"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const Bar = ({ score }) => {
  const color = score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full ${color} transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
};

const Stat = ({ label, value, tone }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm text-center">
    <p className={`text-xl font-bold ${tone}`}>{value}</p>
    <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
  </div>
);

const StatusPill = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.mismatch;
  return <span className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${m.chip}`}>{m.label}</span>;
};

const cell = "px-3 py-2 align-top";
const val = (v) => (v == null || v === "" ? <span className="text-gray-300">—</span> : v);

// Section wrapper with a title, icon and optional accent.
const Section = ({ title, icon: Icon, count, priority, children }) => (
  <div className={`bg-white border rounded-lg shadow-sm overflow-hidden ${priority ? "border-teal-300 ring-1 ring-teal-100" : "border-gray-200"}`}>
    <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${priority ? "bg-teal-50/70 border-teal-100" : "border-gray-100"}`}>
      {Icon && <Icon size={14} className={priority ? "text-teal-600" : "text-gray-500"} />}
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex-1">{title}{typeof count === "number" ? ` (${count})` : ""}</h3>
      {priority && <span className="text-[9px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">Highest Priority</span>}
    </div>
    {children}
  </div>
);

// Generic field-comparison table (Header / Containers / Certificates / SIMS).
const CompareTable = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] text-xs">
      <thead>
        <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 text-left">
          <th className={cell}>Field</th>
          <th className={cell}>CHA Checklist</th>
          <th className={cell}>System Document</th>
          <th className={cell}>Source</th>
          <th className={`${cell} text-right`}>Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => {
          const m = STATUS_META[r.status] || STATUS_META.mismatch;
          return (
            <tr key={i} className={m.row}>
              <td className={`${cell} font-semibold text-gray-700`}>{r.field}</td>
              <td className={`${cell} text-gray-700`}>{val(r.checklistValue)}</td>
              <td className={`${cell} text-gray-700`}>{val(r.systemValue)}</td>
              <td className={`${cell} text-gray-400`}>{r.sourceDocument ? r.sourceDocument : "—"}</td>
              <td className={`${cell} text-right`}><StatusPill status={r.status} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// Item-by-item comparison table (highest priority).
// Normalise a description the way the verifier does — ignore case, punctuation,
// spacing and line breaks — so only meaningful tokens are compared for highlighting.
const normToken = (t) => t.toUpperCase().replace(/[^A-Z0-9./-]/g, "");
const tokenSet = (s) => new Set(String(s || "").split(/\s+/).map(normToken).filter(Boolean));

// Render a description with the tokens that are ABSENT from the other side highlighted.
const HighlightDiff = ({ text, other }) => {
  const otherSet = tokenSet(other);
  const parts = String(text || "").split(/(\s+)/);
  return (
    <span>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p) || !p) return p;
        const differs = !otherSet.has(normToken(p));
        return differs
          ? <mark key={i} className="bg-red-100 text-red-700 rounded px-0.5">{p}</mark>
          : <span key={i}>{p}</span>;
      })}
    </span>
  );
};

// Side-by-side CHA vs System description comparison shown beneath an item.
const DescriptionCompare = ({ row }) => {
  const matched = row.descriptionStatus !== "mismatch";
  const chk = row.checklistDescription;
  const sys = row.systemDescription;
  const hasBoth = chk && sys;
  return (
    <div className="mt-1.5">
      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${matched ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
        {matched ? <><CheckCircle2 className="h-3 w-3" /> Item Description Matched</> : <><XCircle className="h-3 w-3" /> Item Description Not Matched</>}
      </span>
      {!matched && hasBoth && (
        <div className="mt-1.5 grid gap-1 rounded-md border border-red-100 bg-red-50/40 p-2 text-[10px] font-normal sm:grid-cols-2">
          <div>
            <p className="font-semibold uppercase tracking-wide text-gray-400">CHA Checklist</p>
            <p className="text-gray-700"><HighlightDiff text={chk} other={sys} /></p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-gray-400">System Document</p>
            <p className="text-gray-700"><HighlightDiff text={sys} other={chk} /></p>
          </div>
          {row.descriptionDetail && (
            <p className="sm:col-span-2 text-red-700"><span className="font-semibold">Reason:</span> {row.descriptionDetail}</p>
          )}
        </div>
      )}
    </div>
  );
};

const ItemTable = ({ items }) => (
  <>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 text-left">
            <th className={cell}>Description</th>
            <th className={cell}>HSN</th>
            <th className={cell}>Qty</th>
            <th className={cell}>Unit</th>
            <th className={cell}>Unit Price</th>
            <th className={cell}>Total Value</th>
            <th className={cell}>Origin</th>
            <th className={`${cell} text-right`}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.rows.length === 0 ? (
            <tr><td className={`${cell} text-gray-400`} colSpan={8}>No item-level data was extracted.</td></tr>
          ) : items.rows.map((r, i) => {
            const m = STATUS_META[r.status] || STATUS_META.mismatch;
            return (
              <tr key={i} className={m.row}>
                <td className={`${cell} font-semibold text-gray-700 min-w-[280px]`}>
                  {r.description}
                  {r.detail && r.detail !== r.descriptionDetail && <p className="font-normal text-[10px] text-gray-400 mt-0.5">{r.detail}</p>}
                  <DescriptionCompare row={r} />
                </td>
                <td className={`${cell} text-gray-700`}>{val(r.hsnCode)}</td>
                <td className={`${cell} text-gray-700`}>{val(r.quantity)}</td>
                <td className={`${cell} text-gray-700`}>{val(r.unit)}</td>
                <td className={`${cell} text-gray-700`}>{val(r.unitPrice)}</td>
                <td className={`${cell} text-gray-700`}>{val(r.totalValue)}</td>
                <td className={`${cell} text-gray-700`}>{val(r.countryOfOrigin)}</td>
                <td className={`${cell} text-right`}><StatusPill status={r.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {(items.missingItems.length > 0 || items.extraItems.length > 0) && (
      <div className="px-4 py-2.5 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1">
        {items.missingItems.length > 0 && (
          <div className="text-[11px]"><span className="font-bold text-amber-700">Missing items (in checklist, not in system):</span> <span className="text-gray-600">{items.missingItems.join(", ")}</span></div>
        )}
        {items.extraItems.length > 0 && (
          <div className="text-[11px]"><span className="font-bold text-sky-700">Extra items (in system, not in checklist):</span> <span className="text-gray-600">{items.extraItems.join(", ")}</span></div>
        )}
      </div>
    )}
  </>
);

// Duty & Tax summary table.
const DutyTaxTable = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[520px] text-xs">
      <thead>
        <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 text-left">
          <th className={cell}>Charge</th>
          <th className={cell}>Amount</th>
          <th className={cell}>Percentage</th>
          <th className={`${cell} text-right`}>Matches Supporting Docs</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => (
          <tr key={i}>
            <td className={`${cell} font-semibold text-gray-700`}>{r.name}{r.detail && <p className="font-normal text-[10px] text-gray-400 mt-0.5">{r.detail}</p>}</td>
            <td className={`${cell} text-gray-700`}>{val(r.amount)}</td>
            <td className={`${cell} text-gray-700`}>{r.percentage ? `${r.percentage}${/%/.test(r.percentage) ? "" : "%"}` : "—"}</td>
            <td className={`${cell} text-right`}>
              {r.matches === true ? <span className="text-emerald-600 font-semibold">✓ Yes</span>
                : r.matches === false ? <span className="text-red-600 font-semibold">✗ No</span>
                : <span className="text-gray-400">N/A</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// "ISSUED RETROACTIVELY" status card (from the CEPA certificate).
const IR_META = {
  present_marked: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50", txt: "text-emerald-800", label: "Present and Marked", emoji: "✅" },
  present_not_marked: { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50", txt: "text-amber-800", label: "Present but Not Marked", emoji: "⚠️" },
  not_found: { icon: XCircle, cls: "border-red-200 bg-red-50", txt: "text-red-800", label: "Field Not Found", emoji: "❌" },
};
const IssuedRetroactively = ({ data }) => {
  const m = IR_META[data.status] || IR_META.not_found;
  const Icon = m.icon;
  return (
    <div className={`rounded-lg border p-3 shadow-sm flex items-start gap-3 ${m.cls}`}>
      <Icon size={20} className={`shrink-0 ${m.txt}`} />
      <div className="min-w-0">
        <p className={`text-sm font-bold ${m.txt}`}>{m.emoji} ISSUED RETROACTIVELY: {m.label}</p>
        {data.detail && <p className="text-[11px] text-gray-600 mt-0.5">{data.detail}</p>}
        {data.sourceDocument && <p className="text-[10px] text-gray-400 mt-0.5">Source: {data.sourceDocument}</p>}
      </div>
    </div>
  );
};

// Multi-record SIMS verification table + summary counts.
const SimsTable = ({ sims }) => {
  const records = sims.records || [];
  const unmatched = (sims.unmatchedCount || 0) + (sims.missingCount || 0) + (sims.extraCount || 0);
  return (
    <>
      <div className="px-4 py-2 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div><span className="text-gray-400">Checklist Records:</span> <b className="text-gray-700">{sims.checklistCount ?? records.length}</b></div>
        <div><span className="text-gray-400">System Records:</span> <b className="text-gray-700">{sims.systemCount ?? 0}</b></div>
        <div><span className="text-gray-400">Matched:</span> <b className="text-emerald-600">{sims.matchedCount ?? 0}</b></div>
        <div><span className="text-gray-400">Unmatched:</span> <b className="text-red-600">{unmatched}</b></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 text-left">
              <th className={cell}>SIMS Number</th>
              <th className={cell}>SIMS Date</th>
              <th className={cell}>Source</th>
              <th className={`${cell} text-right`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map((r, i) => {
              const m = STATUS_META[r.status] || STATUS_META.mismatch;
              return (
                <tr key={i} className={m.row}>
                  <td className={`${cell} font-semibold text-gray-700`}>{r.simsNumber}{r.detail && <p className="font-normal text-[10px] text-gray-400 mt-0.5">{r.detail}</p>}</td>
                  <td className={`${cell} text-gray-700`}>{val(r.simsDate)}</td>
                  <td className={`${cell} text-gray-400`}>{r.sourceDocument || "—"}</td>
                  <td className={`${cell} text-right`}><StatusPill status={r.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export const ResultsPanel = ({ result }) => {
  const {
    match, score, summary, mock,
    dashboard = {}, header = [], items = { rows: [], missingItems: [], extraItems: [] },
    containers = [], certificates = [], sims = { records: [] }, dutyTax = [],
    issuedRetroactively = null,
    matchedFields = [], unmatchedFields = [], missingInfo = [], missingDocuments = [],
  } = result;
  const simsRecords = (sims && sims.records) || [];
  const [showMatched, setShowMatched] = useState(false);

  return (
    <div className="space-y-3">
      {mock && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-[11px] text-amber-700 flex items-center gap-2">
          <Info size={13} /> Demo result — set <code className="font-mono">GEMINI_API_KEY</code> on the server for a real AI comparison.
        </div>
      )}

      {/* Final Verification Dashboard */}
      <div className={`rounded-xl border p-4 shadow-sm ${match ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
        <div className="flex items-start gap-3">
          {match ? <CheckCircle2 size={28} className="text-emerald-600 shrink-0" /> : <XCircle size={28} className="text-red-600 shrink-0" />}
          <div className="flex-1">
            <h3 className={`text-base font-bold ${match ? "text-emerald-800" : "text-red-800"}`}>
              {match ? "✅ Overall Status: Documents Match" : "❌ Overall Status: Documents Do Not Match"}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">{summary}</p>
            <div className="mt-3 max-w-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 mb-1">
                <span>Match percentage</span><span>{dashboard.matchPercentage ?? score}%</span>
              </div>
              <Bar score={dashboard.matchPercentage ?? score} />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Stat label="Fields Compared" value={dashboard.totalCompared ?? 0} tone="text-gray-700" />
        <Stat label="Matched" value={dashboard.totalMatched ?? 0} tone="text-emerald-600" />
        <Stat label="Unmatched" value={dashboard.totalUnmatched ?? 0} tone="text-red-600" />
        <Stat label="Missing" value={dashboard.totalMissing ?? 0} tone="text-amber-600" />
        <Stat label="Match %" value={`${dashboard.matchPercentage ?? score}%`} tone="text-teal-600" />
      </div>

      {/* Missing supporting documents */}
      {missingDocuments.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs font-bold text-orange-800 flex items-center gap-2 mb-1.5">
            <FileWarning size={14} /> Possibly Missing Supporting Document(s)
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-orange-700">
            {missingDocuments.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {/* Duty & Tax summary */}
      {dutyTax.length > 0 && (
        <Section title="Duty & Tax Summary" icon={ReceiptText} count={dutyTax.length}>
          <DutyTaxTable rows={dutyTax} />
        </Section>
      )}

      {/* Item Details — highest priority */}
      <Section title="Item Details" icon={Package} priority count={items.rows.length}>
        <ItemTable items={items} />
      </Section>

      {/* Header Information */}
      {header.length > 0 && (
        <Section title="Header Information" icon={ListChecks} count={header.length}>
          <CompareTable rows={header} />
        </Section>
      )}

      {/* Container Details */}
      {containers.length > 0 && (
        <Section title="Container Details" icon={Container} count={containers.length}>
          <CompareTable rows={containers} />
        </Section>
      )}

      {/* Certificate Details */}
      {certificates.length > 0 && (
        <Section title="Certificate Details" icon={Award} count={certificates.length}>
          <CompareTable rows={certificates} />
        </Section>
      )}

      {/* Issued Retroactively (CEPA certificate) */}
      {issuedRetroactively && <IssuedRetroactively data={issuedRetroactively} />}

      {/* SIMS — multi-record verification */}
      {simsRecords.length > 0 && (
        <Section title="SIMS Verification" icon={ShieldCheck} count={simsRecords.length}>
          <SimsTable sims={sims} />
        </Section>
      )}

      {/* Unmatched fields */}
      {unmatchedFields.length > 0 && (
        <Section title="Unmatched Fields" icon={XCircle} count={unmatchedFields.length}>
          <div className="divide-y divide-gray-100">
            {unmatchedFields.map((f, i) => (
              <div key={i} className="p-3 bg-red-50/40">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-800">{f.field}</span>
                  {f.sourceDocument && <span className="text-[9px] text-gray-400">Source: {f.sourceDocument}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-gray-500">Expected (system):</span>
                  <span className="font-medium text-gray-800">{val(f.expected)}</span>
                  <ArrowRight size={12} className="text-gray-300" />
                  <span className="text-gray-500">Found (checklist):</span>
                  <span className="font-medium text-red-700">{val(f.actual)}</span>
                </div>
                {f.reason && <p className="mt-1 text-[11px] text-gray-500">{f.reason}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Missing information */}
      {missingInfo.length > 0 && (
        <Section title="Missing Information" icon={AlertTriangle} count={missingInfo.length}>
          <div className="divide-y divide-gray-100">
            {missingInfo.map((f, i) => (
              <div key={i} className="p-3 flex items-start gap-2">
                <span className={`mt-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${f.where === "system" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>
                  {f.where === "system" ? "Missing in System" : "Missing in Checklist"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-700">{f.field}</p>
                  {f.detail && <p className="text-[11px] text-gray-500">{f.detail}</p>}
                  {f.sourceDocument && <p className="text-[10px] text-gray-400">Source: {f.sourceDocument}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Matched fields (collapsible) */}
      {matchedFields.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <button onClick={() => setShowMatched((s) => !s)} className="w-full px-4 py-2.5 flex items-center justify-between text-left">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 size={14} /> Matched Fields ({matchedFields.length})
            </span>
            <span className="text-[10px] text-gray-400">{showMatched ? "Hide" : "Show"}</span>
          </button>
          {showMatched && (
            <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {matchedFields.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span className="font-medium text-gray-700">{f.field}:</span>
                  <span className="text-gray-500 truncate">{f.value || "—"}</span>
                  {f.sourceDocument && <span className="ml-auto text-[9px] text-gray-400 shrink-0">{f.sourceDocument}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocVerify;
