import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import PreAdviceNavbar from "./PreAdviceNavbar.jsx";
import ComparisonTable from "./ComparisonTable.jsx";
import PreAdviceForm from "./PreAdviceForm.jsx";
import ViewAllPreAdvice from "./ViewAllPreAdvice.jsx";
import { generatePreAdvicePDF } from "./generatePreAdvicePDF.js";
import {
  ClipboardList,
  ArrowRight,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  FileText,
  Ship,
  MapPin,
  Calendar,
  Package,
  DollarSign,
  User,
  BarChart3,
  X,
  ChevronRight,
  Anchor,
} from "lucide-react";

const API_BASE_URL = "https://papayawhip-antelope-424743.hostingersite.com/api";
const BUYING_RATE_API =
  "https://papayawhip-antelope-424743.hostingersite.com/api/rate-filings";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const normalize = (str) => (str || "").trim().toLowerCase();

/* ---- Charge-name normalizer ---- */
/*
 * Strips suffixes like "Charges", "Charge", "Fee", "Fees" and
 * normalises common abbreviations so that e.g.
 *   "THC" === "THC Charges"    "BL Fees" === "BL Fees Charge"
 *   "Ocean Freight" === "Ocean Freight Charges"
 *   "MUC" === "MUC Charges"
 */
const normalizeChargeName = (name) => {
  let s = (name || "").trim().toLowerCase();
  // strip trailing "charges" / "charge" / "fees" / "fee"
  s = s.replace(/\s+(charges|charge|fees|fee)$/i, "").trim();
  // common aliases
  const aliases = {
    thc: "thc",
    "terminal handling": "thc",
    "terminal handling charge": "thc",
    "bl fee": "bl fee",
    "bl fees": "bl fee",
    bl: "bl fee",
    "b/l fee": "bl fee",
    "b/l": "bl fee",
    muc: "muc",
    "ocean freight": "ocean freight",
    ocean: "ocean freight",
    freight: "ocean freight",
    toll: "toll",
    acd: "acd/ens/afr",
    "acd/ens/afr": "acd/ens/afr",
    ens: "acd/ens/afr",
    afr: "acd/ens/afr",
    "acd charge": "acd/ens/afr",
  };
  return aliases[s] || s;
};

/* ---- Location normalizer (POR / POL / POD) ---- */
/*  "Mundra Port (GJ)" → "mundra port"
 *  "ICD Palwal"       → "icd palwal"
 *  Strips state codes like (GJ), (MH), country suffixes, etc.  */
const normalizeLocation = (loc) => {
  let s = (loc || "").trim().toLowerCase();
  // remove parenthesised state / country codes  e.g. "(GJ)", "(MH)"
  s = s.replace(/\s*\([^)]{1,10}\)\s*/g, " ").trim();
  // remove trailing country after comma  e.g. ", Netherlands" ", India"
  s = s.replace(/,\s*[a-z]+$/i, "").trim();
  return s;
};

/* ---- Shipping-line normalizer ---- */
/* "COSCO Shipping" and "COSCO" → same; "Hapag-Lloyd" vs "Hapag Lloyd" */
const normalizeShippingLine = (sl) => {
  let s = (sl || "").trim().toLowerCase();
  s = s.replace(/[-_]/g, " ");
  // strip common suffixes
  s = s.replace(/\s+(shipping|line|lines|container|logistics)$/g, "").trim();
  s = s.replace(/\s+(shipping|line|lines|container|logistics)$/g, "").trim(); // 2nd pass
  const slAliases = {
    cosco: "cosco",
    "cosco ship": "cosco",
    maersk: "maersk",
    "hapag lloyd": "hapag lloyd",
    "cma cgm": "cma cgm",
    cma: "cma cgm",
    one: "one",
    "ocean network express": "one",
    evergreen: "evergreen",
    msc: "msc",
    zim: "zim",
    hmm: "hmm",
    hyundai: "hmm",
    "wan hai": "wan hai",
    pil: "pil",
    oocl: "oocl",
    sci: "sci",
  };
  return slAliases[s] || s;
};

/* ---- Container / equipment normalizer ---- */
/* "40ft High Cube" ↔ "40ft H.Q" ↔ "40 HC", "20ft Standard" ↔ "20ft ST" */
const normalizeContainerType = (ct) => {
  let s = (ct || "").trim().toLowerCase();
  // normalise ft / foot variants
  s = s.replace(/(\d+)\s*(?:ft|foot|')\s*/g, "$1ft ");
  // remove extra spaces
  s = s.replace(/\s+/g, " ").trim();
  // type aliases
  const typeAliases = [
    {
      patterns: ["high cube", "h.q", "hq", "h.c", "hc", "hi cube"],
      canonical: "hc",
    },
    {
      patterns: ["standard", "st", "std", "gp", "general purpose", "dry"],
      canonical: "st",
    },
    { patterns: ["open top", "ot", "ot-in", "ot in"], canonical: "ot" },
    { patterns: ["flat rack", "fr", "flat"], canonical: "fr" },
    { patterns: ["reefer", "rf", "refrigerated"], canonical: "rf" },
    { patterns: ["haz", "hazardous", "dangerous"], canonical: "haz" },
  ];
  // extract size prefix
  const sizeMatch = s.match(/^(\d+ft)\s*(.*)$/);
  if (sizeMatch) {
    const size = sizeMatch[1];
    let type = sizeMatch[2].replace(/[.\-]/g, " ").replace(/\s+/g, " ").trim();
    for (const alias of typeAliases) {
      if (alias.patterns.some((p) => type === p || type.includes(p))) {
        return `${size} ${alias.canonical}`;
      }
    }
    return `${size} ${type}`;
  }
  return s;
};

/* ---- Generic flexible matchField (uses domain normalisers) ---- */
const matchField = (a, b, fieldType) => {
  if (!(a || "").trim() || !(b || "").trim()) return false;

  let na, nb;
  switch (fieldType) {
    case "location":
      na = normalizeLocation(a);
      nb = normalizeLocation(b);
      break;
    case "shippingLine":
      na = normalizeShippingLine(a);
      nb = normalizeShippingLine(b);
      break;
    case "containerType":
      na = normalizeContainerType(a);
      nb = normalizeContainerType(b);
      break;
    default:
      na = normalize(a);
      nb = normalize(b);
  }

  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // token overlap – if ≥60 % of shorter's tokens appear in longer
  const ta = na.split(/\s+/);
  const tb = nb.split(/\s+/);
  const shorter = ta.length <= tb.length ? ta : tb;
  const longer = ta.length > tb.length ? ta : tb;
  const overlap = shorter.filter((t) => longer.includes(t)).length;
  if (shorter.length > 0 && overlap / shorter.length >= 0.6) return true;
  return false;
};

const normalizeCurrency = (c) => {
  if (c === "₹" || c === "Rs" || c === "Rs.") return "INR";
  return c || "INR";
};

const fmtNum = (v) => {
  const n = Number(v);
  return isNaN(n) ? "0" : n.toLocaleString("en-IN");
};

/** Parse ocean_freight field like "USD $1063" → { currency: "USD", amount: 1063 } */
const parseOceanFreight = (val) => {
  if (!val) return null;
  const str = String(val).trim();
  // Match patterns like "USD $1063", "USD 1063", "$1063", "1063"
  const m = str.match(/^([A-Z]{3})?\s*\$?\s*([\d,.]+)/i);
  if (m) {
    return {
      currency: m[1] ? m[1].toUpperCase() : "USD",
      amount: Number(m[2].replace(/,/g, "")) || 0,
    };
  }
  return null;
};

/**
 * Parse a currency-prefixed value string.
 * Handles: "₹11000" → { currency:"INR", amount:11000 }
 *          "$30"    → { currency:"USD", amount:30 }
 *          "USD $1688" → { currency:"USD", amount:1688 }
 *          "ACD $30"   → { currency:"USD", amount:30 }
 *          "4000"      → { currency:fallback, amount:4000 }
 *          4000 (number) → { currency:fallback, amount:4000 }
 */
const parseCurrencyValue = (val, fallbackCurrency = "INR") => {
  if (val === null || val === undefined || val === "")
    return { currency: fallbackCurrency, amount: 0 };
  // If already a number
  if (typeof val === "number")
    return { currency: fallbackCurrency, amount: val };
  const str = String(val).trim();
  if (!str) return { currency: fallbackCurrency, amount: 0 };

  // Detect currency symbol / code
  let currency = fallbackCurrency;
  if (str.includes("₹") || str.toLowerCase().includes("inr")) currency = "INR";
  else if (str.includes("$") || str.toUpperCase().includes("USD"))
    currency = "USD";
  else if (str.toUpperCase().includes("EUR")) currency = "EUR";

  // Extract numeric part
  const numMatch = str.match(/([\d,.]+)/);
  const amount = numMatch ? Number(numMatch[1].replace(/,/g, "")) || 0 : 0;
  return { currency, amount };
};

/** Check if a charges array has real (non-empty) data */
const hasRealCharges = (arr) =>
  Array.isArray(arr) &&
  arr.some(
    (c) =>
      c.charges &&
      String(c.charges).trim() !== "" &&
      (Number(c.amount) > 0 ||
        Number(c.buyingAmount) > 0 ||
        Number(c.sellingAmount) > 0),
  );

/* ------------------------------------------------------------------ */
/*  Short container label  "40ft High Cube Container" → "40ft H.C"    */
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

/* ------------------------------------------------------------------ */
/*  Transform buying rate → rateFile format  (multi-container aware)   */
/* ------------------------------------------------------------------ */
const transformBuyingRate = (br) => {
  // Resolve container list
  const containerTypes =
    br.container_types?.length > 0
      ? br.container_types
      : br.container_type
        ? [br.container_type]
        : [];
  const isMulti = containerTypes.length > 1;

  // Parse multi-container charge maps
  let parsedContainerCharges = null;
  if (br.containerCharges) {
    try { parsedContainerCharges = typeof br.containerCharges === "string" ? JSON.parse(br.containerCharges) : br.containerCharges; } catch {}
  }
  let parsedOriginChargeMap = null;
  if (br.originChargeMap) {
    try { parsedOriginChargeMap = typeof br.originChargeMap === "string" ? JSON.parse(br.originChargeMap) : br.originChargeMap; } catch {}
  }

  let originCharges = [];
  let freightCharges = [];

  if (isMulti) {
    // ── Multi-container: build per-container rows with [ContainerLabel] suffix ──
    containerTypes.forEach((ct) => {
      const lbl = shortContainerLabel(ct);

      // Origin charges
      const oc = parsedOriginChargeMap?.[ct] || {};
      const bl   = parseCurrencyValue(oc.bl_fees || br.bl_fees);
      const thc  = parseCurrencyValue(oc.thc     || br.thc);
      const muc  = parseCurrencyValue(oc.muc     || br.muc);
      const toll = parseCurrencyValue(oc.toll    || br.toll);
      if (bl.amount   > 0) originCharges.push({ charges: `BL Fee [${lbl}]`,  currency: bl.currency,   amount: bl.amount,   unit: "Per BL" });
      if (thc.amount  > 0) originCharges.push({ charges: `THC [${lbl}]`,     currency: thc.currency,  amount: thc.amount,  unit: "Per Container" });
      if (muc.amount  > 0) originCharges.push({ charges: `MUC [${lbl}]`,     currency: muc.currency,  amount: muc.amount,  unit: "Per Container" });
      if (toll.amount > 0) originCharges.push({ charges: `Toll [${lbl}]`,    currency: toll.currency, amount: toll.amount, unit: "Per Container" });

      // Freight charges
      const cc = parsedContainerCharges?.[ct] || {};
      if (cc.ocean_freight) {
        freightCharges.push({ charges: `Ocean Freight [${lbl}]`, currency: cc.ocean_freight_currency || "USD", amount: Number(cc.ocean_freight) || 0, unit: "Per Container" });
      } else {
        const of2 = parseOceanFreight(br.ocean_freight);
        if (of2?.amount > 0) freightCharges.push({ charges: `Ocean Freight [${lbl}]`, currency: of2.currency, amount: of2.amount, unit: "Per Container" });
      }
      if (cc.acd_value) {
        freightCharges.push({ charges: `${cc.acd_type || "ACD"} [${lbl}]`, currency: cc.acd_currency || "USD", amount: Number(cc.acd_value) || 0, unit: "Per BL" });
      } else if (br.acd_ens_afr && String(br.acd_ens_afr).trim()) {
        const acdP = parseCurrencyValue(br.acd_ens_afr, "USD");
        if (acdP.amount > 0) {
          const tm = String(br.acd_ens_afr).match(/^(ACD|ENS|AFR)/i);
          freightCharges.push({ charges: `${tm?.[1]?.toUpperCase() || "ACD"} [${lbl}]`, currency: acdP.currency, amount: acdP.amount, unit: "Per BL" });
        }
      }
    });

    // Custom charges (may be container-specific)
    if (br.customCharges) {
      try {
        const customs = typeof br.customCharges === "string" ? JSON.parse(br.customCharges) : br.customCharges;
        (customs || []).forEach((cc) => {
          if (cc.label && cc.value) {
            const p = parseCurrencyValue(cc.value);
            if (p.amount > 0) {
              const suffix = cc.containerType ? ` [${shortContainerLabel(cc.containerType)}]` : "";
              freightCharges.push({ charges: `${cc.label}${suffix}`, currency: p.currency, amount: p.amount, unit: cc.unit || "Per Container" });
            }
          }
        });
      } catch {}
    }
  } else {
    // ── Single-container (legacy) path ──
    const thcParsed  = parseCurrencyValue(br.thc);
    const blParsed   = parseCurrencyValue(br.bl_fees);
    const mucParsed  = parseCurrencyValue(br.muc);
    const tollParsed = parseCurrencyValue(br.toll);
    const originItems = [
      { charges: "THC",    currency: thcParsed.currency,  amount: thcParsed.amount,  unit: "Per Container" },
      { charges: "BL Fee", currency: blParsed.currency,   amount: blParsed.amount,   unit: "Per BL" },
      { charges: "MUC",    currency: mucParsed.currency,  amount: mucParsed.amount,  unit: "Per Container" },
      { charges: "Toll",   currency: tollParsed.currency, amount: tollParsed.amount, unit: "Per Container" },
    ];
    if (br.customLabel && br.customValue) {
      const customParsed = parseCurrencyValue(br.customValue);
      if (customParsed.amount > 0) originItems.push({ charges: br.customLabel, currency: customParsed.currency, amount: customParsed.amount, unit: br.customUnit || "Per Container" });
    }
    originCharges = originItems.filter((c) => c.amount > 0);

    const of = parseOceanFreight(br.ocean_freight);
    if (of?.amount > 0) freightCharges.push({ charges: "Ocean Freight", currency: of.currency, amount: of.amount, unit: "Per Container" });
    if (br.acd_ens_afr && String(br.acd_ens_afr).trim()) {
      const acdParsed = parseCurrencyValue(br.acd_ens_afr, "USD");
      if (acdParsed.amount > 0) {
        const typeMatch = String(br.acd_ens_afr).match(/^(ACD|ENS|AFR)/i);
        freightCharges.push({ charges: typeMatch?.[1]?.toUpperCase() || "ACD/ENS/AFR", currency: acdParsed.currency, amount: acdParsed.amount, unit: "Per BL" });
      }
    }
  }

  const routeParts = [br.por, br.pol, br.pod].filter(Boolean);

  return {
    shippingLine: br.shipping_lines || "",
    shippingLineContact: {
      name: br.shipping_name || "",
      email: br.shipping_email || "",
      phone: br.shipping_number || "",
      designation: br.shipping_address || "",
    },
    validity: br.validity || "",
    routing: routeParts.join(" → "),
    transitTime: br.transit
      ? /day/i.test(String(br.transit)) ? String(br.transit).trim() : `${br.transit} Days`
      : "",
    equipmentSize: containerTypes.length > 0 ? containerTypes.join(", ") : (br.container_type || ""),
    equipmentSizes: containerTypes,
    isMultiContainer: isMulti,
    commodity: br.commodity || "",
    por: br.por || "",
    pol: br.pol || "",
    pod: br.pod || "",
    fdrr: br.fdrr || "",
    finalDestination: br.finalDestination || br.fdrr || br.pod || "",
    railRamp: br.railRamp || "",
    term: "",
    route: br.route || "",
    originCharges,
    freightCharges,
    destinationCharges: [],
    ddpCharges: 0,
    remarks: br.remarks || "",
    railFreightRates:
      typeof br.railFreightRates === "object" && br.railFreightRates !== null
        ? br.railFreightRates
        : typeof br.railFreightRates === "string" && br.railFreightRates
          ? (() => { try { return JSON.parse(br.railFreightRates); } catch { return br.railFreightRates; } })()
          : "",
  };
};

/* ------------------------------------------------------------------ */
/*  Expand per-container charges (containerAmounts) into flat rows     */
/* ------------------------------------------------------------------ */
const expandMultiContainerCharges = (charges, equipmentList) => {
  if (!equipmentList || equipmentList.length <= 1) {
    return (charges || [])
      .map((c) => ({ ...c, amount: Number(c.amount) || 0 }))
      .filter((c) => (c.charges && String(c.charges).trim() !== "") || Number(c.amount) > 0);
  }
  const ctypes = equipmentList.map((e) => e.type);
  const result = [];
  (charges || []).forEach((c) => {
    if (!c.charges || String(c.charges).trim() === "") return;
    const ca = c.containerAmounts || {};
    if (Object.keys(ca).length > 0) {
      ctypes.forEach((ct) => {
        const val = ca[ct];
        if (val !== undefined && val !== "") {
          const amt = Number(val) || 0;
          if (amt > 0) result.push({ charges: `${c.charges} [${shortContainerLabel(ct)}]`, currency: c.currency || "INR", amount: amt, unit: c.unit || "Per Container" });
        }
      });
    } else {
      const amt = Number(c.amount) || 0;
      if (amt > 0) result.push({ charges: c.charges, currency: c.currency || "INR", amount: amt, unit: c.unit || "Per Container" });
    }
  });
  return result;
};

/* ------------------------------------------------------------------ */
/*  Transform quotation → format for child components (multi-cont.)    */
/* ------------------------------------------------------------------ */
const transformQuotation = (q) => {
  const custLines = (q.customerName || "").split("\n").filter(Boolean);
  const consLines = (q.consigneeName || "").split("\n").filter(Boolean);

  // Resolve equipment list
  const equipmentList = q.equipmentList?.length > 0
    ? q.equipmentList
    : q.equipment ? [{ type: q.equipment, qty: 1 }] : [];
  const isMulti = equipmentList.length > 1;
  const containerTypes = equipmentList.map((e) => e.type);

  // Expand charges — for multi-container, expand containerAmounts into per-container rows
  const filterCharges = (arr) =>
    isMulti
      ? expandMultiContainerCharges(arr, equipmentList)
      : (arr || [])
          .map((c) => ({ ...c, amount: Number(c.amount) || 0 }))
          .filter((c) => (c.charges && String(c.charges).trim() !== "") || c.amount > 0);

  return {
    quotationNumber: q.id || q.quotationNumber || "",
    quotationSegment: q.quotationSegment || "",
    dateOfBooking: "",
    bookedBy: q.createdBy || "",
    customer: {
      name: custLines[0] || "",
      address: custLines.slice(1).join("\n"),
      gstin: "",
      contactPerson: "",
      phone: "",
      email: "",
    },
    consignee: {
      name: consLines[0] || "",
      address: consLines.slice(1).join("\n"),
      contactPerson: "",
      phone: "",
      email: "",
    },
    shipper: "",
    shippingLine: q.shippingLine || "",
    routing: [q.por, q.pol, q.pod].filter(Boolean).join(" → "),
    transitTime: q.transitTime || "",
    equipmentSize: isMulti ? containerTypes.join(", ") : (q.equipment || ""),
    equipmentSizes: containerTypes,
    isMultiContainer: isMulti,
    commodity: q.commodity || "",
    cargoWeight: q.cargoWeight || q.weight || "",
    noOfContainers: q.numberOfPackets || "",
    por: q.por || "",
    pol: q.pol || "",
    pod: q.pod || "",
    finalDestination: q.finalDestination || q.pod || "",
    railRamp: q.railRamp || "",
    term: q.terms || "",
    forwarding: "",
    cha: "",
    transportation: "",
    originCharges: filterCharges(q.originCharges),
    freightCharges: filterCharges(q.freightCharges),
    destinationCharges: filterCharges(q.destinationCharges),
    ddpCharges: 0,
    remarks: q.remarks || "",
    agentDetails: "",
    termsAndConditions: q.termsAndConditions || [],
    etd: q.etd || "",
    cargoSize: q.cargoSize || "",
    cbm: q.cbm || "",
    size: q.size || "",
    serviceJobType: q.serviceJobType || "",
    createdBy: q.createdBy || "",
    createdDate: q.createdDate || q.createdAt || "",
  };
};

/* ================================================================== */
/*  PreAdvice Component                                                */
/* ================================================================== */
const PreAdvice = ({
  onBack,
  initialQuotation,
  onInitialQuotationConsumed,
}) => {
  /* --- data --- */
  const [quotations, setQuotations] = useState([]);
  const [buyingRates, setBuyingRates] = useState([]);
  const [loading, setLoading] = useState({
    quotations: false,
    buyingRates: false,
  });
  const [errors, setErrors] = useState({ quotations: null, buyingRates: null });

  /* --- selection --- */
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  /* --- matching --- */
  const [matchResults, setMatchResults] = useState(null);
  const [selectedBuyingRate, setSelectedBuyingRate] = useState(null);
  const [isMatching, setIsMatching] = useState(false);

  /* --- views --- */
  const [step, setStep] = useState("viewall"); // select | viewall | results | working | edit
  const [subView, setSubView] = useState("comparison"); // comparison | preview

  /* --- edit mode --- */
  const [editPreAdvice, setEditPreAdvice] = useState(null);

  /* --- formatted data for child components --- */
  const [rateFile, setRateFile] = useState(null);
  const [quotationFormatted, setQuotationFormatted] = useState(null);
  const [comparisonTotals, setComparisonTotals] = useState(null);

  /* ============ FETCH DATA ============ */
  useEffect(() => {
    fetchQuotations();
    fetchBuyingRates();
  }, []);

  /* If an external quotation was passed (e.g. from Quotation module), auto-select it */
  useEffect(() => {
    if (initialQuotation && buyingRates.length > 0 && quotations.length > 0) {
      setSelectedQuotation(initialQuotation);
      setStep("select");
      if (onInitialQuotationConsumed) onInitialQuotationConsumed();
    }
  }, [initialQuotation, buyingRates.length, quotations.length]);

  /* Auto-run matching when a quotation is selected from the table */
  useEffect(() => {
    if (selectedQuotation && step === "select" && buyingRates.length > 0) {
      runMatching();
    }
  }, [selectedQuotation]);

  const fetchQuotations = async () => {
    setLoading((l) => ({ ...l, quotations: true }));
    setErrors((e) => ({ ...e, quotations: null }));
    try {
      /* ---- resolve current user & role ---- */
      let cu = null;
      try { cu = JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { cu = {}; }
      const role = (cu?.role || "").toLowerCase();
      const isAdminUser = role === "admin" || role === "super admin";

      /* ---- build URL (backend filter for non-admins) ---- */
      let url = `${API_BASE_URL}/quotations`;
      if (!isAdminUser && (cu?.username || cu?.fullName)) {
        const name = cu.fullName || cu.username;
        url += `?createdBy=${encodeURIComponent(name)}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        let nonDrafts = json.data.filter((q) => !q.isDraft);

        /* ---- frontend fallback: double-check ownership for non-admins ---- */
        if (!isAdminUser && cu) {
          const uname = (cu.username || "").toLowerCase();
          const fname = (cu.fullName || "").toLowerCase();
          nonDrafts = nonDrafts.filter((q) => {
            const cb = (q.createdBy || "").toLowerCase();
            return cb === uname || cb === fname || cb.includes(uname) || cb.includes(fname);
          });
        }

        setQuotations(nonDrafts);
      } else {
        setErrors((e) => ({ ...e, quotations: "Failed to load quotations" }));
      }
    } catch (err) {
      setErrors((e) => ({ ...e, quotations: err.message }));
    } finally {
      setLoading((l) => ({ ...l, quotations: false }));
    }
  };

  const fetchBuyingRates = async () => {
    setLoading((l) => ({ ...l, buyingRates: true }));
    setErrors((e) => ({ ...e, buyingRates: null }));
    try {
      const res = await fetch(BUYING_RATE_API);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json.data || [];
      if (arr.length >= 0) {
        setBuyingRates(arr);
      } else {
        setErrors((e) => ({ ...e, buyingRates: "Unexpected format" }));
      }
    } catch (err) {
      setErrors((e) => ({ ...e, buyingRates: err.message }));
    } finally {
      setLoading((l) => ({ ...l, buyingRates: false }));
    }
  };

  /* ============ FILTERED QUOTATIONS ============ */
  const filteredQuotations = useMemo(() => {
    if (!searchQuery.trim()) return quotations;
    const q = normalize(searchQuery);
    return quotations.filter(
      (qt) =>
        normalize(qt.id).includes(q) ||
        normalize(qt.customerName).includes(q) ||
        normalize(qt.shippingLine).includes(q) ||
        normalize(qt.por).includes(q) ||
        normalize(qt.pol).includes(q) ||
        normalize(qt.pod).includes(q) ||
        normalize(qt.finalDestination).includes(q) ||
        normalize(qt.commodity).includes(q) ||
        normalize(qt.equipment).includes(q) ||
        normalize(qt.quotationSegment).includes(q) ||
        normalize(qt.terms).includes(q),
    );
  }, [quotations, searchQuery]);

  /* ============ MATCHING LOGIC (5 fields: POR, POL, POD, Shipping Line, Container Type) ============ */
  const runMatching = useCallback(() => {
    if (!selectedQuotation || buyingRates.length === 0) return;
    setIsMatching(true);

    const qPor = selectedQuotation.por || "";
    const qPol = selectedQuotation.pol || "";
    const qPod = selectedQuotation.pod || "";
    const qShippingLine = selectedQuotation.shippingLine || "";

    // Resolve quotation container types from equipmentList (multi) or equipment (single/summary)
    const qEquipmentList = selectedQuotation.equipmentList?.length > 0
      ? selectedQuotation.equipmentList
      : selectedQuotation.equipment
        ? [{ type: selectedQuotation.equipment, qty: 1 }]
        : [];
    const qContainerTypes = qEquipmentList.map((e) => e.type).filter(Boolean);

    const matches = [];
    const fieldStats = { por: 0, pol: 0, pod: 0, shippingLine: 0, containerType: 0 };

    buyingRates.forEach((br) => {
      const porMatch = matchField(qPor, br.por, "location");
      const polMatch = matchField(qPol, br.pol, "location");
      const podMatch = matchField(qPod, br.pod, "location");
      const slMatch  = matchField(qShippingLine, br.shipping_lines, "shippingLine");

      // Container match: ANY quotation container matches ANY buying rate container
      const brContainerTypes = br.container_types?.length > 0
        ? br.container_types
        : br.container_type ? [br.container_type] : [];
      const ctMatch =
        qContainerTypes.length === 0 || brContainerTypes.length === 0
          ? false
          : qContainerTypes.some((qt) =>
              brContainerTypes.some((bt) => matchField(qt, bt, "containerType"))
            );

      const score = [porMatch, polMatch, podMatch, slMatch, ctMatch].filter(Boolean).length;

      if (porMatch) fieldStats.por++;
      if (polMatch) fieldStats.pol++;
      if (podMatch) fieldStats.pod++;
      if (slMatch)  fieldStats.shippingLine++;
      if (ctMatch)  fieldStats.containerType++;

      if (score === 5) {
        matches.push({
          buyingRate: br,
          score,
          maxScore: 5,
          fields: { por: porMatch, pol: polMatch, pod: podMatch, shippingLine: slMatch, containerType: ctMatch },
        });
      }
    });

    matches.sort((a, b) => b.score - a.score);

    setMatchResults({
      matches,
      totalBuyingRates: buyingRates.length,
      fieldStats,
      quotationFields: {
        por: qPor,
        pol: qPol,
        pod: qPod,
        shippingLine: qShippingLine,
        equipment: qContainerTypes.join(", ") || selectedQuotation.equipment || "",
      },
    });
    setStep("results");
    setIsMatching(false);
  }, [selectedQuotation, buyingRates]);

  /* ============ SELECT BUYING RATE ============ */
  const handleSelectBuyingRate = (br) => {
    setSelectedBuyingRate(br);
    setRateFile(transformBuyingRate(br));
    setQuotationFormatted(transformQuotation(selectedQuotation));
    setStep("working");
    setSubView("comparison");
  };

  /* ============ PDF ============ */
  const handleGeneratePDF = async (formData) => {
    // 1. Check for duplicate Job Number
    const jobNo = (formData.jobNo || "").trim();
    if (jobNo) {
      try {
        const checkRes = await fetch(`${API_BASE_URL}/pre-advice`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
        });
        const checkJson = await checkRes.json();
        const existing = Array.isArray(checkJson) ? checkJson : checkJson.data || [];
        const duplicate = existing.find(
          (pa) => normalize(pa.jobNo) === normalize(jobNo),
        );
        if (duplicate) {
          alert("A Pre-Advice with this Job Number already exists.");
          return;
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
      }
    }

    // 2. Generate & download the PDF
    generatePreAdvicePDF(formData);

    // 3. Save to backend
    try {
      const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); }
        catch { return {}; }
      })();
      const payload = {
        ...formData,
        createdBy: currentUser.fullName || currentUser.username || "",
      };
      const res = await fetch(`${API_BASE_URL}/pre-advice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error("Save pre-advice failed:", res.status, errBody);
      }
    } catch (err) {
      console.error("Failed to save pre-advice:", err);
    }

    // 4. Redirect to View All
    setSelectedQuotation(null);
    setMatchResults(null);
    setSelectedBuyingRate(null);
    setRateFile(null);
    setQuotationFormatted(null);
    setStep("viewall");
    setSearchQuery("");
  };

  /* ============ EDIT PRE-ADVICE ============ */
  const handleEditPreAdvice = (pa) => {
    setEditPreAdvice(pa);
    setStep("edit");
  };

  const handleEditSave = async (formData) => {
    if (!editPreAdvice?._id) return;
    try {
      const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); }
        catch { return {}; }
      })();
      const payload = {
        ...formData,
        createdBy: editPreAdvice.createdBy || currentUser.fullName || currentUser.username || "",
      };
      const res = await fetch(`${API_BASE_URL}/pre-advice/${editPreAdvice._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error("Update pre-advice failed:", res.status, errBody);
        alert("Failed to update Pre-Advice. Please try again.");
        return;
      }
      alert("Pre-Advice updated successfully!");
      setEditPreAdvice(null);
      setStep("viewall");
      setViewAllKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to update pre-advice:", err);
      alert("Failed to update Pre-Advice. Please try again.");
    }
  };

  /* ============ RESET ============ */
  const handleReset = () => {
    setSelectedQuotation(null);
    setMatchResults(null);
    setSelectedBuyingRate(null);
    setRateFile(null);
    setQuotationFormatted(null);
    setStep("select");
    setSearchQuery("");
  };

  /* ============ VIEW ALL KEY (force refresh) ============ */
  const [viewAllKey, setViewAllKey] = useState(0);

  /* ============ SUB-NAV HANDLER ============ */
  const handleSubNav = (view) => {
    if (view === "viewall") {
      setEditPreAdvice(null);
      setStep("viewall");
      setViewAllKey((k) => k + 1);
    } else if (view === "create") {
      setEditPreAdvice(null);
      handleReset();
    } else if (step === "working") {
      setSubView(view === "comparison" ? "comparison" : "preview");
    }
  };

  /* ============ AUTOCOMPLETE REF ============ */
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ============ SELLING RATE SUMMARY (computed from selected quotation) ============ */
  const sellingRateSummary = useMemo(() => {
    if (!selectedQuotation) return null;
    const q = selectedQuotation;
    const originTotal = (q.originCharges || []).reduce(
      (s, c) => s + (Number(c.amount) || 0),
      0,
    );
    const freightTotal = (q.freightCharges || []).reduce(
      (s, c) => s + (Number(c.amount) || 0),
      0,
    );
    const destTotal = (q.destinationCharges || []).reduce(
      (s, c) => s + (Number(c.amount) || 0),
      0,
    );
    return {
      originTotal,
      freightTotal,
      destTotal,
      grandTotal: originTotal + freightTotal + destTotal,
    };
  }, [selectedQuotation]);

  /* ============ RENDER ============ */
  return (
    <div className="min-h-screen bg-gray-50">
      <PreAdviceNavbar
        onBack={onBack}
        currentSubView={
          step === "viewall" || step === "edit"
            ? "viewall"
            : step === "working"
              ? subView
              : "create"
        }
        onNavigate={handleSubNav}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* ====== VIEW ALL PRE-ADVICE ====== */}
        {step === "viewall" && <ViewAllPreAdvice key={viewAllKey} onEditPreAdvice={handleEditPreAdvice} />}

        {/* ====== STEP 1: SELECT QUOTATION ====== */}
        {step === "select" && (
          <div className="space-y-5">
            {/* Loading / Error bar */}
            {(loading.quotations || loading.buyingRates) && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-1">
                <Loader2 size={16} className="animate-spin" />
                <span>
                  {loading.quotations && "Loading quotations..."}
                  {loading.quotations && loading.buyingRates && " | "}
                  {loading.buyingRates && "Loading buying rates..."}
                </span>
              </div>
            )}
            {(errors.quotations || errors.buyingRates) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle
                  size={16}
                  className="text-red-500 mt-0.5 flex-shrink-0"
                />
                <div className="text-sm text-red-700">
                  {errors.quotations && <p>Quotations: {errors.quotations}</p>}
                  {errors.buyingRates && (
                    <p>Buying Rates: {errors.buyingRates}</p>
                  )}
                  <button
                    onClick={() => {
                      fetchQuotations();
                      fetchBuyingRates();
                    }}
                    className="mt-1 text-xs text-red-600 underline hover:text-red-800 flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Retry
                  </button>
                </div>
              </div>
            )}

            {/* ── Hero Search Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4">
                <h2 className="text-white font-bold text-base flex items-center gap-2">
                  <ClipboardList size={20} />
                  Generate Pre-Advice
                </h2>
                <p className="text-indigo-100 text-xs mt-0.5">
                  Select a quotation from the list below, or search to filter.
                  The system will auto-match buying rates.
                </p>
              </div>

              <div className="p-6">
                {/* Search input with autocomplete */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by quotation number, customer, POR, POL, POD..."
                      className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-full font-semibold">
                      {filteredQuotations.length}/{quotations.length}
                    </span>
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-full font-semibold">
                      {buyingRates.length} rates
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Quotation Table ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-500" />
                  {searchQuery.trim()
                    ? `${filteredQuotations.length} result${filteredQuotations.length !== 1 ? "s" : ""} for "${searchQuery}"`
                    : `All Quotations (${quotations.length})`}
                </h3>
              </div>
              <div className="overflow-x-auto">
                {loading.quotations ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                    <Loader2
                      size={20}
                      className="animate-spin text-indigo-400"
                    />
                    Loading quotations...
                  </div>
                ) : filteredQuotations.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    {searchQuery.trim()
                      ? `No quotations match "${searchQuery}"`
                      : "No quotations available"}
                  </div>
                ) : (
                  <table
                    className="w-full text-xs table-fixed border border-gray-200"
                    style={{ minWidth: "880px" }}
                  >
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                      <tr className="divide-x divide-gray-200">
                        <th className="w-[130px] px-2 py-2 text-left font-semibold">
                          Quotation #
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          Customer
                        </th>
                        <th className="w-[100px] px-2 py-2 text-left font-semibold">
                          Shipping Line
                        </th>
                        <th className="w-[90px] px-2 py-2 text-left font-semibold">
                          Equipment
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          POR
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          POL
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          POD
                        </th>

                        <th className=" px-2 py-2 text-center font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredQuotations.map((qt) => {
                        const custName = qt.customerName
                          ? qt.customerName.split("\n")[0].substring(0, 30)
                          : "—";
                        return (
                          <tr
                            key={qt._id || qt.id}
                            className="hover:bg-indigo-50/40 transition-colors divide-x divide-gray-200"
                          >
                            <td className="px-2 py-2 font-bold text-indigo-700 whitespace-nowrap">
                              {qt.id}
                            </td>
                            <td
                              className="px-2 py-2 text-gray-700 truncate"
                              title={custName}
                            >
                              {custName}
                            </td>
                            <td className="px-2 py-2 text-gray-600 truncate">
                              {qt.shippingLine || "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-600 truncate">
                              {qt.equipment || "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-600 truncate">
                              {qt.por || "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-600 truncate">
                              {qt.pol || "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-600 truncate">
                              {qt.pod || "—"}
                            </td>

                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => {
                                  setSelectedQuotation(qt);
                                  setSearchQuery(qt.id);
                                }}
                                disabled={
                                  buyingRates.length === 0 || isMatching
                                }
                                className="inline-flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                              >
                                <BarChart3 size={12} /> Compare Rates
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====== STEP 2: BUYING RATES FOR SELECTED QUOTATION ====== */}
        {step === "results" && matchResults && (
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={handleReset}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
            >
              ← Back to Quotation List
            </button>

            {/* Selected Quotation info bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-indigo-700 text-sm">
                    {selectedQuotation?.id}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">
                    {selectedQuotation?.customerName
                      ? selectedQuotation.customerName
                          .split("\n")[0]
                          .substring(0, 40)
                      : "—"}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-blue-600 flex items-center gap-1">
                    <Ship size={11} />
                    {selectedQuotation?.shippingLine || "—"}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">
                    {selectedQuotation?.equipment || "—"}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500 flex items-center gap-1">
                    <MapPin size={11} />
                    {[
                      selectedQuotation?.por,
                      selectedQuotation?.pol,
                      selectedQuotation?.pod,
                    ]
                      .filter(Boolean)
                      .join(" → ")}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">
                  {matchResults.matches.length} matching rate
                  {matchResults.matches.length !== 1 ? "s" : ""} found (out of{" "}
                  {matchResults.totalBuyingRates})
                </span>
              </div>
            </div>

            {/* Buying Rates Table */}
            {matchResults.matches.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/80">
                  <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Anchor size={14} className="text-indigo-500" />
                    Available Buying Rates — Select one to proceed
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-xs table-fixed border border-gray-200"
                    style={{ minWidth: "820px" }}
                  >
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                      <tr className="divide-x divide-gray-200">
                        <th className="w-[36px] px-2 py-2 text-left font-semibold">
                          #
                        </th>
                        <th className="w-[120px] px-2 py-2 text-left font-semibold">
                          Shipping Line
                        </th>
                        <th className="w-[100px] px-2 py-2 text-left font-semibold">
                          Container
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          POR
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          POL
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          POD
                        </th>
                        <th className="w-[100px] px-2 py-2 text-left font-semibold">
                          Ocean Freight
                        </th>
                        <th className="w-[100px] px-2 py-2 text-left font-semibold">
                          Validity
                        </th>
                        <th className="w-[100px] px-2 py-2 text-center font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {matchResults.matches.map((m, idx) => {
                        const br = m.buyingRate;
                        const ofParsed = parseOceanFreight(br.ocean_freight);
                        const isFullMatch = m.score === 5;
                        return (
                          <tr
                            key={br._id || idx}
                            className={`transition-colors divide-x divide-gray-200 ${isFullMatch ? "bg-emerald-50/60 border-l-[3px] border-l-emerald-500 hover:bg-emerald-50" : "hover:bg-indigo-50/40"}`}
                          >
                            <td className="px-2 py-2 text-gray-400 font-medium">
                              {idx + 1}
                            </td>
                            <td className="px-2 py-2 font-semibold text-gray-800">
                              <span className="truncate block">
                                {br.shipping_lines}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-gray-600">
                              {(br.container_types?.length > 0 ? br.container_types : [br.container_type]).filter(Boolean).map((ct) => (
                                <span key={ct} className="inline-block bg-gray-100 text-gray-700 rounded px-1 py-0.5 text-[9px] mr-0.5 mb-0.5">{shortContainerLabel(ct)}</span>
                              ))}
                            </td>
                            <td className="px-2 py-2 text-gray-600 truncate">
                              {br.por || "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-600 truncate">
                              {br.pol || "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-600 truncate">
                              {br.pod || "—"}
                            </td>
                            <td className="px-2 py-2 text-left font-semibold text-blue-700 whitespace-nowrap">
                              {ofParsed && ofParsed.amount > 0
                                ? `${ofParsed.currency} ${fmtNum(ofParsed.amount)}`
                                : "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-500 whitespace-nowrap">
                              {br.validity
                                ? new Date(br.validity)
                                    .toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                    .replace(/ /g, "-")
                                : "—"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => handleSelectBuyingRate(br)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${isFullMatch ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                              >
                                Select <ChevronRight size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-amber-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-amber-800">
                    No matching buying rates
                  </h3>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  No buying rates matched at least 2 of the 5 criteria (POR,
                  POL, POD, Shipping Line, Container Type) for quotation{" "}
                  <b>{selectedQuotation?.id}</b>. Try a different quotation or
                  add more rates in Rate Filing.
                </p>
                <button
                  onClick={handleReset}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <ArrowRight size={12} className="rotate-180" /> Back to
                  quotation list
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====== STEP 3: WORKING (Comparison / Preview) ====== */}
        {step === "working" && rateFile && quotationFormatted && (
          <>
            {/* Info bar */}
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2 mb-4 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-indigo-700">
                  {selectedQuotation?.id}
                </span>
                <span className="text-gray-400">↔</span>
                <span className="font-semibold text-blue-700">
                  {selectedBuyingRate?.shipping_lines} —{" "}
                  {(selectedBuyingRate?.container_types?.length > 0
                    ? selectedBuyingRate.container_types
                    : [selectedBuyingRate?.container_type]
                  ).filter(Boolean).map((ct) => shortContainerLabel(ct)).join(", ")}
                </span>
                <span className="text-gray-400">
                  ({selectedBuyingRate?.por} → {selectedBuyingRate?.pol})
                </span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Start Over
              </button>
            </div>

            {subView === "comparison" && (
              <ComparisonTable
                rateFile={rateFile}
                quotation={quotationFormatted}
                onProceed={(t) => { setComparisonTotals(t); setSubView("preview"); }}
              />
            )}

            {subView === "preview" && (
              <PreAdviceForm
                rateFile={rateFile}
                quotation={quotationFormatted}
                onGeneratePDF={handleGeneratePDF}
                initialTotals={comparisonTotals}
              />
            )}
          </>
        )}

        {/* ====== EDIT PRE-ADVICE ====== */}
        {step === "edit" && editPreAdvice && (
          <>
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-700">
                  Editing: {editPreAdvice.jobNo || "Pre-Advice"}
                </span>
              </div>
              <button
                onClick={() => {
                  setEditPreAdvice(null);
                  setStep("viewall");
                  setViewAllKey((k) => k + 1);
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Cancel
              </button>
            </div>
            <PreAdviceForm
              rateFile={{
                shippingLine: editPreAdvice.shippingLine || "",
                routing: editPreAdvice.routing || "",
                transitTime: editPreAdvice.transitTime || "",
                equipmentSize: editPreAdvice.equipmentSize || "",
                commodity: editPreAdvice.commodity || "",
                por: editPreAdvice.por || "",
                pol: editPreAdvice.pol || "",
                pod: editPreAdvice.pod || "",
                finalDestination: editPreAdvice.finalDestination || "",
                term: editPreAdvice.term || "",
                ddpCharges: editPreAdvice.ddpBuying ?? 0,
                originCharges: (editPreAdvice.originCharges || []).map((c) => ({
                  charges: c.charges || "",
                  currency: c.currency || "USD",
                  amount: c.buyingAmount ?? 0,
                  unit: c.unit || "Per Container",
                })),
                freightCharges: (editPreAdvice.freightCharges || []).map((c) => ({
                  charges: c.charges || "",
                  currency: c.currency || "USD",
                  amount: c.buyingAmount ?? 0,
                  unit: c.unit || "Per Container",
                })),
                destinationCharges: (editPreAdvice.destinationCharges || []).map((c) => ({
                  charges: c.charges || "",
                  currency: c.currency || "USD",
                  amount: c.buyingAmount ?? 0,
                  unit: c.unit || "Per Container",
                })),
                shippingLineContact: {
                  name: editPreAdvice.slContactName || "",
                  email: editPreAdvice.slContactEmail || "",
                  phone: editPreAdvice.slContactPhone || "",
                  designation: editPreAdvice.slContactDesignation || "",
                },
              }}
              quotation={{
                quotationNumber: editPreAdvice.jobNo || "",
                dateOfBooking: editPreAdvice.dateOfBooking || "",
                bookedBy: editPreAdvice.bookedBy || "",
                shippingLine: editPreAdvice.shippingLine || "",
                routing: editPreAdvice.routing || "",
                transitTime: editPreAdvice.transitTime || "",
                equipmentSize: editPreAdvice.equipmentSize || "",
                commodity: editPreAdvice.commodity || "",
                cargoWeight: editPreAdvice.cargoWeight || "",
                noOfContainers: editPreAdvice.noOfContainers ?? "",
                por: editPreAdvice.por || "",
                pol: editPreAdvice.pol || "",
                pod: editPreAdvice.pod || "",
                finalDestination: editPreAdvice.finalDestination || "",
                term: editPreAdvice.term || "",
                shipper: editPreAdvice.shipper || "",
                customer: {
                  name: editPreAdvice.customerName || "",
                  address: editPreAdvice.customerAddress || "",
                },
                consignee: {
                  name: editPreAdvice.consigneeName || "",
                  address: editPreAdvice.consigneeAddress || "",
                  contactPerson: editPreAdvice.consigneeContact || "",
                  phone: editPreAdvice.consigneePhone || "",
                  email: editPreAdvice.consigneeEmail || "",
                },
                ddpCharges: editPreAdvice.ddpSelling ?? 0,
                remarks: editPreAdvice.remarks || "",
                originCharges: (editPreAdvice.originCharges || []).map((c) => ({
                  charges: c.charges || "",
                  currency: c.currency || "USD",
                  amount: c.sellingAmount ?? 0,
                  unit: c.unit || "Per Container",
                })),
                freightCharges: (editPreAdvice.freightCharges || []).map((c) => ({
                  charges: c.charges || "",
                  currency: c.currency || "USD",
                  amount: c.sellingAmount ?? 0,
                  unit: c.unit || "Per Container",
                })),
                destinationCharges: (editPreAdvice.destinationCharges || []).map((c) => ({
                  charges: c.charges || "",
                  currency: c.currency || "USD",
                  amount: c.sellingAmount ?? 0,
                  unit: c.unit || "Per Container",
                })),
              }}
              onGeneratePDF={handleGeneratePDF}
              editMode
              onSaveEdit={handleEditSave}
              initialTotals={{ buying: editPreAdvice.totalBuying ?? 0, selling: editPreAdvice.totalSelling ?? 0, margin: editPreAdvice.totalMargin ?? 0 }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PreAdvice;
