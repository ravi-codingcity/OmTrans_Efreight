import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Loader2, AlertCircle, RefreshCw, Eye, Trash2, ScanSearch,
  CheckCircle2, XCircle, X, FileText,
} from "lucide-react";
import { listVerifications, getVerification, deleteVerification } from "./verifyApi";
import { ResultsPanel } from "./DocVerify";

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const StatusBadge = ({ status }) =>
  status === "match" ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={11} /> Match</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle size={11} /> No Match</span>
  );

const VerifyRecords = ({ currentUser }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null); // full record for the modal
  const [viewLoading, setViewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const isSuperAdmin = (currentUser?.role || "").toLowerCase().trim() === "super admin";

  const fetchRecords = async () => {
    setLoading(true); setError(null);
    try {
      setRecords(await listVerifications());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      [r.checklistFileName, r.createdBy, r.verificationStatus].some((f) => (f || "").toLowerCase().includes(q))
    );
  }, [records, search]);

  const openView = async (r) => {
    setViewLoading(true); setError(null);
    try {
      const full = await getVerification(r._id);
      setViewing(full);
    } catch (err) {
      setError(err.message || "Could not load the record.");
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async (r) => {
    if (deletingId) return;
    if (!window.confirm(`Delete this verification record (${r.checklistFileName || ""})? This cannot be undone.`)) return;
    setDeletingId(r._id);
    try {
      await deleteVerification(r._id);
      setRecords((prev) => prev.filter((x) => x._id !== r._id));
    } catch (err) {
      alert(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <ScanSearch size={16} className="text-teal-600" /> AI Verification Records
          </h2>
          <p className="text-[11px] text-gray-500">Previously saved CHA Checklist verification reports</p>
        </div>
        <button onClick={fetchRecords} className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 px-2 py-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by file name, status or user…" className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-400" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 size={22} className="animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-400">
          No saved verification records yet. Run a verification and click <span className="font-semibold text-teal-600">Submit &amp; Save Report</span>.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <th className="px-3 py-2.5 text-left font-semibold">Verification Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold">CHA File Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Match %</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Verified By</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id} className="border-b border-gray-100 hover:bg-teal-50/40">
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800 truncate max-w-[220px]">{r.checklistFileName || "—"}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={r.verificationStatus} /></td>
                    <td className="px-3 py-2.5 font-semibold text-gray-700">{r.matchPercentage ?? 0}%</td>
                    <td className="px-3 py-2.5 text-gray-600">{r.createdBy || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openView(r)} title="View report" className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-medium hover:bg-indigo-100">
                          <Eye size={11} /> View
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete(r)} disabled={deletingId === r._id} title="Delete (Super Admin)" className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-medium hover:bg-red-100 disabled:opacity-40">
                            {deletingId === r._id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg px-6 py-4 flex items-center gap-2 text-gray-500"><Loader2 size={18} className="animate-spin" /> Loading report…</div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewing(null)}>
          <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-t-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText size={16} /> {viewing.checklistFileName || "Verification Report"}
                <span className="text-[11px] font-medium text-white/80">· {fmtDate(viewing.createdAt)} · {viewing.createdBy}</span>
              </h3>
              <button onClick={() => setViewing(null)} className="text-white hover:bg-white/20 p-1 rounded"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {viewing.result ? <ResultsPanel result={viewing.result} /> : <p className="text-sm text-gray-400 text-center py-8">This record has no stored report.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyRecords;
