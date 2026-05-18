import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Ship,
  Calendar,
  Clock,
  X,
  Loader2,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Package,
  FileText,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  User images — import available profile pictures + default           */
/* ------------------------------------------------------------------ */
import harmeetImg from "../assets/harmeet.jpg";
import tarunImg from "../assets/tarun.jpeg";
import vikramImg from "../assets/vikram.jpg";
import defaultImg from "../assets/omtrans_dp.jpg";

const userImageMap = {
  harmeet: harmeetImg,
  tarun: tarunImg,
  vikram: vikramImg,
};
const getUserImage = (name) => {
  if (!name) return defaultImg;
  const key = name.trim().toLowerCase();
  for (const [k, v] of Object.entries(userImageMap)) {
    if (key === k || key.startsWith(k)) return v;
  }
  return defaultImg;
};

const RATE_FILING_API = "https://papayawhip-antelope-424743.hostingersite.com/api/rate-filings";

/* ------------------------------------------------------------------ */
/*  ExpiredRates component                                              */
/* ------------------------------------------------------------------ */
const ExpiredRates = ({ onCopy }) => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterShippingLine, setFilterShippingLine] = useState("");
  const [filterContainer, setFilterContainer] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const perPage = 15;

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch(RATE_FILING_API);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.data || [];
      const now = new Date();
      const expired = arr.filter((r) => r.validity && new Date(r.validity) < now);
      // Sort newest-expired first
      expired.sort((a, b) => new Date(b.validity) - new Date(a.validity));
      setRates(expired);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  /* ----- Derived lists ----- */
  const shippingLines = useMemo(
    () => [...new Set(rates.map((r) => r.shipping_lines).filter(Boolean))].sort(),
    [rates]
  );
  const containerTypes = useMemo(
    () => [...new Set(rates.map((r) => r.container_type).filter(Boolean))].sort(),
    [rates]
  );

  /* ----- Filtering ----- */
  const filtered = useMemo(() => {
    let list = rates;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.por || "").toLowerCase().includes(q) ||
          (r.pol || "").toLowerCase().includes(q) ||
          (r.pod || "").toLowerCase().includes(q) ||
          (r.shipping_lines || "").toLowerCase().includes(q) ||
          (r.commodity || "").toLowerCase().includes(q) ||
          (r.route || "").toLowerCase().includes(q) ||
          (r.name || "").toLowerCase().includes(q)
      );
    }
    if (filterShippingLine) list = list.filter((r) => r.shipping_lines === filterShippingLine);
    if (filterContainer) list = list.filter((r) => r.container_type === filterContainer);
    return list;
  }, [rates, search, filterShippingLine, filterContainer]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const clearFilters = () => {
    setSearch("");
    setFilterShippingLine("");
    setFilterContainer("");
    setPage(1);
  };

  const fmtDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const fmtDateTime = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      ", " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const daysExpired = (d) => {
    if (!d) return 0;
    return Math.floor((new Date() - new Date(d)) / (1000 * 60 * 60 * 24));
  };

  /* ----- Parse custom charges JSON ----- */
  const parseCustomCharges = (raw) => {
    if (!raw) return [];
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };

  /* ----- Parse rail freight JSON ----- */
  const parseRailFreight = (raw) => {
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch { return null; }
  };

  /* ----- Validity display helper ----- */
  const validityLabel = (vf) => {
    if (!vf) return "";
    return vf.replace("For ", "");
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 rounded-lg">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Clock size={16} />
            Expired Rates
          </h2>
          <p className="text-[10px] text-amber-100">
            {filtered.length} expired rate{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={fetchRates}
          className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-white/30 transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by POR, POL, POD, Shipping Line, Commodity..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
          />
        </div>
        <select
          value={filterShippingLine}
          onChange={(e) => { setFilterShippingLine(e.target.value); setPage(1); }}
          className="px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-amber-400"
        >
          <option value="">All Shipping Lines</option>
          {shippingLines.map((sl) => (
            <option key={sl} value={sl}>{sl}</option>
          ))}
        </select>
        <select
          value={filterContainer}
          onChange={(e) => { setFilterContainer(e.target.value); setPage(1); }}
          className="px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-amber-400"
        >
          <option value="">All Containers</option>
          {containerTypes.map((ct) => (
            <option key={ct} value={ct}>{ct}</option>
          ))}
        </select>
        {(search || filterShippingLine || filterContainer) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          <span className="text-sm">Loading expired rates...</span>
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No expired rates found.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-amber-50 text-gray-600 uppercase text-[10px]">
                <th className="px-2 py-2 text-left font-semibold">User</th>
                <th className="px-2 py-2 text-left font-semibold">Shipping Lines</th>
                <th className="px-2 py-2 text-left font-semibold">POR</th>
                <th className="px-2 py-2 text-left font-semibold">POL</th>
                <th className="px-2 py-2 text-left font-semibold">POD</th>
                <th className="px-2 py-2 text-center font-semibold">Container</th>
                <th className="px-2 py-2 text-right font-semibold">Ocean Freight</th>
                <th className="px-2 py-2 text-center font-semibold">Validity</th>
                <th className="px-2 py-2 text-center font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, i) => {
                const isExpanded = expandedId === (r._id || i);
                const customCharges = parseCustomCharges(r.customCharges);
                const railFreight = parseRailFreight(r.railFreightRates);
                const is40 = (r.container_type || "").toLowerCase().includes("40");
                const days = daysExpired(r.validity);

                return (
                <React.Fragment key={r._id || i}>
                  <tr
                    className={`border-t border-gray-100 hover:bg-amber-50/40 cursor-pointer transition-colors ${
                      isExpanded ? "bg-amber-50/60" : ""
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : (r._id || i))}
                  >
                    {/* User column with image */}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={getUserImage(r.name)}
                          alt={r.name || "User"}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200"
                          onError={(e) => { e.target.src = defaultImg; }}
                        />
                        <span className="font-medium text-gray-800">{r.name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Ship size={11} className="text-blue-500" />
                        {r.shipping_lines || "-"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 font-medium">{r.por || "-"}</td>
                    <td className="px-2 py-1.5">{r.pol || "-"}</td>
                    <td className="px-2 py-1.5">{r.pod || "-"}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                        {r.container_type || "-"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-medium text-amber-700">{r.ocean_freight || "-"}</span>
                        {r.acd_ens_afr && (
                          <span className="font-mono text-[10px] text-orange-600">{r.acd_ens_afr}</span>
                        )}
                        {r.remarks && (
                          <span className="text-[9px] text-blue-500 italic mt-0.5">Please Read Remark</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex flex-col items-center">
                        {r.validity ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-[10px] text-red-500 font-medium">
                              <Calendar size={10} className="text-red-400" />
                              {fmtDate(r.validity)}
                            </span>
                            {r.validity_for && (
                              <span className="text-[9px] text-gray-500">{validityLabel(r.validity_for)}</span>
                            )}
                            <span
                              className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-0 rounded mt-0.5 ${
                                days > 30
                                  ? "bg-red-100 text-red-700"
                                  : days > 7
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              <AlertTriangle size={8} />
                              {days}d ago
                            </span>
                          </>
                        ) : "-"}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : (r._id || i));
                          }}
                          className={`text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors ${
                            isExpanded
                              ? "bg-red-100 text-red-600 hover:bg-red-200"
                              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                          }`}
                          title={isExpanded ? "Hide" : "Show"}
                        >
                          {isExpanded ? (
                            <><ChevronUp size={11} /> Hide</>
                          ) : (
                            <><ChevronDown size={11} /> Show</>
                          )}
                        </button>
                        {onCopy && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopy(r);
                            }}
                            className="text-emerald-500 hover:text-emerald-700 p-0.5"
                            title="Copy & Create New"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* =============== EXPANDED DETAILS =============== */}
                  {isExpanded && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={9} className="px-3 py-2.5">
                        {/* Compact 3-column grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 text-[10px]">

                          {/* ---- COL 1: Route & Contact ---- */}
                          <div className="space-y-2">
                            {/* Route */}
                            <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
                              <div className="flex items-center gap-1 mb-1.5 border-b border-gray-100 pb-1">
                                <MapPin size={10} className="text-amber-600" />
                                <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Route & Commodity</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                <div><span className="text-gray-400">POR:</span> <span className="font-medium text-gray-800">{r.por || "-"}</span></div>
                                <div><span className="text-gray-400">POL:</span> <span className="font-medium text-gray-800">{r.pol || "-"}</span></div>
                                <div><span className="text-gray-400">POD:</span> <span className="font-medium text-gray-800">{r.pod || "-"}</span></div>
                                <div><span className="text-gray-400">Final Dest:</span> <span className="font-medium text-gray-800">{r.finalDestination || r.fdrr || "-"}</span></div>
                                <div><span className="text-gray-400">Rail Ramp:</span> <span className="font-medium text-gray-800">{r.railRamp || "-"}</span></div>
                                <div><span className="text-gray-400">Commodity:</span> <span className="font-medium text-gray-800">{r.commodity || "-"}</span></div>
                                <div><span className="text-gray-400">Transit:</span> <span className="font-medium text-gray-800">{r.transit || "-"}</span></div>
                                <div className="col-span-2"><span className="text-gray-400">Route:</span> <span className="font-medium text-gray-800">{r.route || "-"}</span></div>
                              </div>
                            </div>

                            {/* Shipping Contact */}
                            <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
                              <div className="flex items-center gap-1 mb-1.5 border-b border-gray-100 pb-1">
                                <User size={10} className="text-violet-600" />
                                <span className="text-[9px] font-bold text-violet-700 uppercase tracking-wider">Shipping Contact</span>
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1"><User size={9} className="text-gray-300" /> <span className="text-gray-400">Name:</span> <span className="font-medium text-gray-800">{r.shipping_name || "-"}</span></div>
                                <div className="flex items-center gap-1"><Phone size={9} className="text-gray-300" /> <span className="text-gray-400">No:</span> <span className="font-medium text-gray-800">{r.shipping_number || "-"}</span></div>
                                <div className="flex items-center gap-1"><Mail size={9} className="text-gray-300" /> <span className="text-gray-400">Email:</span> <span className="font-medium text-gray-800 truncate">{r.shipping_email || "-"}</span></div>
                                <div className="flex items-start gap-1"><MapPin size={9} className="text-gray-300 mt-0.5 shrink-0" /> <span className="text-gray-400 shrink-0">Addr:</span> <span className="font-medium text-gray-800">{r.shipping_address || "-"}</span></div>
                              </div>
                            </div>
                          </div>

                          {/* ---- COL 2: Charges ---- */}
                          <div className="space-y-2">
                            {/* Origin Charges */}
                            <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
                              <div className="flex items-center gap-1 mb-1.5 border-b border-gray-100 pb-1">
                                <DollarSign size={10} className="text-orange-600" />
                                <span className="text-[9px] font-bold text-orange-700 uppercase tracking-wider">Origin Charges</span>
                              </div>
                              <div className="space-y-0.5">
                                {[
                                  ["BL Fees", r.bl_fees, "/BL"],
                                  ["THC", r.thc, "/Cntr"],
                                  ["MUC", r.muc, "/BL"],
                                  ["TOLL", r.toll, "/Cntr"],
                                ].map(([lbl, val, unit]) => (
                                  <div key={lbl} className="flex items-center justify-between">
                                    <span className="text-gray-500">{lbl}</span>
                                    <span className="font-mono font-medium text-gray-800">{val || "0"} <span className="text-gray-400 text-[9px]">{unit}</span></span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Other Charges */}
                            {customCharges.length > 0 && (
                              <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
                                <div className="flex items-center gap-1 mb-1.5 border-b border-gray-100 pb-1">
                                  <Package size={10} className="text-pink-600" />
                                  <span className="text-[9px] font-bold text-pink-700 uppercase tracking-wider">Other Charges</span>
                                </div>
                                <div className="space-y-0.5">
                                  {customCharges.map((cc, ci) => (
                                    <div key={ci} className="flex items-center justify-between">
                                      <span className="text-gray-500">{cc.label || "Charge"}</span>
                                      <span className="font-mono font-medium text-gray-800">
                                        {cc.currency === "INR" ? "₹" : cc.currency === "USD" ? "$" : cc.currency === "EUR" ? "€" : cc.currency === "GBP" ? "£" : cc.currency || ""}
                                        {cc.value || "0"} <span className="text-gray-400 text-[9px]">/{(cc.unit || "").replace("Per ", "")}</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* ---- COL 3: Additional Info + Rail Freight ---- */}
                          <div className="space-y-2">
                          <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
                            <div className="flex items-center gap-1 mb-1.5 border-b border-gray-100 pb-1">
                              <FileText size={10} className="text-gray-500" />
                              <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Additional Info</span>
                            </div>
                            <div className="space-y-1.5">
                              {r.remarks && (
                                <div className="bg-amber-50 rounded px-2 py-1 border border-amber-100">
                                  <span className="text-[9px] text-amber-600 font-semibold uppercase block">Remarks</span>
                                  <span className="font-medium text-gray-800 leading-tight">{r.remarks}</span>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                <div><span className="text-gray-400">Created:</span><br /><span className="font-medium text-gray-700">{fmtDateTime(r.createdAt)}</span></div>
                                <div><span className="text-gray-400">Updated:</span><br /><span className="font-medium text-gray-700">{fmtDateTime(r.updatedAt)}</span></div>
                              </div>
                              <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                                <img src={getUserImage(r.name)} alt="" className="w-5 h-5 rounded-full object-cover border border-gray-200" onError={(e) => { e.target.src = defaultImg; }} />
                                <div>
                                  <span className="text-[9px] text-gray-400 block">Added By</span>
                                  <span className="font-medium text-gray-800">{r.name || "-"}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                            {/* Rail Freight */}
                            {railFreight && (() => {
                              const cur = railFreight.currency || "₹";
                              const weightRows20 = [
                                { range: "0-10 ton", value: railFreight.weight20ft0_10 },
                                { range: "10-20 ton", value: railFreight.weight20ft10_20 },
                                { range: "20-26 ton", value: railFreight.weight20ft20_26 },
                                { range: "26+ ton", value: railFreight.weight20ft26Plus },
                              ].filter((row) => row.value !== undefined && row.value !== null);
                              const weightRows40 = [
                                { range: "10-20 ton", value: railFreight.weight40ft10_20 },
                                { range: "20+ ton", value: railFreight.weight40ft20Plus },
                              ].filter((row) => row.value !== undefined && row.value !== null);
                              const rows = is40 ? weightRows40 : weightRows20;
                              return rows.length > 0 ? (
                                <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
                                  <div className="flex items-center gap-1 mb-1.5 border-b border-gray-100 pb-1">
                                    <Ship size={10} className="text-purple-600" />
                                    <span className="text-[9px] font-bold text-purple-700 uppercase tracking-wider">Rail Freight</span>
                                    <span className="text-[8px] text-gray-400 ml-auto">(Cargo + Tare Wt)</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    {rows.map((row, ri) => (
                                      <div key={ri} className="flex items-center justify-between">
                                        <span className="text-gray-500">{r.container_type || (is40 ? "40ft" : "20ft")}: ({row.range})</span>
                                        <span className="font-mono font-medium text-gray-800">{cur}{row.value || 0} <span className="text-gray-400 text-[9px]">/Cntr</span></span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pg;
              if (totalPages <= 7) pg = i + 1;
              else if (page <= 4) pg = i + 1;
              else if (page >= totalPages - 3) pg = totalPages - 6 + i;
              else pg = page - 3 + i;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-6 h-6 rounded text-[10px] font-medium ${
                    pg === page
                      ? "bg-amber-500 text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpiredRates;
