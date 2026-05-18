import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Ship,
  MapPin,
  DollarSign,
  Package,
  User,
  Calendar,
  MessageSquare,
  Loader2,
  Search,
  X,
  Calculator,
  RefreshCw,
  Clock,
  Navigation,
  FileText,
} from "lucide-react";
import { icdLocations } from "../components/POR";
import { indianPorts } from "../components/POL";
import { foreignDestinations } from "../components/POD";
import { shippingLines as staticShippingLines } from "../components/ShippingLines";

/* ------------------------------------------------------------------ */
/*  Constants / APIs                                                    */
/* ------------------------------------------------------------------ */
const ORIGIN_API = "https://mediumspringgreen-stork-730427.hostingersite.com/api/origin/forms/all";
const RAIL_FREIGHT_API = "https://mediumspringgreen-stork-730427.hostingersite.com/api/railfreight/forms/all";
const RATE_FILING_API = "https://papayawhip-antelope-424743.hostingersite.com/api/rate-filings";

const CONTAINER_TYPES = [
  "20ft Standard Container",
  "40ft Standard Container",
  "40ft High Cube Container",
  "45ft High Cube Container",
  "20ft Reefer Container",
  "40ft Reefer Container",
  "40ft High Cube Reefer Container",
  "20ft Open Top Container",
  "40ft Open Top Container",
  "20ft Open Top Container",
  "40ft Open Top Container",
  "20ft Flat Rack Container",
  "40ft Flat Rack Container",
  "20ft Hazardous Container",
  "40ft Hazardous Container",
];

const COMMODITY_TYPES = ["FAK", "Commodity Specific"];
const ROUTING_OPTIONS = ["Direct", "Via"];
// Format must match the Quotation form exactly so Pre-Advice / Rate Comparison
// don't flag a difference purely from string formatting (e.g. "1 day (approx)").
const TRANSIT_DAYS = Array.from({ length: 100 }, (_, i) => {
  const day = i + 1;
  return `${day} ${day === 1 ? "day (approx)" : "days (approx)"}`;
});
const VALIDITY_TYPES = ["Gate-in", "Handover", "Sailing"];

const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "AED", "JPY", "AUD"];
const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "د.إ", JPY: "¥", AUD: "A$" };
const ACD_TYPES = ["ACD", "ENS", "AFR"];
const UNIT_OPTIONS = ["Per BL", "Per Container", "Per Shipment", "Per CBM", "Per KG", "Lump Sum"];

/* Map full container type names (form) → abbreviated API values */
const containerTypeToApiMap = {
  "20ft Standard Container": "20ft ST",
  "40ft Standard Container": "40ft ST",
  "40ft High Cube Container": "40ft H.Q",
  "45ft High Cube Container": "45ft H.Q",
  "20ft Reefer Container": "20ft RF",
  "40ft Reefer Container": "40ft RF",
  "40ft High Cube Reefer Container": "40ft H.Q-RF",
  "20ft Open Top (Inward) Container": "20ft OT-In",
  "40ft Open Top (Inward) Container": "40ft OT-In",
  "20ft Open Top (Outward) Container": "20ft OT-Out",
  "40ft Open Top (Outward) Container": "40ft OT-Out",
  "20ft Flat Rack Container": "20ft FR",
  "40ft Flat Rack Container": "40ft FR",
  "20ft Hazardous Container": "20ft Haz",
  "40ft Hazardous Container": "40ft Haz",
};
const mapContainerType = (fullName) => containerTypeToApiMap[fullName] || fullName;

/* ------------------------------------------------------------------ */
/*  Reusable tiny components                                            */
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

const Field = ({ label, children, required, className = "" }) => (
  <div className={`flex flex-col gap-0.5 ${className}`}>
    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  "px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400";

/* ------------------------------------------------------------------ */
/*  Autocomplete input                                                  */
/* ------------------------------------------------------------------ */
const AutocompleteInput = ({ value, onChange, suggestions, placeholder, allowNew = false }) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes((filter || value || "").toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setFilter(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`${inputCls} w-full pr-7`}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setFilter(""); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
          {filtered.slice(0, 100).map((s, i) => (
            <button
              type="button"
              key={i}
              onClick={() => {
                onChange(s);
                setFilter("");
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-emerald-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Autocomplete contact input — shows name + number in dropdown        */
/* ------------------------------------------------------------------ */
const AutocompleteContactInput = ({ value, onChange, contacts, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Deduplicate by name
  const unique = useMemo(() => {
    const map = new Map();
    contacts.forEach((c) => {
      if (c.name && !map.has(c.name.toLowerCase())) map.set(c.name.toLowerCase(), c);
    });
    return [...map.values()];
  }, [contacts]);

  const filtered = unique.filter((c) =>
    c.name.toLowerCase().includes((filter || value || "").toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setFilter(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`${inputCls} w-full pr-7`}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setFilter(""); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
          {filtered.slice(0, 100).map((c, i) => (
            <button
              type="button"
              key={i}
              onClick={() => {
                onChange(c.name);
                setFilter("");
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-emerald-50 transition-colors flex items-center justify-between"
            >
              <span className="font-medium text-gray-800">{c.name}</span>
              {c.number && <span className="text-[10px] text-gray-400 ml-2">{c.number}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  AddRates component                                                  */
/* ------------------------------------------------------------------ */
const AddRates = ({ currentUser, editingRate, onSaved }) => {
  /* ----- Section toggles ----- */
  const [sections, setSections] = useState({
    route: true,
    charges: true,
    origin: true,
    rail: true,
    custom: true,
    contact: true,
    validity: true,
    remarks: true,
  });
  const toggle = (key) => setSections((p) => ({ ...p, [key]: !p[key] }));

  /* ----- API data stores ----- */
  const [originRates, setOriginRates] = useState([]);
  const [railFreightRates, setRailFreightRates] = useState([]);
  const [buyingRates, setBuyingRates] = useState([]);
  const [loadingOrigin, setLoadingOrigin] = useState(false);
  const [loadingRail, setLoadingRail] = useState(false);

  /* ----- Suggestions extracted from buying rates ----- */
  const [finalDestinationSuggestions, setFinalDestinationSuggestions] = useState([]);
  const [railRampSuggestions, setRailRampSuggestions] = useState([]);
  const [shippingContactSuggestions, setShippingContactSuggestions] = useState([]);

  /* ----- Form state ----- */
  const initialForm = {
    name: currentUser?.fullName || currentUser?.username || "",
    por: "",
    pol: "",
    pod: "",
    finalDestination: "",
    railRamp: "",
    shipping_lines: "",
    commodity: "",
    route: "",
    transit: "",
    bl_fees: "",
    thc: "",
    muc: "",
    toll: "",
    railFreightRates: null,
    shipping_name: "",
    shipping_number: "",
    shipping_email: "",
    shipping_address: "",
    validity: "",
    validity_for: "",
    remarks: "",
  };

  /* Parse stored "USD $100" → { currency: "USD", value: "100" } */
  const parseOceanFreight = (raw) => {
    if (!raw || typeof raw !== "string") return { currency: "USD", value: raw || "" };
    // Match patterns like "USD $100", "INR ₹500", "INR ₹ $100", "EUR 200"
    const m = raw.match(/^(USD|INR|EUR|GBP|AED|SGD|JPY|AUD)\s*[^\d]*([\d,.]+)$/i);
    if (m) return { currency: m[1].toUpperCase(), value: m[2].trim() };
    // If it's just a number, return as-is
    if (!isNaN(parseFloat(raw))) return { currency: "USD", value: raw };
    return { currency: "USD", value: raw };
  };

  /* Parse stored "ACD $50" or "ENS USD $50" → { type, currency, value } */
  const parseAcdEnsAfr = (raw) => {
    if (!raw || typeof raw !== "string") return { type: "ACD", currency: "USD", value: "" };
    // Match: "ACD USD $50", "ENS ₹100", "AFR $200", "ACD ₹ $50"
    const m = raw.match(/^(ACD|ENS|AFR)\s*(?:(USD|INR|EUR|GBP|AED|SGD|JPY|AUD)\s*)?[^\d]*([\d,.]+)$/i);
    if (m) {
      const type = m[1].toUpperCase();
      let currency = m[2] ? m[2].toUpperCase() : "USD";
      // Infer currency from symbol if not matched
      if (!m[2] && raw.includes("₹")) currency = "INR";
      return { type, currency, value: m[3].trim() };
    }
    return { type: "ACD", currency: "USD", value: "" };
  };

  const buildInitialForm = () => {
    if (!editingRate) return initialForm;
    return { ...initialForm, ...editingRate };
  };

  const defaultContainerCharge = () => ({
    ocean_freight: "",
    ocean_freight_currency: "USD",
    acd_type: "ACD",
    acd_currency: "USD",
    acd_value: "",
  });

  const [form, setForm] = useState(buildInitialForm);

  // Multi-container state
  const [containerSelections, setContainerSelections] = useState(() => {
    if (!editingRate) return [];
    if (editingRate.container_types?.length > 0) return editingRate.container_types;
    if (editingRate.container_type) return [editingRate.container_type];
    return [];
  });

  const [containerCharges, setContainerCharges] = useState(() => {
    if (!editingRate) return {};
    if (editingRate.containerCharges) {
      try {
        const parsed = typeof editingRate.containerCharges === "string"
          ? JSON.parse(editingRate.containerCharges)
          : editingRate.containerCharges;
        if (parsed && typeof parsed === "object") return parsed;
      } catch {}
    }
    if (editingRate.container_type) {
      const of = parseOceanFreight(editingRate.ocean_freight);
      const acd = parseAcdEnsAfr(editingRate.acd_ens_afr);
      return {
        [editingRate.container_type]: {
          ocean_freight: of.value,
          ocean_freight_currency: of.currency,
          acd_type: acd.type,
          acd_currency: acd.currency,
          acd_value: acd.value,
        },
      };
    }
    return {};
  });

  const [newContainerType, setNewContainerType] = useState("");

  const updateContainerCharge = (ct, field, val) =>
    setContainerCharges((prev) => ({
      ...prev,
      [ct]: { ...(prev[ct] || defaultContainerCharge()), [field]: val },
    }));

  const addContainerType = () => {
    if (!newContainerType || containerSelections.includes(newContainerType)) return;
    setContainerSelections((prev) => [...prev, newContainerType]);
    setContainerCharges((prev) => ({
      ...prev,
      [newContainerType]: prev[newContainerType] || defaultContainerCharge(),
    }));
  };

  const removeContainerType = (ct) => {
    setContainerSelections((prev) => prev.filter((c) => c !== ct));
    setContainerCharges((prev) => {
      const next = { ...prev };
      delete next[ct];
      return next;
    });
  };

  const [customCharges, setCustomCharges] = useState(
    editingRate?.customCharges
      ? (typeof editingRate.customCharges === "string"
          ? JSON.parse(editingRate.customCharges)
          : editingRate.customCharges)
      : []
  );
  // Per-container origin charges (bl_fees, thc, muc, toll)
  const [originChargeMap, setOriginChargeMap] = useState(() => {
    if (!editingRate) return {};
    if (editingRate.originChargeMap) {
      try {
        const parsed = typeof editingRate.originChargeMap === "string"
          ? JSON.parse(editingRate.originChargeMap)
          : editingRate.originChargeMap;
        if (parsed && typeof parsed === "object") return parsed;
      } catch {}
    }
    // Fall back to single container legacy values
    const ct = editingRate.container_type;
    if (ct) {
      return {
        [ct]: {
          bl_fees: editingRate.bl_fees || "",
          thc: editingRate.thc || "",
          muc: editingRate.muc || "",
          toll: editingRate.toll || "",
        },
      };
    }
    return {};
  });

  const updateOriginCharge = (ct, field, val) =>
    setOriginChargeMap((prev) => ({
      ...prev,
      [ct]: { ...(prev[ct] || { bl_fees: "", thc: "", muc: "", toll: "" }), [field]: val },
    }));

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [originMatch, setOriginMatch] = useState(null);
  const [originMatchMap, setOriginMatchMap] = useState({});
  const [railMatch, setRailMatch] = useState(null);
  const [railMatchMap, setRailMatchMap] = useState({});
  const [commodityMode, setCommodityMode] = useState(
    editingRate?.commodity && editingRate.commodity !== "FAK" ? "Commodity Specific" : ""
  );

  const set = (field) => (val) => setForm((p) => ({ ...p, [field]: val }));

  /* ----- Fetch APIs ----- */
  useEffect(() => {
    const fetchOrigin = async () => {
      setLoadingOrigin(true);
      try {
        const res = await fetch(ORIGIN_API);
        const data = await res.json();
        setOriginRates(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error("Origin rates fetch error:", err);
      } finally {
        setLoadingOrigin(false);
      }
    };

    const fetchRail = async () => {
      setLoadingRail(true);
      try {
        const res = await fetch(RAIL_FREIGHT_API);
        const data = await res.json();
        setRailFreightRates(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error("Rail freight fetch error:", err);
      } finally {
        setLoadingRail(false);
      }
    };

    const fetchBuying = async () => {
      try {
        const res = await fetch(RATE_FILING_API);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.data || [];
        setBuyingRates(arr);

        // Extract Final Destination & Rail Ramp suggestions
        // (legacy combined `fdrr` values feed the Final Destination list)
        const finalDestSet = new Set();
        const railRampSet = new Set();
        arr.forEach((r) => {
          if (r.finalDestination) finalDestSet.add(r.finalDestination);
          else if (r.fdrr) finalDestSet.add(r.fdrr);
          if (r.railRamp) railRampSet.add(r.railRamp);
        });
        setFinalDestinationSuggestions([...finalDestSet].sort());
        setRailRampSuggestions([...railRampSet].sort());

        // Extract shipping contact suggestions
        const contacts = [];
        arr.forEach((r) => {
          if (r.shipping_name) {
            contacts.push({
              name: r.shipping_name,
              number: r.shipping_number || "",
              email: r.shipping_email || "",
              address: r.shipping_address || "",
            });
          }
        });
        setShippingContactSuggestions(contacts);
      } catch (err) {
        console.error("Buying rates fetch error:", err);
      }
    };

    fetchOrigin();
    fetchRail();
    fetchBuying();
  }, []);

  /* ----- Auto-calculate origin charges for all selected containers ----- */
  useEffect(() => {
    if (originRates.length === 0) return;

    const norm = (s) => (s || "").trim().toLowerCase();

    const computeOriginMatch = (ct) => {
      const apiCt = mapContainerType(ct);
      if (form.por && form.pol && form.shipping_lines && ct) {
        const m = originRates.find((r) =>
          norm(r.por) === norm(form.por) &&
          norm(r.pol) === norm(form.pol) &&
          norm(r.shipping_lines) === norm(form.shipping_lines) &&
          norm(r.container_type) === norm(apiCt)
        );
        if (m) return m;
      }
      if (form.por && form.pol && form.shipping_lines) {
        const m = originRates.find((r) =>
          norm(r.por) === norm(form.por) &&
          norm(r.pol) === norm(form.pol) &&
          norm(r.shipping_lines) === norm(form.shipping_lines)
        );
        if (m) return m;
      }
      if (form.por && form.pol && ct) {
        const m = originRates.find((r) =>
          norm(r.por) === norm(form.por) &&
          norm(r.pol) === norm(form.pol) &&
          norm(r.container_type) === norm(mapContainerType(ct))
        );
        if (m) return m;
      }
      if (form.por && form.pol) {
        return originRates.find((r) =>
          norm(r.por) === norm(form.por) && norm(r.pol) === norm(form.pol)
        ) || null;
      }
      return null;
    };

    const newMap = {};
    containerSelections.forEach((ct) => { newMap[ct] = computeOriginMatch(ct); });
    setOriginMatchMap(newMap);

    // Populate per-container origin charge map from matched records.
    // Merge with existing state: only fill in fields that are currently empty
    // so manually entered or previously-saved values are never overwritten.
    setOriginChargeMap((prev) => {
      const merged = {};
      containerSelections.forEach((ct) => {
        const m = newMap[ct];
        const existing = prev[ct] || {};
        merged[ct] = {
          bl_fees: existing.bl_fees || (m ? (m.bl_fees ?? m.blFees ?? "") : ""),
          thc:     existing.thc     || (m ? (m.thc     ?? "")             : ""),
          muc:     existing.muc     || (m ? (m.muc     ?? "")             : ""),
          toll:    existing.toll    || (m ? (m.toll    ?? "")             : ""),
        };
      });
      return merged;
    });

    // Keep form.bl_fees/thc/muc/toll synced with first container for backward compat
    const firstCt = containerSelections[0] || "";
    const match = firstCt ? newMap[firstCt] : null;
    setOriginMatch(match || null);
    if (match) {
      setForm((p) => ({
        ...p,
        bl_fees: match.bl_fees ?? match.blFees ?? "",
        thc: match.thc ?? "",
        muc: match.muc ?? "",
        toll: match.toll ?? "",
      }));
    } else if (form.por && form.pol) {
      setForm((p) => ({ ...p, bl_fees: "", thc: "", muc: "", toll: "" }));
    }
  }, [form.por, form.pol, form.shipping_lines, containerSelections, originRates]);

  /* ----- Auto-calculate rail freight for all selected containers ----- */
  useEffect(() => {
    if (railFreightRates.length === 0) return;

    const norm = (s) => (s || "").trim().toLowerCase();

    const computeRailMatch = (ct) => {
      const apiCt = mapContainerType(ct);
      if (form.por && form.pol && form.shipping_lines && ct) {
        const m = railFreightRates.find((r) =>
          norm(r.por) === norm(form.por) &&
          norm(r.pol) === norm(form.pol) &&
          norm(r.shipping_lines) === norm(form.shipping_lines) &&
          norm(r.container_type) === norm(apiCt)
        );
        if (m) return m;
      }
      if (form.por && form.pol && form.shipping_lines) {
        const m = railFreightRates.find((r) =>
          norm(r.por) === norm(form.por) &&
          norm(r.pol) === norm(form.pol) &&
          norm(r.shipping_lines) === norm(form.shipping_lines)
        );
        if (m) return m;
      }
      if (form.por && form.pol && ct) {
        const m = railFreightRates.find((r) =>
          norm(r.por) === norm(form.por) &&
          norm(r.pol) === norm(form.pol) &&
          norm(r.container_type) === norm(mapContainerType(ct))
        );
        if (m) return m;
      }
      if (form.por && form.pol) {
        const m = railFreightRates.find((r) =>
          norm(r.por) === norm(form.por) && norm(r.pol) === norm(form.pol)
        );
        if (m) return m;
      }
      if (form.por) {
        return railFreightRates.find((r) => norm(r.por) === norm(form.por)) || null;
      }
      return null;
    };

    const newMap = {};
    containerSelections.forEach((ct) => { newMap[ct] = computeRailMatch(ct); });
    setRailMatchMap(newMap);

    // Use first container's match for form state (backward compat)
    const firstCt = containerSelections[0] || "";
    const match = firstCt ? computeRailMatch(firstCt) : null;
    setRailMatch(match || null);
    setForm((p) => ({ ...p, railFreightRates: match || null }));
  }, [form.por, form.pol, form.shipping_lines, containerSelections, railFreightRates]);

  /* ----- Auto-fill shipping contact ----- */
  const handleShippingNameChange = (val) => {
    setForm((p) => ({ ...p, shipping_name: val }));
    const found = shippingContactSuggestions.find(
      (c) => c.name.toLowerCase() === val.toLowerCase()
    );
    if (found) {
      setForm((p) => ({
        ...p,
        shipping_number: found.number,
        shipping_email: found.email,
        shipping_address: found.address,
      }));
    }
  };

  /* ----- Custom charges ----- */
  const addCustomCharge = () => {
    if (customCharges.length >= 20) return;
    setCustomCharges((p) => [
      ...p,
      { label: "", value: "", currency: "INR", unit: "Per Container" },
    ]);
  };
  const removeCustomCharge = (idx) => setCustomCharges((p) => p.filter((_, i) => i !== idx));
  const updateCustomCharge = (idx, field, val) =>
    setCustomCharges((p) => p.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));

  /* ----- Validation ----- */
  const validate = () => {
    const e = {};
    if (!form.por) e.por = "Required";
    if (!form.pol) e.pol = "Required";
    if (!form.pod) e.pod = "Required";
    if (!form.shipping_lines) e.shipping_lines = "Required";
    if (containerSelections.length === 0) e.container_type = "Select at least one container type";
    containerSelections.forEach((ct) => {
      if (!containerCharges[ct]?.ocean_freight) e[`ocean_freight_${ct}`] = "Required";
    });
    if (!form.validity) e.validity = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ----- Build output model ----- */
  const buildRateModel = () => {
    const firstCt = containerSelections[0] || "";
    const firstCharge = containerCharges[firstCt] || defaultContainerCharge();
    const oceanSym = CURRENCY_SYMBOLS[firstCharge.ocean_freight_currency] || "$";
    const oceanStr = firstCharge.ocean_freight
      ? `${firstCharge.ocean_freight_currency} ${oceanSym}${firstCharge.ocean_freight}`
      : "";
    const acdSym = CURRENCY_SYMBOLS[firstCharge.acd_currency] || "$";
    const acdStr = firstCharge.acd_value
      ? `${firstCharge.acd_type} ${acdSym}${firstCharge.acd_value}`
      : "";

    return {
      name: form.name,
      por: form.por,
      pol: form.pol,
      pod: form.pod,
      finalDestination: form.finalDestination,
      railRamp: form.railRamp,
      shipping_lines: form.shipping_lines,
      container_type: firstCt,
      container_types: containerSelections,
      ocean_freight: oceanStr,
      acd_ens_afr: acdStr,
      containerCharges: JSON.stringify(containerCharges),
      commodity: form.commodity,
      route: form.route,
      transit: form.transit,
      bl_fees: form.bl_fees,
      thc: form.thc,
      muc: form.muc,
      toll: form.toll,
      railFreightRates: form.railFreightRates ? JSON.stringify(form.railFreightRates) : "",
      originChargeMap: Object.keys(originChargeMap).length > 0 ? JSON.stringify(originChargeMap) : "",
      shipping_name: form.shipping_name,
      shipping_number: form.shipping_number,
      shipping_email: form.shipping_email,
      shipping_address: form.shipping_address,
      validity: form.validity,
      validity_for: form.validity_for,
      remarks: form.remarks,
      customCharges: customCharges.length > 0 ? JSON.stringify(customCharges) : "",
      customLabel: customCharges[0]?.label || "",
      customValue: customCharges[0]?.value || "",
      customUnit: customCharges[0]?.unit || "",
    };
  };

  /* ----- Submit handler ----- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const model = buildRateModel();
    const token = localStorage.getItem("authToken");
    const isEditing = editingRate && editingRate._id;

    try {
      const url = isEditing
        ? `${RATE_FILING_API}/${editingRate._id}`
        : RATE_FILING_API;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(model),
      });

      const data = await res.json();

      if (res.ok) {
        alert(isEditing ? "Rate updated successfully!" : "Rate created successfully!");
        if (onSaved) onSaved(data.data || data);
      } else {
        alert(data.message || `Failed to ${isEditing ? "update" : "create"} rate. Please try again.`);
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ----- Reset ----- */
  const handleReset = () => {
    setForm(initialForm);
    setContainerSelections([]);
    setContainerCharges({});
    setOriginChargeMap({});
    setNewContainerType("");
    setCustomCharges([]);
    setErrors({});
    setCommodityMode("");
  };

  /* ----- Shipping line suggestions from API + static ----- */
  const allShippingLines = [
    ...new Set([
      ...staticShippingLines,
      ...buyingRates.map((r) => r.shipping_lines).filter(Boolean),
    ]),
  ].sort();

  /* ----- POL suggestions from API + static ----- */
  const allPOL = [...new Set([
    ...indianPorts,
    ...buyingRates.map((r) => r.pol).filter(Boolean),
  ])].sort();

  /* ----- POD suggestions from API + static + allow new ----- */
  const allPOD = [...new Set([
    ...foreignDestinations,
    ...buyingRates.map((r) => r.pod).filter(Boolean),
  ])].sort();

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-lg">
        <div>
          <h2 className="text-sm font-bold">
            {editingRate
              ? editingRate._id
                ? "Edit Rate Filing"
                : "Copy Rate — New Filing"
              : "Add New Buying Rate"}
          </h2>
          <p className="text-[10px] text-emerald-200">
            {editingRate && !editingRate._id
              ? "Copied from an existing rate. Review, modify, and save as a new filing."
              : "Fill in the rate details below. Origin & Rail charges auto-populate."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-emerald-200 hover:text-white transition-colors px-2 py-1"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-white text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Rate"}
          </button>
        </div>
      </div>

      {/* ====== 70/30 SPLIT LAYOUT ====== */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* ======== LEFT PANEL — 70% Main Form ======== */}
        <div className="w-full lg:w-[70%] space-y-4">

          {/* ====== ROUTE INFORMATION ====== */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-visible shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-emerald-600" />
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Route Information</h3>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-emerald-600 transition-colors"
              >
                <RefreshCw size={11} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <Field label="POR (Place of Receipt)" required>
                <AutocompleteInput
                  value={form.por}
                  onChange={set("por")}
                  suggestions={icdLocations}
                  placeholder="Select POR..."
                />
                {errors.por && <span className="text-[9px] text-red-500">{errors.por}</span>}
              </Field>

              <Field label="Shipping Line" required>
                <AutocompleteInput
                  value={form.shipping_lines}
                  onChange={set("shipping_lines")}
                  suggestions={allShippingLines}
                  placeholder="Search Shipping Line..."
                />
                {errors.shipping_lines && (
                  <span className="text-[9px] text-red-500">{errors.shipping_lines}</span>
                )}
              </Field>

              <Field label="POL (Port of Loading)" required>
                <AutocompleteInput
                  value={form.pol}
                  onChange={set("pol")}
                  suggestions={allPOL}
                  placeholder="Search POL..."
                />
                {errors.pol && <span className="text-[9px] text-red-500">{errors.pol}</span>}
              </Field>

              <Field label="Equipment" required>
                <div className="space-y-1.5">
                  {containerSelections.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {containerSelections.map((ct) => (
                        <span key={ct} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                          {ct.replace(" Container", "")}
                          <button type="button" onClick={() => removeContainerType(ct)} className="ml-0.5 text-emerald-600 hover:text-red-500 transition-colors">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <select
                      value={newContainerType}
                      onChange={(e) => setNewContainerType(e.target.value)}
                      className={`${inputCls} flex-1`}
                    >
                      <option value="">Select &amp; Add your container</option>
                      {CONTAINER_TYPES.map((ct) => (
                        <option key={ct} value={ct} disabled={containerSelections.includes(ct)}>
                          {ct}{containerSelections.includes(ct) ? " ✓" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addContainerType}
                      disabled={!newContainerType || containerSelections.includes(newContainerType)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 transition-colors disabled:opacity-40"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>
                {errors.container_type && (
                  <span className="text-[9px] text-red-500">{errors.container_type}</span>
                )}
              </Field>

              <Field label="POD (Port of Discharge)" required>
                <AutocompleteInput
                  value={form.pod}
                  onChange={set("pod")}
                  suggestions={allPOD}
                  placeholder="Type or Select POD"
                  allowNew
                />
                {errors.pod && <span className="text-[9px] text-red-500">{errors.pod}</span>}
              </Field>

              <Field label="Commodity Type" required>
                <select
                  value={form.commodity === "FAK" ? "FAK" : commodityMode === "Commodity Specific" ? "Commodity Specific" : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "FAK") {
                      set("commodity")("FAK");
                      setCommodityMode("FAK");
                    } else if (v === "Commodity Specific") {
                      set("commodity")("");
                      setCommodityMode("Commodity Specific");
                    } else {
                      set("commodity")("");
                      setCommodityMode("");
                    }
                  }}
                  className={`${inputCls} w-full`}
                >
                  <option value="">Select Commodity Type</option>
                  {COMMODITY_TYPES.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
                {commodityMode === "Commodity Specific" && form.commodity !== "FAK" && (
                  <input
                    type="text"
                    value={form.commodity}
                    onChange={(e) => set("commodity")(e.target.value)}
                    placeholder="Enter commodity details..."
                    className={`${inputCls} w-full mt-1`}
                    autoFocus
                  />
                )}
              </Field>

              <Field label="Final Destination">
                <AutocompleteInput
                  value={form.finalDestination}
                  onChange={set("finalDestination")}
                  suggestions={finalDestinationSuggestions}
                  placeholder="Type or Select Final Destination"
                />
              </Field>

              <Field label="Rail Ramp">
                <AutocompleteInput
                  value={form.railRamp}
                  onChange={set("railRamp")}
                  suggestions={railRampSuggestions}
                  placeholder="Type or Select Rail Ramp"
                />
              </Field>
            </div>
          </div>

          {/* ====== FREIGHT DETAILS & ROUTING ====== */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-visible shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <DollarSign size={14} className="text-blue-600" />
              <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Freight Details & Routing</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {/* Per-container Ocean Freight and ACD/ENS/AFR */}
              <div className="md:col-span-2">
                {containerSelections.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-[10px] text-amber-700">
                    <Package size={12} />
                    Select container type(s) in Route Information to enter Ocean Freight and ACD/ENS/AFR charges
                  </div>
                ) : (
                  <div className="space-y-2">
                    {containerSelections.map((ct) => (
                      <div key={ct} className="bg-blue-50 rounded-md p-3 border border-blue-200">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Package size={11} className="text-blue-600" />
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">{ct}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Field label="Ocean Freight" required>
                            <div className="flex gap-1">
                              <select
                                value={containerCharges[ct]?.ocean_freight_currency || "USD"}
                                onChange={(e) => updateContainerCharge(ct, "ocean_freight_currency", e.target.value)}
                                className={`${inputCls} w-20`}
                              >
                                {CURRENCY_OPTIONS.map((c) => (
                                  <option key={c} value={c}>{c} {CURRENCY_SYMBOLS[c] || ""}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={containerCharges[ct]?.ocean_freight || ""}
                                onChange={(e) => updateContainerCharge(ct, "ocean_freight", e.target.value)}
                                placeholder="Enter Amount"
                                className={`${inputCls} flex-1 font-mono`}
                              />
                            </div>
                            {errors[`ocean_freight_${ct}`] && (
                              <span className="text-[9px] text-red-500">{errors[`ocean_freight_${ct}`]}</span>
                            )}
                          </Field>
                          <Field label="ACD / ENS / AFR Charges">
                            <div className="flex gap-1">
                              <select
                                value={containerCharges[ct]?.acd_type || "ACD"}
                                onChange={(e) => updateContainerCharge(ct, "acd_type", e.target.value)}
                                className={`${inputCls} w-16`}
                              >
                                {ACD_TYPES.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <select
                                value={containerCharges[ct]?.acd_currency || "USD"}
                                onChange={(e) => updateContainerCharge(ct, "acd_currency", e.target.value)}
                                className={`${inputCls} w-20`}
                              >
                                {CURRENCY_OPTIONS.map((c) => (
                                  <option key={c} value={c}>{c} {CURRENCY_SYMBOLS[c] || ""}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={containerCharges[ct]?.acd_value || ""}
                                onChange={(e) => updateContainerCharge(ct, "acd_value", e.target.value)}
                                placeholder="Enter Charges"
                                className={`${inputCls} flex-1 font-mono`}
                              />
                            </div>
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Field label="Transit Time (Days)">
                <select
                  value={form.transit}
                  onChange={(e) => set("transit")(e.target.value)}
                  className={`${inputCls} w-full`}
                >
                  <option value="">Select Transit Time</option>
                  {TRANSIT_DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>

              <Field label="Routing">
                <select
                  value={form.route === "Direct" || form.route === "" ? form.route : "Via"}
                  onChange={(e) => {
                    const v = e.target.value;
                    set("route")(v === "Via" ? "Via " : v);
                  }}
                  className={`${inputCls} w-full`}
                >
                  <option value="">Select Route</option>
                  {ROUTING_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {form.route && form.route !== "Direct" && (
                  <input
                    type="text"
                    value={form.route.replace(/^Via\s*/i, "")}
                    onChange={(e) => set("route")(`Via ${e.target.value}`)}
                    placeholder="Enter route details (e.g. Colombo, Singapore)"
                    className={`${inputCls} w-full mt-1`}
                  />
                )}
              </Field>

              <Field label="Validity (End Date)" required>
                <input
                  type="date"
                  value={form.validity}
                  onChange={(e) => set("validity")(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch {} }}
                  className={`${inputCls} w-full cursor-pointer`}
                />
                {errors.validity && <span className="text-[9px] text-red-500">{errors.validity}</span>}
              </Field>

              <Field label="Validity Type">
                <select
                  value={form.validity_for}
                  onChange={(e) => set("validity_for")(e.target.value)}
                  className={`${inputCls} w-full`}
                >
                  <option value="">Select Validity Type</option>
                  {VALIDITY_TYPES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* ====== SHIPPING LINE CONTACT PERSON DETAILS ====== */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-visible shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200">
              <User size={14} className="text-violet-600" />
              <h3 className="text-xs font-bold text-violet-800 uppercase tracking-wide">Shipping Line Contact Person Details</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Name" required>
                <AutocompleteContactInput
                  value={form.shipping_name}
                  onChange={handleShippingNameChange}
                  contacts={shippingContactSuggestions}
                  placeholder="Enter Name *"
                />
              </Field>
              <Field label="Number" required>
                <input
                  type="text"
                  value={form.shipping_number}
                  onChange={(e) => set("shipping_number")(e.target.value)}
                  placeholder="Enter Number *"
                  className={`${inputCls} w-full`}
                />
              </Field>
              <Field label="Email" required>
                <input
                  type="text"
                  value={form.shipping_email}
                  onChange={(e) => set("shipping_email")(e.target.value)}
                  placeholder="Enter Email *"
                  className={`${inputCls} w-full`}
                />
              </Field>
              <Field label="Address" required>
                <input
                  type="text"
                  value={form.shipping_address}
                  onChange={(e) => set("shipping_address")(e.target.value)}
                  placeholder="Enter Address *"
                  className={`${inputCls} w-full`}
                />
              </Field>
            </div>
          </div>

          {/* ====== REMARKS ====== */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
              <MessageSquare size={14} className="text-gray-500" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Remarks (Optional)</h3>
            </div>
            <div className="p-4">
              <textarea
                value={form.remarks}
                onChange={(e) => set("remarks")(e.target.value)}
                placeholder="Add any special instructions related to this shipment"
                rows={3}
                className={`${inputCls} w-full resize-none`}
              />
            </div>
          </div>

          {/* Bottom save bar */}
          <div className="flex justify-end gap-2 pt-2 pb-4">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-700 px-4 py-2 border border-gray-200 rounded-lg transition-colors"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold px-5 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : editingRate ? (editingRate._id ? "Update Rate" : "Save as New Rate") : "Save Rate"}
            </button>
          </div>
        </div>

        {/* ======== RIGHT PANEL — 30% Origin Rate Calculator ======== */}
        <div className="w-full lg:w-[30%]">
          <div className="lg:sticky lg:top-20">
            <div className="bg-white border border-orange-200 rounded-lg overflow-hidden shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-2.5">
                <Calculator size={15} />
                <div>
                  <h3 className="text-xs font-bold">Origin Rate Calculator</h3>
                  <p className="text-[9px] text-orange-100 mt-0.5 leading-snug">
                    Select POR, POL, Container Size and Shipping Lines to view applicable rates
                  </p>
                </div>
              </div>

              {/* Selected pills */}
              <div className="px-3 py-2 border-b border-orange-100 bg-orange-50/40">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] font-semibold text-gray-500 uppercase mr-0.5">Selected:</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${form.por ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                    {form.por || "No POR"}
                  </span>
                  <span className="text-gray-300 text-[9px]">+</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${form.pol ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                    {form.pol || "No POL"}
                  </span>
                  <span className="text-gray-300 text-[9px]">+</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${form.shipping_lines ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                    {form.shipping_lines || "No Shipping Lines"}
                  </span>
                  {containerSelections.length > 0 ? (
                    containerSelections.map((ct) => (
                      <React.Fragment key={ct}>
                        <span className="text-gray-300 text-[9px]">+</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                          {ct.replace(" Container", "")}
                        </span>
                      </React.Fragment>
                    ))
                  ) : (
                    <>
                      <span className="text-gray-300 text-[9px]">+</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400">
                        No Container Type
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Charges section — per-container when multiple selected, single otherwise */}
              <div className="px-3 py-2">
                {loadingOrigin && (
                  <div className="flex items-center gap-1.5 text-[10px] text-orange-500 mb-2">
                    <Loader2 size={10} className="animate-spin" />
                    <span>Loading origin rates...</span>
                  </div>
                )}
                {!loadingOrigin && form.por && form.pol && containerSelections.length === 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] mb-2 px-2 py-1 rounded bg-amber-50 text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Add container type to check origin rates
                  </div>
                )}

                {containerSelections.length > 1 ? (
                  /* ---- MULTI-CONTAINER: one charge section per container type ---- */
                  <div className="space-y-3">
                    {containerSelections.map((ct) => {
                      const m = originMatchMap[ct];
                      const charges = originChargeMap[ct] || { bl_fees: "", thc: "", muc: "", toll: "" };
                      return (
                        <div key={ct} className="rounded-md border border-orange-200 overflow-hidden">
                          {/* Sub-header */}
                          <div className={`flex items-center justify-between px-2 py-1 ${m ? "bg-emerald-50" : "bg-red-50"}`}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m ? "bg-emerald-500" : "bg-red-400"}`} />
                              <span className="text-[10px] font-bold text-gray-700">{ct.replace(" Container", "")}</span>
                            </div>
                            <span className={`text-[9px] truncate max-w-[120px] ${m ? "text-emerald-600" : "text-red-500"}`}>
                              {m ? `${m.por} → ${m.pol}` : "No match"}
                            </span>
                          </div>
                          {/* Charges table */}
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-[9px] font-semibold text-gray-400 uppercase border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-1 px-2">Charge</th>
                                <th className="text-right py-1 px-1">Amount</th>
                                <th className="text-left py-1 px-1">Unit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { field: "bl_fees", label: "BL Fees", unit: "/BL" },
                                { field: "thc", label: "THC", unit: "/Cntr" },
                                { field: "muc", label: "MUC", unit: "/BL" },
                                { field: "toll", label: "TOLL", unit: "/Cntr" },
                              ].map(({ field, label, unit }, i, arr) => (
                                <tr key={field} className={`${i < arr.length - 1 ? "border-b border-gray-50" : ""} hover:bg-orange-50/30 transition-colors`}>
                                  <td className="py-1.5 px-2 font-medium text-gray-700">{label}</td>
                                  <td className="py-1.5 px-1">
                                    <input
                                      type="text"
                                      value={charges[field]}
                                      onChange={(e) => updateOriginCharge(ct, field, e.target.value)}
                                      placeholder="0"
                                      className="w-full text-right font-mono text-xs bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-orange-400 focus:outline-none py-0.5 px-1"
                                    />
                                  </td>
                                  <td className="py-1.5 px-1 text-gray-400 text-[10px]">{unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ---- SINGLE CONTAINER: original shared table ---- */
                  <>
                    {!loadingOrigin && form.por && form.pol && containerSelections.length === 1 && (
                      <div className={`flex items-center gap-1.5 text-[10px] mb-2 px-2 py-1 rounded ${originMatch ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${originMatch ? "bg-emerald-500" : "bg-red-400"}`} />
                        {originMatch
                          ? `${originMatch.por} → ${originMatch.pol} | ${originMatch.shipping_lines || "Any"} | ${originMatch.container_type || "Any"}`
                          : "No origin rates found for this combination"}
                      </div>
                    )}
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[9px] font-semibold text-gray-400 uppercase border-b border-gray-200">
                          <th className="text-left py-1.5 pr-2">Charge</th>
                          <th className="text-right py-1.5 px-2">Amount</th>
                          <th className="text-left py-1.5 pl-2">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                          <td className="py-2 pr-2 font-medium text-gray-700">BL Fees</td>
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              value={containerSelections.length === 1 ? (originChargeMap[containerSelections[0]]?.bl_fees ?? form.bl_fees) : form.bl_fees}
                              onChange={(e) => {
                                if (containerSelections.length === 1) updateOriginCharge(containerSelections[0], "bl_fees", e.target.value);
                                set("bl_fees")(e.target.value);
                              }}
                              placeholder="0"
                              className="w-full text-right font-mono text-xs bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-orange-400 focus:outline-none py-0.5 px-1"
                            />
                          </td>
                          <td className="py-2 pl-2 text-gray-400 text-[10px]">/BL</td>
                        </tr>
                        <tr className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                          <td className="py-2 pr-2 font-medium text-gray-700">THC</td>
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              value={containerSelections.length === 1 ? (originChargeMap[containerSelections[0]]?.thc ?? form.thc) : form.thc}
                              onChange={(e) => {
                                if (containerSelections.length === 1) updateOriginCharge(containerSelections[0], "thc", e.target.value);
                                set("thc")(e.target.value);
                              }}
                              placeholder="0"
                              className="w-full text-right font-mono text-xs bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-orange-400 focus:outline-none py-0.5 px-1"
                            />
                          </td>
                          <td className="py-2 pl-2 text-gray-400 text-[10px]">/Container</td>
                        </tr>
                        <tr className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                          <td className="py-2 pr-2 font-medium text-gray-700">MUC</td>
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              value={containerSelections.length === 1 ? (originChargeMap[containerSelections[0]]?.muc ?? form.muc) : form.muc}
                              onChange={(e) => {
                                if (containerSelections.length === 1) updateOriginCharge(containerSelections[0], "muc", e.target.value);
                                set("muc")(e.target.value);
                              }}
                              placeholder="0"
                              className="w-full text-right font-mono text-xs bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-orange-400 focus:outline-none py-0.5 px-1"
                            />
                          </td>
                          <td className="py-2 pl-2 text-gray-400 text-[10px]">/BL</td>
                        </tr>
                        <tr className="hover:bg-orange-50/30 transition-colors">
                          <td className="py-2 pr-2 font-medium text-gray-700">TOLL</td>
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              value={containerSelections.length === 1 ? (originChargeMap[containerSelections[0]]?.toll ?? form.toll) : form.toll}
                              onChange={(e) => {
                                if (containerSelections.length === 1) updateOriginCharge(containerSelections[0], "toll", e.target.value);
                                set("toll")(e.target.value);
                              }}
                              placeholder="0"
                              className="w-full text-right font-mono text-xs bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-orange-400 focus:outline-none py-0.5 px-1"
                            />
                          </td>
                          <td className="py-2 pl-2 text-gray-400 text-[10px]">/Container</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {/* Rail Freight - per container */}
              {!loadingRail && form.por && form.pol && containerSelections.length > 0 &&
                containerSelections.every((ct) => !railMatchMap[ct]) && (
                <div className="px-3 py-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Ship size={12} className="text-purple-500" />
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Rail Freight</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-red-50 text-red-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    No rail freight rates found for this combination
                  </div>
                </div>
              )}
              {containerSelections.map((ct) => {
                const rf = railMatchMap[ct];
                if (!rf) return null;
                const rfData = typeof rf === "string" ? JSON.parse(rf) : rf;
                const cur = rfData.currency || "₹";
                const is40ct = ct.toLowerCase().includes("40");
                const weightRows20 = [
                  { range: "20ft: (0-10 Ton)", value: rfData.weight20ft0_10 },
                  { range: "20ft: (10-20 Ton)", value: rfData.weight20ft10_20 },
                  { range: "20ft: (20-26 Ton)", value: rfData.weight20ft20_26 },
                  { range: "20ft: (26+ Ton)", value: rfData.weight20ft26Plus },
                ].filter((row) => row.value !== undefined);
                const weightRows40 = [
                  { range: "40ft: (10-20 Ton)", value: rfData.weight40ft10_20 },
                  { range: "40ft: (20+ Ton)", value: rfData.weight40ft20Plus },
                ].filter((row) => row.value !== undefined);
                const rows = is40ct ? weightRows40 : weightRows20;
                if (rows.length === 0) return null;
                return (
                  <div key={ct} className="px-3 py-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Ship size={12} className="text-purple-500" />
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">
                        Rail — {ct.replace(" Container", "")}
                      </span>
                      <span className="text-[9px] text-gray-400 ml-auto">(Cargo + Tare Wt)</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[9px] font-semibold text-gray-400 uppercase border-b border-gray-200">
                          <th className="text-left py-1.5 pr-2">Weight Range</th>
                          <th className="text-right py-1.5 px-2">Amount</th>
                          <th className="text-left py-1.5 pl-2">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className={`${i < rows.length - 1 ? "border-b border-gray-50" : ""} hover:bg-purple-50/30 transition-colors`}>
                            <td className="py-1.5 pr-2 font-medium text-gray-700 text-[11px]">{row.range}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-[11px] text-gray-800">{cur}{row.value || 0}</td>
                            <td className="py-1.5 pl-2 text-gray-400 text-[10px]">/Container</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* Custom / Other Charges */}
              <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                {customCharges.map((cc, idx) => (
                  <div key={idx} className="mb-2 bg-gray-50 rounded-md p-2 border border-gray-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <input
                        type="text"
                        value={cc.label}
                        onChange={(e) => updateCustomCharge(idx, "label", e.target.value)}
                        placeholder="Mention Other Charges"
                        className="flex-1 text-[10px] font-medium bg-transparent border-0 border-b border-dashed border-gray-300 focus:border-orange-400 focus:outline-none py-0.5 pr-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomCharge(idx)}
                        className="text-red-400 hover:text-red-600 p-0.5 ml-1"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {containerSelections.length > 1 && (
                      <div className="mb-1.5">
                        <select
                          value={cc.containerType || ""}
                          onChange={(e) => updateCustomCharge(idx, "containerType", e.target.value)}
                          className={`${inputCls} w-full text-[10px]`}
                        >
                          <option value="">All Containers</option>
                          {containerSelections.map((ct) => (
                            <option key={ct} value={ct}>{ct.replace(" Container", "")}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <select
                        value={cc.currency}
                        onChange={(e) => updateCustomCharge(idx, "currency", e.target.value)}
                        className={`${inputCls} w-16 text-[10px]`}
                      >
                        {CURRENCY_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c} {CURRENCY_SYMBOLS[c] || ""}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={cc.value}
                        onChange={(e) => updateCustomCharge(idx, "value", e.target.value)}
                        placeholder="Amount"
                        className={`${inputCls} flex-1 w-20 font-mono text-right text-[10px]`}
                      />
                      <select
                        value={cc.unit}
                        onChange={(e) => updateCustomCharge(idx, "unit", e.target.value)}
                        className={`${inputCls} w-26 text-[10px]`}
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {customCharges.length < 20 && (
                  <button
                    type="button"
                    onClick={addCustomCharge}
                    className="flex items-center gap-1 text-[10px] text-orange-600 hover:text-orange-800 font-semibold w-full justify-center py-1.5 mt-1 border border-dashed border-orange-200 rounded-md hover:bg-orange-50 transition-colors"
                  >
                    <Plus size={11} /> Add Other Charges
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default AddRates;
