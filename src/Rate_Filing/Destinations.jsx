import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  MapPin,
  Ship,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Globe,
  Anchor,
  X,
} from "lucide-react";

const RATE_FILING_API = "https://papayawhip-antelope-424743.hostingersite.com/api/rate-filings";

/* ------------------------------------------------------------------ */
/*  Destinations — POD search & Shipping Line lookup                     */
/* ------------------------------------------------------------------ */
const Destinations = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPod, setSelectedPod] = useState(null);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch(RATE_FILING_API);
      const data = await res.json();
      setRates(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  /* ----- Build POD → Shipping Lines map ----- */
  const podMap = useMemo(() => {
    const map = {};
    rates.forEach((r) => {
      if (!r.pod) return;
      const pod = r.pod.trim();
      if (!map[pod]) {
        map[pod] = { pod, shippingLines: new Set(), rates: [] };
      }
      if (r.shipping_lines) map[pod].shippingLines.add(r.shipping_lines);
      map[pod].rates.push(r);
    });
    // Convert sets to sorted arrays
    Object.values(map).forEach((entry) => {
      entry.shippingLines = [...entry.shippingLines].sort();
    });
    return map;
  }, [rates]);

  /* ----- Filtered PODs ----- */
  const filteredPods = useMemo(() => {
    const all = Object.values(podMap).sort((a, b) => a.pod.localeCompare(b.pod));
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(
      (entry) =>
        entry.pod.toLowerCase().includes(q) ||
        entry.shippingLines.some((sl) => sl.toLowerCase().includes(q))
    );
  }, [podMap, search]);

  const fmtDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2.5 rounded-lg">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Globe size={16} />
            Destinations
          </h2>
          <p className="text-[10px] text-indigo-200">
            {filteredPods.length} destination{filteredPods.length !== 1 ? "s" : ""} with active rates
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

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelectedPod(null); }}
          placeholder="Search by destination (POD) or shipping line..."
          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
        />
        {search && (
          <button
            onClick={() => { setSearch(""); setSelectedPod(null); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          <span className="text-sm">Loading destinations...</span>
        </div>
      ) : filteredPods.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No destinations found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredPods.map((entry) => {
            const isExpanded = selectedPod === entry.pod;
            return (
              <div
                key={entry.pod}
                className={`border rounded-lg transition-all ${
                  isExpanded
                    ? "border-indigo-300 bg-indigo-50/40 col-span-1 md:col-span-2 lg:col-span-3"
                    : "border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/20"
                }`}
              >
                {/* POD Header */}
                <button
                  type="button"
                  onClick={() => setSelectedPod(isExpanded ? null : entry.pod)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                >
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <MapPin size={14} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">{entry.pod}</div>
                    <div className="text-[10px] text-gray-500">
                      {entry.shippingLines.length} shipping line{entry.shippingLines.length !== 1 ? "s" : ""}{" "}
                      · {entry.rates.length} rate{entry.rates.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {entry.shippingLines.slice(0, 3).map((sl) => (
                      <span
                        key={sl}
                        className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-medium"
                      >
                        {sl.length > 10 ? sl.substring(0, 10) + "…" : sl}
                      </span>
                    ))}
                    {entry.shippingLines.length > 3 && (
                      <span className="text-[9px] text-gray-400">
                        +{entry.shippingLines.length - 3}
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </button>

                {/* Expanded: show all rates for this POD */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-indigo-200">
                    <div className="mt-2 space-y-1.5">
                      {/* Shipping line badges */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {entry.shippingLines.map((sl) => (
                          <span
                            key={sl}
                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          >
                            <Ship size={10} />
                            {sl}
                          </span>
                        ))}
                      </div>

                      {/* Rate cards */}
                      <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-[10px]">
                              <th className="px-2 py-1.5 text-left font-semibold">Shipping Line</th>
                              <th className="px-2 py-1.5 text-left font-semibold">POR</th>
                              <th className="px-2 py-1.5 text-left font-semibold">POL</th>
                              <th className="px-2 py-1.5 text-center font-semibold">Container</th>
                              <th className="px-2 py-1.5 text-right font-semibold">Ocean Freight</th>
                              <th className="px-2 py-1.5 text-center font-semibold">Validity</th>
                              <th className="px-2 py-1.5 text-left font-semibold">Route</th>
                              <th className="px-2 py-1.5 text-left font-semibold">Transit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.rates.map((r, ri) => (
                              <tr key={ri} className="border-t border-gray-100 hover:bg-indigo-50/30">
                                <td className="px-2 py-1.5">
                                  <span className="inline-flex items-center gap-1">
                                    <Anchor size={10} className="text-blue-500" />
                                    {r.shipping_lines || "-"}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5">{r.por || "-"}</td>
                                <td className="px-2 py-1.5">{r.pol || "-"}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {r.container_type || "-"}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono font-medium text-emerald-700">
                                  {r.ocean_freight || "-"}
                                </td>
                                <td className="px-2 py-1.5 text-center text-[10px]">
                                  {r.validity ? fmtDate(r.validity) : "-"}
                                </td>
                                <td className="px-2 py-1.5">{r.route || "-"}</td>
                                <td className="px-2 py-1.5">{r.transit || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Destinations;
