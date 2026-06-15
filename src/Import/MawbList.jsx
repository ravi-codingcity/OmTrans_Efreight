import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  FileDown,
  Plane,
  Plus,
} from "lucide-react";
import { listMawb, deleteMawb } from "./mawbApi";
import { generateMawbPDF, generateMawbWord } from "./generateMawbDocument";
import MawbPreview from "./MawbPreview";
import { formatDMY } from "./dateUtil";

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const StatusBadge = ({ status }) =>
  status === "submitted" ? (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Submitted</span>
  ) : (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Draft</span>
  );

const MawbList = ({ currentUser, onNew, onEdit }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isSuperAdmin = (currentUser?.role || "").toLowerCase().trim() === "super admin";

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await listMawb());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const fields = [
        r.hawb_nos,
        r.airport_of_destination,
        r.shipper,
        r.consignee,
        r.createdBy,
      ];
      return fields.some((f) => (f || "").toLowerCase().includes(q));
    });
  }, [records, search]);

  const handleDelete = async (r) => {
    if (deletingId) return;
    if (!window.confirm(`Delete MAWB ${r.airline_information?.mawb_number || ""}? This cannot be undone.`)) return;
    setDeletingId(r._id);
    try {
      await deleteMawb(r._id);
      setRecords((prev) => prev.filter((x) => x._id !== r._id));
    } catch (err) {
      alert(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePdf = async (r) => {
    try {
      await generateMawbPDF(r);
    } catch (err) {
      alert(err.message || "PDF download failed");
    }
  };

  const handleWord = async (r) => {
    try {
      await generateMawbWord(r);
    } catch (err) {
      alert(err.message || "Word download failed");
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Plane size={16} className="text-sky-600" /> MAWB Import Records
          </h2>
          <p className="text-[11px] text-gray-500">All generated AWB Instruction documents</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRecords} className="flex items-center gap-1 text-xs text-gray-500 hover:text-sky-600 px-2 py-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={onNew} className="flex items-center gap-1.5 bg-sky-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-sky-700">
            <Plus size={14} /> New MAWB
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by MAWB no, airline, shipper, consignee..."
          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-sky-400"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={22} className="animate-spin mr-2" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-400">
          No MAWB records yet. Click <span className="font-semibold text-sky-600">New MAWB</span> to create one.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <th className="px-3 py-2.5 text-left font-semibold">HAWB Nos</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Consignee</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Destination</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Created By</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Created</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id} className="border-b border-gray-100 hover:bg-sky-50/40">
                    <td className="px-3 py-2.5 font-bold text-sky-700">{r.hawb_nos || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-700 truncate max-w-[180px]">{(r.consignee || "—").split("\n")[0]}</td>
                    <td className="px-3 py-2.5 text-gray-700 truncate max-w-[150px]">{r.airport_of_destination || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{formatDMY(r.date) || "—"}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2.5 text-gray-600">{r.createdBy || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-[10px]">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setPreview(r)} title="Preview" className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-medium hover:bg-indigo-100">
                          <Eye size={11} /> View
                        </button>
                        <button onClick={() => handlePdf(r)} title="Download PDF" className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded text-[10px] font-medium hover:bg-purple-100">
                          <FileDown size={11} /> PDF
                        </button>
                        <button onClick={() => handleWord(r)} title="Download Word" className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-medium hover:bg-blue-100">
                          <FileDown size={11} /> Word
                        </button>
                        <button onClick={() => onEdit(r)} title="Edit" className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-medium hover:bg-amber-100">
                          <Pencil size={11} /> Edit
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

      {preview && <MawbPreview data={preview} onClose={() => setPreview(null)} />}
    </div>
  );
};

export default MawbList;
