import React, { useState, useEffect, useMemo } from "react";
import { generatePreAdvicePDF } from "./generatePreAdvicePDF.js";
import {
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileDown,
  Eye,
  X,
  Calendar,
  Ship,
  MapPin,
  User,
  Package,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Pencil,
  Mail,
  Trash2,
} from "lucide-react";

const API_BASE_URL = "https://papayawhip-antelope-424743.hostingersite.com/api";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const normalize = (str) => (str || "").trim().toLowerCase();

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtNum = (v) => {
  const n = Number(v);
  return isNaN(n) ? "0" : n.toLocaleString("en-IN");
};

/* User image helper */
const getUserImage = (name) => {
  const n = normalize(name);
  if (n.includes("harmeet")) return "/src/assets/harmeet.jpg";
  if (n.includes("tarun")) return "/src/assets/tarun.jpeg";
  if (n.includes("vikram")) return "/src/assets/vikram.jpg";
  return null;
};

/* ================================================================== */
/*  ViewAllPreAdvice Component                                         */
/* ================================================================== */
const ViewAllPreAdvice = ({ onEditPreAdvice }) => {
  const [preAdvices, setPreAdvices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); }
    catch { return {}; }
  })();
  const currentUsername = currentUser.fullName || currentUser.username || "";
  const role = normalize(currentUser?.role);
  // Admin if role is admin/super admin (case-insensitive), or the user is
  // Vikram — matched via substring so the full name "Vikram Garg" still works.
  const isAdmin =
    role === "admin" ||
    role === "super admin" ||
    normalize(currentUser.fullName).includes("vikram") ||
    normalize(currentUser.username).includes("vikram");

  /* ============ FETCH ============ */
  const fetchPreAdvices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pre-advice`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      });
      const json = await res.json();
      let arr = Array.isArray(json) ? json : json.data || [];
      // Non-admin users only see their own pre-advice. Match against both
      // full name and username so records saved under either still appear.
      if (!isAdmin && currentUsername) {
        const fname = normalize(currentUser.fullName);
        const uname = normalize(currentUser.username);
        arr = arr.filter((pa) => {
          const cb = normalize(pa.createdBy);
          return (
            (!!fname && (cb === fname || cb.includes(fname))) ||
            (!!uname && (cb === uname || cb.includes(uname)))
          );
        });
      }
      // Sort newest first
      arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setPreAdvices(arr);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPreAdvices(); }, []);

  /* ============ FILTERED ============ */
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return preAdvices;
    const q = normalize(searchQuery);
    return preAdvices.filter(
      (pa) =>
        normalize(pa.jobNo).includes(q) ||
        normalize(pa.customerName).includes(q) ||
        normalize(pa.shippingLine).includes(q) ||
        normalize(pa.por).includes(q) ||
        normalize(pa.pol).includes(q) ||
        normalize(pa.pod).includes(q) ||
        normalize(pa.commodity).includes(q) ||
        normalize(pa.createdBy).includes(q) ||
        normalize(pa.bookedBy).includes(q),
    );
  }, [preAdvices, searchQuery]);

  /* ============ RE-DOWNLOAD PDF ============ */
  const handleReDownload = (pa) => {
    generatePreAdvicePDF(pa);
  };

  /* ============ DELETE ============ */
  // A user may delete their own records (matched by full name or username);
  // admins may delete anyone's.
  const canDelete = (pa) => {
    if (isAdmin) return true;
    const cb = normalize(pa.createdBy);
    const fname = normalize(currentUser.fullName);
    const uname = normalize(currentUser.username);
    return (
      (!!fname && (cb === fname || cb.includes(fname))) ||
      (!!uname && (cb === uname || cb.includes(uname)))
    );
  };

  const handleDelete = async (pa) => {
    if (!pa?._id || deletingId) return;
    if (
      !window.confirm(
        `Delete Pre-Advice ${pa.jobNo || ""}? This action cannot be undone.`,
      )
    )
      return;
    setDeletingId(pa._id);
    try {
      const res = await fetch(`${API_BASE_URL}/pre-advice/${pa._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("Delete pre-advice failed:", res.status, body);
        alert("Failed to delete Pre-Advice. Please try again.");
        return;
      }
      // Refresh UI: drop the deleted record from local state.
      setPreAdvices((prev) => prev.filter((p) => p._id !== pa._id));
      if (selectedRecord?._id === pa._id) setSelectedRecord(null);
    } catch (err) {
      console.error("Failed to delete pre-advice:", err);
      alert("Network error while deleting Pre-Advice.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ============ MAIL (copy structured HTML to clipboard + open mailto) ============ */
  const sendPreAdviceMail = async (pa) => {
    const headerStyle = "background-color: #2563eb; color: white; padding: 8px 12px; font-weight: bold; font-size: 13px;";
    const cellStyle = "border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 12px;";
    const labelStyle = `${cellStyle} background-color: #f3f4f6; font-weight: 600; color: #374151; width: 140px;`;
    const valueStyle = `${cellStyle} color: #1f2937;`;
    const tableStyle = "border-collapse: collapse; width: 100%; margin-bottom: 16px; font-family: Arial, sans-serif;";

    const addRow = (label1, value1, label2, value2) => {
      const v1 = value1 || "N/A";
      const v2 = value2 || "N/A";
      if (v1 === "N/A" && v2 === "N/A") return "";
      if (!label2) {
        return `<tr><td style="${labelStyle}">${label1}</td><td style="${valueStyle}" colspan="3">${v1}</td></tr>`;
      }
      return `<tr><td style="${labelStyle}">${label1}</td><td style="${valueStyle}">${v1}</td><td style="${labelStyle}">${label2}</td><td style="${valueStyle}">${v2}</td></tr>`;
    };

    const getChargesTable = (title, charges, bgColor) => {
      const real = (charges || []).filter(
        (c) => c.charges && (Number(c.buyingAmount) > 0 || Number(c.sellingAmount) > 0),
      );
      if (real.length === 0) return "";
      const chargeHeaderStyle = `background-color: ${bgColor}; color: white; padding: 6px 10px; font-weight: bold; font-size: 12px; border: 1px solid ${bgColor};`;
      let html = `<table style="${tableStyle}">`;
      html += `<tr><td colspan="5" style="${chargeHeaderStyle}">${title}</td></tr>`;
      html += `<tr style="background-color: #f9fafb;"><td style="${labelStyle}">Charge</td><td style="${labelStyle}">Currency</td><td style="${labelStyle}">Buying Rate</td><td style="${labelStyle}">Selling Rate</td><td style="${labelStyle}">Unit</td></tr>`;
      real.forEach((c) => {
        html += `<tr><td style="${valueStyle}">${c.charges}</td><td style="${valueStyle}">${c.currency || "-"}</td><td style="${valueStyle}">${fmtNum(c.buyingAmount)}</td><td style="${valueStyle}">${fmtNum(c.sellingAmount)}</td><td style="${valueStyle}">${c.unit || "-"}</td></tr>`;
      });
      html += `</table>`;
      return html;
    };

    let html = `<div style="font-family: Arial, sans-serif; max-width: 700px;">`;
    html += `<p style="margin: 0 0 16px 0; font-size: 14px;">Dear Sir/Madam,</p>`;
    html += `<p style="margin: 0 0 16px 0; font-size: 14px;">Please find the Pre-Advice details below.</p>`;

    // Customer & Consignee
    html += `<table style="${tableStyle}">`;
    html += `<tr><td style="${labelStyle}">Customer</td><td style="${valueStyle}" colspan="3">${(pa.customerName || "N/A").replace(/\n/g, "<br>")}${pa.customerAddress ? "<br>" + pa.customerAddress.replace(/\n/g, "<br>") : ""}</td></tr>`;
    if (pa.consigneeName || pa.consigneeAddress) {
      html += `<tr><td style="${labelStyle}">Consignee</td><td style="${valueStyle}" colspan="3">${(pa.consigneeName || "N/A").replace(/\n/g, "<br>")}${pa.consigneeAddress ? "<br>" + pa.consigneeAddress.replace(/\n/g, "<br>") : ""}</td></tr>`;
    }
    html += `</table>`;

    // Shipment Details
    html += `<table style="${tableStyle}">`;
    html += `<tr><td colspan="4" style="${headerStyle}">SHIPMENT DETAILS</td></tr>`;
    html += addRow("Job No", pa.jobNo, "Shipping Line", pa.shippingLine);
    html += addRow("Equipment Size", pa.equipmentSize, "Commodity", pa.commodity);
    html += addRow("Cargo Weight", pa.cargoWeight, "Booked By", pa.bookedBy);
    html += addRow("Transit Time", pa.transitTime, "Term", pa.term);
    html += `</table>`;

    // Route Information
    html += `<table style="${tableStyle}">`;
    html += `<tr><td colspan="4" style="${headerStyle}">ROUTE INFORMATION</td></tr>`;
    html += addRow("POR", pa.por, "POL", pa.pol);
    html += addRow("POD", pa.pod, "Final Destination", pa.finalDestination);
    if (pa.routing) {
      html += addRow("Routing", pa.routing);
    }
    html += `</table>`;

    // Charges
    html += getChargesTable("ORIGIN CHARGES", pa.originCharges, "#2563eb");
    html += getChargesTable("FREIGHT CHARGES", pa.freightCharges, "#7c3aed");
    html += getChargesTable("DESTINATION CHARGES", pa.destinationCharges, "#059669");

    // DDP Charges
    if (Number(pa.ddpBuying) > 0 || Number(pa.ddpSelling) > 0) {
      html += `<table style="${tableStyle}">`;
      html += `<tr><td colspan="4" style="${headerStyle}">DDP CHARGES</td></tr>`;
      html += addRow("DDP Buying", fmtNum(pa.ddpBuying), "DDP Selling", fmtNum(pa.ddpSelling));
      html += `</table>`;
    }

    // Remarks
    if (pa.remarks && pa.remarks.trim()) {
      html += `<table style="${tableStyle}">`;
      html += `<tr><td style="background-color: #fef3c7; padding: 8px 12px; font-weight: bold; font-size: 13px; border: 1px solid #fcd34d;">REMARKS</td></tr>`;
      html += `<tr><td style="${valueStyle}">${pa.remarks.replace(/\n/g, "<br>")}</td></tr>`;
      html += `</table>`;
    }

    // Shipping Line Contact
    if (pa.slContactName || pa.slContactEmail || pa.slContactPhone) {
      html += `<table style="${tableStyle}">`;
      html += `<tr><td colspan="4" style="${headerStyle}">SHIPPING LINE CONTACT</td></tr>`;
      html += addRow("Contact Name", pa.slContactName, "Designation", pa.slContactDesignation);
      html += addRow("Phone", pa.slContactPhone, "Email", pa.slContactEmail);
      html += `</table>`;
    }

    html += `<p style="margin: 16px 0 0 0; font-size: 12px; color: #6b7280;">OmTrans Logistics Ltd. | Simplifying Your Business</p>`;
    html += `</div>`;

    // Subject: Pre Advise / Container / Final Destination (or POD) / POR /
    // Shipping Line / Customer Name / Pre-Advice Number. Empty values are
    // dropped so the line stays clean and readable.
    const subject = [
      "Pre Advise",
      pa.equipmentSize,
      pa.finalDestination || pa.pod,
      pa.por,
      pa.shippingLine,
      pa.customerName,
      pa.jobNo,
    ]
      .map((v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim()))
      .filter(Boolean)
      .join(" / ");

    try {
      const blob = new Blob([html], { type: "text/html" });
      const clipboardItem = new ClipboardItem({
        "text/html": blob,
        "text/plain": new Blob([`Pre-Advice ${pa.jobNo} - Please see formatted content when pasted in email`], { type: "text/plain" }),
      });
      await navigator.clipboard.write([clipboardItem]);

      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}`;
      setTimeout(() => {
        window.location.href = mailtoLink;
      }, 300);
    } catch (err) {
      console.error("Failed to prepare email:", err);
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}`;
      alert("Please paste pre-advice details manually in the email body.");
    }
  };

  /* ============ EDIT ============ */
  const handleEdit = (pa) => {
    if (onEditPreAdvice) {
      onEditPreAdvice(pa);
    }
  };

  /* ============ CHARGE SECTION COMPONENT ============ */
  const ChargeSection = ({ title, charges, color }) => {
    const [open, setOpen] = useState(true);
    const realCharges = (charges || []).filter(
      (c) => c.charges && (Number(c.buyingAmount) > 0 || Number(c.sellingAmount) > 0),
    );
    if (realCharges.length === 0) return null;
    return (
      <div className="mb-3">
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${color} mb-1`}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {title} ({realCharges.length})
        </button>
        {open && (
          <table className="w-full text-[11px] border border-gray-200 rounded overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-2 py-1 text-left font-semibold">Charge</th>
                <th className="px-2 py-1 text-center font-semibold">Currency</th>
                <th className="px-2 py-1 text-right font-semibold">Buying</th>
                <th className="px-2 py-1 text-right font-semibold">Selling</th>
                <th className="px-2 py-1 text-center font-semibold">Unit</th>
              </tr>
            </thead>
            <tbody>
              {realCharges.map((c, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-2 py-1">{c.charges}</td>
                  <td className="px-2 py-1 text-center">{c.currency}</td>
                  <td className="px-2 py-1 text-right font-mono">{fmtNum(c.buyingAmount)}</td>
                  <td className="px-2 py-1 text-right font-mono">{fmtNum(c.sellingAmount)}</td>
                  <td className="px-2 py-1 text-center">{c.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  /* ============ RENDER ============ */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl border border-indigo-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 mb-0.5">
              All Pre-Advice Records
            </h1>
            <p className="text-xs text-gray-600">
              View and manage all generated Pre-Advice documents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
              {filtered.length} / {preAdvices.length} records
            </span>
            <button
              onClick={fetchPreAdvices}
              disabled={loading}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by job no, customer, shipping line, POR, POL, POD, commodity..."
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-8">
          <Loader2 size={16} className="animate-spin" />
          Loading pre-advice records...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">
            <p>{error}</p>
            <button
              onClick={fetchPreAdvices}
              className="mt-1 text-xs text-red-600 underline hover:text-red-800 flex items-center gap-1"
            >
              <RefreshCw size={10} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && preAdvices.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="bg-indigo-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package size={24} className="text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-700 mb-1">
            No Pre-Advice Records Yet
          </h3>
          <p className="text-xs text-gray-500">
            Create a Pre-Advice by selecting a quotation and matching it with buying rates.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Job No</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Created By</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Customer</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Shipping Line</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Route</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Equipment</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Created</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pa) => {
                  const route = [pa.por, pa.pol, pa.pod]
                    .filter(Boolean)
                    .join(" → ");
                  const img = getUserImage(pa.createdBy);
                  const isOwner = normalize(pa.createdBy) === normalize(currentUsername);

                  return (
                    <tr
                      key={pa._id}
                      className="border-b border-gray-100 hover:bg-indigo-50/40 transition-colors"
                    >
                      {/* Job No */}
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-indigo-700">{pa.jobNo || "—"}</span>
                      </td>

                      {/* Created By */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-700">{pa.createdBy || "—"}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-3 py-2.5">
                        <span className="text-gray-700 truncate max-w-[150px] block">
                          {pa.customerName || "—"}
                        </span>
                      </td>

                      {/* Shipping Line */}
                      <td className="px-3 py-2.5">
                        <span className="text-blue-600 font-medium">{pa.shippingLine || "—"}</span>
                      </td>

                      {/* Route */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-[11px] text-gray-600">
                          <MapPin size={10} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{route || "—"}</span>
                        </div>
                      </td>

                      {/* Equipment */}
                      <td className="px-3 py-2.5">
                        <span className="text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded text-[10px]">
                          {pa.equipmentSize || "—"}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-3 py-2.5">
                        <span className="text-gray-500 text-[10px]">
                          {fmtDate(pa.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5">
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            onClick={() => setSelectedRecord(pa)}
                            className="flex items-center justify-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-medium hover:bg-indigo-100 transition-colors"
                            title="View Details"
                          >
                            <Eye size={11} /> View
                          </button>
                          <button
                            onClick={() => handleReDownload(pa)}
                            className="flex items-center justify-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded text-[10px] font-medium hover:bg-purple-100 transition-colors"
                            title="Re-download PDF"
                          >
                            <FileDown size={11} /> PDF
                          </button>
                          <button
                            onClick={() => sendPreAdviceMail(pa)}
                            className="flex items-center justify-center gap-1 bg-purple-50 text-purple-600 px-2 py-1 rounded text-[10px] font-medium hover:bg-purple-100 transition-colors border border-purple-200"
                            title="Click & Paste on Mail"
                          >
                            <Mail size={11} /> Mail
                          </button>
                          <button
                            onClick={() => handleEdit(pa)}
                            className="flex items-center justify-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-medium hover:bg-amber-100 transition-colors"
                            title="Edit Pre-Advice"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          {canDelete(pa) && (
                            <button
                              onClick={() => handleDelete(pa)}
                              disabled={deletingId === pa._id}
                              className="flex items-center justify-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-medium hover:bg-red-100 transition-colors disabled:opacity-40"
                              title="Delete Pre-Advice"
                            >
                              {deletingId === pa._id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Trash2 size={11} />
                              )}{" "}
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No search results */}
      {!loading && filtered.length === 0 && preAdvices.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-400">
          No records match your search.
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-t-xl flex items-center justify-between z-10">
              <div>
                <h2 className="text-sm font-bold">
                  Pre-Advice: {selectedRecord.jobNo}
                </h2>
                <p className="text-[10px] text-indigo-200">
                  Created by {selectedRecord.createdBy} on {fmtDate(selectedRecord.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReDownload(selectedRecord)}
                  className="flex items-center gap-1 bg-white/20 text-white text-[10px] px-2.5 py-1 rounded-md hover:bg-white/30 transition-colors"
                >
                  <FileDown size={12} /> Download PDF
                </button>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Customer & Consignee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <User size={12} /> Customer
                  </h4>
                  <p className="text-xs font-semibold text-gray-800">{selectedRecord.customerName || "—"}</p>
                  {selectedRecord.customerAddress && (
                    <p className="text-[11px] text-gray-500 mt-0.5">{selectedRecord.customerAddress}</p>
                  )}
                </div>
                {(selectedRecord.consigneeName || selectedRecord.consigneeAddress) && (
                  <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                    <h4 className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <User size={12} /> Consignee
                    </h4>
                    <p className="text-xs font-semibold text-gray-800">{selectedRecord.consigneeName || "—"}</p>
                    {selectedRecord.consigneeAddress && (
                      <p className="text-[11px] text-gray-500 mt-0.5">{selectedRecord.consigneeAddress}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Shipment Details */}
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <h4 className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Ship size={12} /> Shipment Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  {[
                    ["Job No", selectedRecord.jobNo],
                    ["Shipping Line", selectedRecord.shippingLine],
                    ["Booked By", selectedRecord.bookedBy],
                    ["Equipment", selectedRecord.equipmentSize],
                    ["Commodity", selectedRecord.commodity],
                    ["Cargo Weight", selectedRecord.cargoWeight],
                    ["Transit Time", selectedRecord.transitTime],
                    ["Term", selectedRecord.term],
                  ]
                    .filter(([, v]) => v && String(v).trim() && v !== "—")
                    .map(([label, value]) => (
                      <div key={label}>
                        <span className="text-gray-500 text-[10px]">{label}</span>
                        <p className="font-semibold text-gray-800">{value}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Route */}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MapPin size={12} /> Route Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  {[
                    ["POR", selectedRecord.por],
                    ["POL", selectedRecord.pol],
                    ["POD", selectedRecord.pod],
                    ["Final Destination", selectedRecord.finalDestination],
                  ]
                    .filter(([, v]) => v && String(v).trim())
                    .map(([label, value]) => (
                      <div key={label}>
                        <span className="text-gray-500 text-[10px]">{label}</span>
                        <p className="font-semibold text-gray-800">{value}</p>
                      </div>
                    ))}
                </div>
                {selectedRecord.routing && (
                  <div className="mt-2 text-[11px]">
                    <span className="text-gray-500 text-[10px]">Routing</span>
                    <p className="font-semibold text-gray-800">{selectedRecord.routing}</p>
                  </div>
                )}
              </div>

              {/* Charges */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <DollarSign size={12} /> Charges
                </h4>
                <ChargeSection title="Origin Charges" charges={selectedRecord.originCharges} color="text-orange-600" />
                <ChargeSection title="Freight Charges" charges={selectedRecord.freightCharges} color="text-blue-600" />
                <ChargeSection title="Destination Charges" charges={selectedRecord.destinationCharges} color="text-emerald-600" />

                {(Number(selectedRecord.ddpBuying) > 0 || Number(selectedRecord.ddpSelling) > 0) && (
                  <div className="mt-2 grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-gray-500 text-[10px]">DDP Buying</span>
                      <p className="font-semibold text-gray-800">{fmtNum(selectedRecord.ddpBuying)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px]">DDP Selling</span>
                      <p className="font-semibold text-gray-800">{fmtNum(selectedRecord.ddpSelling)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks */}
              {selectedRecord.remarks && selectedRecord.remarks.trim() && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Remarks</h4>
                  <p className="text-[11px] text-gray-700 whitespace-pre-wrap">{selectedRecord.remarks}</p>
                </div>
              )}

              {/* Shipping Line Contact */}
              {(selectedRecord.slContactName || selectedRecord.slContactEmail || selectedRecord.slContactPhone) && (
                <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
                  <h4 className="text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-2">
                    Shipping Line Contact
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    {[
                      ["Name", selectedRecord.slContactName],
                      ["Designation", selectedRecord.slContactDesignation],
                      ["Phone", selectedRecord.slContactPhone],
                      ["Email", selectedRecord.slContactEmail],
                    ]
                      .filter(([, v]) => v && String(v).trim())
                      .map(([label, value]) => (
                        <div key={label}>
                          <span className="text-gray-500 text-[10px]">{label}</span>
                          <p className="font-semibold text-gray-800">{value}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewAllPreAdvice;
