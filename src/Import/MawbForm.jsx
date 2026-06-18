import React, { useState, useEffect } from "react";
import { Save, Send, Eye, ArrowLeft, Loader2 } from "lucide-react";
import { emptyMawb, createMawb, updateMawb, listMawb } from "./mawbApi";
import AutoSuggest from "./AutoSuggest";
import { collectSuggestions } from "./dateUtil";

// Fields that capture previously-submitted values as autocomplete suggestions.
const SUGGEST_FIELDS = ["shipper", "consignee", "notify", "from_routing", "to_routing", "airport_of_destination", "hsn_code"];

const inputCls =
  "w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-sky-400 focus:border-transparent";
const labelCls =
  "text-[10px] font-semibold text-gray-500 uppercase tracking-wide";

const Field = ({ label, value, onChange, type = "text", required, placeholder }) => (
  <div className="flex flex-col gap-0.5">
    <label className={labelCls}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  </div>
);

const Area = ({ label, value, onChange, required, rows = 3, placeholder }) => (
  <div className="flex flex-col gap-0.5">
    <label className={labelCls}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`${inputCls} resize-none`}
    />
  </div>
);

const Card = ({ title, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
    <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50/70 rounded-t-lg">
      <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{title}</h3>
    </div>
    <div className="p-3">{children}</div>
  </div>
);

const MawbForm = ({ currentUser, initialData, onBack, onSaved, onPreview }) => {
  const [data, setData] = useState(() => ({ ...emptyMawb(), ...(initialData || {}) }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  // "Same as Consignee" — when on, Notify mirrors Consignee.
  const [sameAsConsignee, setSameAsConsignee] = useState(
    () => !!(initialData && initialData.notify && initialData.notify === initialData.consignee)
  );
  const editingId = initialData && initialData._id ? initialData._id : null;

  const set = (key) => (value) => setData((p) => ({ ...p, [key]: value }));

  // Consignee change also syncs Notify while "Same as Consignee" is active.
  const setConsignee = (value) =>
    setData((p) => ({ ...p, consignee: value, ...(sameAsConsignee ? { notify: value } : {}) }));

  const toggleSameAsConsignee = (checked) => {
    setSameAsConsignee(checked);
    if (checked) setData((p) => ({ ...p, notify: p.consignee }));
  };

  // Load suggestion values from previously-submitted records on mount
  // (re-runs whenever the form is opened, so new values appear immediately).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const records = await listMawb();
        if (!active) return;
        const map = {};
        SUGGEST_FIELDS.forEach((f) => { map[f] = collectSuggestions(records, f); });
        setSuggestions(map);
      } catch {
        /* suggestions are best-effort; ignore fetch errors */
      }
    })();
    return () => { active = false; };
  }, []);

  const validateForSubmit = () => {
    const e = [];
    if (!data.shipper?.trim()) e.push("Shipper is required");
    if (!data.consignee?.trim()) e.push("Consignee is required");
    // HAWB Nos is optional.
    return e;
  };

  const buildPayload = (status) => ({
    ...data,
    status,
    createdBy: currentUser?.fullName || currentUser?.username || "",
    createdByRole: currentUser?.role || "",
    createdByLocation: currentUser?.location || "",
  });

  const persist = async (status) => {
    if (status === "submitted") {
      const e = validateForSubmit();
      if (e.length > 0) {
        setErrors(e);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setErrors([]);
    setSaving(true);
    try {
      const payload = buildPayload(status);
      const saved = editingId ? await updateMawb(editingId, payload) : await createMawb(payload);
      onSaved && onSaved(saved, status);
    } catch (err) {
      setErrors([err.message || "Failed to save MAWB"]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-sky-600 to-indigo-600 text-white px-3 py-2 rounded-lg sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="hover:bg-white/20 p-1 rounded" title="Back">
            <ArrowLeft size={16} />
          </button>
          <h2 className="text-sm font-bold">{editingId ? "Edit MAWB Instruction" : "New MAWB Instruction"}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onPreview && onPreview(buildPayload(data.status))} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md">
            <Eye size={14} /> Preview
          </button>
          <button onClick={() => persist("draft")} disabled={saving} className="flex items-center gap-1.5 bg-white text-sky-700 text-xs font-semibold px-2.5 py-1.5 rounded-md hover:bg-sky-50 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Draft
          </button>
          <button onClick={() => persist("submitted")} disabled={saving} className="flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md hover:bg-emerald-600 disabled:opacity-50">
            <Send size={14} /> Submit
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Parties — 3 across on desktop, stack on mobile */}
      <Card title="Parties">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <AutoSuggest label="Shipper" required multiline rows={4} value={data.shipper} onChange={set("shipper")} suggestions={suggestions.shipper} placeholder="Name & address..." inputCls={inputCls} labelCls={labelCls} />
          <AutoSuggest label="Consignee" required multiline rows={4} value={data.consignee} onChange={setConsignee} suggestions={suggestions.consignee} placeholder="Name & address..." inputCls={inputCls} labelCls={labelCls} />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Notify</label>
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-600 cursor-pointer">
                <input type="checkbox" checked={sameAsConsignee} onChange={(e) => toggleSameAsConsignee(e.target.checked)} className="accent-sky-600" />
                Same as Consignee
              </label>
            </div>
            <AutoSuggest label="" multiline rows={4} value={data.notify} onChange={set("notify")} suggestions={suggestions.notify} disabled={sameAsConsignee} placeholder="Name & address..." inputCls={inputCls} labelCls="hidden" />
          </div>
        </div>
      </Card>

      {/* Routing & Accounting — compact grid */}
      <Card title="Routing & Accounting">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          <AutoSuggest label="From" value={data.from_routing} onChange={set("from_routing")} suggestions={suggestions.from_routing} inputCls={inputCls} labelCls={labelCls} />
          <AutoSuggest label="To" value={data.to_routing} onChange={set("to_routing")} suggestions={suggestions.to_routing} inputCls={inputCls} labelCls={labelCls} />
          <AutoSuggest label="Airport of Destination" value={data.airport_of_destination} onChange={set("airport_of_destination")} suggestions={suggestions.airport_of_destination} inputCls={inputCls} labelCls={labelCls} />
          <div className="flex flex-col gap-0.5">
            <label className={labelCls}>Freight</label>
            <select value={data.freight} onChange={(e) => set("freight")(e.target.value)} className={inputCls}>
              <option value="PP">PP (Prepaid)</option>
              <option value="CC">CC (Collect)</option>
            </select>
          </div>
          <Field label="HAWB Nos" value={data.hawb_nos} onChange={set("hawb_nos")} />
          <Field label="Date" type="date" value={data.date} onChange={set("date")} />
        </div>
      </Card>

      {/* Handling */}
      <Card title="Handling Information">
        <Area label="Handling Information" value={data.handling_information} onChange={set("handling_information")} rows={2} placeholder="Handling instructions..." />
      </Card>

      {/* Shipment + Cargo */}
      <Card title="Shipment & Cargo">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Field label="No. of Pcs" type="number" value={data.no_of_pcs} onChange={set("no_of_pcs")} />
          <Field label="Gross Weight" type="number" value={data.gross_weight} onChange={set("gross_weight")} />
          <Field label="Chargeable Weight" type="number" value={data.chargeable_weight} onChange={set("chargeable_weight")} />
        </div>
        <div className="mt-2.5">
          <Area label="Nature & Qty of Goods (incl. dimensions or volume)" value={data.nature_of_goods} onChange={set("nature_of_goods")} rows={2} placeholder="Description of goods..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
          <AutoSuggest label="HSN Code" value={data.hsn_code} onChange={set("hsn_code")} suggestions={suggestions.hsn_code} inputCls={inputCls} labelCls={labelCls} />
          <Field label="Goods Dimension" value={data.goods_dimension} onChange={set("goods_dimension")} placeholder="e.g. 120 x 80 x 100 cm" />
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          HSN Code &amp; Goods Dimension are automatically appended into the "Nature &amp; quantity of goods" box of the MAWB document.
        </p>
      </Card>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-2 pb-6">
        <button onClick={() => persist("draft")} disabled={saving} className="flex items-center gap-1.5 border border-sky-300 text-sky-700 text-xs font-semibold px-4 py-2 rounded-md hover:bg-sky-50 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Draft
        </button>
        <button onClick={() => persist("submitted")} disabled={saving} className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">
          <Send size={14} /> Submit MAWB
        </button>
      </div>
    </div>
  );
};

export default MawbForm;
