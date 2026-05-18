import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Ship,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Globe,
  Calendar,
  FileSpreadsheet,
  X,
  Anchor,
  Package,
  Clock,
  TrendingUp,
  Settings2,
  BarChart3,
  Star,
  Lock,
  Route,
  Database,
  User,
  MessageSquare,
  DollarSign,
} from "lucide-react";

const VALIDITY_FIELDS = [
  "validity",
  "validity_period",
  "valid_until",
  "expiry_date",
  "expires_at",
  "validity_date",
];
const CREATED_FIELDS = ["createdAt", "created_at", "dateCreated", "date"];

const normalizeDestination = (d) => {
  if (!d) return "";
  return String(d)
    .toLowerCase()
    .trim()
    .replace(
      /,?\s*(saudi arabia|argentina|australia|uae|bangladesh|angola|united arab emirates|cameron|china|india|germany|netherlands|belgium|italy|indonesia|ecuador|mexico|colombia|egypt|vietnam|sri lanka|russia|us|israel|france|uk|oman|united kingdom|usa|united states|peru|japan|uruguay|algeria|harbour|harbor|port|ny)$/i,
      "",
    )
    .replace(/^(port of|port|harbor of|harbour of)\s+/i, "")
    .replace(/[,.\-_()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const calculateSimilarity = (a, b) => {
  const A = normalizeDestination(a);
  const B = normalizeDestination(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.9;
  const w1 = new Set(A.split(" ").filter((w) => w.length > 2));
  const w2 = new Set(B.split(" ").filter((w) => w.length > 2));
  if (w1.size === 0 || w2.size === 0) return 0;
  const inter = [...w1].filter((x) => w2.has(x)).length;
  const union = new Set([...w1, ...w2]).size;
  return union ? inter / union : 0;
};

const findSimilarDestinations = (query, list, threshold = 0.7) =>
  list
    .map((d) => ({ destination: d, similarity: calculateSimilarity(query, d) }))
    .filter((m) => m.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map((m) => m.destination);

const parseFlexibleDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "string" && val.includes("/")) {
    const parts = val.split("/").map((p) => parseInt(p, 10));
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const getValidityDate = (rate) => {
  if (!rate) return null;
  for (const f of VALIDITY_FIELDS) {
    if (rate[f] && typeof rate[f] !== "boolean") {
      const d = parseFlexibleDate(rate[f]);
      if (d) return d;
    }
  }
  for (const f of CREATED_FIELDS) {
    if (rate[f]) {
      const c = parseFlexibleDate(rate[f]);
      if (c) return new Date(c.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }
  return null;
};

const formatDDMMYYYY = (date) => {
  if (!date || isNaN(date.getTime())) return "N/A";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
};

const getRateValidityStatus = (rate) => {
  if (!rate)
    return {
      isActive: false,
      statusText: "No Rate",
      className: "text-gray-400",
      formattedDate: "N/A",
    };
  const v = getValidityDate(rate);
  if (!v)
    return {
      isActive: false,
      statusText: "No Validity",
      className: "text-gray-400",
      formattedDate: "N/A",
    };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  v.setHours(0, 0, 0, 0);
  const isActive = v >= today;
  return {
    isActive,
    statusText: isActive ? "Active" : "Expired",
    className: isActive ? "text-green-600" : "text-red-600",
    formattedDate: formatDDMMYYYY(v),
  };
};

const ITEMS_PER_PAGE = 20;

function RateDetailModal({ rate, pod, onClose }) {
  if (!rate) return null;

  const status = getRateValidityStatus(rate);

  // Parse potentially JSON-stringified fields (backend stores them as strings)
  const parseJSONField = (val) => {
    if (!val) return null;
    if (typeof val === "object") return val;
    try { return JSON.parse(val); } catch { return null; }
  };

  const containerTypes =
    Array.isArray(rate.container_types) && rate.container_types.length > 0
      ? rate.container_types
      : rate.container_type
        ? [rate.container_type]
        : [];

  const containerCharges = parseJSONField(rate.containerCharges) || {};
  const originChargeMap  = parseJSONField(rate.originChargeMap)  || {};
  const customCharges    = parseJSONField(rate.customCharges)    || [];

  // Returns display strings for each charge column for a given container type.
  // Falls back to legacy top-level fields when only one container exists.
  const isSingle = containerTypes.length <= 1;
  const getCharges = (ct) => {
    const cc = containerCharges[ct] || {};
    const oc = originChargeMap[ct]  || {};

    const oceanFreight = cc.ocean_freight
      ? `${cc.ocean_freight_currency || ""} ${cc.ocean_freight}`.trim()
      : isSingle ? (rate.ocean_freight || "—") : "—";

    const acd = cc.acd_value
      ? `${cc.acd_type || "ACD"} ${cc.acd_currency || ""} ${cc.acd_value}`.trim()
      : isSingle ? (rate.acd_ens_afr || "—") : "—";

    return {
      oceanFreight,
      acd,
      blFees: oc.bl_fees || (isSingle ? rate.bl_fees : "") || "—",
      thc:    oc.thc     || (isSingle ? rate.thc     : "") || "—",
      muc:    oc.muc     || (isSingle ? rate.muc     : "") || "—",
      toll:   oc.toll    || (isSingle ? rate.toll    : "") || "—",
    };
  };

  const InfoField = ({ label, value, accent }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <span className={`text-sm font-medium ${accent || "text-gray-800"}`}>
        {value || "—"}
      </span>
    </div>
  );

  const SectionHeader = ({ icon: Icon, children, color = "text-gray-500" }) => (
    <h4 className={`text-[11px] font-bold uppercase tracking-widest ${color} mb-2.5 flex items-center gap-1.5`}>
      <Icon size={12} />
      {children}
    </h4>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 animate-slideUp flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div
          className={`px-5 py-4 flex-shrink-0 rounded-t-2xl ${
            status.isActive
              ? "bg-gradient-to-r from-emerald-600 to-green-700"
              : "bg-gradient-to-r from-rose-600 to-red-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-white/20 rounded-lg p-2 flex-shrink-0">
                <Ship className="text-white" size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">
                  {rate.shipping_lines || rate.shipping_line || "Shipping Line"}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="text-white/80 text-xs flex items-center gap-1">
                    <MapPin size={10} />
                    {pod}
                  </span>
                  <span className="text-white/50 text-xs">•</span>
                  <span className="bg-white/20 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                    {status.statusText}
                  </span>
                  <span className="text-white/50 text-xs">•</span>
                  <span className="text-white/80 text-xs">
                    Valid till {status.formattedDate}
                    {rate.validity_for ? ` (${rate.validity_for})` : ""}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/25 text-white transition flex-shrink-0 ml-3"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Route Information */}
          <div>
            <SectionHeader icon={Route}>Route Information</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-3">
              <InfoField label="POR" value={rate.por} />
              <InfoField label="POL" value={rate.pol} />
              <InfoField label="POD" value={rate.pod} />
              <InfoField label="Final Destination" value={rate.finalDestination || rate.fdrr} />
              <InfoField label="Rail Ramp" value={rate.railRamp} />
              <InfoField label="Routing" value={rate.route} />
              <InfoField label="Transit" value={rate.transit} />
              <InfoField label="Commodity" value={rate.commodity} />
              <InfoField
                label="Validity Type"
                value={rate.validity_for || "—"}
              />
            </div>
          </div>

          {/* Container Charges — one row per container type */}
          {containerTypes.length > 0 && (
            <div>
              <SectionHeader icon={Package}>Container Charges</SectionHeader>
              <div className="rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                        Container Type
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-emerald-700 uppercase tracking-wide text-[10px]">
                        Ocean Freight
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                        ACD / ENS / AFR
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                        BL Fees
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                        THC
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                        MUC
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                        Toll
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {containerTypes.map((ct, i) => {
                      const ch = getCharges(ct);
                      return (
                        <tr
                          key={ct}
                          className={
                            i % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                          }
                        >
                          <td className="px-3 py-2 font-medium text-gray-800">
                            {ct}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                            {ch.oceanFreight}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {ch.acd}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {ch.blFees}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {ch.thc}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {ch.muc}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {ch.toll}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Custom / Additional Charges */}
          {customCharges.length > 0 && (
            <div>
              <SectionHeader icon={DollarSign}>Additional Charges</SectionHeader>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                        Description
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                        Amount
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customCharges.map((c, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}
                      >
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {c.label || "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {c.value
                            ? `${c.currency ? c.currency + " " : ""}${c.value}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {c.unit || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Shipping Contact */}
          {(rate.shipping_name ||
            rate.shipping_number ||
            rate.shipping_email ||
            rate.shipping_address) && (
            <div>
              <SectionHeader icon={User}>Shipping Contact</SectionHeader>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-3">
                <InfoField label="Name"    value={rate.shipping_name}    />
                <InfoField label="Phone"   value={rate.shipping_number}  />
                <InfoField label="Email"   value={rate.shipping_email}   />
                <InfoField label="Address" value={rate.shipping_address} />
              </div>
            </div>
          )}

          {/* Remarks */}
          {rate.remarks && (
            <div>
              <SectionHeader icon={MessageSquare}>Remarks</SectionHeader>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-line leading-relaxed">
                {rate.remarks}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0 rounded-b-2xl flex items-center justify-between text-xs text-gray-500">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              Filed:{" "}
              {formatDDMMYYYY(
                parseFlexibleDate(
                  rate.createdAt || rate.created_at || rate.dateCreated,
                ),
              )}
            </span>
            {rate.name && (
              <span className="flex items-center gap-1">
                <User size={11} />
                By: {rate.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-md text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out; }
        .animate-slideUp { animation: slideUp 0.22s ease-out; }
      `}</style>
    </div>
  );
}

function POD_lines({
  destinations = [],
  freightRates = [],
  isLoading = false,
  onRefresh,
  onOpenManagement,
  onSyncFromRates,
  isAdmin = false,
  isRoleAdmin = false,
}) {
  const [selectedPOD, setSelectedPOD] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [animatingRows, setAnimatingRows] = useState(new Set());
  const [detailRate, setDetailRate] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".search-container")) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Pre-built indices (computed once per data change) ────────────────
  //
  // destNameIndex: lowercase → canonical name for O(1) exact lookup
  const destNameIndex = useMemo(() => {
    const map = new Map();
    destinations.forEach((d) => {
      const name = (typeof d === "string" ? d : d?.destinationName)?.trim();
      if (name) map.set(name.toLowerCase(), name);
    });
    return map;
  }, [destinations]);

  // allSearchableItems: deduplicated union of destination names + rate PODs
  // Used as the source for the autocomplete dropdown — built once, not per keystroke
  const allSearchableItems = useMemo(() => {
    const seen = new Map(); // lower → canonical name
    destinations.forEach((d) => {
      const name = (typeof d === "string" ? d : d?.destinationName)?.trim();
      if (name) seen.set(name.toLowerCase(), name);
    });
    freightRates.forEach((r) => {
      const name = r.pod?.trim();
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    });
    return Array.from(seen.entries()).map(([lower, name]) => ({ name, lower }));
  }, [destinations, freightRates]);

  // podLineCounts: lowercase name → shipping-line count
  // Merged from destination documents + rate filings — O(1) count lookup in suggestions
  const podLineCounts = useMemo(() => {
    const sets = new Map(); // lower → Set<line lower>
    destinations.forEach((d) => {
      const name = (typeof d === "string" ? d : d?.destinationName)?.trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!sets.has(key)) sets.set(key, new Set());
      if (typeof d === "object" && Array.isArray(d.shippingLines)) {
        d.shippingLines
          .filter((l) => l.isActive !== false)
          .forEach((l) => {
            if (l.lineName) sets.get(key).add(l.lineName.toLowerCase().trim());
          });
      }
    });
    freightRates.forEach((r) => {
      const pod = r.pod?.trim();
      const line = (r.shipping_lines || r.shipping_line)?.trim();
      if (!pod || !line) return;
      const key = pod.toLowerCase();
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key).add(line.toLowerCase());
    });
    const counts = new Map();
    sets.forEach((v, k) => counts.set(k, v.size));
    return counts;
  }, [destinations, freightRates]);

  // podToCanonical: maps every rate-filing POD (lower) → canonical destination name
  // Avoids repeated similarity calls in popularDestinations / ratesForSelectedPOD
  const podToCanonical = useMemo(() => {
    const map = new Map();
    const destEntries = Array.from(destNameIndex.entries()); // [lower, canonical]
    const uniquePods = new Set(
      freightRates.map((r) => r.pod?.trim()).filter(Boolean),
    );
    uniquePods.forEach((pod) => {
      const podLower = pod.toLowerCase();
      // 1. Exact match
      if (destNameIndex.has(podLower)) {
        map.set(podLower, destNameIndex.get(podLower));
        return;
      }
      // 2. Prefix / contains (faster than full similarity)
      for (const [lower, canonical] of destEntries) {
        if (lower.startsWith(podLower) || podLower.startsWith(lower)) {
          map.set(podLower, canonical);
          return;
        }
      }
      // 3. Similarity — only runs when the two faster checks failed
      let best = null;
      let bestScore = 0.74; // threshold
      for (const [, canonical] of destEntries) {
        const score = calculateSimilarity(pod, canonical);
        if (score > bestScore) {
          bestScore = score;
          best = canonical;
        }
      }
      map.set(podLower, best || pod);
    });
    return map;
  }, [destNameIndex, freightRates]);

  // ── Autocomplete suggestions ──────────────────────────────────────────
  // Pure string filtering on the pre-built list — zero similarity calls per keystroke
  const filteredSuggestions = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    if (!term) return [];
    return allSearchableItems
      .filter((s) => s.lower.includes(term) && s.lower !== term)
      .map((s) => ({
        name: s.name,
        shippingLinesCount: podLineCounts.get(s.lower) || 0,
      }))
      .sort((a, b) => {
        const aP = a.name.toLowerCase().startsWith(term);
        const bP = b.name.toLowerCase().startsWith(term);
        if (aP && !bP) return -1;
        if (!aP && bP) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [debouncedSearch, allSearchableItems, podLineCounts]);

  useEffect(() => {
    setShowSuggestions(
      debouncedSearch.length > 0 && filteredSuggestions.length > 0,
    );
  }, [debouncedSearch, filteredSuggestions]);

  // ── Rates for the selected POD ────────────────────────────────────────
  // Uses podToCanonical to find all rate-filing PODs that belong to this
  // destination without re-running findSimilarDestinations every search
  const ratesForSelectedPOD = useMemo(() => {
    if (!selectedPOD) return [];
    const selectedLower = selectedPOD.toLowerCase();
    // Collect all rate PODs that resolve to this canonical destination
    const matchingSet = new Set([selectedLower]);
    podToCanonical.forEach((canonical, podLower) => {
      if (canonical.toLowerCase() === selectedLower) matchingSet.add(podLower);
    });
    return freightRates.filter(
      (r) => r.pod && matchingSet.has(r.pod.toLowerCase().trim()),
    );
  }, [selectedPOD, freightRates, podToCanonical]);

  const latestRateByLine = useMemo(() => {
    const map = new Map();
    ratesForSelectedPOD.forEach((rate) => {
      const line = rate.shipping_lines || rate.shipping_line || "Unknown";
      const key = line.toLowerCase().trim();
      const created =
        parseFlexibleDate(
          rate.createdAt || rate.created_at || rate.dateCreated || rate.date,
        ) || new Date(0);
      const existing = map.get(key);
      const existingTime =
        parseFlexibleDate(
          existing?.createdAt ||
            existing?.created_at ||
            existing?.dateCreated ||
            existing?.date,
        )?.getTime() || 0;
      if (!existing || created.getTime() > existingTime) {
        map.set(key, { ...rate, shipping_line: line });
      }
    });
    return map;
  }, [ratesForSelectedPOD]);

  const shippingLineRows = useMemo(() => {
    if (!selectedPOD) return [];
    const destDoc = destinations.find(
      (d) =>
        (typeof d === "string" ? d : d?.destinationName)?.toLowerCase() ===
        selectedPOD.toLowerCase(),
    );
    const fromDest = [];
    if (
      destDoc &&
      typeof destDoc === "object" &&
      Array.isArray(destDoc.shippingLines)
    ) {
      destDoc.shippingLines
        .filter((l) => l.isActive !== false)
        .forEach((l) => fromDest.push(l.lineName || l.name));
    }
    const fromRates = Array.from(latestRateByLine.values()).map(
      (r) => r.shipping_lines || r.shipping_line || "Unknown",
    );
    const seen = new Set();
    const merged = [];
    [...fromDest, ...fromRates].forEach((name) => {
      const key = String(name || "")
        .toLowerCase()
        .trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(name);
    });
    return merged.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" }),
    );
  }, [selectedPOD, destinations, latestRateByLine]);

  const findRateForLine = useCallback(
    (lineName) =>
      lineName
        ? latestRateByLine.get(lineName.toLowerCase().trim()) || null
        : null,
    [latestRateByLine],
  );

  const totalItems = shippingLineRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = shippingLineRows.slice(startIndex, endIndex);

  useEffect(() => {
    setAnimatingRows(new Set());
    if (currentItems.length === 0) return;
    const timers = currentItems.map((_, i) =>
      setTimeout(
        () => setAnimatingRows((prev) => new Set([...prev, i])),
        i * 30,
      ),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPOD, currentPage, totalItems]);

  const handleSelectPOD = (name) => {
    setSelectedPOD(name);
    setSearchInput(name);
    setShowSuggestions(false);
    setHasSearched(true);
    setCurrentPage(1);
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const term = searchInput.trim();
    if (!term) return;
    const termLower = term.toLowerCase();
    // 1. Exact O(1) lookup from index
    if (destNameIndex.has(termLower)) return handleSelectPOD(destNameIndex.get(termLower));
    // 2. First prefix / includes match in the full searchable list
    const partial = allSearchableItems.find((s) => s.lower.includes(termLower));
    if (partial) return handleSelectPOD(partial.name);
    // 3. Similarity fallback (only when no string match found)
    const allNames = allSearchableItems.map((s) => s.name);
    const fuzzy = findSimilarDestinations(term, allNames, 0.6);
    if (fuzzy.length > 0) return handleSelectPOD(fuzzy[0]);
    setError(`No destination found matching "${term}"`);
    setTimeout(() => setError(""), 3000);
  };

  const handleReset = () => {
    setSelectedPOD("");
    setSearchInput("");
    setHasSearched(false);
    setCurrentPage(1);
    setError("");
  };

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const handleSync = async () => {
    if (!selectedPOD || !onSyncFromRates) return;
    setIsSyncing(true);
    setError("");
    try {
      await onSyncFromRates(selectedPOD);
    } catch (err) {
      setError(err.message || "Sync failed");
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const getPageNumbers = () => {
    const out = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) out.push(i);
    } else if (currentPage <= 3) {
      out.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      out.push(
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      out.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    }
    return out;
  };

  const isInitialized = !isLoading;
  const totalRates = freightRates.length;
  const totalActiveLines = useMemo(() => {
    let count = 0;
    latestRateByLine.forEach((r) => {
      if (getRateValidityStatus(r).isActive) count++;
    });
    return count;
  }, [latestRateByLine]);

  // ── Live global stats ─────────────────────────────────────────────────
  // popularDestinations uses podToCanonical (pre-built) so it runs O(r) not O(d×r)
  const popularDestinations = useMemo(() => {
    const nameMap = new Map(); // canonical → Set<line lower>
    destinations.forEach((d) => {
      const name = (typeof d === "string" ? d : d?.destinationName)?.trim();
      if (!name) return;
      if (!nameMap.has(name)) nameMap.set(name, new Set());
      if (typeof d === "object" && Array.isArray(d.shippingLines)) {
        d.shippingLines
          .filter((l) => l.isActive !== false)
          .forEach((l) =>
            nameMap.get(name).add((l.lineName || "").toLowerCase().trim()),
          );
      }
    });
    freightRates.forEach((r) => {
      const pod = r.pod?.trim();
      const line = r.shipping_lines || r.shipping_line;
      if (!pod || !line) return;
      const canonical = podToCanonical.get(pod.toLowerCase()) || pod;
      if (!nameMap.has(canonical)) nameMap.set(canonical, new Set());
      nameMap.get(canonical).add(String(line).trim().toLowerCase());
    });
    return Array.from(nameMap.entries())
      .map(([name, linesSet]) => ({ name, count: linesSet.size }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [destinations, freightRates, podToCanonical]);

  const globalTotalLines = useMemo(() => {
    const allLines = new Set();
    freightRates.forEach((r) => {
      const line = r.shipping_lines || r.shipping_line;
      if (line) allLines.add(String(line).trim().toLowerCase());
    });
    return allLines.size;
  }, [freightRates]);

  const globalActiveRoutes = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return freightRates.filter((r) => {
      const v = getValidityDate(r);
      if (!v) return false;
      v.setHours(0, 0, 0, 0);
      return v >= today;
    }).length;
  }, [freightRates]);

  const totalDestinations = useMemo(() => {
    const seen = new Set();
    destinations.forEach((d) => {
      const name = typeof d === "string" ? d : d?.destinationName;
      if (name) seen.add(name.toLowerCase());
    });
    freightRates.forEach((r) => {
      if (r.pod) seen.add(r.pod.toLowerCase());
    });
    return seen.size;
  }, [destinations, freightRates]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Hero Section ──────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 mb-4">
            <Globe className="text-blue-300" size={14} />
            <span className="text-blue-200 text-xs font-medium tracking-wide uppercase">
              Global Shipping Network
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 leading-tight">
            <span className="text-white">Discover Global </span>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Shipping Routes
            </span>
          </h1>
          <p className="text-blue-200/80 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Select any international destination from our comprehensive list to
            view all shipping lines from Indian ports to your chosen
            destination.
          </p>

          {/* data-ready indicators */}
          <div className="mt-5 flex justify-center items-center gap-3 flex-wrap">
            {/* destinations available */}
            <div className="inline-flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-3 py-1">
              <MapPin size={12} className="text-blue-400" />
              <span className="text-blue-200 text-xs font-medium">
                {isLoading ? (
                  <span className="inline-block w-16 h-3 bg-white/10 rounded animate-pulse align-middle" />
                ) : (
                  `${totalDestinations.toLocaleString()} destinations available`
                )}
              </span>
            </div>

            {/* freight rates ready */}
            <div className="inline-flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-3 py-1">
              <div
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isInitialized
                    ? "bg-green-400"
                    : isLoading
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-red-400"
                }`}
              />
              <span className="text-blue-200 text-xs font-medium">
                {isLoading ? (
                  <span className="inline-block w-20 h-3 bg-white/10 rounded animate-pulse align-middle" />
                ) : (
                  `${totalRates.toLocaleString()} freight rates ready`
                )}
              </span>
            </div>

            {!isLoading && onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="text-xs text-blue-300 hover:text-white flex items-center gap-1 transition disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={isLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Bar ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          {[
            {
              icon: <MapPin size={20} className="text-blue-400" />,
              value: isLoading ? "—" : totalDestinations.toLocaleString(),
              label: "Total Destinations",
              bg: "from-blue-600/20 to-blue-700/10",
              border: "border-blue-500/30",
            },
            {
              icon: <Ship size={20} className="text-cyan-400" />,
              value: isLoading ? "—" : globalTotalLines.toLocaleString(),
              label: "Shipping Lines",
              bg: "from-cyan-600/20 to-cyan-700/10",
              border: "border-cyan-500/30",
            },
            {
              icon: <Route size={20} className="text-green-400" />,
              value: isLoading ? "—" : globalActiveRoutes.toLocaleString(),
              label: "Active Routes",
              bg: "from-green-600/20 to-green-700/10",
              border: "border-green-500/30",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-4 sm:p-5 text-center backdrop-blur-sm`}
            >
              <div className="flex justify-center mb-2">{s.icon}</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {isLoading ? (
                  <span className="inline-block w-12 h-7 bg-white/10 rounded animate-pulse" />
                ) : (
                  s.value
                )}
              </div>
              <div className="text-xs text-white/60 mt-1 font-medium">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Search form */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-5 mb-6 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-2">
                <Globe className="inline mr-1 text-blue-400" size={14} />
                Search Destination (POD/FPOD){" "}
                <span className="text-red-400">*</span>
              </label>

              <div className="flex gap-3 items-start">
                <div className="flex-1 relative search-container">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-gray-400" size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Type destination name (e.g., Singapore, Dubai, Rotterdam)..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() =>
                      setShowSuggestions(
                        searchInput.length > 0 &&
                          filteredSuggestions.length > 0,
                      )
                    }
                    disabled={isLoading}
                    className="block w-full pl-10 pr-4 py-3 text-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition hover:border-blue-400/60 bg-white/10 text-white placeholder-white/40 disabled:bg-white/5 disabled:cursor-not-allowed"
                    required
                  />

                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                      {filteredSuggestions.map((s, i) => (
                        <button
                          key={`${s.name}-${i}`}
                          type="button"
                          onClick={() => handleSelectPOD(s.name)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-600/20 focus:bg-blue-600/20 focus:outline-none transition border-b border-white/10 last:border-b-0 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                              <MapPin
                                className="text-blue-400 mr-3 flex-shrink-0"
                                size={14}
                              />
                              <span className="text-sm font-medium text-white group-hover:text-blue-300 truncate">
                                {s.name}
                              </span>
                            </div>
                            <span className="ml-2 flex-shrink-0 text-xs text-blue-300/70 flex items-center">
                              <Ship size={11} className="mr-1" />
                              {s.shippingLinesCount}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="submit"
                    disabled={!searchInput.trim() || isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg font-medium text-sm"
                  >
                    <div className="flex items-center">
                      <Search className="mr-2" size={14} />
                      Search
                    </div>
                  </button>

                  {hasSearched && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-3 border border-white/20 rounded-xl text-sm font-medium text-white/80 bg-white/10 hover:bg-white/20 transition flex items-center"
                    >
                      <RefreshCw className="mr-2" size={14} />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-white/40 mt-2 flex items-center gap-2">
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="inline-block w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin mr-1" />
                    Loading freight rates...
                  </span>
                ) : (
                  <span>
                    {debouncedSearch !== searchInput
                      ? "Searching..."
                      : searchInput
                        ? filteredSuggestions.length > 0
                          ? `${filteredSuggestions.length} instant suggestions`
                          : "No matching destinations found"
                        : isInitialized
                          ? `${totalRates} freight rates ready for instant search`
                          : `${destinations.length} destinations available — start typing to search`}
                  </span>
                )}
              </p>
            </div>
          </form>
        </div>

        {/* ── Popular Destinations ──────────────────────────────────── */}
        {!hasSearched && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="text-yellow-400" size={18} />
              <h2 className="text-white font-bold text-base sm:text-lg">
                Popular Destinations
              </h2>
              <span className="ml-auto text-xs text-blue-300/70">
                Click any to search
              </span>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : popularDestinations.length === 0 ? (
              <p className="text-blue-300/60 text-sm">
                No destination data yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {popularDestinations.map((dest, i) => (
                  <button
                    key={dest.name}
                    onClick={() => handleSelectPOD(dest.name)}
                    className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 rounded-xl p-4 text-left transition-all duration-200 hover:shadow-lg hover:shadow-blue-900/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-semibold text-sm truncate group-hover:text-blue-300 transition-colors">
                          {dest.name}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Ship size={11} className="text-blue-400" />
                          <span className="text-blue-300/80 text-xs">
                            {dest.count} line{dest.count === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center ml-2">
                        <span className="text-blue-300 text-[10px] font-bold">
                          {i + 1}
                        </span>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-b-xl transition-all duration-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Admin Data Management Panel (role-based: Admin / Super Admin only) */}
        {!hasSearched && isRoleAdmin && onOpenManagement && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl flex-shrink-0">
                    <Database className="text-purple-300" size={22} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">
                      Data Management Panel
                    </h3>
                    <p className="text-purple-200/70 text-xs mt-0.5">
                      Add new POD destinations and manage shipping lines
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Lock size={11} className="text-green-400" />
                      <span className="text-green-300 text-xs font-medium">
                        Authorized Access
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onOpenManagement}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all duration-200"
                >
                  <Settings2 size={15} />
                  Manage POD Data
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-3 mb-4 flex items-center text-sm text-red-200">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center min-w-0">
                  <div className="text-white mr-3 flex-shrink-0">
                    <Ship size={24} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-white truncate">
                      Shipping Lines to {selectedPOD}
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {totalItems} shipping lines found • Page {currentPage} of{" "}
                      {totalPages}
                      {totalActiveLines > 0 && (
                        <span className="ml-2">
                          • {totalActiveLines} active rate
                          {totalActiveLines === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && onSyncFromRates && (
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                      title="Sync shipping lines for this POD from rate filings"
                    >
                      <RefreshCw
                        size={12}
                        className={isSyncing ? "animate-spin" : ""}
                      />
                      {isSyncing ? "Syncing…" : "Sync from Rates"}
                    </button>
                  )}
                  <div className="hidden sm:block">
                    <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                      <span className="text-white text-sm font-medium">
                        Showing {totalItems === 0 ? 0 : startIndex + 1}-
                        {Math.min(endIndex, totalItems)} of {totalItems}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {totalItems === 0 ? (
                <div className="text-center py-12">
                  <Anchor className="mx-auto text-gray-300 mb-4" size={56} />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Shipping Lines Found
                  </h3>
                  <p className="text-gray-500 text-sm">
                    No shipping lines are currently associated with this
                    destination.
                  </p>
                  {isAdmin && onSyncFromRates && (
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                    >
                      <RefreshCw
                        size={14}
                        className={isSyncing ? "animate-spin" : ""}
                      />
                      Sync from Rate Filings
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm border border-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="w-16 px-2 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300">
                          S.No
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300">
                          <div className="flex items-center">
                            <Ship className="text-blue-600 mr-1.5" size={14} />
                            <span>Shipping Line</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300">
                          <div className="flex items-center justify-center">
                            <FileSpreadsheet
                              className="text-green-600 mr-1.5"
                              size={14}
                            />
                            <span>Ocean Freight</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300">
                          <div className="flex items-center justify-center">
                            <Calendar
                              className="text-blue-600 mr-1.5"
                              size={14}
                            />
                            <span>Validity Date</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300">
                          <div className="flex items-center justify-center">
                            <ExternalLink
                              className="text-purple-600 mr-1.5"
                              size={14}
                            />
                            <span>Action</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentItems.map((lineName, index) => {
                        const globalIndex = startIndex + index;
                        const isAnimating = animatingRows.has(index);
                        const rate = findRateForLine(lineName);
                        const status = getRateValidityStatus(rate);
                        return (
                          <tr
                            key={`${lineName}-${globalIndex}`}
                            className={`hover:bg-blue-50 transition-all duration-500 group ${
                              isAnimating
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-4"
                            }`}
                            style={{
                              transitionDelay: isAnimating
                                ? `${index * 30}ms`
                                : "0ms",
                            }}
                          >
                            <td className="w-16 px-3 py-3 text-center border-r border-gray-200">
                              <div className="flex justify-center">
                                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm group-hover:from-blue-600 group-hover:to-indigo-700 transition">
                                  <span className="text-white text-xs font-bold">
                                    {globalIndex + 1}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 border-r border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition truncate pr-2">
                                    {lineName}
                                  </div>
                                  <div className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mt-1 group-hover:w-16 transition-all duration-300" />
                                </div>
                                <div className="flex-shrink-0 bg-blue-50 rounded-full p-1.5 group-hover:bg-blue-100 transition">
                                  <Ship className="text-blue-600" size={12} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center border-r border-gray-200">
                              <div className="flex flex-col items-center">
                                {rate ? (
                                  <>
                                    <span
                                      className={`text-base font-bold ${status.className}`}
                                    >
                                      {rate.ocean_freight ||
                                        rate.freight_rate ||
                                        "N/A"}
                                    </span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                      <Package size={10} />
                                      {rate.container_type ||
                                        (Array.isArray(rate.container_types) &&
                                        rate.container_types.length > 0
                                          ? rate.container_types.join(", ")
                                          : "20 FT")}
                                    </span>
                                    <span
                                      className={`text-xs font-medium ${status.className}`}
                                    >
                                      {status.statusText} Rate
                                    </span>
                                  </>
                                ) : (
                                  <div className="text-center">
                                    <span className="text-sm text-orange-600 font-medium">
                                      Rate Not Available
                                    </span>
                                    <div className="text-xs text-gray-500">
                                      No freight data
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center border-r border-gray-200">
                              <div className="flex flex-col items-center">
                                {rate ? (
                                  <>
                                    <span
                                      className={`font-medium text-sm ${status.className}`}
                                    >
                                      {status.formattedDate}
                                    </span>
                                    <span
                                      className={`text-xs ${status.className}`}
                                    >
                                      {status.statusText} Rate
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-sm text-gray-400">
                                      —
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      No validity date
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center">
                                {rate ? (
                                  <button
                                    onClick={() => setDetailRate(rate)}
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition hover:scale-110 ${
                                      status.isActive
                                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                                        : "bg-red-100 text-red-700 hover:bg-red-200"
                                    }`}
                                    title={`View ${
                                      status.isActive ? "active" : "expired"
                                    } rate details`}
                                  >
                                    <ExternalLink size={14} />
                                  </button>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">
                                      —
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 border-t border-gray-200 rounded-b-lg">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center text-sm text-gray-700">
                          <span>
                            Showing{" "}
                            <span className="font-medium">
                              {startIndex + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                              {Math.min(endIndex, totalItems)}
                            </span>{" "}
                            of <span className="font-medium">{totalItems}</span>{" "}
                            results
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            <ChevronLeft size={16} />
                          </button>

                          {getPageNumbers().map((pageNum, index) => (
                            <button
                              key={index}
                              onClick={() =>
                                typeof pageNum === "number" &&
                                handlePageChange(pageNum)
                              }
                              disabled={pageNum === "..."}
                              className={`relative inline-flex items-center px-3 py-2 border text-sm font-medium transition ${
                                pageNum === currentPage
                                  ? "z-10 bg-blue-600 border-blue-600 text-white"
                                  : pageNum === "..."
                                    ? "border-gray-300 bg-white text-gray-700 cursor-not-allowed"
                                    : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}

                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {detailRate && (
        <RateDetailModal
          rate={detailRate}
          pod={selectedPOD}
          onClose={() => setDetailRate(null)}
        />
      )}
    </div>
  );
}

export default POD_lines;
