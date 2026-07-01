import React, { useState, useEffect } from "react";
import { Save, Send, Eye, ArrowLeft, Loader2 } from "lucide-react";
import { emptyHawb, createHawb, updateHawb, listHawb } from "./hawbApi";
import AutoSuggest from "../AutoSuggest";
import { collectSuggestions } from "../dateUtil";

// Fields that capture previously-submitted values as autocomplete suggestions.
const SUGGEST_FIELDS = [
  "airport_of_departure",
  "airport_of_destination",
  "shipper",
  "consignee",
  "notify",
  "notify_party_2",
  "routing_airport_of_departure",
  "routing_to",
  "routing_airport_of_destination",
  "hsn_code",
];

const inputCls =
  "w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-violet-400 focus:border-transparent";
const labelCls = "text-[10px] font-semibold text-gray-500 uppercase tracking-wide";

const Field = ({ label, value, onChange, type = "text", required, placeholder }) => (
  <div className="flex flex-col gap-0.5">
    <label className={labelCls}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
  </div>
);

const Area = ({ label, value, onChange, required, rows = 3, placeholder }) => (
  <div className="flex flex-col gap-0.5">
    <label className={labelCls}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={`${inputCls} resize-none`} />
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

const HawbForm = ({ currentUser, initialData, onBack, onSaved, onPreview }) => {
  const [data, setData] = useState(() => ({ ...emptyHawb(), ...(initialData || {}) }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [suggestions, setSuggestions] = useState({});
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

  // Load suggestion values from previously-submitted records on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const records = await listHawb();
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
    // House AWB Number is optional.
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
      const saved = editingId ? await updateHawb(editingId, payload) : await createHawb(payload);
      onSaved && onSaved(saved, status);
    } catch (err) {
      setErrors([err.message || "Failed to save HAWB"]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-3 py-2 rounded-lg sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="hover:bg-white/20 p-1 rounded" title="Back">
            <ArrowLeft size={16} />
          </button>
          <h2 className="text-sm font-bold">{editingId ? "Edit HAWB" : "New HAWB"}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onPreview && onPreview(buildPayload(data.status))} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md">
            <Eye size={14} /> Preview
          </button>
          <button onClick={() => persist("draft")} disabled={saving} className="flex items-center gap-1.5 bg-white text-violet-700 text-xs font-semibold px-2.5 py-1.5 rounded-md hover:bg-violet-50 disabled:opacity-50">
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

      {/* Shipment Information */}
      <Card title="Shipment Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          <AutoSuggest label="Airport of Departure" value={data.airport_of_departure} onChange={set("airport_of_departure")} suggestions={suggestions.airport_of_departure} inputCls={inputCls} labelCls={labelCls} />
          <AutoSuggest label="Airport of Destination (Top Section)" value={data.airport_of_destination} onChange={set("airport_of_destination")} suggestions={suggestions.airport_of_destination} inputCls={inputCls} labelCls={labelCls} />
          <Field label="Master AWB Number" value={data.master_awb_number} onChange={set("master_awb_number")} />
          <Field label="House AWB Number" value={data.house_awb_number} onChange={set("house_awb_number")} />
        </div>
      </Card>

      {/* Parties */}
      <Card title="Parties">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <AutoSuggest label="Shipper's Name & Address" required multiline rows={4} value={data.shipper} onChange={set("shipper")} suggestions={suggestions.shipper} placeholder="Name & address..." inputCls={inputCls} labelCls={labelCls} />
          <AutoSuggest label="Consignee's Name & Address" required multiline rows={4} value={data.consignee} onChange={setConsignee} suggestions={suggestions.consignee} placeholder="Name & address..." inputCls={inputCls} labelCls={labelCls} />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Notify Party 1</label>
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-600 cursor-pointer">
                <input type="checkbox" checked={sameAsConsignee} onChange={(e) => toggleSameAsConsignee(e.target.checked)} className="accent-violet-600" />
                Same as Consignee
              </label>
            </div>
            <AutoSuggest label="" multiline rows={4} value={data.notify} onChange={set("notify")} suggestions={suggestions.notify} disabled={sameAsConsignee} placeholder="Name & address..." inputCls={inputCls} labelCls="hidden" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2.5">
          <AutoSuggest label="Notify Party 2 (optional)" multiline rows={4} value={data.notify_party_2} onChange={set("notify_party_2")} suggestions={suggestions.notify_party_2} placeholder="Name & address..." inputCls={inputCls} labelCls={labelCls} />
        </div>
      </Card>

      {/* Accounting Information */}
      <Card title="Accounting Information">
        <Area label="Accounting Information (optional)" value={data.accounting_information} onChange={set("accounting_information")} rows={2} placeholder="Accounting information..." />
      </Card>

      {/* Destination Agent Detail */}
      <Card title="Destination Agent Detail">
        <Area label="Destination Agent Detail (optional)" value={data.destination_agent_detail} onChange={set("destination_agent_detail")} rows={3} placeholder="Destination agent name, address & contact..." />
      </Card>

      {/* Routing */}
      <Card title="Routing Information">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <AutoSuggest label="Airport of Departure (Addr. of First Carrier & Requested Routing)" value={data.routing_airport_of_departure} onChange={set("routing_airport_of_departure")} suggestions={suggestions.routing_airport_of_departure} inputCls={inputCls} labelCls={labelCls} />
          <AutoSuggest label="To" value={data.routing_to} onChange={set("routing_to")} suggestions={suggestions.routing_to} inputCls={inputCls} labelCls={labelCls} />
          <AutoSuggest label="Airport of Destination (Routing Section)" value={data.routing_airport_of_destination} onChange={set("routing_airport_of_destination")} suggestions={suggestions.routing_airport_of_destination} inputCls={inputCls} labelCls={labelCls} />
        </div>
      </Card>

      {/* Freight — drives PP/CC + AS AGREED in the document (optional) */}
      <Card title="Freight">
        <div className="flex items-center gap-6">
          {["Prepaid", "Collect"].map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="freight"
                value={opt}
                checked={data.freight === opt}
                onChange={() => set("freight")(opt)}
                className="accent-violet-600"
              />
              {opt}
            </label>
          ))}
          {data.freight && (
            <button type="button" onClick={() => set("freight")("")} className="text-[10px] text-gray-400 hover:text-gray-600 underline">
              Clear
            </button>
          )}
        </div>
      </Card>

      {/* Handling Information */}
      <Card title="Handling Information">
        <Area label="Handling Information" value={data.handling_information} onChange={set("handling_information")} rows={2} placeholder="Handling instructions..." />
      </Card>

      {/* Shipment Details */}
      <Card title="Shipment Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Field label="No. of Pieces (RCP)" type="number" value={data.no_of_pieces} onChange={set("no_of_pieces")} />
          <Field label="Gross Weight" type="number" value={data.gross_weight} onChange={set("gross_weight")} />
          <Field label="Chargeable Weight" type="number" value={data.chargeable_weight} onChange={set("chargeable_weight")} />
        </div>
      </Card>

      {/* Nature & Quantity of Goods */}
      <Card title="Nature & Quantity of Goods (Incl. Dimensions or Value)">
        <Area
          label="Nature of Goods"
          value={data.nature_of_goods}
          onChange={set("nature_of_goods")}
          rows={3}
          placeholder={"One product per line, e.g.\nLADIES CARDIGAN\nLADIES DRESS\nLADIES CAPRI"}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5">
          <Field label="Invoice No." value={data.invoice_no} onChange={set("invoice_no")} placeholder="e.g. NA/2025-26/032" />
          <Field label="Invoice Date" type="date" value={data.invoice_date} onChange={set("invoice_date")} />
          <Field label="HSN Code" value={data.hsn_code} onChange={set("hsn_code")} placeholder="e.g. 61103010, 61044400" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
          <Area label="Dimension (CMS)" value={data.dimension} onChange={set("dimension")} rows={2} placeholder={"One per line, e.g.\n60x30x30/14\n60x30x15/8"} />
          <Field label="Volume WT" value={data.volume_wt} onChange={set("volume_wt")} placeholder="e.g. 162.00 KG" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
          <Field label="Shipping Bill No." value={data.shipping_bill_no} onChange={set("shipping_bill_no")} placeholder="e.g. 1234567" />
          <Field label="Shipping Bill Date" type="date" value={data.shipping_bill_date} onChange={set("shipping_bill_date")} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Nature of Goods, Invoice No., Invoice Date, HSN Code, Dimension, Volume WT &amp; Shipping Bill details are automatically combined inside the "Nature &amp; Quantity of Goods" box of the HAWB document.
        </p>
      </Card>

      {/* Final */}
      <Card title="Final">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Field label="Dated" type="date" value={data.dated} onChange={set("dated")} />
        </div>
      </Card>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-2 pb-6">
        <button onClick={() => persist("draft")} disabled={saving} className="flex items-center gap-1.5 border border-violet-300 text-violet-700 text-xs font-semibold px-4 py-2 rounded-md hover:bg-violet-50 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Draft
        </button>
        <button onClick={() => persist("submitted")} disabled={saving} className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">
          <Send size={14} /> Submit HAWB
        </button>
      </div>
    </div>
  );
};

export default HawbForm;
