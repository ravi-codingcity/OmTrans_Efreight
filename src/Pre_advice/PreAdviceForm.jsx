import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  FileDown,
  Save,
  ChevronDown,
  ChevronRight,
  User,
  Ship,
  MapPin,
  Package,
  DollarSign,
  MessageSquare,
  Phone,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tiny helpers                                                       */
/* ------------------------------------------------------------------ */
const SectionToggle = ({ title, icon: Icon, color, open, toggle }) => (
  <button
    type="button"
    onClick={toggle}
    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold tracking-wide uppercase ${color} transition-colors`}
  >
    <Icon size={14} />
    <span className="flex-1 text-left">{title}</span>
    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
  </button>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  readOnly = false,
  rows,
  placeholder,
}) => (
  <div className={`flex flex-col gap-0.5 ${className}`}>
    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
      {label}
    </label>
    {rows ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        rows={rows}
        placeholder={placeholder}
        className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 resize-none disabled:bg-gray-50"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 disabled:bg-gray-50"
      />
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Editable charge table                                               */
/* ------------------------------------------------------------------ */
const ChargeTable = ({ charges, onChange, onAdd, onRemove, label, accentColor }) => {
  const currencyOptions = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY"];
  const unitOptions = [
    "Per BL",
    "Per Container",
    "Per Shipment",
    "Per CBM",
    "Per KG",
    "Lump Sum",
  ];

  const updateRow = (idx, field, val) => {
    const updated = charges.map((c, i) =>
      i === idx ? { ...c, [field]: field === "amount" ? (val === "" ? "" : Number(val)) : val } : c,
    );
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${accentColor}`}>
          {label}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Plus size={12} /> Add Row
        </button>
      </div>
      <table className="w-full text-[11px] border border-gray-200 rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-50 text-gray-600">
            <th className="px-2 py-1 text-left font-semibold w-[30%]">Charge</th>
            <th className="px-2 py-1 text-center font-semibold w-[14%]">Currency</th>
            <th className="px-2 py-1 text-right font-semibold w-[16%]">B/R</th>
            <th className="px-2 py-1 text-right font-semibold w-[16%]">S/R</th>
            <th className="px-2 py-1 text-center font-semibold w-[18%]">Unit</th>
            <th className="px-2 py-1 w-[6%]"></th>
          </tr>
        </thead>
        <tbody>
          {charges.map((c, idx) => (
            <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50/50">
              <td className="px-1 py-0.5">
                <input
                  value={c.charges}
                  onChange={(e) => updateRow(idx, "charges", e.target.value)}
                  className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-400"
                  placeholder="Charge name"
                />
              </td>
              <td className="px-1 py-0.5">
                <select
                  value={c.currency}
                  onChange={(e) => updateRow(idx, "currency", e.target.value)}
                  className="w-full px-1 py-0.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-400"
                >
                  {currencyOptions.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </td>
              <td className="px-1 py-0.5">
                <input
                  type="number"
                  value={c.buyingAmount ?? ""}
                  onChange={(e) => updateRow(idx, "buyingAmount", e.target.value)}
                  className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs text-right font-mono focus:ring-1 focus:ring-blue-400"
                  placeholder="0"
                />
              </td>
              <td className="px-1 py-0.5">
                <input
                  type="number"
                  value={c.sellingAmount ?? ""}
                  onChange={(e) => updateRow(idx, "sellingAmount", e.target.value)}
                  className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs text-right font-mono focus:ring-1 focus:ring-green-400"
                  placeholder="0"
                />
              </td>
              <td className="px-1 py-0.5">
                <select
                  value={c.unit}
                  onChange={(e) => updateRow(idx, "unit", e.target.value)}
                  className="w-full px-1 py-0.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-400"
                >
                  {unitOptions.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </td>
              <td className="px-1 py-0.5 text-center">
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
          {charges.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-2 text-center text-gray-400 text-[10px]">
                No charges added. Click "Add Row" to add.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Charge-name normaliser (same logic as ComparisonTable / PreAdvice) */
/* ------------------------------------------------------------------ */
const normalizeChargeName = (name) => {
  let s = (name || "").trim().toLowerCase();
  s = s.replace(/\s+(charges|charge|fees|fee)$/i, "").trim();
  const aliases = {
    "thc": "thc", "terminal handling": "thc", "terminal handling charge": "thc",
    "bl fee": "bl fee", "bl fees": "bl fee", "bl": "bl fee", "b/l fee": "bl fee", "b/l": "bl fee",
    "muc": "muc",
    "ocean freight": "ocean freight", "ocean": "ocean freight", "freight": "ocean freight",
    "toll": "toll",
    "acd": "acd/ens/afr", "acd/ens/afr": "acd/ens/afr", "ens": "acd/ens/afr", "afr": "acd/ens/afr", "acd charge": "acd/ens/afr",
  };
  return aliases[s] || s;
};

/** Pick the longer / more descriptive charge name for display */
const pickDisplayName = (a, b) => {
  const sa = (a || "").trim();
  const sb = (b || "").trim();
  if (!sa) return sb || "";
  if (!sb) return sa || "";
  // Prefer specific ACD/ENS/AFR type over generic combined label
  const generic = /^acd\/ens\/afr$/i;
  if (generic.test(sa) && !generic.test(sb)) return sb;
  if (generic.test(sb) && !generic.test(sa)) return sa;
  return sa.length >= sb.length ? sa : sb;
};

/* ------------------------------------------------------------------ */
/*  Merge helper: combine buying & selling arrays into unified rows     */
/*  Uses normalised keys so "THC" and "THC Charges" become one row     */
/* ------------------------------------------------------------------ */
const mergeCharges = (buyArr, sellArr) => {
  const map = {};
  (buyArr || []).forEach((c) => {
    const key = normalizeChargeName(c.charges);
    map[key] = {
      charges: c.charges,
      currency: c.currency,
      buyingAmount: c.amount,
      sellingAmount: "",
      unit: c.unit,
    };
  });
  (sellArr || []).forEach((c) => {
    const key = normalizeChargeName(c.charges);
    if (map[key]) {
      map[key].sellingAmount = c.amount;
      // keep the more descriptive display name
      map[key].charges = pickDisplayName(map[key].charges, c.charges);
    } else {
      map[key] = {
        charges: c.charges,
        currency: c.currency,
        buyingAmount: "",
        sellingAmount: c.amount,
        unit: c.unit,
      };
    }
  });
  return Object.values(map);
};

/* ------------------------------------------------------------------ */
/*  Multi-container helpers                                            */
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

const parseContainerSuffix = (chargeName) => {
  const m = (chargeName || "").match(/\[([^\]]+)\]$/);
  return m ? m[1] : null;
};

const groupChargesByContainerWithIdx = (charges) => {
  const groups = new Map();
  const common = [];
  (charges || []).forEach((row, idx) => {
    const suffix = parseContainerSuffix(row.charges);
    if (suffix) {
      if (!groups.has(suffix)) groups.set(suffix, []);
      groups.get(suffix).push({ ...row, _cleanName: row.charges.replace(/\s*\[[^\]]+\]$/, "").trim(), _origIdx: idx });
    } else {
      common.push({ ...row, _origIdx: idx });
    }
  });
  return { groups, common };
};

/* ------------------------------------------------------------------ */
/*  Multi-container charge table (container-wise side-by-side cards)  */
/* ------------------------------------------------------------------ */
const MultiContainerChargeTable = ({ charges, onChange, onAdd, onRemove, label, accentColor, equipmentSizes }) => {
  const currencyOptions = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY"];
  const unitOptions = ["Per BL", "Per Container", "Per Shipment", "Per CBM", "Per KG", "Lump Sum"];

  const updateField = (origIdx, field, val) => {
    onChange(
      charges.map((c, i) =>
        i === origIdx
          ? { ...c, [field]: (field === "buyingAmount" || field === "sellingAmount") ? (val === "" ? "" : Number(val)) : val }
          : c,
      ),
    );
  };

  const { groups, common } = groupChargesByContainerWithIdx(charges);
  const allGroupLabels = [...groups.keys()];
  const orderedLabels =
    equipmentSizes?.length > 0
      ? [
          ...equipmentSizes.map(shortContainerLabel).filter((l) => groups.has(l)),
          ...allGroupLabels.filter((l) => !equipmentSizes.map(shortContainerLabel).includes(l)),
        ]
      : allGroupLabels;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${accentColor}`}>{label}</span>
        <button type="button" onClick={onAdd} className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium">
          <Plus size={10} /> Add Row
        </button>
      </div>

      {/* Per-container cards */}
      {orderedLabels.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-1 min-w-max">
            {orderedLabels.map((ctLabel) => {
              const rows = groups.get(ctLabel) || [];
              return (
                <div key={ctLabel} className="flex-1 min-w-[210px] border border-gray-200 rounded overflow-hidden">
                  <div className="bg-gray-100 border-b border-gray-200 px-2 py-1 text-center">
                    <span className="text-[10px] font-bold text-gray-700">{ctLabel}</span>
                  </div>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-2 py-1 text-left font-semibold text-gray-500">Charge</th>
                        <th className="px-1 py-1 text-right font-semibold text-blue-600 bg-blue-50/40">B/R</th>
                        <th className="px-1 py-1 text-right font-semibold text-green-600 bg-green-50/40">S/R</th>
                        <th className="w-5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row._origIdx} className="border-t border-gray-100 hover:bg-gray-50/50">
                          <td className="px-2 py-1 font-medium text-gray-700 text-[10px]">
                            {row._cleanName}
                            <div className="text-[9px] text-gray-400">{charges[row._origIdx]?.currency}</div>
                          </td>
                          <td className="px-1 py-0.5 bg-blue-50/20">
                            <input
                              type="number"
                              value={charges[row._origIdx]?.buyingAmount ?? ""}
                              onChange={(e) => updateField(row._origIdx, "buyingAmount", e.target.value)}
                              className="w-full px-1 py-0.5 border border-blue-200 rounded text-[10px] text-right font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-1 py-0.5 bg-green-50/20">
                            <input
                              type="number"
                              value={charges[row._origIdx]?.sellingAmount ?? ""}
                              onChange={(e) => updateField(row._origIdx, "sellingAmount", e.target.value)}
                              className="w-full px-1 py-0.5 border border-green-200 rounded text-[10px] text-right font-mono focus:ring-1 focus:ring-green-400 focus:outline-none"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-1 py-0.5 text-center">
                            <button type="button" onClick={() => onRemove(row._origIdx)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={10} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr><td colSpan={4} className="px-2 py-2 text-center text-gray-400 text-[9px]">No charges</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Common / unsuffixed charges */}
      {(common.length > 0 || orderedLabels.length === 0) && (
        <div className={`${orderedLabels.length > 0 ? "mt-2" : ""} border border-gray-200 rounded overflow-hidden`}>
          {orderedLabels.length > 0 && (
            <div className="bg-gray-100 border-b border-gray-200 px-2 py-1 text-center">
              <span className="text-[10px] font-bold text-gray-700">Common</span>
            </div>
          )}
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-2 py-1 text-left font-semibold text-gray-500 w-[28%]">Charge</th>
                <th className="px-1 py-1 text-center font-semibold text-gray-500 w-[12%]">Cur</th>
                <th className="px-1 py-1 text-right font-semibold text-blue-600 w-[18%]">B/R</th>
                <th className="px-1 py-1 text-right font-semibold text-green-600 w-[18%]">S/R</th>
                <th className="px-1 py-1 text-center font-semibold text-gray-500 w-[16%]">Unit</th>
                <th className="w-5"></th>
              </tr>
            </thead>
            <tbody>
              {common.map((row) => (
                <tr key={row._origIdx} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-1 py-0.5">
                    <input value={charges[row._origIdx]?.charges || ""} onChange={(e) => updateField(row._origIdx, "charges", e.target.value)}
                      className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-[10px] focus:ring-1 focus:ring-indigo-400" placeholder="Charge name" />
                  </td>
                  <td className="px-1 py-0.5">
                    <select value={charges[row._origIdx]?.currency || "USD"} onChange={(e) => updateField(row._origIdx, "currency", e.target.value)}
                      className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] focus:ring-1 focus:ring-indigo-400">
                      {currencyOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-0.5">
                    <input type="number" value={charges[row._origIdx]?.buyingAmount ?? ""} onChange={(e) => updateField(row._origIdx, "buyingAmount", e.target.value)}
                      className="w-full px-1.5 py-0.5 border border-blue-200 rounded text-[10px] text-right font-mono focus:ring-1 focus:ring-blue-400" placeholder="0" />
                  </td>
                  <td className="px-1 py-0.5">
                    <input type="number" value={charges[row._origIdx]?.sellingAmount ?? ""} onChange={(e) => updateField(row._origIdx, "sellingAmount", e.target.value)}
                      className="w-full px-1.5 py-0.5 border border-green-200 rounded text-[10px] text-right font-mono focus:ring-1 focus:ring-green-400" placeholder="0" />
                  </td>
                  <td className="px-1 py-0.5">
                    <select value={charges[row._origIdx]?.unit || "Per Container"} onChange={(e) => updateField(row._origIdx, "unit", e.target.value)}
                      className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] focus:ring-1 focus:ring-indigo-400">
                      {unitOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-0.5 text-center">
                    <button type="button" onClick={() => onRemove(row._origIdx)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={10} />
                    </button>
                  </td>
                </tr>
              ))}
              {common.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-2 text-center text-gray-400 text-[9px]">No common charges. Click "Add Row" to add.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ================================================================== */
/*  PreAdviceForm                                                      */
/* ================================================================== */
const PreAdviceForm = ({ rateFile, quotation, onGeneratePDF, editMode, onSaveEdit, initialTotals }) => {
  // ----- Collapsible Sections -----
  const [sections, setSections] = useState({
    customer: true,
    consignee: true,
    shipment: true,
    route: true,
    origin: true,
    freight: true,
    destination: true,
    ddp: true,
    totals: true,
    remarks: true,
    agent: true,
  });
  const toggle = (key) =>
    setSections((p) => ({ ...p, [key]: !p[key] }));

  // ----- Editable state derived from data -----
  const resolvedEquipmentSizes =
    quotation.equipmentSizes?.length > 0
      ? quotation.equipmentSizes
      : rateFile.equipmentSizes?.length > 0
        ? rateFile.equipmentSizes
        : [];
  const isMultiContainer = resolvedEquipmentSizes.length > 1;
  const [data, setData] = useState({
    jobNo: quotation.quotationNumber || "",
    shippingLine: quotation.shippingLine || rateFile.shippingLine || "",
    bookedBy: quotation.bookedBy || "",
    routing: quotation.routing || rateFile.routing || "",
    transitTime: quotation.transitTime || rateFile.transitTime || "",
    equipmentSize: quotation.equipmentSize || rateFile.equipmentSize || "",
    commodity: quotation.commodity || rateFile.commodity || "",
    cargoWeight: quotation.cargoWeight || "",
    forwarding: quotation.forwarding || "",
    cha: quotation.cha || "",
    por: quotation.por || rateFile.por || "",
    transportation: quotation.transportation || "",
    pol: quotation.pol || rateFile.pol || "",
    pod: quotation.pod || rateFile.pod || "",
    finalDestination: quotation.finalDestination || rateFile.finalDestination || "",
    term: quotation.term || rateFile.term || "",
    // Customer
    customerName: quotation.customer?.name || "",
    customerAddress: quotation.customer?.address || "",
    // Consignee
    consigneeName: quotation.consignee?.name || "",
    consigneeAddress: quotation.consignee?.address || "",
    consigneeContact: quotation.consignee?.contactPerson || "",
    consigneePhone: quotation.consignee?.phone || "",
    consigneeEmail: quotation.consignee?.email || "",
    // DDP
    ddpBuying: rateFile.ddpCharges ?? 0,
    ddpSelling: quotation.ddpCharges ?? 0,
    // Totals
    totalBuying: initialTotals?.buying ?? 0,
    totalSelling: initialTotals?.selling ?? 0,
    totalMargin: initialTotals?.margin ?? 0,
    // Remarks & agent — prefilled from any remark carried from Quotation or
    // Rate Filing; fully editable here on the Preview & Download page.
    remarks: quotation.remarks ?? rateFile.remarks ?? "",
    // Shipping line contact
    slContactName: rateFile.shippingLineContact?.name || "",
    slContactEmail: rateFile.shippingLineContact?.email || "",
    slContactPhone: rateFile.shippingLineContact?.phone || "",
    slContactDesignation: rateFile.shippingLineContact?.designation || "",
  });

  const set = (field) => (val) =>
    setData((p) => ({ ...p, [field]: val }));

  // ----- Charges (merged buying + selling) — only include if data exists -----
  const mergedOrigin = mergeCharges(rateFile.originCharges, quotation.originCharges);
  const mergedFreight = mergeCharges(rateFile.freightCharges, quotation.freightCharges);
  const mergedDestination = mergeCharges(rateFile.destinationCharges, quotation.destinationCharges);

  const [originCharges, setOriginCharges] = useState(mergedOrigin);
  const [freightCharges, setFreightCharges] = useState(mergedFreight);
  const [destinationCharges, setDestinationCharges] = useState(mergedDestination);

  // Keep Rate Totals (and Margin) in sync with the charge rows + DDP so that
  // editing any Buying/Selling amount recalculates margins in real time.
  // These derived values are what gets saved, PDF-generated and viewed.
  useEffect(() => {
    const sumBuy = (arr) =>
      (arr || []).reduce((s, c) => s + (Number(c.buyingAmount) || 0), 0);
    const sumSell = (arr) =>
      (arr || []).reduce((s, c) => s + (Number(c.sellingAmount) || 0), 0);

    const totalBuying =
      sumBuy(originCharges) +
      sumBuy(freightCharges) +
      sumBuy(destinationCharges) +
      (Number(data.ddpBuying) || 0);
    const totalSelling =
      sumSell(originCharges) +
      sumSell(freightCharges) +
      sumSell(destinationCharges) +
      (Number(data.ddpSelling) || 0);
    const totalMargin = totalSelling - totalBuying;

    setData((p) => {
      if (
        Number(p.totalBuying) === totalBuying &&
        Number(p.totalSelling) === totalSelling &&
        Number(p.totalMargin) === totalMargin
      ) {
        return p; // no change — avoid re-render loop
      }
      return { ...p, totalBuying, totalSelling, totalMargin };
    });
  }, [
    originCharges,
    freightCharges,
    destinationCharges,
    data.ddpBuying,
    data.ddpSelling,
  ]);

  // Check if sections have data
  const hasOriginCharges = originCharges.length > 0;
  const hasFreightCharges = freightCharges.length > 0;
  const hasDestinationCharges = destinationCharges.length > 0;
  const hasDDP = Number(data.ddpBuying) > 0 || Number(data.ddpSelling) > 0;
  const hasConsignee = !!(data.consigneeName || data.consigneeAddress || data.consigneeContact || data.consigneePhone || data.consigneeEmail);
  const hasSlContact = !!(data.slContactName || data.slContactEmail || data.slContactPhone || data.slContactDesignation);

  const addCharge = (setter) => () =>
    setter((p) => [
      ...p,
      { charges: "", currency: "USD", buyingAmount: "", sellingAmount: "", unit: "Per Container" },
    ]);
  const removeCharge = (setter) => (idx) =>
    setter((p) => p.filter((_, i) => i !== idx));

  // ----- PDF handler -----
  const handleDownloadPDF = () => {
    onGeneratePDF({
      ...data,
      equipmentSizes: resolvedEquipmentSizes,
      originCharges,
      freightCharges,
      destinationCharges,
    });
  };

  // ----- Save edit handler -----
  const handleSaveEdit = () => {
    if (onSaveEdit) {
      onSaveEdit({
        ...data,
        equipmentSizes: resolvedEquipmentSizes,
        originCharges,
        freightCharges,
        destinationCharges,
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-lg">
        <div>
          <h2 className="text-sm font-bold">
            {editMode ? "Edit Pre-Advice" : "Pre-Advice Document"}
          </h2>
          <p className="text-[10px] text-indigo-200">
            {editMode
              ? "Modify pre-advice details and save changes"
              : "Review and edit all fields before downloading PDF"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <button
              type="button"
              onClick={handleSaveEdit}
              className="flex items-center gap-1.5 bg-white text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
            >
              <Save size={14} />
              Save Changes
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 bg-white text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
            >
              <FileDown size={14} />
              Download PDF
            </button>
          )}
        </div>
      </div>

      {/* ====== CUSTOMER DETAILS ====== */}
      <SectionToggle
        title="Customer Details"
        icon={User}
        color="text-blue-700 bg-blue-50 hover:bg-blue-100"
        open={sections.customer}
        toggle={() => toggle("customer")}
      />
      {sections.customer && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 px-1">
          <Field label="Customer Name" value={data.customerName} onChange={set("customerName")} />
          <Field
            label="Address"
            value={data.customerAddress}
            onChange={set("customerAddress")}
            className="col-span-2 md:col-span-3"
            rows={2}
          />
        </div>
      )}

      {/* ====== CONSIGNEE DETAILS ====== */}
      {hasConsignee && (
        <>
          <SectionToggle
            title="Consignee Details"
            icon={User}
            color="text-teal-700 bg-teal-50 hover:bg-teal-100"
            open={sections.consignee}
            toggle={() => toggle("consignee")}
          />
          {sections.consignee && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 px-1">
              <Field label="Consignee Name" value={data.consigneeName} onChange={set("consigneeName")} />
              <Field
                label="Address"
                value={data.consigneeAddress}
                onChange={set("consigneeAddress")}
                className="col-span-2 md:col-span-3"
                rows={2}
              />
            </div>
          )}
        </>
      )}

      {/* ====== SHIPMENT DETAILS ====== */}
      <SectionToggle
        title="Shipment Details"
        icon={Package}
        color="text-purple-700 bg-purple-50 hover:bg-purple-100"
        open={sections.shipment}
        toggle={() => toggle("shipment")}
      />
      {sections.shipment && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-1">
          <Field label="Job No (Quotation No.)" value={data.jobNo} onChange={set("jobNo")} />
          <Field label="Shipping Line" value={data.shippingLine} onChange={set("shippingLine")} />
          <Field label="Booked By" value={data.bookedBy} onChange={set("bookedBy")} />
          <Field label="Commodity" value={data.commodity} onChange={set("commodity")} />
          <Field label="Cargo Weight" value={data.cargoWeight} onChange={set("cargoWeight")} />
          <Field label="Equipment Size" value={data.equipmentSize} onChange={set("equipmentSize")} />
          <Field label="T/T" value={data.transitTime} onChange={set("transitTime")} />
          <Field label="Term (CY/CY / DDP / DDU)" value={data.term} onChange={set("term")} />
        </div>
      )}

      {/* ====== ROUTE INFORMATION ====== */}
      <SectionToggle
        title="Route Information"
        icon={MapPin}
        color="text-amber-700 bg-amber-50 hover:bg-amber-100"
        open={sections.route}
        toggle={() => toggle("route")}
      />
      {sections.route && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-1">
          <Field label="POR" value={data.por} onChange={set("por")} />
          <Field label="POL" value={data.pol} onChange={set("pol")} />
          <Field label="POD" value={data.pod} onChange={set("pod")} />
          <Field label="Final Destination" value={data.finalDestination} onChange={set("finalDestination")} />
          <Field label="Routing" value={data.routing} onChange={set("routing")} className="col-span-2 md:col-span-4" />
        </div>
      )}

      {/* ====== ORIGIN CHARGES ====== */}
      {hasOriginCharges && (
        <>
          <SectionToggle
            title="Origin Charges"
            icon={DollarSign}
            color="text-orange-700 bg-orange-50 hover:bg-orange-100"
            open={sections.origin}
            toggle={() => toggle("origin")}
          />
          {sections.origin && (
            <div className="px-1">
              {isMultiContainer ? (
                <MultiContainerChargeTable
                  charges={originCharges}
                  onChange={setOriginCharges}
                  onAdd={addCharge(setOriginCharges)}
                  onRemove={removeCharge(setOriginCharges)}
                  label="Origin Charges"
                  accentColor="text-orange-600"
                  equipmentSizes={resolvedEquipmentSizes}
                />
              ) : (
                <ChargeTable
                  charges={originCharges}
                  onChange={setOriginCharges}
                  onAdd={addCharge(setOriginCharges)}
                  onRemove={removeCharge(setOriginCharges)}
                  label="Origin Charges"
                  accentColor="text-orange-600"
                />
              )}
            </div>
          )}
        </>
      )}

      {/* ====== FREIGHT CHARGES ====== */}
      {hasFreightCharges && (
        <>
          <SectionToggle
            title="Freight Charges"
            icon={Ship}
            color="text-blue-700 bg-blue-50 hover:bg-blue-100"
            open={sections.freight}
            toggle={() => toggle("freight")}
          />
          {sections.freight && (
            <div className="px-1">
              {isMultiContainer ? (
                <MultiContainerChargeTable
                  charges={freightCharges}
                  onChange={setFreightCharges}
                  onAdd={addCharge(setFreightCharges)}
                  onRemove={removeCharge(setFreightCharges)}
                  label="Freight Charges"
                  accentColor="text-blue-600"
                  equipmentSizes={resolvedEquipmentSizes}
                />
              ) : (
                <ChargeTable
                  charges={freightCharges}
                  onChange={setFreightCharges}
                  onAdd={addCharge(setFreightCharges)}
                  onRemove={removeCharge(setFreightCharges)}
                  label="Freight Charges"
                  accentColor="text-blue-600"
                />
              )}
            </div>
          )}
        </>
      )}

      {/* ====== DESTINATION CHARGES ====== */}
      {hasDestinationCharges && (
        <>
          <SectionToggle
            title="Destination Charges"
            icon={MapPin}
            color="text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            open={sections.destination}
            toggle={() => toggle("destination")}
          />
          {sections.destination && (
            <div className="px-1">
              {isMultiContainer ? (
                <MultiContainerChargeTable
                  charges={destinationCharges}
                  onChange={setDestinationCharges}
                  onAdd={addCharge(setDestinationCharges)}
                  onRemove={removeCharge(setDestinationCharges)}
                  label="Destination Charges"
                  accentColor="text-emerald-600"
                  equipmentSizes={resolvedEquipmentSizes}
                />
              ) : (
                <ChargeTable
                  charges={destinationCharges}
                  onChange={setDestinationCharges}
                  onAdd={addCharge(setDestinationCharges)}
                  onRemove={removeCharge(setDestinationCharges)}
                  label="Destination Charges"
                  accentColor="text-emerald-600"
                />
              )}
            </div>
          )}
        </>
      )}

      {/* ====== DDP CHARGES ====== */}
      {hasDDP && (
        <>
          <SectionToggle
            title="DDP Charges"
            icon={DollarSign}
            color="text-rose-700 bg-rose-50 hover:bg-rose-100"
            open={sections.ddp}
            toggle={() => toggle("ddp")}
          />
          {sections.ddp && (
            <div className="grid grid-cols-2 gap-2 px-1">
              <Field label="DDP Charges B/R" value={data.ddpBuying} onChange={set("ddpBuying")} type="number" />
              <Field label="DDP Charges S/R" value={data.ddpSelling} onChange={set("ddpSelling")} type="number" />
            </div>
          )}
        </>
      )}

      {/* ====== RATE TOTALS ====== */}
      {(hasOriginCharges || hasFreightCharges || hasDestinationCharges || hasDDP) && (
        <>
          <SectionToggle
            title="Rate Totals"
            icon={DollarSign}
            color="text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            open={sections.totals}
            toggle={() => toggle("totals")}
          />
          {sections.totals && (
            <div className="grid grid-cols-3 gap-2 px-1">
              <Field label="Total Buying (B/R)" value={data.totalBuying} onChange={set("totalBuying")} type="number" readOnly />
              <Field label="Total Selling (S/R)" value={data.totalSelling} onChange={set("totalSelling")} type="number" readOnly />
              <Field label="Total Margin (auto)" value={data.totalMargin} onChange={set("totalMargin")} type="number" readOnly />
            </div>
          )}
        </>
      )}

      {/* ====== REMARKS ====== */}
      {/* Always available so a remark can be added even when none came from
          Rate Filing or Quotation. */}
      <>
        <SectionToggle
          title="Remarks"
          icon={MessageSquare}
          color="text-gray-700 bg-gray-100 hover:bg-gray-200"
          open={sections.remarks}
          toggle={() => toggle("remarks")}
        />
        {sections.remarks && (
          <div className="space-y-2 px-1">
            <Field label="Remarks" value={data.remarks} onChange={set("remarks")} rows={3} />
          </div>
        )}
      </>

      {/* ====== SHIPPING LINE CONTACT ====== */}
      {hasSlContact && (
        <>
          <SectionToggle
            title="Shipping Line Contact"
            icon={Phone}
            color="text-violet-700 bg-violet-50 hover:bg-violet-100"
            open={sections.agent}
            toggle={() => toggle("agent")}
          />
          {sections.agent && (
            <div className="px-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Field label="Contact Name" value={data.slContactName} onChange={set("slContactName")} />
                <Field label="Designation" value={data.slContactDesignation} onChange={set("slContactDesignation")} />
                <Field label="Phone" value={data.slContactPhone} onChange={set("slContactPhone")} />
                <Field label="Email" value={data.slContactEmail} onChange={set("slContactEmail")} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Bottom actions */}
      <div className="flex justify-end gap-2 pt-2 pb-4">
        {editMode ? (
          <button
            type="button"
            onClick={handleSaveEdit}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold px-5 py-2 rounded-lg hover:shadow-lg transition-all"
          >
            <Save size={14} />
            Save Changes
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold px-5 py-2 rounded-lg hover:shadow-lg transition-all"
          >
            <FileDown size={14} />
            Generate & Download PDF
          </button>
        )}
      </div>
    </div>
  );
};

export default PreAdviceForm;
