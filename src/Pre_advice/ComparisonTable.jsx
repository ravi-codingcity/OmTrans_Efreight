import React, { useState, useMemo } from "react";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Charge-name normaliser (same logic as PreAdvice.jsx)               */
/* ------------------------------------------------------------------ */
const normalizeChargeName = (name) => {
  let s = (name || "").trim();

  // 1. Extract and remove the container-suffix "[20ft Std]" BEFORE any
  //    other manipulation so the trailing-word strip works correctly in
  //    multi-container mode (names like "BL Fee [20ft Std]").
  const suffixMatch = s.match(/\s*(\[[^\]]+\])$/);
  const suffix = suffixMatch ? suffixMatch[1].toLowerCase() : "";
  if (suffixMatch) s = s.slice(0, s.length - suffixMatch[0].length).trim();

  // 2. Lowercase + normalise punctuation (/, -, .) to spaces
  s = s.toLowerCase().replace(/[/\-.]/g, " ").replace(/\s+/g, " ").trim();

  // 3. Strip common trailing noise words (handles both singular & plural)
  s = s.replace(/\s+(charges?|fees?|services?|surcharges?)$/, "").trim();

  // 4. Canonical alias map — covers common freight charge name variations
  //    including uppercase/lowercase, singular/plural and minor wording
  const aliases = {
    // BL
    "bl": "bl fee",
    "b l": "bl fee",
    "bill of lading": "bl fee",
    // THC
    "thc": "thc",
    "terminal handling": "thc",
    // MUC
    "muc": "muc",
    // Ocean Freight
    "ocean freight": "ocean freight",
    "ocean": "ocean freight",
    "freight": "ocean freight",
    // Transport (handles "Transport Charges" vs "TRANSPORTATION CHARGES")
    "transport": "transport",
    "transportation": "transport",
    // Documentation
    "documentation": "documentation",
    "document": "documentation",
    "doc": "documentation",
    // ACD / ENS / AFR
    "acd": "acd/ens/afr",
    "ens": "acd/ens/afr",
    "afr": "acd/ens/afr",
    "acd ens afr": "acd/ens/afr",
    // Customs
    "customs": "customs clearance",
    "custom": "customs clearance",
    "customs clearance": "customs clearance",
    // CFS
    "cfs": "cfs",
    // BAF
    "baf": "baf",
    "bunker adjustment": "baf",
    // ISS / LSS
    "iss": "iss",
    "lss": "lss",
    // Toll
    "toll": "toll",
    // Wharfage
    "wharfage": "wharfage",
    // Detention / Demurrage
    "detention": "detention",
    "demurrage": "demurrage",
  };

  const normalized = aliases[s] ?? s;
  // Re-append the container suffix so multi-container keying is preserved
  return suffix ? `${normalized} ${suffix}` : normalized;
};

/** Preferred display label — picks the longer / more descriptive name */
const displayChargeName = (nameA, nameB) => {
  const a = (nameA || "").trim();
  const b = (nameB || "").trim();
  if (!a) return b || "-";
  if (!b) return a || "-";
  // Prefer specific ACD/ENS/AFR type over generic combined label
  const generic = /^acd\/ens\/afr$/i;
  if (generic.test(a) && !generic.test(b)) return b;
  if (generic.test(b) && !generic.test(a)) return a;
  return a.length >= b.length ? a : b;
};

/* ------------------------------------------------------------------ */
/*  Location / Shipping-line / Container-type normalisers for          */
/*  "Match" vs "Differs" badges on info rows                           */
/* ------------------------------------------------------------------ */
const normalizeLocation = (loc) => {
  let s = (loc || "").trim().toLowerCase();
  s = s.replace(/\s*\([^)]{1,10}\)\s*/g, " ").trim();
  s = s.replace(/,\s*[a-z]+$/i, "").trim();
  return s;
};

const normalizeShippingLine = (sl) => {
  let s = (sl || "").trim().toLowerCase().replace(/[-_]/g, " ");
  s = s.replace(/\s+(shipping|line|lines|container|logistics)$/g, "").trim();
  s = s.replace(/\s+(shipping|line|lines|container|logistics)$/g, "").trim();
  const map = { "cosco": "cosco", "cosco ship": "cosco", "maersk": "maersk", "hapag lloyd": "hapag lloyd",
    "cma cgm": "cma cgm", "cma": "cma cgm", "one": "one", "ocean network express": "one",
    "msc": "msc", "zim": "zim", "hmm": "hmm", "hyundai": "hmm", "oocl": "oocl", "sci": "sci" };
  return map[s] || s;
};

const normalizeContainerType = (ct) => {
  let s = (ct || "").trim().toLowerCase();
  s = s.replace(/(\d+)\s*(?:ft|foot|')\s*/g, "$1ft ").replace(/\s+/g, " ").trim();
  const typeAliases = [
    { patterns: ["high cube", "h.q", "hq", "h.c", "hc", "hi cube"], canonical: "hc" },
    { patterns: ["standard", "st", "std", "gp", "general purpose", "dry"], canonical: "st" },
    { patterns: ["open top", "ot", "ot-in", "ot in"], canonical: "ot" },
    { patterns: ["flat rack", "fr", "flat"], canonical: "fr" },
    { patterns: ["reefer", "rf", "refrigerated"], canonical: "rf" },
    { patterns: ["haz", "hazardous", "dangerous"], canonical: "haz" },
  ];
  const m = s.match(/^(\d+ft)\s*(.*)$/);
  if (m) {
    let type = m[2].replace(/[.\-]/g, " ").replace(/\s+/g, " ").trim();
    for (const a of typeAliases) if (a.patterns.some((p) => type === p || type.includes(p))) return `${m[1]} ${a.canonical}`;
    return `${m[1]} ${type}`;
  }
  return s;
};

/** Flexible match for info-row values */
const flexMatch = (rawA, rawB, fieldLabel) => {
  const a = (rawA || "").trim();
  const b = (rawB || "").trim();
  if (a === "-" || b === "-") return a === b;
  const lbl = fieldLabel.toLowerCase();
  if (["por", "pol", "pod", "final destination", "routing"].includes(lbl)) {
    return normalizeLocation(a) === normalizeLocation(b) ||
      normalizeLocation(a).includes(normalizeLocation(b)) ||
      normalizeLocation(b).includes(normalizeLocation(a));
  }
  if (lbl === "shipping line") return normalizeShippingLine(a) === normalizeShippingLine(b);
  if (lbl === "equipment size") return normalizeContainerType(a) === normalizeContainerType(b);
  return a === b;
};

const fmtAmt = (amount) =>
  typeof amount === "number"
    ? amount.toLocaleString("en-IN", { minimumFractionDigits: 0 })
    : amount;

const DiffBadge = ({ buying, selling }) => {
  const diff = selling - buying;
  if (diff === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
        <Minus size={10} /> 0
      </span>
    );
  const isPositive = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
        isPositive ? "text-green-600" : "text-red-600"
      }`}
    >
      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isPositive ? "+" : ""}
      {fmtAmt(diff)}
    </span>
  );
};

const ChargeRow = ({ label, buyRow, sellRow }) => (
  <tr className="border-b border-gray-100 hover:bg-gray-50/60 text-[11px]">
    <td className="px-2 py-1 font-medium text-gray-700">{label}</td>
    <td className="px-2 py-1 text-center">{buyRow?.currency || "-"}</td>
    <td className="px-2 py-1 text-right font-mono">
      {buyRow ? fmtAmt(buyRow.amount) : "-"}
    </td>
    <td className="px-2 py-1 text-center">{sellRow?.currency || "-"}</td>
    <td className="px-2 py-1 text-right font-mono">
      {sellRow ? fmtAmt(sellRow.amount) : "-"}
    </td>
    <td className="px-2 py-1 text-center">
      {buyRow && sellRow && buyRow.currency === sellRow.currency ? (
        <DiffBadge buying={buyRow.amount} selling={sellRow.amount} />
      ) : (
        "-"
      )}
    </td>
    <td className="px-2 py-1 text-center text-gray-500">
      {(buyRow || sellRow)?.unit || "-"}
    </td>
  </tr>
);

const SectionHeader = ({ title, color }) => (
  <tr>
    <td
      colSpan={7}
      className={`px-2 py-1.5 text-[11px] font-bold ${color} uppercase tracking-wide`}
    >
      {title}
    </td>
  </tr>
);

/* ------------------------------------------------------------------ */
/*  Short container label (mirrors PreAdvice.jsx helper)               */
/* ------------------------------------------------------------------ */
const shortContainerLabel = (ct) =>
  (ct || "")
    .replace(" Container", "")
    .replace("Standard", "Std")
    .replace("High Cube", "H.C")
    .replace("Reefer", "RF")
    .replace("Open Top", "OT")
    .replace("Flat Rack", "FR")
    .replace("Hazardous", "Haz")
    .trim();

const ComparisonTable = ({ rateFile, quotation, onProceed }) => {
  // Detect multi-container mode
  const equipmentSizes =
    rateFile.equipmentSizes?.length > 0
      ? rateFile.equipmentSizes
      : quotation.equipmentSizes?.length > 0
        ? quotation.equipmentSizes
        : null;
  const isMulti = equipmentSizes && equipmentSizes.length > 1;

  // Build charge maps keyed by NORMALISED charge name
  const mapCharges = (arr) => {
    const m = {};
    (arr || []).forEach((c) => {
      if (c.charges && String(c.charges).trim() !== "") {
        const key = normalizeChargeName(c.charges);
        if (!m[key] || (Number(c.amount) > 0 && !Number(m[key].amount))) {
          m[key] = { ...c, _normKey: key };
        }
      }
    });
    return m;
  };

  const originBuy = mapCharges(rateFile.originCharges);
  const originSell = mapCharges(quotation.originCharges);
  const freightBuy = mapCharges(rateFile.freightCharges);
  const freightSell = mapCharges(quotation.freightCharges);
  const destBuy = mapCharges(rateFile.destinationCharges);
  const destSell = mapCharges(quotation.destinationCharges);

  const allKeys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])];

  /** Pick the best display label from both sides */
  const label = (key, buyMap, sellMap) =>
    displayChargeName(buyMap[key]?.charges, sellMap[key]?.charges);

  // Check if a section has any real data
  const hasOrigin = allKeys(originBuy, originSell).length > 0;
  const hasFreight = allKeys(freightBuy, freightSell).length > 0;
  const hasDestination = allKeys(destBuy, destSell).length > 0;
  const hasDDP = (rateFile.ddpCharges || 0) > 0 || (quotation.ddpCharges || 0) > 0;

  // Auto-compute grand totals
  const sumMap = (m) => Object.values(m).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const initBuying = sumMap(originBuy) + sumMap(freightBuy) + sumMap(destBuy) + (Number(rateFile.ddpCharges) || 0);
  const initSelling = sumMap(originSell) + sumMap(freightSell) + sumMap(destSell) + (Number(quotation.ddpCharges) || 0);
  const [totals, setTotals] = useState({
    buying: initBuying,
    selling: initSelling,
    margin: initSelling - initBuying,
  });

  // Remark — prefilled from Rate Filing or Quotation if present, otherwise
  // an empty editable field so a remark can always be added here.
  const [remark, setRemark] = useState(
    rateFile.remarks || quotation.remarks || "",
  );

  const RemarkSection = () => (
    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50/40">
      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
        Remark
      </label>
      <textarea
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        rows={3}
        placeholder="Add a remark for this Pre-Advice (optional)…"
        className="w-full px-2 py-1.5 text-[11px] border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-400 focus:border-transparent resize-y"
      />
    </div>
  );

  // Info fields comparison
  const buyEquipment = rateFile.equipmentSize || "-";
  const sellEquipment = quotation.equipmentSize || "-";

  const infoRows = [
    { label: "Shipping Line", buy: rateFile.shippingLine || "-", sell: quotation.shippingLine || "-" },
    { label: "Routing", buy: rateFile.routing || "-", sell: quotation.routing || "-" },
    { label: "T/T", buy: rateFile.transitTime || "-", sell: quotation.transitTime || "-" },
    { label: "Equipment Size", buy: buyEquipment, sell: sellEquipment, isEquipment: true, buySizes: rateFile.equipmentSizes, sellSizes: quotation.equipmentSizes },
    { label: "Commodity", buy: rateFile.commodity || "-", sell: quotation.commodity || "-" },
    { label: "POR", buy: rateFile.por || "-", sell: quotation.por || "-" },
    { label: "POL", buy: rateFile.pol || "-", sell: quotation.pol || "-" },
    { label: "POD", buy: rateFile.pod || "-", sell: quotation.pod || "-" },
    { label: "Final Destination", buy: rateFile.finalDestination || rateFile.fdrr || "-", sell: quotation.finalDestination || "-" },
    { label: "Rail Ramp", buy: rateFile.railRamp || "-", sell: quotation.railRamp || "-" },
    { label: "Term", buy: rateFile.term || "-", sell: quotation.term || "-" },
  ];

  // ----------------------------------------------------------------
  // MULTI-CONTAINER: Group charge rows by container label suffix
  // Charges look like: "Ocean Freight [20ft Std]"
  // ----------------------------------------------------------------
  const parseContainerSuffix = (chargeName) => {
    const m = (chargeName || "").match(/\[([^\]]+)\]$/);
    return m ? m[1] : null;
  };

  const groupChargesByContainer = (buyMap, sellMap) => {
    const containers = new Map(); // label → { buy: {}, sell: {} }
    const noSuffix = { buy: {}, sell: {} };

    [...Object.keys(buyMap), ...Object.keys(sellMap)].forEach((normKey) => {
      const displayName =
        buyMap[normKey]?.charges || sellMap[normKey]?.charges || normKey;
      const suffix = parseContainerSuffix(displayName);
      if (suffix) {
        if (!containers.has(suffix)) containers.set(suffix, { buy: {}, sell: {} });
        const grp = containers.get(suffix);
        if (buyMap[normKey]) grp.buy[normKey] = buyMap[normKey];
        if (sellMap[normKey]) grp.sell[normKey] = sellMap[normKey];
      } else {
        if (buyMap[normKey]) noSuffix.buy[normKey] = buyMap[normKey];
        if (sellMap[normKey]) noSuffix.sell[normKey] = sellMap[normKey];
      }
    });

    // Order by equipmentSizes if available
    if (equipmentSizes) {
      const orderedLabels = equipmentSizes.map(shortContainerLabel);
      const ordered = new Map();
      orderedLabels.forEach((lbl) => {
        if (containers.has(lbl)) ordered.set(lbl, containers.get(lbl));
      });
      // add any remaining that weren't in the ordered list
      containers.forEach((v, k) => { if (!ordered.has(k)) ordered.set(k, v); });
      return { containers: ordered, noSuffix };
    }
    return { containers, noSuffix };
  };

  // Shared header + footer bars
  const TableHeader = ({ isMultiMode }) => (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
      <h2 className="text-white font-bold text-sm flex items-center gap-2">
        <ArrowRight size={16} />
        Rate Comparison — Buying vs Selling
        {isMultiMode && (
          <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            Multi-Container
          </span>
        )}
      </h2>
      <button
        onClick={() => onProceed({ buying: Number(totals.buying), selling: Number(totals.selling), margin: Number(totals.margin), remarks: remark })}
        className="bg-white text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
      >
        Proceed to Pre-Advice →
      </button>
    </div>
  );

  const GrandTotalSection = () => (
    <>
      <tr>
        <td colSpan={7} className="px-2 py-1.5 text-[11px] font-bold text-gray-700 bg-gradient-to-r from-indigo-100 to-purple-50 uppercase tracking-wide border-t-2 border-indigo-300">
          Grand Total (Editable)
        </td>
      </tr>
      <tr className="bg-gray-50/90 border-t border-gray-200 text-[11px]">
        <td className="px-2 py-1.5 font-bold text-gray-800 text-[10px] uppercase tracking-wide">Total</td>
        <td className="px-2 py-1 text-center text-gray-400 text-[10px]">—</td>
        <td className="px-1 py-1">
          <input type="text" value={Number(totals.buying) > 0 || totals.buying !== 0 ? Number(totals.buying).toLocaleString("en-IN") : ""}
            onChange={(e) => { const raw = Number(e.target.value.replace(/,/g, "")) || 0; setTotals((t) => ({ buying: raw, selling: t.selling, margin: Number(t.selling) - raw })); }}
            className="w-full px-1.5 py-0.5 border border-blue-300 rounded text-xs text-right font-mono font-bold bg-blue-50 text-blue-900 focus:ring-1 focus:ring-blue-400 focus:outline-none" />
        </td>
        <td className="px-2 py-1 text-center text-gray-400 text-[10px]">—</td>
        <td className="px-1 py-1">
          <input type="text" value={Number(totals.selling) > 0 || totals.selling !== 0 ? Number(totals.selling).toLocaleString("en-IN") : ""}
            onChange={(e) => { const raw = Number(e.target.value.replace(/,/g, "")) || 0; setTotals((t) => ({ buying: t.buying, selling: raw, margin: raw - Number(t.buying) })); }}
            className="w-full px-1.5 py-0.5 border border-green-300 rounded text-xs text-right font-mono font-bold bg-green-50 text-green-900 focus:ring-1 focus:ring-green-400 focus:outline-none" />
        </td>
        <td className="px-1 py-1">
          <input type="text" value={Number(totals.margin).toLocaleString("en-IN")}
            onChange={(e) => { const raw = Number(e.target.value.replace(/,/g, "")) || 0; setTotals((t) => ({ ...t, margin: raw })); }}
            className={`w-full px-1.5 py-0.5 border rounded text-xs text-right font-mono font-bold focus:ring-1 focus:outline-none ${Number(totals.margin) >= 0 ? "border-green-300 bg-green-50 text-green-700 focus:ring-green-400" : "border-red-300 bg-red-50 text-red-700 focus:ring-red-400"}`} />
        </td>
        <td className="px-2 py-1.5 text-center text-[10px] text-gray-400">Overall</td>
      </tr>
    </>
  );

  // ================================================================
  // MULTI-CONTAINER LAYOUT
  // ================================================================
  if (isMulti) {
    const allSections = [
      { title: "Origin Charges", color: "text-orange-700 bg-orange-50/60", buyMap: originBuy, sellMap: originSell, has: hasOrigin },
      { title: "Freight Charges", color: "text-blue-700 bg-blue-50/60", buyMap: freightBuy, sellMap: freightSell, has: hasFreight },
      { title: "Destination Charges", color: "text-emerald-700 bg-emerald-50/60", buyMap: destBuy, sellMap: destSell, has: hasDestination },
    ].filter((s) => s.has);

    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <TableHeader isMultiMode />

        {/* Shipment Info */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-40">Field</th>
                <th colSpan={2} className="px-2 py-1.5 text-center font-semibold text-blue-700 bg-blue-50/50">Rate File (Buying)</th>
                <th colSpan={2} className="px-2 py-1.5 text-center font-semibold text-green-700 bg-green-50/50">Quotation (Selling)</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600">Match</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader title="Shipment Details" color="text-indigo-700 bg-indigo-50/60" />
              {infoRows.map((row) => (
                <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50/60 text-[11px]">
                  <td className="px-2 py-1 font-medium text-gray-700">{row.label}</td>
                  <td colSpan={2} className="px-2 py-1 text-center text-gray-800">
                    {row.isEquipment && row.buySizes?.length > 1 ? (
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {row.buySizes.map((ct) => (
                          <span key={ct} className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[9px] font-medium">{ct.replace(" Container", "")}</span>
                        ))}
                      </div>
                    ) : row.buy}
                  </td>
                  <td colSpan={2} className="px-2 py-1 text-center text-gray-800">
                    {row.isEquipment && row.sellSizes?.length > 1 ? (
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {row.sellSizes.map((ct) => (
                          <span key={ct} className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-[9px] font-medium">{ct.replace(" Container", "")}</span>
                        ))}
                      </div>
                    ) : row.sell}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {flexMatch(row.buy, row.sell, row.label)
                      ? <span className="text-green-600 text-[10px] font-medium">Match</span>
                      : <span className="text-amber-600 text-[10px] font-medium">Differs</span>}
                  </td>
                  <td className="px-2 py-1"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Per-section container-wise tables */}
        {allSections.map((section) => {
          const { containers, noSuffix } = groupChargesByContainer(section.buyMap, section.sellMap);
          return (
            <div key={section.title} className="border-t border-gray-200">
              {/* Section title bar */}
              <div className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wide ${section.color}`}>
                {section.title}
              </div>

              {/* Container columns grid */}
              <div className="overflow-x-auto">
                <div className="flex gap-0 divide-x divide-gray-200 min-w-max">
                  {[...containers.entries()].map(([ctLabel, grp]) => {
                    const allBuyKeys = Object.keys(grp.buy);
                    const allSellKeys = Object.keys(grp.sell);
                    const keys = [...new Set([...allBuyKeys, ...allSellKeys])];

                    const buyTotal = Object.values(grp.buy).reduce((s, c) => s + (Number(c.amount) || 0), 0);
                    const sellTotal = Object.values(grp.sell).reduce((s, c) => s + (Number(c.amount) || 0), 0);
                    const marginTotal = sellTotal - buyTotal;

                    return (
                      <div key={ctLabel} className="flex-1 min-w-[280px]">
                        {/* Container label header */}
                        <div className="bg-gray-100 border-b border-gray-200 px-3 py-1.5 text-center">
                          <span className="text-[11px] font-bold text-gray-700">{ctLabel}</span>
                        </div>

                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100">
                              <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-500 w-32">Charge</th>
                              <th className="px-1 py-1 text-center text-[10px] font-semibold text-blue-600 bg-blue-50/40">Buying</th>
                              <th className="px-1 py-1 text-center text-[10px] font-semibold text-green-600 bg-green-50/40">Selling</th>
                              <th className="px-1 py-1 text-center text-[10px] font-semibold text-purple-600 bg-purple-50/40">Margin</th>
                            </tr>
                          </thead>
                          <tbody>
                            {keys.map((k) => {
                              const br = grp.buy[k];
                              const sr = grp.sell[k];
                              // Strip container suffix from display label
                              const rawLabel = label(k, grp.buy, grp.sell);
                              const cleanLabel = rawLabel.replace(/\s*\[[^\]]+\]$/, "").trim();
                              const diff = (Number(sr?.amount) || 0) - (Number(br?.amount) || 0);
                              const sameCur = br && sr && br.currency === sr.currency;
                              return (
                                <tr key={k} className="border-b border-gray-100 hover:bg-gray-50/60">
                                  <td className="px-2 py-1 font-medium text-gray-700 text-[10px]">{cleanLabel}</td>
                                  <td className="px-1 py-1 text-right font-mono text-blue-800 bg-blue-50/30 text-[10px]">
                                    {br ? `${br.currency} ${fmtAmt(br.amount)}` : "—"}
                                  </td>
                                  <td className="px-1 py-1 text-right font-mono text-green-800 bg-green-50/30 text-[10px]">
                                    {sr ? `${sr.currency} ${fmtAmt(sr.amount)}` : "—"}
                                  </td>
                                  <td className="px-1 py-1 text-center bg-purple-50/20 text-[10px]">
                                    {sameCur ? (
                                      <span className={`inline-flex items-center gap-0.5 font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-400"}`}>
                                        {diff > 0 ? <TrendingUp size={9} /> : diff < 0 ? <TrendingDown size={9} /> : <Minus size={9} />}
                                        {diff > 0 ? "+" : ""}{fmtAmt(diff)}
                                      </span>
                                    ) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {/* Container sub-total */}
                          <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-50/90 font-bold text-[10px]">
                              <td className="px-2 py-1.5 text-gray-700 uppercase tracking-wide">Sub-total</td>
                              <td className="px-1 py-1 text-right font-mono text-blue-800 bg-blue-50/30">
                                {buyTotal > 0 ? buyTotal.toLocaleString("en-IN") : "—"}
                              </td>
                              <td className="px-1 py-1 text-right font-mono text-green-800 bg-green-50/30">
                                {sellTotal > 0 ? sellTotal.toLocaleString("en-IN") : "—"}
                              </td>
                              <td className={`px-1 py-1 text-right font-mono bg-purple-50/20 ${marginTotal >= 0 ? "text-green-700" : "text-red-700"}`}>
                                {marginTotal !== 0 ? (marginTotal > 0 ? "+" : "") + marginTotal.toLocaleString("en-IN") : "—"}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })}

                  {/* Charges with no container suffix (shared/misc) */}
                  {(Object.keys(noSuffix.buy).length > 0 || Object.keys(noSuffix.sell).length > 0) && (
                    <div className="flex-1 min-w-[280px]">
                      <div className="bg-gray-100 border-b border-gray-200 px-3 py-1.5 text-center">
                        <span className="text-[11px] font-bold text-gray-700">Common</span>
                      </div>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-500 w-32">Charge</th>
                            <th className="px-1 py-1 text-center text-[10px] font-semibold text-blue-600 bg-blue-50/40">Buying</th>
                            <th className="px-1 py-1 text-center text-[10px] font-semibold text-green-600 bg-green-50/40">Selling</th>
                            <th className="px-1 py-1 text-center text-[10px] font-semibold text-purple-600 bg-purple-50/40">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allKeys(noSuffix.buy, noSuffix.sell).map((k) => {
                            const br = noSuffix.buy[k];
                            const sr = noSuffix.sell[k];
                            const diff = (Number(sr?.amount) || 0) - (Number(br?.amount) || 0);
                            const sameCur = br && sr && br.currency === sr.currency;
                            return (
                              <tr key={k} className="border-b border-gray-100 hover:bg-gray-50/60">
                                <td className="px-2 py-1 font-medium text-gray-700 text-[10px]">{label(k, noSuffix.buy, noSuffix.sell)}</td>
                                <td className="px-1 py-1 text-right font-mono text-blue-800 bg-blue-50/30 text-[10px]">
                                  {br ? `${br.currency} ${fmtAmt(br.amount)}` : "—"}
                                </td>
                                <td className="px-1 py-1 text-right font-mono text-green-800 bg-green-50/30 text-[10px]">
                                  {sr ? `${sr.currency} ${fmtAmt(sr.amount)}` : "—"}
                                </td>
                                <td className="px-1 py-1 text-center bg-purple-50/20 text-[10px]">
                                  {sameCur ? (
                                    <span className={`inline-flex items-center gap-0.5 font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-400"}`}>
                                      {diff > 0 ? <TrendingUp size={9} /> : diff < 0 ? <TrendingDown size={9} /> : <Minus size={9} />}
                                      {diff > 0 ? "+" : ""}{fmtAmt(diff)}
                                    </span>
                                  ) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* DDP for multi-container */}
        {hasDDP && (
          <div className="border-t border-gray-200">
            <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-rose-700 bg-rose-50/60">DDP Charges</div>
            <div className="px-4 py-2 text-[11px] flex gap-6 items-center">
              <span className="text-blue-700 font-mono font-bold">Buying: USD {fmtAmt(rateFile.ddpCharges || 0)}</span>
              <span className="text-green-700 font-mono font-bold">Selling: USD {fmtAmt(quotation.ddpCharges || 0)}</span>
              <DiffBadge buying={rateFile.ddpCharges || 0} selling={quotation.ddpCharges || 0} />
              <span className="text-gray-400 text-[10px]">Lump Sum</span>
            </div>
          </div>
        )}

        {!hasOrigin && !hasFreight && !hasDestination && !hasDDP && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">No charge data available.</div>
        )}

        {/* Grand Total */}
        <div className="border-t border-gray-200 overflow-x-auto">
          <table className="w-full text-[11px]">
            <tbody>
              <GrandTotalSection />
            </tbody>
          </table>
        </div>

        {/* Remark */}
        <RemarkSection />
      </div>
    );
  }

  // ================================================================
  // SINGLE-CONTAINER LAYOUT (unchanged)
  // ================================================================
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <TableHeader isMultiMode={false} />

      {/* Shipment Info Comparison */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-40">Field</th>
              <th colSpan={2} className="px-2 py-1.5 text-center font-semibold text-blue-700 bg-blue-50/50">Rate File (Buying)</th>
              <th colSpan={2} className="px-2 py-1.5 text-center font-semibold text-green-700 bg-green-50/50">Quotation (Selling)</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-600">Margin</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-600">Unit</th>
            </tr>
          </thead>
          <tbody>
            <SectionHeader title="Shipment Details" color="text-indigo-700 bg-indigo-50/60" />
            {infoRows.map((row) => (
              <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50/60 text-[11px]">
                <td className="px-2 py-1 font-medium text-gray-700">{row.label}</td>
                <td colSpan={2} className="px-2 py-1 text-center text-gray-800">{row.buy}</td>
                <td colSpan={2} className="px-2 py-1 text-center text-gray-800">{row.sell}</td>
                <td className="px-2 py-1 text-center">
                  {flexMatch(row.buy, row.sell, row.label)
                    ? <span className="text-green-600 text-[10px] font-medium">Match</span>
                    : <span className="text-amber-600 text-[10px] font-medium">Differs</span>}
                </td>
                <td className="px-2 py-1"></td>
              </tr>
            ))}

            {hasOrigin && (
              <>
                <SectionHeader title="Origin Charges" color="text-orange-700 bg-orange-50/60" />
                <tr className="bg-gray-50/40 text-[10px] font-semibold text-gray-500 border-b">
                  <td className="px-2 py-1">Charge Name</td><td className="px-2 py-1 text-center">Cur</td>
                  <td className="px-2 py-1 text-right">Buying</td><td className="px-2 py-1 text-center">Cur</td>
                  <td className="px-2 py-1 text-right">Selling</td><td className="px-2 py-1 text-center">Margin</td>
                  <td className="px-2 py-1 text-center">Unit</td>
                </tr>
                {allKeys(originBuy, originSell).map((k) => (
                  <ChargeRow key={`o-${k}`} label={label(k, originBuy, originSell)} buyRow={originBuy[k]} sellRow={originSell[k]} />
                ))}
              </>
            )}

            {hasFreight && (
              <>
                <SectionHeader title="Freight Charges" color="text-blue-700 bg-blue-50/60" />
                <tr className="bg-gray-50/40 text-[10px] font-semibold text-gray-500 border-b">
                  <td className="px-2 py-1">Charge Name</td><td className="px-2 py-1 text-center">Cur</td>
                  <td className="px-2 py-1 text-right">Buying</td><td className="px-2 py-1 text-center">Cur</td>
                  <td className="px-2 py-1 text-right">Selling</td><td className="px-2 py-1 text-center">Margin</td>
                  <td className="px-2 py-1 text-center">Unit</td>
                </tr>
                {allKeys(freightBuy, freightSell).map((k) => (
                  <ChargeRow key={`f-${k}`} label={label(k, freightBuy, freightSell)} buyRow={freightBuy[k]} sellRow={freightSell[k]} />
                ))}
              </>
            )}

            {hasDestination && (
              <>
                <SectionHeader title="Destination Charges" color="text-emerald-700 bg-emerald-50/60" />
                <tr className="bg-gray-50/40 text-[10px] font-semibold text-gray-500 border-b">
                  <td className="px-2 py-1">Charge Name</td><td className="px-2 py-1 text-center">Cur</td>
                  <td className="px-2 py-1 text-right">Buying</td><td className="px-2 py-1 text-center">Cur</td>
                  <td className="px-2 py-1 text-right">Selling</td><td className="px-2 py-1 text-center">Margin</td>
                  <td className="px-2 py-1 text-center">Unit</td>
                </tr>
                {allKeys(destBuy, destSell).map((k) => (
                  <ChargeRow key={`d-${k}`} label={label(k, destBuy, destSell)} buyRow={destBuy[k]} sellRow={destSell[k]} />
                ))}
              </>
            )}

            {hasDDP && (
              <>
                <SectionHeader title="DDP Charges" color="text-rose-700 bg-rose-50/60" />
                <tr className="border-b border-gray-100 hover:bg-gray-50/60 text-[11px]">
                  <td className="px-2 py-1 font-medium text-gray-700">DDP Charges</td>
                  <td className="px-2 py-1 text-center">{(rateFile.ddpCharges || 0) > 0 ? "USD" : "-"}</td>
                  <td className="px-2 py-1 text-right font-mono">{fmtAmt(rateFile.ddpCharges || 0)}</td>
                  <td className="px-2 py-1 text-center">{(quotation.ddpCharges || 0) > 0 ? "USD" : "-"}</td>
                  <td className="px-2 py-1 text-right font-mono">{fmtAmt(quotation.ddpCharges || 0)}</td>
                  <td className="px-2 py-1 text-center"><DiffBadge buying={rateFile.ddpCharges || 0} selling={quotation.ddpCharges || 0} /></td>
                  <td className="px-2 py-1 text-center text-gray-500">Lump Sum</td>
                </tr>
              </>
            )}

            {!hasOrigin && !hasFreight && !hasDestination && !hasDDP && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">
                  No charge data available in either buying or selling rate.
                </td>
              </tr>
            )}

            <GrandTotalSection />
          </tbody>
        </table>
      </div>

      {/* Remark */}
      <RemarkSection />
    </div>
  );
};

export default ComparisonTable;
