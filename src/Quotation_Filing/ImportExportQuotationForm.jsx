import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FileText,
  Send,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Search,
  Save,
  GripVertical,
  ArrowLeft,
  List,
  FilePlus,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import OmTransLogo from "../assets/OmTrans_PDF.jpg"; // Import the logo image
import { icdLocations } from "../components/POR";
import { indianPorts } from "../components/POL";
import { foreignDestinations } from "../components/POD";
import { customerData } from "./CustomerData";
import { shippingLines } from "../components/ShippingLines";
import { airlines } from "../components/Airlines";
import { airportsOfDeparture } from "../components/AirportOfDeparture";
import { airportsOfDestination } from "../components/AirportOfDestination";
import { allAvailableTerms, getTermsForSegment } from "./Terms_and_Conditions";
import { invalidateQuotationsCache } from "./QuotationList";

const API_BASE_URL = "https://papayawhip-antelope-424743.hostingersite.com/api";

// Sortable Term Item component for drag-and-drop reordering
const SortableTermItem = ({ id, term, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-1 bg-white rounded px-2 py-1 border ${
        isDragging
          ? "border-yellow-400 shadow-lg bg-yellow-50"
          : "border-yellow-200 hover:border-yellow-300"
      } transition group`}
    >
      <button
        type="button"
        className="mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <span className="text-yellow-600 font-bold mt-0.5 min-w-[20px]">
        {index + 1}.
      </span>
      <span className="flex-1 leading-relaxed text-xs text-gray-700">
        {term}
      </span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="ml-1 text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition flex-shrink-0"
        title="Remove term"
      >
        <X size={14} />
      </button>
    </li>
  );
};

// Module-level cache for quotations data (shared across component instances)
const suggestionsCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 60000, // 1 minute cache
  isLoading: false,
  promise: null,
};

// Prefetch function that can be called early (e.g., on app load or route change)
export const prefetchSuggestionData = async () => {
  const now = Date.now();

  // Return cached data if valid
  if (
    suggestionsCache.data &&
    suggestionsCache.timestamp &&
    now - suggestionsCache.timestamp < suggestionsCache.CACHE_DURATION
  ) {
    return suggestionsCache.data;
  }

  // Return existing promise if already loading
  if (suggestionsCache.isLoading && suggestionsCache.promise) {
    return suggestionsCache.promise;
  }

  // Start new fetch
  suggestionsCache.isLoading = true;
  suggestionsCache.promise = fetch(`${API_BASE_URL}/quotations`)
    .then((response) => response.json())
    .then((result) => {
      const quotations = result.data || result || [];
      suggestionsCache.data = quotations;
      suggestionsCache.timestamp = Date.now();
      suggestionsCache.isLoading = false;
      return quotations;
    })
    .catch((error) => {
      console.error("Error prefetching suggestions:", error);
      suggestionsCache.isLoading = false;
      return [];
    });

  return suggestionsCache.promise;
};

const ImportExportQuotationForm = ({
  currentUser,
  onNavigate,
  draftQuotation,
  onDraftCleared,
  copyQuotation,
  onCopyCleared,
}) => {
  // Data loading state
  const [isDataReady, setIsDataReady] = useState(!!suggestionsCache.data);
  const abortControllerRef = useRef(null);
  // Draft saving state
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  // Basic Information State
  const [basicInfo, setBasicInfo] = useState({
    customerNameAndAddress: "",
    shipperNameAndAddress: "",
    consigneeAddress: "",
    equipment: "",
    weight: "",
    cbm: "",
    terms: "",
    commodity: "",
    por: "",
    pol: "",
    pod: "",
    finalDestination: "",
    shippingLine: "",
    etd: "",
    eta: "",
    totalTransitTime: "",
    ratesValidity: "",
    remarks: "",
    numberOfPackets: "",
    cargoSizes: [""],
    airLines: "",
    airPortOfDeparture: "",
    airPortOfDestination: "",
    chargeableWeight: "",
    volumeWeight: "",
    size: "",
    railRamp: "",
    pickupLocation: "",
  });

  // Popup state
  const [showPopup, setShowPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationSegment, setQuotationSegment] = useState(""); // Quotation segment selection
  const [serviceJobType, setServiceJobType] = useState(""); // For Service Job radio selection

  // Multi-container selection state (FCL segments only)
  const [containerSelections, setContainerSelections] = useState([]);
  const [newContainerType, setNewContainerType] = useState("20ft Standard Container");
  const [newContainerQty, setNewContainerQty] = useState(1);

  // Terms and Conditions state
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [termSearchInput, setTermSearchInput] = useState("");
  const [showTermsSuggestions, setShowTermsSuggestions] = useState(false);
  const [filteredTermsSuggestions, setFilteredTermsSuggestions] = useState([]);
  const [mergedTermsData, setMergedTermsData] = useState(allAvailableTerms);

  // Quotation segment options with prefixes
  const quotationSegments = [
    { label: "Sea Export LCL", prefix: "SELCL" },
    { label: "Sea Export FCL", prefix: "SEFCL" },
    { label: "Sea Export Break Bulk", prefix: "BBE" },
    { label: "Sea Import LCL", prefix: "SILCL" },
    { label: "Sea Import FCL", prefix: "SIFCL" },
    { label: "Sea Import Break Bulk", prefix: "BBI" },
    { label: "Air Export", prefix: "AE" },
    { label: "Air Import", prefix: "AI" },
    { label: "Service Job", prefix: "SJ" },
  ];

  // Autocomplete state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showShipperDropdown, setShowShipperDropdown] = useState(false);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const [showShippingLineDropdown, setShowShippingLineDropdown] =
    useState(false);
  const [showPorDropdown, setShowPorDropdown] = useState(false);
  const [showPolDropdown, setShowPolDropdown] = useState(false);
  const [showPodDropdown, setShowPodDropdown] = useState(false);
  const [showFinalDestDropdown, setShowFinalDestDropdown] = useState(false);
  const [showOriginChargeSuggestions, setShowOriginChargeSuggestions] =
    useState({});
  const [filteredOriginChargeSuggestions, setFilteredOriginChargeSuggestions] =
    useState({});
  const [showFreightChargeSuggestions, setShowFreightChargeSuggestions] =
    useState({});
  const [
    filteredFreightChargeSuggestions,
    setFilteredFreightChargeSuggestions,
  ] = useState({});
  const [
    showDestinationChargeSuggestions,
    setShowDestinationChargeSuggestions,
  ] = useState({});
  const [
    filteredDestinationChargeSuggestions,
    setFilteredDestinationChargeSuggestions,
  ] = useState({});
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredShippers, setFilteredShippers] = useState([]);
  const [filteredConsignees, setFilteredConsignees] = useState([]);
  const [filteredShippingLines, setFilteredShippingLines] = useState([]);
  const [filteredPorLocations, setFilteredPorLocations] = useState([]);
  const [filteredPolPorts, setFilteredPolPorts] = useState([]);
  const [filteredPodPorts, setFilteredPodPorts] = useState([]);
  const [filteredFinalDestinations, setFilteredFinalDestinations] = useState(
    [],
  );
  const [showAirlinesDropdown, setShowAirlinesDropdown] = useState(false);
  const [filteredAirlines, setFilteredAirlines] = useState([]);
  const [mergedAirlinesData, setMergedAirlinesData] = useState(airlines);
  const [showAirportDepartureDropdown, setShowAirportDepartureDropdown] =
    useState(false);
  const [filteredAirportsDeparture, setFilteredAirportsDeparture] = useState(
    [],
  );
  const [showAirportDestinationDropdown, setShowAirportDestinationDropdown] =
    useState(false);
  const [filteredAirportsDestination, setFilteredAirportsDestination] =
    useState([]);
  const [showCommodityDropdown, setShowCommodityDropdown] = useState(false);
  const [filteredCommodities, setFilteredCommodities] = useState([]);

  // State for merged customer, shipper and consignee data (static + custom from DB)
  // All three address fields share CustomerData.jsx as their base suggestion
  // source; each is then merged with its own previously-submitted entries.
  const [mergedCustomerData, setMergedCustomerData] = useState(customerData);
  const [mergedShipperData, setMergedShipperData] = useState(customerData);
  const [mergedConsigneeData, setMergedConsigneeData] = useState(customerData);

  // Autocomplete is backed by ~9k+ records. Precompute one lowercased
  // search string per entry whenever the dataset changes so keystroke
  // filtering doesn't re-lowercase the whole list every time.
  const buildSearchIndex = (data) =>
    data.map((d) => ({
      item: d,
      search: `${d.name || ""}\n${d.address || ""}`.toLowerCase(),
    }));
  const customerSearchIndex = useMemo(
    () => buildSearchIndex(mergedCustomerData),
    [mergedCustomerData],
  );
  const shipperSearchIndex = useMemo(
    () => buildSearchIndex(mergedShipperData),
    [mergedShipperData],
  );
  const consigneeSearchIndex = useMemo(
    () => buildSearchIndex(mergedConsigneeData),
    [mergedConsigneeData],
  );
  // Cap matches so a broad query (e.g. one letter) can't compute or
  // render thousands of rows — early exit keeps it near-instant.
  const MAX_SUGGESTIONS = 50;
  const filterSuggestions = (index, query) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (let i = 0; i < index.length && out.length < MAX_SUGGESTIONS; i++) {
      if (index[i].search.includes(q)) out.push(index[i].item);
    }
    return out;
  };

  // State for merged POR, POL, POD data (static + custom from DB)
  const [mergedPorData, setMergedPorData] = useState(icdLocations);
  const [mergedPolData, setMergedPolData] = useState(indianPorts);
  const [mergedPodData, setMergedPodData] = useState(foreignDestinations);

  // State for merged Commodity, Final Destination, Airport data (static + custom from DB)
  const [mergedCommodityData, setMergedCommodityData] = useState([]);
  const [mergedFinalDestData, setMergedFinalDestData] =
    useState(foreignDestinations);
  const [mergedAirportDepartureData, setMergedAirportDepartureData] =
    useState(airportsOfDeparture);
  const [mergedAirportDestinationData, setMergedAirportDestinationData] =
    useState(airportsOfDestination);

  // State for Rail Ramp suggestions from DB
  const [mergedRailRampData, setMergedRailRampData] = useState([]);
  const [filteredRailRampData, setFilteredRailRampData] = useState([]);
  const [showRailRampDropdown, setShowRailRampDropdown] = useState(false);

  // Load previously submitted customer, consignee, POR, POL, POD data from quotations on mount
  useEffect(() => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const processQuotationsData = (quotations) => {
      // Extract unique values from quotations
      const submittedCustomers = [];
      const submittedShippers = [];
      const submittedConsignees = [];
      const seenCustomers = new Set();
      const seenShippers = new Set();
      const seenConsignees = new Set();
      const submittedPor = new Set();
      const submittedPol = new Set();
      const submittedPod = new Set();
      const submittedCommodity = new Set();
      const submittedFinalDest = new Set();
      const submittedAirportDeparture = new Set();
      const submittedAirportDestination = new Set();
      const submittedRailRamp = new Set();
      const submittedAirlines = new Set();
      const submittedTerms = new Set();
      const submittedOriginChargeNames = new Set();
      const submittedFreightChargeNames = new Set();
      const submittedDestinationChargeNames = new Set();

      quotations.forEach((q) => {
        // Process customer data
        if (
          q.customerName &&
          !seenCustomers.has(q.customerName.toLowerCase())
        ) {
          seenCustomers.add(q.customerName.toLowerCase());
          const lines = q.customerName.split("\n");
          const name = lines[0]?.trim() || "";
          const address = lines.slice(1).join("\n").trim() || "";
          if (name) {
            submittedCustomers.push({ name, address });
          }
        }

        // Process consignee data
        if (
          q.consigneeName &&
          !seenConsignees.has(q.consigneeName.toLowerCase())
        ) {
          seenConsignees.add(q.consigneeName.toLowerCase());
          const lines = q.consigneeName.split("\n");
          const name = lines[0]?.trim() || "";
          const address = lines.slice(1).join("\n").trim() || "";
          if (name) {
            submittedConsignees.push({ name, address });
          }
        }

        // Process shipper data
        if (
          q.shipperName &&
          !seenShippers.has(q.shipperName.toLowerCase())
        ) {
          seenShippers.add(q.shipperName.toLowerCase());
          const lines = q.shipperName.split("\n");
          const name = lines[0]?.trim() || "";
          const address = lines.slice(1).join("\n").trim() || "";
          if (name) {
            submittedShippers.push({ name, address });
          }
        }

        // Process POR data
        if (q.por && q.por.trim()) {
          submittedPor.add(q.por.trim());
        }

        // Process POL data
        if (q.pol && q.pol.trim()) {
          submittedPol.add(q.pol.trim());
        }

        // Process POD data
        if (q.pod && q.pod.trim()) {
          submittedPod.add(q.pod.trim());
        }

        // Process Commodity data
        if (q.commodity && q.commodity.trim()) {
          submittedCommodity.add(q.commodity.trim());
        }

        // Process Final Destination data
        if (q.finalDestination && q.finalDestination.trim()) {
          submittedFinalDest.add(q.finalDestination.trim());
        }

        // Process Airport of Departure data
        if (q.airPortOfDeparture && q.airPortOfDeparture.trim()) {
          submittedAirportDeparture.add(q.airPortOfDeparture.trim());
        }

        // Process Airport of Destination data
        if (q.airPortOfDestination && q.airPortOfDestination.trim()) {
          submittedAirportDestination.add(q.airPortOfDestination.trim());
        }

        // Process Rail Ramp data
        if (q.railRamp && q.railRamp.trim()) {
          submittedRailRamp.add(q.railRamp.trim());
        }

        // Process Airlines data
        if (q.airLines && q.airLines.trim()) {
          submittedAirlines.add(q.airLines.trim());
        }

        // Process Terms & Conditions data
        if (q.termsAndConditions) {
          const terms = Array.isArray(q.termsAndConditions)
            ? q.termsAndConditions
            : typeof q.termsAndConditions === "string"
              ? [q.termsAndConditions]
              : [];
          terms.forEach((term) => {
            if (term && typeof term === "string" && term.trim()) {
              submittedTerms.add(term.trim());
            }
          });
        }

        // Process charge names from Origin, Freight, and Destination charges
        if (q.originCharges && Array.isArray(q.originCharges)) {
          q.originCharges.forEach((c) => {
            if (c.charges && c.charges.trim())
              submittedOriginChargeNames.add(c.charges.trim());
          });
        }
        if (q.freightCharges && Array.isArray(q.freightCharges)) {
          q.freightCharges.forEach((c) => {
            if (c.charges && c.charges.trim())
              submittedFreightChargeNames.add(c.charges.trim());
          });
        }
        if (q.destinationCharges && Array.isArray(q.destinationCharges)) {
          q.destinationCharges.forEach((c) => {
            if (c.charges && c.charges.trim())
              submittedDestinationChargeNames.add(c.charges.trim());
          });
        }
      });

      // Merge static data with submitted data (remove duplicates)
      const existingCustomerKeys = new Set(
        customerData.map((c) => `${c.name}\n${c.address}`.toLowerCase()),
      );
      const uniqueSubmittedCustomers = submittedCustomers.filter(
        (c) =>
          !existingCustomerKeys.has(`${c.name}\n${c.address}`.toLowerCase()),
      );
      setMergedCustomerData([...customerData, ...uniqueSubmittedCustomers]);

      // Shipper data — same CustomerData.jsx base as customers, plus
      // any shippers entered on previously submitted quotations.
      const uniqueSubmittedShippers = submittedShippers.filter(
        (s) =>
          !existingCustomerKeys.has(`${s.name}\n${s.address}`.toLowerCase()),
      );
      setMergedShipperData([...customerData, ...uniqueSubmittedShippers]);

      // Consignee data — same CustomerData.jsx base, merged with
      // any consignees entered on previously submitted quotations.
      const uniqueSubmittedConsignees = submittedConsignees.filter(
        (c) =>
          !existingCustomerKeys.has(`${c.name}\n${c.address}`.toLowerCase()),
      );
      setMergedConsigneeData([...customerData, ...uniqueSubmittedConsignees]);

      // Merge POR data
      const existingPorKeys = new Set(icdLocations.map((p) => p.toLowerCase()));
      const uniqueSubmittedPor = [...submittedPor].filter(
        (p) => !existingPorKeys.has(p.toLowerCase()),
      );
      setMergedPorData([...icdLocations, ...uniqueSubmittedPor]);

      // Merge POL data
      const existingPolKeys = new Set(indianPorts.map((p) => p.toLowerCase()));
      const uniqueSubmittedPol = [...submittedPol].filter(
        (p) => !existingPolKeys.has(p.toLowerCase()),
      );
      setMergedPolData([...indianPorts, ...uniqueSubmittedPol]);

      // Merge POD data
      const existingPodKeys = new Set(
        foreignDestinations.map((p) => p.toLowerCase()),
      );
      const uniqueSubmittedPod = [...submittedPod].filter(
        (p) => !existingPodKeys.has(p.toLowerCase()),
      );
      setMergedPodData([...foreignDestinations, ...uniqueSubmittedPod]);

      // Set Commodity data from submitted quotations
      setMergedCommodityData([...submittedCommodity]);

      // Merge Final Destination data
      const existingFinalDestKeys = new Set(
        foreignDestinations.map((p) => p.toLowerCase()),
      );
      const uniqueSubmittedFinalDest = [...submittedFinalDest].filter(
        (p) => !existingFinalDestKeys.has(p.toLowerCase()),
      );
      setMergedFinalDestData([
        ...foreignDestinations,
        ...uniqueSubmittedFinalDest,
      ]);

      // Merge Airport of Departure data
      const existingAirportDepartureKeys = new Set(
        airportsOfDeparture.map((p) => p.toLowerCase()),
      );
      const uniqueSubmittedAirportDeparture = [
        ...submittedAirportDeparture,
      ].filter((p) => !existingAirportDepartureKeys.has(p.toLowerCase()));
      setMergedAirportDepartureData([
        ...airportsOfDeparture,
        ...uniqueSubmittedAirportDeparture,
      ]);

      // Merge Airport of Destination data
      const existingAirportDestinationKeys = new Set(
        airportsOfDestination.map((p) => p.toLowerCase()),
      );
      const uniqueSubmittedAirportDestination = [
        ...submittedAirportDestination,
      ].filter((p) => !existingAirportDestinationKeys.has(p.toLowerCase()));
      setMergedAirportDestinationData([
        ...airportsOfDestination,
        ...uniqueSubmittedAirportDestination,
      ]);

      // Set Rail Ramp data from submitted quotations
      setMergedRailRampData([...submittedRailRamp]);

      // Merge Airlines data from submitted quotations
      const existingAirlinesKeys = new Set(
        airlines.map((a) => a.toLowerCase()),
      );
      const uniqueSubmittedAirlines = [...submittedAirlines]
        .filter((a) => !existingAirlinesKeys.has(a.toLowerCase()))
        .sort();
      setMergedAirlinesData([...airlines, ...uniqueSubmittedAirlines]);

      // Merge custom terms from saved quotations with predefined terms
      const existingTermsKeys = new Set(
        allAvailableTerms.map((t) => t.toLowerCase()),
      );
      const uniqueCustomTerms = [...submittedTerms]
        .filter((t) => !existingTermsKeys.has(t.toLowerCase()))
        .sort();
      console.log(
        "[T&C Debug] Quotations:",
        quotations.length,
        "| DB terms:",
        submittedTerms.size,
        "| Static:",
        allAvailableTerms.length,
        "| Custom found:",
        uniqueCustomTerms.length,
        uniqueCustomTerms.slice(0, 5),
      );
      setMergedTermsData([...allAvailableTerms, ...uniqueCustomTerms]);

      // Merge charge name suggestions from submitted quotations
      const existingOriginChargeKeys = new Set(
        originChargeSuggestionsStatic.map((c) => c.toLowerCase()),
      );
      const uniqueOriginCharges = [...submittedOriginChargeNames]
        .filter((c) => !existingOriginChargeKeys.has(c.toLowerCase()))
        .sort();
      setMergedOriginChargeSuggestions([
        ...originChargeSuggestionsStatic,
        ...uniqueOriginCharges,
      ]);

      const existingFreightChargeKeys = new Set(
        freightChargeSuggestionsStatic.map((c) => c.toLowerCase()),
      );
      const uniqueFreightCharges = [...submittedFreightChargeNames]
        .filter((c) => !existingFreightChargeKeys.has(c.toLowerCase()))
        .sort();
      setMergedFreightChargeSuggestions([
        ...freightChargeSuggestionsStatic,
        ...uniqueFreightCharges,
      ]);

      const existingDestChargeKeys = new Set(
        destinationChargeSuggestionsStatic.map((c) => c.toLowerCase()),
      );
      const uniqueDestCharges = [...submittedDestinationChargeNames]
        .filter((c) => !existingDestChargeKeys.has(c.toLowerCase()))
        .sort();
      setMergedDestinationChargeSuggestions([
        ...destinationChargeSuggestionsStatic,
        ...uniqueDestCharges,
      ]);

      setIsDataReady(true);
    };

    const loadSubmittedData = async () => {
      try {
        // Use prefetch function which handles caching
        const quotations = await prefetchSuggestionData();
        processQuotationsData(quotations);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error loading submitted data:", error);
        }
        setIsDataReady(true); // Still mark as ready to use static data
      }
    };

    loadSubmittedData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Effect to load terms when quotation segment or terms option changes
  useEffect(() => {
    if (quotationSegment) {
      const terms = getTermsForSegment(quotationSegment, basicInfo.terms);
      setSelectedTerms(terms);
    } else {
      setSelectedTerms([]);
    }
  }, [quotationSegment, basicInfo.terms]);

  // Sync basicInfo.equipment with containerSelections summary for FCL segments
  useEffect(() => {
    const seg = quotationSegment.toLowerCase();
    if (seg === "sea export fcl" || seg === "sea import fcl") {
      if (containerSelections.length > 0) {
        const summary = containerSelections
          .map((s) => `${s.type.replace(" Container", "")} \u00d7${s.qty}`)
          .join(", ");
        setBasicInfo((prev) => ({ ...prev, equipment: summary }));
      } else {
        setBasicInfo((prev) => ({ ...prev, equipment: "" }));
      }
    }
  }, [containerSelections, quotationSegment]);

  // Effect to prefill form when copying a quotation
  useEffect(() => {
    if (copyQuotation) {
      // Prefill basic info from copied quotation
      setBasicInfo({
        customerNameAndAddress: copyQuotation.customerName || "",
        shipperNameAndAddress: copyQuotation.shipperName || "",
        consigneeAddress: copyQuotation.consigneeName || "",
        equipment: copyQuotation.equipment || "",
        weight: copyQuotation.weight || "",
        cbm: copyQuotation.cbm || "",
        terms: copyQuotation.terms || "",
        commodity: copyQuotation.commodity || "",
        por: copyQuotation.por || "",
        pol: copyQuotation.pol || "",
        pod: copyQuotation.pod || "",
        finalDestination: copyQuotation.finalDestination || "",
        shippingLine: copyQuotation.shippingLine || "",
        etd: copyQuotation.etd || "",
        eta: copyQuotation.eta || "",
        totalTransitTime: copyQuotation.transitTime || "",
        ratesValidity: copyQuotation.ratesValidity || "",
        remarks: copyQuotation.remarks || "",
        numberOfPackets: copyQuotation.numberOfPackets || "",
        cargoSizes: Array.isArray(copyQuotation.cargoSizes) && copyQuotation.cargoSizes.length > 0 ? copyQuotation.cargoSizes : (copyQuotation.cargoSize && copyQuotation.cargoSize.trim() ? [copyQuotation.cargoSize] : [""]),
        airLines: copyQuotation.airLines || "",
        airPortOfDeparture: copyQuotation.airPortOfDeparture || "",
        airPortOfDestination: copyQuotation.airPortOfDestination || "",
        chargeableWeight: copyQuotation.chargeableWeight || "",
        volumeWeight: copyQuotation.volumeWeight || "",
        size: copyQuotation.size || "",
        railRamp: copyQuotation.railRamp || "",
        pickupLocation: copyQuotation.pickup_location || "",
      });

      // Prefill quotation segment
      setQuotationSegment(copyQuotation.quotationSegment || "");

      // Prefill service job type
      setServiceJobType(copyQuotation.serviceJobType || "");

      // Prefill multi-container selections
      if (copyQuotation.equipmentList && copyQuotation.equipmentList.length > 0) {
        setContainerSelections(copyQuotation.equipmentList);
      } else {
        setContainerSelections([]);
      }

      // Prefill charges with new IDs to avoid conflicts
      if (
        copyQuotation.originCharges &&
        copyQuotation.originCharges.length > 0
      ) {
        setOriginCharges(
          copyQuotation.originCharges.map((c) => ({
            ...c,
            id: Date.now() + Math.random(),
          })),
        );
      }
      if (
        copyQuotation.freightCharges &&
        copyQuotation.freightCharges.length > 0
      ) {
        setFreightCharges(
          copyQuotation.freightCharges.map((c) => ({
            ...c,
            id: Date.now() + Math.random(),
          })),
        );
      }
      if (
        copyQuotation.destinationCharges &&
        copyQuotation.destinationCharges.length > 0
      ) {
        setDestinationCharges(
          copyQuotation.destinationCharges.map((c) => ({
            ...c,
            id: Date.now() + Math.random(),
          })),
        );
      }

      // Prefill terms and conditions
      if (
        copyQuotation.termsAndConditions &&
        copyQuotation.termsAndConditions.length > 0
      ) {
        setSelectedTerms(copyQuotation.termsAndConditions);
      }

      // Clear copy state so this is treated as a brand new quotation
      if (onCopyCleared) onCopyCleared();
    }
  }, [copyQuotation]);

  // Effect to prefill form when editing a draft quotation
  useEffect(() => {
    if (draftQuotation) {
      // Prefill basic info
      setBasicInfo({
        customerNameAndAddress: draftQuotation.customerName || "",
        shipperNameAndAddress: draftQuotation.shipperName || "",
        consigneeAddress: draftQuotation.consigneeName || "",
        equipment: draftQuotation.equipment || "",
        weight: draftQuotation.weight || "",
        cbm: draftQuotation.cbm || "",
        terms: draftQuotation.terms || "",
        commodity: draftQuotation.commodity || "",
        por: draftQuotation.por || "",
        pol: draftQuotation.pol || "",
        pod: draftQuotation.pod || "",
        finalDestination: draftQuotation.finalDestination || "",
        shippingLine: draftQuotation.shippingLine || "",
        etd: draftQuotation.etd || "",
        eta: draftQuotation.eta || "",
        totalTransitTime: draftQuotation.transitTime || "",
        ratesValidity: draftQuotation.ratesValidity || "",
        remarks: draftQuotation.remarks || "",
        numberOfPackets: draftQuotation.numberOfPackets || "",
        cargoSizes: Array.isArray(draftQuotation.cargoSizes) && draftQuotation.cargoSizes.length > 0 ? draftQuotation.cargoSizes : (draftQuotation.cargoSize && draftQuotation.cargoSize.trim() ? [draftQuotation.cargoSize] : [""]),
        airLines: draftQuotation.airLines || "",
        airPortOfDeparture: draftQuotation.airPortOfDeparture || "",
        airPortOfDestination: draftQuotation.airPortOfDestination || "",
        chargeableWeight: draftQuotation.chargeableWeight || "",
        volumeWeight: draftQuotation.volumeWeight || "",
        size: draftQuotation.size || "",
        railRamp: draftQuotation.railRamp || "",
        pickupLocation: draftQuotation.pickup_location || "",
      });

      // Prefill quotation segment
      setQuotationSegment(draftQuotation.quotationSegment || "");

      // Prefill service job type
      setServiceJobType(draftQuotation.serviceJobType || "");

      // Prefill multi-container selections
      if (draftQuotation.equipmentList && draftQuotation.equipmentList.length > 0) {
        setContainerSelections(draftQuotation.equipmentList);
      } else {
        setContainerSelections([]);
      }

      // Prefill charges
      if (
        draftQuotation.originCharges &&
        draftQuotation.originCharges.length > 0
      ) {
        setOriginCharges(draftQuotation.originCharges);
      }
      if (
        draftQuotation.freightCharges &&
        draftQuotation.freightCharges.length > 0
      ) {
        setFreightCharges(draftQuotation.freightCharges);
      }
      if (
        draftQuotation.destinationCharges &&
        draftQuotation.destinationCharges.length > 0
      ) {
        setDestinationCharges(draftQuotation.destinationCharges);
      }

      // Prefill terms and conditions
      if (
        draftQuotation.termsAndConditions &&
        draftQuotation.termsAndConditions.length > 0
      ) {
        setSelectedTerms(draftQuotation.termsAndConditions);
      }
    }
  }, [draftQuotation]);

  // Handler for term search input
  const handleTermSearchChange = (value) => {
    setTermSearchInput(value);
    if (value.trim().length > 0) {
      const filtered = mergedTermsData.filter(
        (term) =>
          term.toLowerCase().includes(value.toLowerCase()) &&
          !selectedTerms.includes(term),
      );
      setFilteredTermsSuggestions(filtered);
      setShowTermsSuggestions(true);
    } else {
      setFilteredTermsSuggestions(
        mergedTermsData.filter((term) => !selectedTerms.includes(term)),
      );
      setShowTermsSuggestions(true);
    }
  };

  // Handler to add a term
  const handleAddTerm = (term) => {
    if (term && !selectedTerms.includes(term)) {
      setSelectedTerms((prev) => [...prev, term]);
    }
    setTermSearchInput("");
    setShowTermsSuggestions(false);
  };

  // Handler to add custom term
  const handleAddCustomTerm = () => {
    const customTerm = termSearchInput.trim();
    if (customTerm && !selectedTerms.includes(customTerm)) {
      setSelectedTerms((prev) => [...prev, customTerm]);
    }
    setTermSearchInput("");
    setShowTermsSuggestions(false);
  };

  // Handler to remove a term
  const handleRemoveTerm = (index) => {
    setSelectedTerms((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag-and-drop sensors for terms reordering
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handler for drag-and-drop reordering of terms
  const handleTermsDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSelectedTerms((prev) => {
        const oldIndex = prev.findIndex(
          (term, i) => `term-${i}-${term.substring(0, 20)}` === active.id,
        );
        const newIndex = prev.findIndex(
          (term, i) => `term-${i}-${term.substring(0, 20)}` === over.id,
        );
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prev, oldIndex, newIndex);
        }
        return prev;
      });
    }
  };

  // Origin Charge Suggestions
  const originChargeSuggestionsStatic = [
    "Transport Charge",
    "Ex Work Charge",
    "BL Fee Charge",
    "Customs Clearance Charge",
    "Loading Charge",
    "Unloading Charge",
    "Documentation Charge",
    "Port Handling Charge",
    "THC Charge",
    "CFS Charge",
    "Seal Charge",
    "VGM Charge",
    "DGFT Charge",
    "ISPS Charge",
  ].sort();

  // Freight Charge Suggestions
  const freightChargeSuggestionsStatic = [
    "Ocean Freight Charges",
    "Transport Charge",
    "ISPS Charge",
    "Seal Charge",
    "ACD Charge",
    "ENS Charge",
    "BL Charges",
    "THC Charge",
    "Air Freight Charge",
    "Lift On/Lift Off Charge",
  ].sort();

  // Destination Charge Suggestions
  const destinationChargeSuggestionsStatic = [
    "Shipping Line Charge",
    "Air Freight Charge",
    "Documentation Charge",
    "EDI Fees Charge",
    "Certification Charge",
    "BL Fee Charge",
    "Customs Clearance Charge",
    "OMT DO",
    "Terminal Handling Charge",
    "Container Washing Charge",
    "CCFEE (2% on Freight MIN USD 10)",
    "Inland Haulage Charges (Mundra to ICD TKD)",
    "Container Maintenance Charges",
    "Carrier DO Fee",
    "HBL Manifest",
    "Handling Fee",
    "Import Customs Clearance Charge",
    "Road Tax",
    "Trucking Charges to Door (By Road Only)",
  ].sort();

  // Merged charge suggestions (static + custom from DB)
  const [mergedOriginChargeSuggestions, setMergedOriginChargeSuggestions] =
    useState(originChargeSuggestionsStatic);
  const [mergedFreightChargeSuggestions, setMergedFreightChargeSuggestions] =
    useState(freightChargeSuggestionsStatic);
  const [
    mergedDestinationChargeSuggestions,
    setMergedDestinationChargeSuggestions,
  ] = useState(destinationChargeSuggestionsStatic);

  // Origin Charges State
  const [originCharges, setOriginCharges] = useState([
    {
      id: Date.now(),
      charges: "",
      currency: "INR",
      amount: "",
      unit: "Per BL",
      containerAmounts: {},
    },
  ]);

  // Freight Charges State
  const [freightCharges, setFreightCharges] = useState([
    {
      id: Date.now() + 1,
      charges: "",
      currency: "INR",
      amount: "",
      unit: "Per BL",
      containerAmounts: {},
    },
  ]);

  // Destination Charges State
  const [destinationCharges, setDestinationCharges] = useState([
    {
      id: Date.now() + 2,
      charges: "",
      currency: "INR",
      amount: "",
      unit: "Per BL",
      containerAmounts: {},
    },
  ]);

  // Normalized search function for location fields (POR, POL, POD)
  // Matches words regardless of order, position, or capitalization
  // e.g., "ICD Palwal" and "Palwal ICD" will both match
  const normalizedLocationSearch = (searchTerm, locationList) => {
    if (!searchTerm || !searchTerm.trim()) return [];

    const searchLower = searchTerm.toLowerCase().trim();
    // Split search term into individual words
    const searchWords = searchLower
      .split(/\s+/)
      .filter((word) => word.length > 0);

    return locationList
      .filter((location) => {
        const locationLower = location.toLowerCase();

        // Check if ALL search words are found in the location (in any order)
        return searchWords.every((word) => locationLower.includes(word));
      })
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();

        // Prioritize exact matches
        if (aLower === searchLower) return -1;
        if (bLower === searchLower) return 1;

        // Prioritize matches that start with the search term
        const aStartsWith = aLower.startsWith(searchLower);
        const bStartsWith = bLower.startsWith(searchLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // Prioritize matches where first word matches first search word
        if (searchWords.length > 0) {
          const aFirstWord = aLower.split(/\s+/)[0];
          const bFirstWord = bLower.split(/\s+/)[0];
          const aFirstMatch = aFirstWord.includes(searchWords[0]);
          const bFirstMatch = bFirstWord.includes(searchWords[0]);
          if (aFirstMatch && !bFirstMatch) return -1;
          if (!aFirstMatch && bFirstMatch) return 1;
        }

        // Default alphabetical sort
        return aLower.localeCompare(bLower);
      });
  };

  // Handle Basic Info Changes
  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setBasicInfo((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Handle autocomplete for customer address
    if (name === "customerNameAndAddress") {
      if (value.trim().length > 0) {
        const filtered = filterSuggestions(customerSearchIndex, value);
        setFilteredCustomers(filtered);
        setShowCustomerDropdown(filtered.length > 0);
      } else {
        setShowCustomerDropdown(false);
      }
    }

    // Handle autocomplete for shipper
    if (name === "shipperNameAndAddress") {
      if (value.trim().length > 0) {
        const filtered = filterSuggestions(shipperSearchIndex, value);
        setFilteredShippers(filtered);
        setShowShipperDropdown(filtered.length > 0);
      } else {
        setShowShipperDropdown(false);
      }
    }

    // Handle autocomplete for consignee address
    if (name === "consigneeAddress") {
      if (value.trim().length > 0) {
        const filtered = filterSuggestions(consigneeSearchIndex, value);
        setFilteredConsignees(filtered);
        setShowConsigneeDropdown(filtered.length > 0);
      } else {
        setShowConsigneeDropdown(false);
      }
    }

    // Handle autocomplete for shipping line
    if (name === "shippingLine") {
      if (value.trim().length > 0) {
        const filtered = shippingLines
          .filter((line) => line.toLowerCase().includes(value.toLowerCase()))
          .sort();
        setFilteredShippingLines(filtered);
        setShowShippingLineDropdown(filtered.length > 0);
      } else {
        setShowShippingLineDropdown(false);
      }
    }

    // Handle autocomplete for POR (using normalized search)
    if (name === "por") {
      if (value.trim().length > 0) {
        const filtered = normalizedLocationSearch(value, mergedPorData);
        setFilteredPorLocations(filtered);
        setShowPorDropdown(filtered.length > 0);
      } else {
        setShowPorDropdown(false);
      }
    }

    // Handle autocomplete for POL (using normalized search)
    if (name === "pol") {
      if (value.trim().length > 0) {
        const filtered = normalizedLocationSearch(value, mergedPolData);
        setFilteredPolPorts(filtered);
        setShowPolDropdown(filtered.length > 0);
      } else {
        setShowPolDropdown(false);
      }
    }

    // Handle autocomplete for POD (using normalized search)
    if (name === "pod") {
      if (value.trim().length > 0) {
        const filtered = normalizedLocationSearch(value, mergedPodData);
        setFilteredPodPorts(filtered);
        setShowPodDropdown(filtered.length > 0);
      } else {
        setShowPodDropdown(false);
      }
    }

    // Handle autocomplete for Final Destination
    if (name === "finalDestination") {
      if (value.trim().length > 0) {
        const filtered = mergedFinalDestData
          .filter((dest) => dest.toLowerCase().includes(value.toLowerCase()))
          .sort();
        setFilteredFinalDestinations(filtered);
        setShowFinalDestDropdown(filtered.length > 0);
      } else {
        setShowFinalDestDropdown(false);
      }
    }

    // Handle autocomplete for Airlines
    if (name === "airLines") {
      if (value.trim().length > 0) {
        const filtered = mergedAirlinesData
          .filter((airline) =>
            airline.toLowerCase().includes(value.toLowerCase()),
          )
          .sort();
        setFilteredAirlines(filtered);
        setShowAirlinesDropdown(filtered.length > 0);
      } else {
        setShowAirlinesDropdown(false);
      }
    }

    // Handle autocomplete for Airport of Departure
    if (name === "airPortOfDeparture") {
      if (value.trim().length > 0) {
        const filtered = mergedAirportDepartureData
          .filter((airport) =>
            airport.toLowerCase().includes(value.toLowerCase()),
          )
          .sort();
        setFilteredAirportsDeparture(filtered);
        setShowAirportDepartureDropdown(filtered.length > 0);
      } else {
        setShowAirportDepartureDropdown(false);
      }
    }

    // Handle autocomplete for Airport of Destination
    if (name === "airPortOfDestination") {
      if (value.trim().length > 0) {
        const filtered = mergedAirportDestinationData
          .filter((airport) =>
            airport.toLowerCase().includes(value.toLowerCase()),
          )
          .sort();
        setFilteredAirportsDestination(filtered);
        setShowAirportDestinationDropdown(filtered.length > 0);
      } else {
        setShowAirportDestinationDropdown(false);
      }
    }

    // Handle autocomplete for Commodity
    if (name === "commodity") {
      if (value.trim().length > 0 && mergedCommodityData.length > 0) {
        const filtered = mergedCommodityData
          .filter((commodity) =>
            commodity.toLowerCase().includes(value.toLowerCase()),
          )
          .sort();
        setFilteredCommodities(filtered);
        setShowCommodityDropdown(filtered.length > 0);
      } else {
        setShowCommodityDropdown(false);
      }
    }

    // Handle autocomplete for Rail Ramp
    if (name === "railRamp") {
      if (value.trim().length > 0 && mergedRailRampData.length > 0) {
        const filtered = mergedRailRampData
          .filter((ramp) => ramp.toLowerCase().includes(value.toLowerCase()))
          .sort();
        setFilteredRailRampData(filtered);
        setShowRailRampDropdown(filtered.length > 0);
      } else {
        setShowRailRampDropdown(false);
      }
    }
  };

  // Handle customer selection from dropdown
  const handleCustomerSelect = (customer) => {
    setBasicInfo((prev) => ({
      ...prev,
      customerNameAndAddress: `${customer.name}\n${customer.address}`,
    }));
    setShowCustomerDropdown(false);
  };

  // Handle shipper selection from dropdown
  const handleShipperSelect = (shipper) => {
    setBasicInfo((prev) => ({
      ...prev,
      shipperNameAndAddress: `${shipper.name}\n${shipper.address}`,
    }));
    setShowShipperDropdown(false);
  };

  // Handle consignee selection from dropdown
  const handleConsigneeSelect = (consignee) => {
    setBasicInfo((prev) => ({
      ...prev,
      consigneeAddress: `${consignee.name}\n${consignee.address}`,
    }));
    setShowConsigneeDropdown(false);
  };

  // Handle shipping line selection from dropdown
  const handleShippingLineSelect = (line) => {
    setBasicInfo((prev) => ({
      ...prev,
      shippingLine: line,
    }));
    setShowShippingLineDropdown(false);
  };

  // Handle POR selection from dropdown
  const handlePorSelect = (location) => {
    setBasicInfo((prev) => ({
      ...prev,
      por: location,
    }));
    setShowPorDropdown(false);
  };

  // Handle POL selection from dropdown
  const handlePolSelect = (port) => {
    setBasicInfo((prev) => ({
      ...prev,
      pol: port,
    }));
    setShowPolDropdown(false);
  };

  // Handle POD selection from dropdown
  const handlePodSelect = (destination) => {
    setBasicInfo((prev) => ({
      ...prev,
      pod: destination,
    }));
    setShowPodDropdown(false);
  };

  // Handle Final Destination selection from dropdown
  const handleFinalDestSelect = (destination) => {
    setBasicInfo((prev) => ({
      ...prev,
      finalDestination: destination,
    }));
    setShowFinalDestDropdown(false);
  };

  // Handle Airlines selection from dropdown
  const handleAirlinesSelect = (airline) => {
    setBasicInfo((prev) => ({
      ...prev,
      airLines: airline,
    }));
    setShowAirlinesDropdown(false);
  };

  // Handle Airport of Departure selection from dropdown
  const handleAirportDepartureSelect = (airport) => {
    setBasicInfo((prev) => ({
      ...prev,
      airPortOfDeparture: airport,
    }));
    setShowAirportDepartureDropdown(false);
  };

  // Handle Airport of Destination selection from dropdown
  const handleAirportDestinationSelect = (airport) => {
    setBasicInfo((prev) => ({
      ...prev,
      airPortOfDestination: airport,
    }));
    setShowAirportDestinationDropdown(false);
  };

  // Handle Commodity selection from dropdown
  const handleCommoditySelect = (commodity) => {
    setBasicInfo((prev) => ({
      ...prev,
      commodity: commodity,
    }));
    setShowCommodityDropdown(false);
  };

  // Handle Rail Ramp selection from dropdown
  const handleRailRampSelect = (ramp) => {
    setBasicInfo((prev) => ({
      ...prev,
      railRamp: ramp,
    }));
    setShowRailRampDropdown(false);
  };

  // Origin Charges Handlers
  const addOriginCharge = () => {
    setOriginCharges([
      ...originCharges,
      {
        id: Date.now(),
        charges: "",
        currency: "INR",
        amount: "",
        unit: "Per BL",
        containerAmounts: {},
      },
    ]);
  };

  const removeOriginCharge = (id) => {
    setOriginCharges(originCharges.filter((charge) => charge.id !== id));
  };

  const handleOriginChargeChange = (id, field, value) => {
    setOriginCharges(
      originCharges.map((charge) =>
        charge.id === id ? { ...charge, [field]: value } : charge,
      ),
    );

    // Handle autocomplete for charges field, excluding already-added charges
    if (field === "charges") {
      const usedCharges = new Set(
        originCharges
          .filter((c) => c.id !== id && c.charges.trim())
          .map((c) => c.charges.trim().toLowerCase()),
      );
      const filtered = mergedOriginChargeSuggestions.filter(
        (suggestion) =>
          !usedCharges.has(suggestion.toLowerCase()) &&
          suggestion.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredOriginChargeSuggestions((prev) => ({
        ...prev,
        [id]: filtered,
      }));
      setShowOriginChargeSuggestions((prev) => ({
        ...prev,
        [id]: filtered.length > 0,
      }));
    }
  };

  // Handle Origin Charge suggestion selection
  const handleOriginChargeSuggestionSelect = (id, suggestion) => {
    setOriginCharges(
      originCharges.map((charge) =>
        charge.id === id ? { ...charge, charges: suggestion } : charge,
      ),
    );
    setShowOriginChargeSuggestions((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  // Freight Charges Handlers
  const addFreightCharge = () => {
    setFreightCharges([
      ...freightCharges,
      {
        id: Date.now(),
        charges: "",
        currency: "INR",
        amount: "",
        unit: "Per BL",
        containerAmounts: {},
      },
    ]);
  };

  const removeFreightCharge = (id) => {
    setFreightCharges(freightCharges.filter((charge) => charge.id !== id));
  };

  const handleFreightChargeChange = (id, field, value) => {
    setFreightCharges(
      freightCharges.map((charge) =>
        charge.id === id ? { ...charge, [field]: value } : charge,
      ),
    );

    // Handle autocomplete for charges field, excluding already-added charges
    if (field === "charges") {
      const usedCharges = new Set(
        freightCharges
          .filter((c) => c.id !== id && c.charges.trim())
          .map((c) => c.charges.trim().toLowerCase()),
      );
      const filtered = mergedFreightChargeSuggestions.filter(
        (suggestion) =>
          !usedCharges.has(suggestion.toLowerCase()) &&
          suggestion.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredFreightChargeSuggestions((prev) => ({
        ...prev,
        [id]: filtered,
      }));
      setShowFreightChargeSuggestions((prev) => ({
        ...prev,
        [id]: filtered.length > 0,
      }));
    }
  };

  // Handle Freight Charge suggestion selection
  const handleFreightChargeSuggestionSelect = (id, suggestion) => {
    setFreightCharges(
      freightCharges.map((charge) =>
        charge.id === id ? { ...charge, charges: suggestion } : charge,
      ),
    );
    setShowFreightChargeSuggestions((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  // Destination Charges Handlers
  const addDestinationCharge = () => {
    setDestinationCharges([
      ...destinationCharges,
      {
        id: Date.now(),
        charges: "",
        currency: "INR",
        amount: "",
        unit: "Per BL",
        containerAmounts: {},
      },
    ]);
  };

  const removeDestinationCharge = (id) => {
    setDestinationCharges(
      destinationCharges.filter((charge) => charge.id !== id),
    );
  };

  const handleDestinationChargeChange = (id, field, value) => {
    setDestinationCharges(
      destinationCharges.map((charge) =>
        charge.id === id ? { ...charge, [field]: value } : charge,
      ),
    );

    // Handle autocomplete for charges field
    if (field === "charges") {
      const usedCharges = new Set(
        destinationCharges
          .filter((c) => c.id !== id && c.charges.trim())
          .map((c) => c.charges.trim().toLowerCase()),
      );
      const filtered = mergedDestinationChargeSuggestions.filter(
        (suggestion) =>
          !usedCharges.has(suggestion.toLowerCase()) &&
          suggestion.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredDestinationChargeSuggestions((prev) => ({
        ...prev,
        [id]: filtered,
      }));
      setShowDestinationChargeSuggestions((prev) => ({
        ...prev,
        [id]: filtered.length > 0,
      }));
    }
  };

  // Handle Destination Charge suggestion selection
  const handleDestinationChargeSuggestionSelect = (id, suggestion) => {
    setDestinationCharges(
      destinationCharges.map((charge) =>
        charge.id === id ? { ...charge, charges: suggestion } : charge,
      ),
    );
    setShowDestinationChargeSuggestions((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  // ── Multi-container (FCL) handlers ──────────────────────────────────────────
  const addContainerSelection = () => {
    if (!newContainerType || newContainerQty < 1) return;
    const existing = containerSelections.find((s) => s.type === newContainerType);
    if (existing) {
      setContainerSelections((prev) =>
        prev.map((s) =>
          s.type === newContainerType
            ? { ...s, qty: s.qty + Number(newContainerQty) }
            : s,
        ),
      );
    } else {
      setContainerSelections((prev) => [
        ...prev,
        { type: newContainerType, qty: Number(newContainerQty) },
      ]);
    }
  };

  const removeContainerSelection = (type) => {
    setContainerSelections((prev) => prev.filter((s) => s.type !== type));
  };

  const handleOriginContainerAmount = (chargeId, containerType, value) => {
    setOriginCharges((prev) =>
      prev.map((c) =>
        c.id === chargeId
          ? { ...c, containerAmounts: { ...(c.containerAmounts || {}), [containerType]: value } }
          : c,
      ),
    );
  };

  const handleFreightContainerAmount = (chargeId, containerType, value) => {
    setFreightCharges((prev) =>
      prev.map((c) =>
        c.id === chargeId
          ? { ...c, containerAmounts: { ...(c.containerAmounts || {}), [containerType]: value } }
          : c,
      ),
    );
  };

  const handleDestContainerAmount = (chargeId, containerType, value) => {
    setDestinationCharges((prev) =>
      prev.map((c) =>
        c.id === chargeId
          ? { ...c, containerAmounts: { ...(c.containerAmounts || {}), [containerType]: value } }
          : c,
      ),
    );
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Generate quotation number based on selected segment
  const generateQuotationNumber = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2); // Get last 2 digits of year

    // Generate unique 2-3 digit random number
    const randomNum = Math.floor(Math.random() * 900) + 100; // Random 3-digit number (100-999)

    // Find the prefix for selected segment
    const selectedSegment = quotationSegments.find(
      (seg) => seg.label === quotationSegment,
    );
    const prefix = selectedSegment ? selectedSegment.prefix : "QT";

    return `${prefix}-${day}${month}${year}-${randomNum}`;
  };

  // Helper function to determine which fields should be visible based on segment
  const getVisibleFields = () => {
    if (!quotationSegment) return [];

    const segment = quotationSegment.toLowerCase();

    // Sea Export FCL or Sea Import FCL
    if (segment === "sea export fcl" || segment === "sea import fcl") {
      return [
        "weight",
        "equipment",
        "commodity",
        "terms",
        "por",
        "pol",
        "pod",
        "finalDestination",
        "pickupLocation",
        "railRamp",
        "shippingLine",
        "totalTransitTime",
        "etd",
        "eta",
        "ratesValidity",
        "remarks",
      ];
    }

    // Sea Export LCL, Sea Import LCL, Break Bulk Export, Break Bulk Import
    if (
      segment === "sea export lcl" ||
      segment === "sea import lcl" ||
      segment === "sea export break bulk" ||
      segment === "sea import break bulk"
    ) {
      return [
        "numberOfPackets",
        "weight",
        "cargoSize",
        "cbm",
        "commodity",
        "terms",
        "por",
        "pol",
        "pod",
        "finalDestination",
        "pickupLocation",
        "railRamp",
        "shippingLine",
        "totalTransitTime",
        "etd",
        "eta",
        "ratesValidity",
        "remarks",
      ];
    }

    // Air Export and Air Import
    if (segment === "air export" || segment === "air import") {
      return [
        "numberOfPackets",
        "weight",
        "cargoSize",
        "volumeWeight",
        "chargeableWeight",
        "commodity",
        "terms",
        "airPortOfDeparture",
        "airPortOfDestination",
        "pickupLocation",
        "railRamp",
        "airLines",
        "totalTransitTime",
        "ratesValidity",
        "remarks",
      ];
    }

    // Service Job - show special section
    if (segment === "service job") {
      return ["serviceJobRadio", "pickupLocation", "railRamp", "ratesValidity", "remarks"];
    }

    return [];
  };

  // Check if all required fields are filled
  const isFormValid = () => {
    return (
      quotationSegment &&
      basicInfo.customerNameAndAddress?.trim() &&
      basicInfo.terms?.trim() &&
      basicInfo.commodity?.trim() &&
      basicInfo.weight?.trim()
    );
  };

  // Check if minimum fields are filled for draft save
  const canSaveDraft = () => {
    return quotationSegment && basicInfo.customerNameAndAddress?.trim();
  };

  // Save quotation as draft (Submit Later)
  const handleSaveDraft = async () => {
    if (!quotationSegment) {
      alert("Please select a Quotation Segment before saving as draft.");
      return;
    }

    if (!basicInfo.customerNameAndAddress?.trim()) {
      alert("Please fill in Customer Name & Address before saving as draft.");
      return;
    }

    setIsSavingDraft(true);

    // Get the selected segment details
    const selectedSegmentDetails = quotationSegments.find(
      (s) => s.label === quotationSegment,
    );

    // Generate draft quotation number (or use existing if editing)
    const draftQuotationNumber =
      draftQuotation?.id || generateQuotationNumber();

    // Prepare draft quotation data
    const draftData = {
      id: draftQuotationNumber,
      quotationSegment: quotationSegment,
      quotationSegmentPrefix: selectedSegmentDetails?.prefix || "",
      customerName: basicInfo.customerNameAndAddress,
      shipperName: basicInfo.shipperNameAndAddress,
      consigneeName: basicInfo.consigneeAddress,
      equipment: basicInfo.equipment,
      equipmentList: containerSelections,
      weight: basicInfo.weight,
      cbm: basicInfo.cbm,
      terms: basicInfo.terms,
      commodity: basicInfo.commodity,
      por: basicInfo.por,
      pol: basicInfo.pol,
      pod: basicInfo.pod,
      finalDestination: basicInfo.finalDestination,
      railRamp: basicInfo.railRamp,
      pickup_location: basicInfo.pickupLocation,
      shippingLine: basicInfo.shippingLine,
      etd: basicInfo.etd,
      eta: basicInfo.eta,
      transitTime: basicInfo.totalTransitTime,
      ratesValidity: basicInfo.ratesValidity,
      remarks: basicInfo.remarks,
      numberOfPackets: basicInfo.numberOfPackets,
      cargoSizes: basicInfo.cargoSizes,
      airLines: basicInfo.airLines,
      airPortOfDeparture: basicInfo.airPortOfDeparture,
      airPortOfDestination: basicInfo.airPortOfDestination,
      chargeableWeight: basicInfo.chargeableWeight,
      volumeWeight: basicInfo.volumeWeight,
      size: basicInfo.size,
      serviceJobType: serviceJobType,
      originCharges: originCharges,
      freightCharges: freightCharges,
      destinationCharges: destinationCharges,
      termsAndConditions: selectedTerms,
      createdBy:
        currentUser?.fullName || currentUser?.username || "Unknown User",
      createdByRole: currentUser?.role || "User",
      createdByLocation: currentUser?.location || "N/A",
      createdDate: draftQuotation?.createdDate || new Date().toISOString(),
      isDraft: true, // Mark as draft
      status: "draft", // Backup draft indicator
      pdfFileName: "",
    };

    try {
      let response;
      let method = "POST";
      let url = `${API_BASE_URL}/quotations`;

      // If editing existing draft, update it
      if (draftQuotation?.id) {
        method = "PUT";
        url = `${API_BASE_URL}/quotations/${draftQuotation.id}`;
      }

      response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draftData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Failed to save draft:", result.message);
        alert(`Failed to save draft: ${result.message || "Unknown error"}`);
        setIsSavingDraft(false);
        return;
      }

      console.log("Draft saved successfully:", result);

      // Clear the draft quotation reference
      if (onDraftCleared) {
        onDraftCleared();
      }

      // Invalidate cache to force refresh on dashboard
      suggestionsCache.data = null;
      suggestionsCache.timestamp = null;
      invalidateQuotationsCache();

      alert(`Draft saved successfully! Quotation ID: ${draftQuotationNumber}`);

      // Navigate to View Quotations page
      if (onNavigate) {
        onNavigate("quotation");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      alert("Failed to save draft. Please try again.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Generate PDF and Submit
  const handleSubmit = async () => {
    // Validate required segment selection
    if (!quotationSegment) {
      alert("Please select a Quotation Segment before submitting.");
      return;
    }

    // Validate required fields
    const missingFields = [];
    if (!basicInfo.customerNameAndAddress?.trim())
      missingFields.push("Customer Name & Address");
    if (!basicInfo.terms?.trim()) missingFields.push("Terms");
    if (!basicInfo.commodity?.trim()) missingFields.push("Commodity");
    if (!basicInfo.weight?.trim()) missingFields.push("Gross Weight (kg)");

    if (missingFields.length > 0) {
      alert(
        `Please fill in the following required fields:\n• ${missingFields.join("\n• ")}`,
      );
      return;
    }

    setIsSubmitting(true);

    const doc = new jsPDF({
      compress: true,
    });

    // Generate quotation number at the start
    const newQuotationNumber = generateQuotationNumber();
    setQuotationNumber(newQuotationNumber);

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const usable = pageW - 2 * margin;
    let y = 12;

    /* ---- Helpers (matching Pre-Advice style) ---- */
    const addPageIfNeeded = (needed = 20) => {
      if (y + needed > pageH - 15) {
        doc.addPage();
        y = 15;
      }
    };

    const sanitizeForPDF = (text) => {
      if (!text) return text;
      return String(text)
        .replace(/₹/g, "Rs.")
        .replace(/\u2192/g, "->")
        .replace(/\u2190/g, "<-")
        .replace(/\u2194/g, "<->");
    };

    const hasVal = (v) =>
      v &&
      String(v).trim() !== "" &&
      String(v).trim() !== "-" &&
      String(v).trim() !== "N/A";

    const sectionTitle = (title) => {
      addPageIfNeeded(14);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, usable, 8, "F");
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), margin + 2, y + 5.5);
      y += 12;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
    };

    const kvRow = (pairs) => {
      const colW = usable / pairs.length;
      const maxValueW = colW - 4;
      const wrapped = pairs.map(([, value]) => {
        const text = sanitizeForPDF(String(value || "-"));
        doc.setFontSize(8.5);
        return doc.splitTextToSize(text, maxValueW);
      });
      const maxLines = Math.max(...wrapped.map((l) => l.length));
      const rowH = 5 + maxLines * 3.8;
      addPageIfNeeded(rowH + 2);

      pairs.forEach(([label], i) => {
        const x = margin + i * colW;
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(sanitizeForPDF(label), x + 2, y + 3);
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(wrapped[i], x + 2, y + 7);
      });
      y += rowH;
    };

    /* ---------- Header with Logo (compact) ---------- */
    try {
      doc.addImage(OmTransLogo, "JPEG", margin, y, 30, 11, "logo", "NONE");
    } catch (e) {
      doc.addImage(OmTransLogo, "JPEG", margin, y, 30, 11);
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("OmTrans Logistics Ltd.", pageW - margin, y + 4, {
      align: "right",
    });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Simplifying Your Business", pageW - margin, y + 8, {
      align: "right",
    });

    y += 15;

    /* ---------- Compact Quotation Header Bar ---------- */
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y, usable, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Quotation No: ${newQuotationNumber}  |  Segment: ${quotationSegment}  |  Date: ${new Date().toLocaleDateString()}`,
      pageW / 2,
      y + 6.5,
      { align: "center" },
    );
    y += 13;

    /* ========== CUSTOMER, SHIPPER & CONSIGNEE DETAILS ========== */
    addPageIfNeeded(22);
    const halfW = usable / 2 - 2;

    // Left header: Customer
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, halfW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("CUSTOMER DETAILS", margin + 2, y + 5);

    // Right header: Consignee
    doc.setFillColor(245, 245, 245);
    doc.rect(margin + halfW + 4, y, halfW, 7, "F");
    doc.text("CONSIGNEE DETAILS", margin + halfW + 6, y + 5);

    y += 9;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    const custLines = doc.splitTextToSize(sanitizeForPDF(basicInfo.customerNameAndAddress || "N/A"), halfW - 4);
    const consLines = doc.splitTextToSize(sanitizeForPDF(basicInfo.consigneeAddress || "N/A"), halfW - 4);
    doc.text(custLines, margin + 2, y + 1);
    doc.text(consLines, margin + halfW + 6, y + 1);
    y += Math.max(custLines.length, consLines.length) * 3.5 + 6;

    // Shipper details (full-width row, only if data entered)
    if (basicInfo.shipperNameAndAddress && basicInfo.shipperNameAndAddress.trim()) {
      addPageIfNeeded(16);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, usable, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("SHIPPER DETAILS", margin + 2, y + 5);
      y += 9;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const shipperLines = doc.splitTextToSize(sanitizeForPDF(basicInfo.shipperNameAndAddress), usable - 4);
      doc.text(shipperLines, margin + 2, y + 1);
      y += shipperLines.length * 3.5 + 6;
    }

    /* ========== SHIPMENT DETAILS ========== */
    sectionTitle("Shipment Details");

    const visibleFields = getVisibleFields();

    // Service Job Type
    if (
      quotationSegment.toLowerCase() === "service job" &&
      hasVal(serviceJobType)
    ) {
      kvRow([["Service Type", serviceJobType]]);
    }

    // Build shipment detail pairs dynamically based on visible fields
    const fieldMap = {
      numberOfPackets: ["No. of Packets", basicInfo.numberOfPackets],
      weight: ["Gross Weight (kg)", basicInfo.weight],
      equipment: ["Equipment", basicInfo.equipment],
      cargoSize: ["Cargo Size", (basicInfo.cargoSizes || []).filter(Boolean).join(", ")],
      cbm: ["CBM (m³)", basicInfo.cbm],
      commodity: ["Commodity", basicInfo.commodity],
      terms: ["Terms", basicInfo.terms],
      por: ["POR", basicInfo.por],
      pol: ["POL", basicInfo.pol],
      pod: ["POD", basicInfo.pod],
      finalDestination: ["Final Destination", basicInfo.finalDestination],
      shippingLine: ["Shipping Line", basicInfo.shippingLine],
      totalTransitTime: ["Transit Time", basicInfo.totalTransitTime],
      etd: ["ETD", basicInfo.etd],
      eta: ["ETA", basicInfo.eta],
      ratesValidity: ["Quotation Validity Date", (() => { if (!basicInfo.ratesValidity) return ""; const [y, m, d] = basicInfo.ratesValidity.split("-"); return `${d} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y}`; })()],
      airLines: ["Airlines", basicInfo.airLines],
      airPortOfDeparture: [
        "Airport of Departure",
        basicInfo.airPortOfDeparture,
      ],
      airPortOfDestination: [
        "Airport of Destination",
        basicInfo.airPortOfDestination,
      ],
      chargeableWeight: ["Chargeable Weight (kg)", basicInfo.chargeableWeight],
      volumeWeight: ["Volume Weight", basicInfo.volumeWeight],
      size: ["Size", basicInfo.size],
      railRamp: ["Rail Ramp", basicInfo.railRamp],
      pickupLocation: ["Pickup Location", basicInfo.pickupLocation],
    };

    // Collect applicable fields into table rows (2-column key-value pairs)
    const pdfBody = [];
    let currentRow = [];
    visibleFields.forEach((field) => {
      if (field === "serviceJobRadio" || field === "remarks") return;
      if (field === "railRamp" && !hasVal(basicInfo.railRamp)) return;
      if (field === "pickupLocation" && !hasVal(basicInfo.pickupLocation)) return;
      if (fieldMap[field]) {
        currentRow.push(fieldMap[field][0], sanitizeForPDF(fieldMap[field][1] || "N/A"));
        if (currentRow.length === 4) {
          pdfBody.push([...currentRow]);
          currentRow = [];
        }
      }
    });
    if (currentRow.length > 0) {
      while (currentRow.length < 4) currentRow.push("");
      pdfBody.push(currentRow);
    }

    autoTable(doc, {
      startY: y,
      head: [["Field", "Details", "Field", "Details"]],
      body: pdfBody,
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 35, textColor: [80, 80, 80] },
        1: { cellWidth: 55 },
        2: { fontStyle: "bold", cellWidth: 35, textColor: [80, 80, 80] },
        3: { cellWidth: 55 },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 4;

    /* ========== CHARGE TABLE HELPER ========== */
    const chargeTable = (title, charges) => {
      const hasData = (c) =>
        c.charges ||
        c.amount ||
        (c.containerAmounts &&
          Object.values(c.containerAmounts).some((v) => v));
      if (!charges || !charges.length || !charges.some(hasData)) return;

      const filteredCharges = charges.filter(hasData);
      if (filteredCharges.length === 0) return;

      sectionTitle(title);
      addPageIfNeeded(20);

      let head, body, columnStyles;

      if (isMultiContainer) {
        // Per-container amount columns
        const cLabels = containerSelections.map(
          (s) => `${s.type.replace(" Container", "")} ×${s.qty}`,
        );
        head = [["Charge Description", "Currency", ...cLabels, "Unit"]];
        body = filteredCharges.map((c) => [
          sanitizeForPDF(c.charges || "-"),
          (c.currency || "USD").replace(/[^A-Za-z]/g, "").toUpperCase() || "USD",
          ...containerSelections.map(
            (s) => (c.containerAmounts && c.containerAmounts[s.type]) || "0",
          ),
          c.unit || "Per Shipment",
        ]);
        const descW = usable * 0.30;
        const currW = usable * 0.11;
        const unitW = usable * 0.12;
        const remaining = usable - descW - currW - unitW;
        const amtW = remaining / containerSelections.length;
        columnStyles = {
          0: { cellWidth: descW },
          1: { cellWidth: currW, halign: "center" },
        };
        containerSelections.forEach((_, idx) => {
          columnStyles[idx + 2] = { cellWidth: amtW, halign: "right" };
        });
        columnStyles[containerSelections.length + 2] = {
          cellWidth: unitW,
          halign: "center",
        };
      } else {
        head = [["Charge Description", "Currency", "Amount", "Unit"]];
        body = filteredCharges.map((c) => [
          sanitizeForPDF(c.charges || "-"),
          (c.currency || "USD").replace(/[^A-Za-z]/g, "").toUpperCase() || "USD",
          c.amount || "0",
          c.unit || "Per Shipment",
        ]);
        columnStyles = {
          0: { cellWidth: usable * 0.42 },
          1: { cellWidth: usable * 0.16, halign: "center" },
          2: { cellWidth: usable * 0.22, halign: "right" },
          3: { cellWidth: usable * 0.2, halign: "center" },
        };
      }

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head,
        body,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          lineColor: [220, 220, 220],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles,
      });
      y = doc.lastAutoTable.finalY + 4;
    };

    /* ========== CHARGE SECTIONS ========== */
    chargeTable("Origin Charges", originCharges);
    chargeTable("Freight Charges", freightCharges);
    chargeTable("Destination Charges", destinationCharges);

    /* ========== REMARKS ========== */
    if (hasVal(basicInfo.remarks)) {
      sectionTitle("Remarks");
      addPageIfNeeded(15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const remarksLines = doc.splitTextToSize(
        sanitizeForPDF(basicInfo.remarks),
        usable - 4,
      );
      doc.text(remarksLines, margin + 2, y);
      y += remarksLines.length * 4 + 4;
    }

    /* ========== TERMS AND CONDITIONS ========== */
    sectionTitle("Terms and Conditions");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    const termsToRender =
      selectedTerms.length > 0
        ? selectedTerms
        : [
            "Freight rates are subject to equipment and space availability.",
            "Transit insurance will be at the customer's cost. OmTrans will not be responsible for any claims.",
            "All charges are subject to change without prior notice.",
            "Payment terms: As per agreed contract.",
            "This quotation is valid for 30 days from the date of issue.",
          ];

    termsToRender.forEach((term, index) => {
      addPageIfNeeded(8);
      const termText = `${index + 1}. ${sanitizeForPDF(term)}`;
      const termLines = doc.splitTextToSize(termText, usable - 4);
      doc.text(termLines, margin + 2, y);
      y += termLines.length * 3.5 + 1;
    });

    /* ---------- Footer on every page ---------- */
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(
        "OmTrans Logistics Ltd. | Simplifying Your Business",
        margin,
        pageH - 7,
      );
      doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 7, {
        align: "right",
      });
    }

    // Save PDF
    const pdfFileName = `${quotationSegment} ${newQuotationNumber}.pdf`;
    doc.save(pdfFileName);

    // Get the selected segment details
    const selectedSegmentDetails = quotationSegments.find(
      (s) => s.label === quotationSegment,
    );

    // Save quotation data to localStorage for approval dashboard
    const quotationData = {
      id: newQuotationNumber,
      quotationSegment: quotationSegment,
      quotationSegmentPrefix: selectedSegmentDetails?.prefix || "",
      customerName: basicInfo.customerNameAndAddress,
      shipperName: basicInfo.shipperNameAndAddress,
      consigneeName: basicInfo.consigneeAddress,
      equipment: basicInfo.equipment,
      equipmentList: containerSelections,
      weight: basicInfo.weight,
      cbm: basicInfo.cbm,
      terms: basicInfo.terms,
      commodity: basicInfo.commodity,
      por: basicInfo.por,
      pol: basicInfo.pol,
      pod: basicInfo.pod,
      finalDestination: basicInfo.finalDestination,
      railRamp: basicInfo.railRamp,
      pickup_location: basicInfo.pickupLocation,
      shippingLine: basicInfo.shippingLine,
      etd: basicInfo.etd,
      eta: basicInfo.eta,
      transitTime: basicInfo.totalTransitTime,
      ratesValidity: basicInfo.ratesValidity,
      remarks: basicInfo.remarks,
      // Air-specific fields
      numberOfPackets: basicInfo.numberOfPackets,
      cargoSizes: basicInfo.cargoSizes,
      airLines: basicInfo.airLines,
      airPortOfDeparture: basicInfo.airPortOfDeparture,
      airPortOfDestination: basicInfo.airPortOfDestination,
      chargeableWeight: basicInfo.chargeableWeight,
      volumeWeight: basicInfo.volumeWeight,
      size: basicInfo.size,
      // Service Job field
      serviceJobType: serviceJobType,
      // Charges
      originCharges: originCharges,
      freightCharges: freightCharges,
      destinationCharges: destinationCharges,
      // Terms and Conditions
      termsAndConditions: selectedTerms,
      createdBy:
        currentUser?.fullName || currentUser?.username || "Unknown User",
      createdByRole: currentUser?.role || "User",
      createdByLocation: currentUser?.location || "N/A",
      createdDate: draftQuotation?.createdDate || new Date().toISOString(),
      pdfFileName: pdfFileName,
      isDraft: false, // Mark as final (not draft)
      status: "submitted", // Backup status indicator
    };

    // Save quotation to backend API
    try {
      let method = "POST";
      let url = `${API_BASE_URL}/quotations`;

      // If finalizing a draft, use PUT to update the existing record
      if (draftQuotation?.id) {
        method = "PUT";
        url = `${API_BASE_URL}/quotations/${draftQuotation.id}`;
        quotationData.id = draftQuotation.id; // Keep original ID
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quotationData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Failed to save quotation:", result.message);
        alert(`Failed to save quotation: ${result.message || "Unknown error"}`);
        setIsSubmitting(false);
        return;
      }

      console.log("Quotation saved successfully:", result);

      // Update merged data with newly submitted customer/consignee for immediate use
      if (basicInfo.customerNameAndAddress) {
        const customerExists = mergedCustomerData.some((c) => {
          const fullCustomer = `${c.name}\n${c.address}`.toLowerCase();
          return (
            fullCustomer === basicInfo.customerNameAndAddress.toLowerCase()
          );
        });

        if (!customerExists) {
          const lines = basicInfo.customerNameAndAddress.split("\n");
          const customerName = lines[0]?.trim() || "";
          const customerAddress = lines.slice(1).join("\n").trim() || "";

          if (customerName) {
            setMergedCustomerData((prev) => [
              ...prev,
              { name: customerName, address: customerAddress },
            ]);
          }
        }
      }

      // Update merged consignee data for immediate use
      if (basicInfo.consigneeAddress) {
        const consigneeExists = mergedConsigneeData.some((c) => {
          const fullConsignee = `${c.name}\n${c.address}`.toLowerCase();
          return fullConsignee === basicInfo.consigneeAddress.toLowerCase();
        });

        if (!consigneeExists) {
          const lines = basicInfo.consigneeAddress.split("\n");
          const consigneeName = lines[0]?.trim() || "";
          const consigneeAddr = lines.slice(1).join("\n").trim() || "";

          if (consigneeName) {
            setMergedConsigneeData((prev) => [
              ...prev,
              { name: consigneeName, address: consigneeAddr },
            ]);
          }
        }
      }

      // Update merged shipper data for immediate use
      if (basicInfo.shipperNameAndAddress && basicInfo.shipperNameAndAddress.trim()) {
        const shipperExists = mergedShipperData.some((s) => {
          const fullShipper = `${s.name}\n${s.address}`.toLowerCase();
          return fullShipper === basicInfo.shipperNameAndAddress.toLowerCase();
        });

        if (!shipperExists) {
          const lines = basicInfo.shipperNameAndAddress.split("\n");
          const shipperName = lines[0]?.trim() || "";
          const shipperAddr = lines.slice(1).join("\n").trim() || "";

          if (shipperName) {
            setMergedShipperData((prev) => [
              ...prev,
              { name: shipperName, address: shipperAddr },
            ]);
          }
        }
      }

      // Update merged POR data for immediate use
      if (basicInfo.por && basicInfo.por.trim()) {
        const porExists = mergedPorData.some(
          (p) => p.toLowerCase() === basicInfo.por.toLowerCase(),
        );
        if (!porExists) {
          setMergedPorData((prev) => [...prev, basicInfo.por.trim()]);
        }
      }

      // Update merged POL data for immediate use
      if (basicInfo.pol && basicInfo.pol.trim()) {
        const polExists = mergedPolData.some(
          (p) => p.toLowerCase() === basicInfo.pol.toLowerCase(),
        );
        if (!polExists) {
          setMergedPolData((prev) => [...prev, basicInfo.pol.trim()]);
        }
      }

      // Update merged POD data for immediate use
      if (basicInfo.pod && basicInfo.pod.trim()) {
        const podExists = mergedPodData.some(
          (p) => p.toLowerCase() === basicInfo.pod.toLowerCase(),
        );
        if (!podExists) {
          setMergedPodData((prev) => [...prev, basicInfo.pod.trim()]);
        }
      }

      // Update merged Commodity data for immediate use
      if (basicInfo.commodity && basicInfo.commodity.trim()) {
        const commodityExists = mergedCommodityData.some(
          (c) => c.toLowerCase() === basicInfo.commodity.toLowerCase(),
        );
        if (!commodityExists) {
          setMergedCommodityData((prev) => [
            ...prev,
            basicInfo.commodity.trim(),
          ]);
        }
      }

      // Update merged Final Destination data for immediate use
      if (basicInfo.finalDestination && basicInfo.finalDestination.trim()) {
        const finalDestExists = mergedFinalDestData.some(
          (d) => d.toLowerCase() === basicInfo.finalDestination.toLowerCase(),
        );
        if (!finalDestExists) {
          setMergedFinalDestData((prev) => [
            ...prev,
            basicInfo.finalDestination.trim(),
          ]);
        }
      }

      // Update merged Airport of Departure data for immediate use
      if (basicInfo.airPortOfDeparture && basicInfo.airPortOfDeparture.trim()) {
        const airportDepExists = mergedAirportDepartureData.some(
          (a) => a.toLowerCase() === basicInfo.airPortOfDeparture.toLowerCase(),
        );
        if (!airportDepExists) {
          setMergedAirportDepartureData((prev) => [
            ...prev,
            basicInfo.airPortOfDeparture.trim(),
          ]);
        }
      }

      // Update merged Airport of Destination data for immediate use
      if (
        basicInfo.airPortOfDestination &&
        basicInfo.airPortOfDestination.trim()
      ) {
        const airportDestExists = mergedAirportDestinationData.some(
          (a) =>
            a.toLowerCase() === basicInfo.airPortOfDestination.toLowerCase(),
        );
        if (!airportDestExists) {
          setMergedAirportDestinationData((prev) => [
            ...prev,
            basicInfo.airPortOfDestination.trim(),
          ]);
        }
      }

      // Update merged Airlines data for immediate use
      if (basicInfo.airLines && basicInfo.airLines.trim()) {
        const airlinesExists = mergedAirlinesData.some(
          (a) => a.toLowerCase() === basicInfo.airLines.toLowerCase(),
        );
        if (!airlinesExists) {
          setMergedAirlinesData((prev) => [...prev, basicInfo.airLines.trim()]);
        }
      }

      // Update merged charge suggestions for immediate use
      const updateChargeSuggestions = (charges, mergedList, setMergedList) => {
        charges.forEach((charge) => {
          if (charge.charges && charge.charges.trim()) {
            const exists = mergedList.some(
              (c) => c.toLowerCase() === charge.charges.toLowerCase(),
            );
            if (!exists) {
              setMergedList((prev) => [...prev, charge.charges.trim()]);
            }
          }
        });
      };
      updateChargeSuggestions(
        originCharges,
        mergedOriginChargeSuggestions,
        setMergedOriginChargeSuggestions,
      );
      updateChargeSuggestions(
        freightCharges,
        mergedFreightChargeSuggestions,
        setMergedFreightChargeSuggestions,
      );
      updateChargeSuggestions(
        destinationCharges,
        mergedDestinationChargeSuggestions,
        setMergedDestinationChargeSuggestions,
      );
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert("Failed to connect to server. Please try again later.");
      setIsSubmitting(false);
      return;
    }

    // Clear the draft quotation reference if we were editing a draft
    if (draftQuotation && onDraftCleared) {
      onDraftCleared();
    }

    // Invalidate cache to force refresh on dashboard
    suggestionsCache.data = null;
    suggestionsCache.timestamp = null;
    invalidateQuotationsCache();

    // Console log all form data
    console.log("=== QUOTATION SUBMITTED ===");
    console.log("Quotation Number:", newQuotationNumber);
    console.log("Quotation Segment:", quotationSegment);
    console.log("Segment Prefix:", selectedSegmentDetails?.prefix);
    console.log("Basic Information:", basicInfo);
    console.log("Origin Charges:", originCharges);
    console.log("Freight Charges:", freightCharges);
    console.log("Destination Charges:", destinationCharges);
    console.log("Created By:", currentUser?.fullName || currentUser?.username);
    console.log("Created Date:", new Date().toISOString());
    console.log("Complete Quotation Data:", quotationData);
    console.log("===========================");

    // Show popup
    setShowPopup(true);
    setIsSubmitting(false);

    // Reset quotation segment after submission
    setQuotationSegment("");

    // Clear all form fields after submission
    setBasicInfo({
      customerNameAndAddress: "",
      shipperNameAndAddress: "",
      consigneeAddress: "",
      equipment: "",
      weight: "",
      cbm: "",
      terms: "",
      commodity: "",
      por: "",
      pol: "",
      pod: "",
      finalDestination: "",
      shippingLine: "",
      etd: "",
      eta: "",
      totalTransitTime: "",
      ratesValidity: "",
      remarks: "",
      numberOfPackets: "",
      cargoSizes: [""],
      airLines: "",
      airPortOfDeparture: "",
      airPortOfDestination: "",
      chargeableWeight: "",
      volumeWeight: "",
      size: "",
      railRamp: "",
      pickupLocation: "",
    });

    // Reset service job type
    setServiceJobType("");

    // Reset multi-container selections
    setContainerSelections([]);
    setNewContainerType("20ft Standard Container");
    setNewContainerQty(1);

    setOriginCharges([
      {
        id: Date.now(),
        charges: "",
        currency: "INR",
        amount: "",
        unit: "Per BL",
        containerAmounts: {},
      },
    ]);

    setFreightCharges([
      {
        id: Date.now() + 1,
        charges: "",
        currency: "INR",
        amount: "",
        unit: "Per BL",
        containerAmounts: {},
      },
    ]);

    setDestinationCharges([
      {
        id: Date.now() + 2,
        charges: "",
        currency: "INR",
        amount: "",
        unit: "Per BL",
        containerAmounts: {},
      },
    ]);

    // Hide popup after 3 seconds and redirect to View Quotations
    setTimeout(() => {
      setShowPopup(false);
      if (onNavigate) {
        onNavigate("quotation");
      }
    }, 3000);
  };

  // Computed FCL helpers (used in JSX and PDF)
  const isFCL =
    quotationSegment.toLowerCase() === "sea export fcl" ||
    quotationSegment.toLowerCase() === "sea import fcl";
  const isMultiContainer = isFCL && containerSelections.length > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-0">
      {/* Sub-Navigation Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Left - Back button */}
            <button
              onClick={() => onNavigate("dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} />
              <span>Back to Main</span>
            </button>

            {/* Center - Sub-navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigate("quotation")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all text-gray-600 hover:bg-gray-100"
              >
                <List size={14} />
                <span>View Quotations</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-blue-50 text-blue-700 border border-blue-200">
                <FilePlus size={14} />
                <span>Create Quotation</span>
              </button>
            </div>

            {/* Right - Module label */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText size={14} />
              <span className="font-medium">Quotation Module</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-8 sm:px-10 lg:px-10 py-5">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={24} />
                <div>
                  <h1 className="text-xl font-bold">Quotation Form</h1>
                </div>
              </div>
              {quotationNumber && (
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                  <p className="text-xs text-blue-100 font-medium">
                    Quotation No.
                  </p>
                  <p className="text-sm font-bold">{quotationNumber}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Segment Selection Screen */}
        {!quotationSegment ? (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-3xl mx-auto">
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-6 py-4 border-b-4 border-blue-600">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-lg shadow-md">
                  <FileText size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Create New Quotation
                  </h2>
                  <p className="text-slate-300 text-sm">
                    Select shipment segment to proceed
                  </p>
                </div>
              </div>
            </div>

            {/* Segment Selection */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Quick Reference Panel */}
                <div className="hidden lg:block w-64 flex-shrink-0">
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Available Services
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          Sea Freight
                        </div>
                        <div className="text-slate-600 space-y-0.5 ml-5">
                          <div>FCL Export/Import</div>
                          <div>LCL Export/Import</div>
                          <div>Break Bulk</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                          Air Freight
                        </div>
                        <div className="text-slate-600 space-y-0.5 ml-5">
                          <div>Air Export</div>
                          <div>Air Import</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Services
                        </div>
                        <div className="text-slate-600 space-y-0.5 ml-5">
                          <div>Transportation</div>
                          <div>Warehousing</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Selection Area */}
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    Select Quotation Segment
                    <span className="text-red-500">*</span>
                  </label>

                  <select
                    value={quotationSegment}
                    onChange={(e) => setQuotationSegment(e.target.value)}
                    className="w-full  px-3 py-3 text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:border-slate-400 cursor-pointer font-medium text-slate-700"
                    required
                  >
                    <option value="">-- Select Service Type --</option>
                    {quotationSegments.map((segment, index) => (
                      <option key={index} value={segment.label}>
                        {segment.label} • {segment.prefix}
                      </option>
                    ))}
                  </select>

                  {/* Compact Info */}
                  <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-600 rounded">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-blue-700">Note:</span>{" "}
                      Form fields will dynamically adjust based on your selected
                      segment. Choose the service type that best matches your
                      shipment requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Main Form - Shows after segment selection */
          <div className="bg-white rounded-lg shadow-md p-4 md:p-5 space-y-4">
            {/* Segment Info Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Selected Segment
                    </p>
                    <p className="text-lg font-bold text-gray-800">
                      {quotationSegment}
                      <span className="text-sm text-green-600 ml-2">
                        (
                        {
                          quotationSegments.find(
                            (s) => s.label === quotationSegment,
                          )?.prefix
                        }
                        )
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setQuotationSegment("");
                    setServiceJobType("");
                  }}
                  className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  Change Segment
                </button>
              </div>
            </div>

            {/* Basic Information Section */}
            <section>
              <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-blue-500">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  Scope of Activities
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Customer Name and Address{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="customerNameAndAddress"
                    value={basicInfo.customerNameAndAddress}
                    onChange={handleBasicInfoChange}
                    onFocus={() => {
                      if (
                        basicInfo.customerNameAndAddress &&
                        filteredCustomers.length > 0
                      ) {
                        setShowCustomerDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay to allow click on dropdown item
                      setTimeout(() => setShowCustomerDropdown(false), 200);
                    }}
                    placeholder="Start typing customer name..."
                    rows="3"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto overflow-x-hidden">
                      {filteredCustomers.map((customer, index) => (
                        <div
                          key={index}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-sm text-gray-800 break-words">
                            {customer.name}
                          </div>
                          <div className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                            {customer.address}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shipper Name and Address
                  </label>
                  <textarea
                    name="shipperNameAndAddress"
                    value={basicInfo.shipperNameAndAddress}
                    onChange={handleBasicInfoChange}
                    onFocus={() => {
                      if (
                        basicInfo.shipperNameAndAddress &&
                        filteredShippers.length > 0
                      ) {
                        setShowShipperDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowShipperDropdown(false), 200);
                    }}
                    placeholder="Start typing shipper name..."
                    rows="3"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  {showShipperDropdown && filteredShippers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto overflow-x-hidden">
                      {filteredShippers.map((shipper, index) => (
                        <div
                          key={index}
                          onClick={() => handleShipperSelect(shipper)}
                          className="px-3 py-2 hover:bg-teal-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-sm text-gray-800 break-words">
                            {shipper.name}
                          </div>
                          <div className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                            {shipper.address}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Delivery Address (Consignee){" "}
                  </label>
                  <textarea
                    name="consigneeAddress"
                    value={basicInfo.consigneeAddress}
                    onChange={handleBasicInfoChange}
                    onFocus={() => {
                      if (
                        basicInfo.consigneeAddress &&
                        filteredConsignees.length > 0
                      ) {
                        setShowConsigneeDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay to allow click on dropdown item
                      setTimeout(() => setShowConsigneeDropdown(false), 200);
                    }}
                    placeholder="Start typing consignee name..."
                    rows="3"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  {showConsigneeDropdown && filteredConsignees.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto overflow-x-hidden">
                      {filteredConsignees.map((consignee, index) => (
                        <div
                          key={index}
                          onClick={() => handleConsigneeSelect(consignee)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-sm text-gray-800 break-words">
                            {consignee.name}
                          </div>
                          <div className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                            {consignee.address}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Shipment Details */}
            <section className="bg-gray-50 p-3 rounded-lg">
              <h2 className="text-base font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-blue-400 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  2
                </span>
                Shipment Details
              </h2>

              {/* Show message if no segment selected */}
              {!quotationSegment && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Please select a Quotation Segment above to view shipment
                    details fields
                  </p>
                </div>
              )}

              {/* Fields display based on selected segment */}
              {quotationSegment && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  {/* Row 1: Container & Measurements */}
                  {getVisibleFields().includes("numberOfPackets") && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Number of Packets
                      </label>
                      <input
                        type="text"
                        name="numberOfPackets"
                        value={basicInfo.numberOfPackets}
                        onChange={handleBasicInfoChange}
                        placeholder="Enter number of packets"
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  )}
                  {getVisibleFields().includes("weight") && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Gross Weight (kg){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="weight"
                        value={basicInfo.weight}
                        onChange={handleBasicInfoChange}
                        placeholder="5000"
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  )}
                  {getVisibleFields().includes("equipment") && (
                    <div className={isFCL ? "md:col-span-2" : ""}>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Equipment <span className="text-red-500">*</span>
                      </label>
                      {isFCL ? (
                        <div className="space-y-2">
                          {/* Row: type dropdown + qty input + Add button */}
                          <div className="flex gap-1.5 items-center">
                            <select
                              value={newContainerType}
                              onChange={(e) => setNewContainerType(e.target.value)}
                              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-white"
                            >
                              <option value="20ft Standard Container">20ft Standard</option>
                              <option value="40ft Standard Container">40ft Standard</option>
                              <option value="40ft High Cube Container">40ft High Cube</option>
                              <option value="45ft High Cube Container">45ft High Cube</option>
                              <option value="20ft Reefer Container">20ft Reefer</option>
                              <option value="40ft Reefer Container">40ft Reefer</option>
                              <option value="20ft Open Top Container">20ft Open Top</option>
                              <option value="40ft Open Top Container">40ft Open Top</option>
                              <option value="20ft Flat Rack Container">20ft Flat Rack</option>
                              <option value="40ft Flat Rack Container">40ft Flat Rack</option>
                            </select>
                            <input
                              type="number"
                              min="1"
                              value={newContainerQty}
                              onChange={(e) =>
                                setNewContainerQty(
                                  Math.max(1, parseInt(e.target.value) || 1),
                                )
                              }
                              className="w-14 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 text-center"
                              placeholder="Qty"
                            />
                            <button
                              type="button"
                              onClick={addContainerSelection}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded text-xs font-medium transition whitespace-nowrap"
                            >
                              <Plus size={12} /> Add
                            </button>
                          </div>
                          {/* Selected container badges */}
                          {containerSelections.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {containerSelections.map((sel) => (
                                <span
                                  key={sel.type}
                                  className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-300"
                                >
                                  {sel.type.replace(" Container", "")} &times;
                                  {sel.qty}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeContainerSelection(sel.type)
                                    }
                                    className="text-blue-500 hover:text-red-600 font-bold leading-none ml-0.5"
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">
                              No containers added — click Add to select
                            </p>
                          )}
                        </div>
                      ) : (
                        <select
                          name="equipment"
                          value={basicInfo.equipment}
                          onChange={handleBasicInfoChange}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-white"
                        >
                          <option value="">Select Container</option>
                          <option value="20ft Standard Container">
                            20ft Standard
                          </option>
                          <option value="40ft Standard Container">
                            40ft Standard
                          </option>
                          <option value="40ft High Cube Container">
                            40ft High Cube
                          </option>
                          <option value="45ft High Cube Container">
                            45ft High Cube
                          </option>
                          <option value="20ft Reefer Container">
                            20ft Reefer
                          </option>
                          <option value="40ft Reefer Container">
                            40ft Reefer
                          </option>
                          <option value="20ft Open Top Container">
                            20ft Open Top
                          </option>
                          <option value="40ft Open Top Container">
                            40ft Open Top
                          </option>
                          <option value="20ft Flat Rack Container">
                            20ft Flat Rack
                          </option>
                          <option value="40ft Flat Rack Container">
                            40ft Flat Rack
                          </option>
                        </select>
                      )}
                    </div>
                  )}
                  {getVisibleFields().includes("cargoSize") && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Cargo Sizes
                      </label>
                      {(basicInfo.cargoSizes || [""]).map((size, idx) => (
                        <div key={idx} className="flex gap-1 mb-1">
                          <input
                            type="text"
                            value={size}
                            onChange={(e) => {
                              const updated = [...basicInfo.cargoSizes];
                              updated[idx] = e.target.value;
                              setBasicInfo(prev => ({ ...prev, cargoSizes: updated }));
                            }}
                            placeholder="Enter cargo size"
                            className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                          />
                          {basicInfo.cargoSizes.length > 1 && (
                            <button type="button" onClick={() => {
                              setBasicInfo(prev => ({ ...prev, cargoSizes: prev.cargoSizes.filter((_, i) => i !== idx) }));
                            }} className="text-red-400 hover:text-red-600 px-1">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => setBasicInfo(prev => ({ ...prev, cargoSizes: [...prev.cargoSizes, ""] }))}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1">
                        <Plus size={10} /> Add More
                      </button>
                    </div>
                  )}
                  {getVisibleFields().includes("volumeWeight") && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Volume Weight (kg)
                      </label>
                      <input
                        type="text"
                        name="volumeWeight"
                        value={basicInfo.volumeWeight}
                        onChange={handleBasicInfoChange}
                        placeholder="Enter volume weight"
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  )}
                  {getVisibleFields().includes("chargeableWeight") && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Chargeable Weight (kg)
                      </label>
                      <input
                        type="text"
                        name="chargeableWeight"
                        value={basicInfo.chargeableWeight}
                        onChange={handleBasicInfoChange}
                        placeholder="Enter chargeable weight"
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  )}
                  {getVisibleFields().includes("cbm") && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        CBM (m³)
                      </label>
                      <input
                        type="text"
                        name="cbm"
                        value={basicInfo.cbm}
                        onChange={handleBasicInfoChange}
                        placeholder="25"
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  )}
                  {getVisibleFields().includes("commodity") && (
                    <div className="relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Commodity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="commodity"
                        value={basicInfo.commodity}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (mergedCommodityData.length > 0) {
                            const filtered = mergedCommodityData
                              .filter((c) =>
                                c
                                  .toLowerCase()
                                  .includes(
                                    (basicInfo.commodity || "").toLowerCase(),
                                  ),
                              )
                              .sort();
                            setFilteredCommodities(filtered);
                            setShowCommodityDropdown(filtered.length > 0);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(
                            () => setShowCommodityDropdown(false),
                            200,
                          );
                        }}
                        placeholder="Electronics, etc."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showCommodityDropdown &&
                        filteredCommodities.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredCommodities.map((commodity, index) => (
                              <div
                                key={index}
                                onClick={() => handleCommoditySelect(commodity)}
                                className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                              >
                                {commodity}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                  {getVisibleFields().includes("terms") && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Terms <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="terms"
                        value={basicInfo.terms}
                        onChange={handleBasicInfoChange}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-white"
                      >
                        <option value="">Select</option>
                        <option value="DDP">DDP</option>
                        <option value="CIF">CIF</option>
                        <option value="DAP">DAP</option>
                        <option value="Ex-WORK">Ex-WORK</option>
                        <option value="FOB">FOB</option>
                        <option value="FCA">FCA</option>
                      </select>
                    </div>
                  )}

                  {/* Row 2: Ports */}
                  {getVisibleFields().includes("por") && (
                    <div className="relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        POR{" "}
                        <span className="text-gray-500 text-[10px]">
                          (Receipt)
                        </span>
                      </label>
                      <input
                        type="text"
                        name="por"
                        value={basicInfo.por}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (
                            basicInfo.por &&
                            filteredPorLocations.length > 0
                          ) {
                            setShowPorDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowPorDropdown(false), 200);
                        }}
                        placeholder="Type ICD location..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showPorDropdown && filteredPorLocations.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredPorLocations.map((location, index) => (
                            <div
                              key={index}
                              onClick={() => handlePorSelect(location)}
                              className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                            >
                              <div className="text-gray-800">{location}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {getVisibleFields().includes("pol") && (
                    <div className="relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        POL{" "}
                        <span className="text-gray-500 text-[10px]">
                          (Loading)
                        </span>
                      </label>
                      <input
                        type="text"
                        name="pol"
                        value={basicInfo.pol}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (basicInfo.pol && filteredPolPorts.length > 0) {
                            setShowPolDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowPolDropdown(false), 200);
                        }}
                        placeholder="Type port name..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showPolDropdown && filteredPolPorts.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredPolPorts.map((port, index) => (
                            <div
                              key={index}
                              onClick={() => handlePolSelect(port)}
                              className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                            >
                              <div className="text-gray-800">{port}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {getVisibleFields().includes("pod") && (
                    <div className="relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        POD{" "}
                        <span className="text-gray-500 text-[10px]">
                          (Discharge)
                        </span>
                      </label>
                      <input
                        type="text"
                        name="pod"
                        value={basicInfo.pod}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (basicInfo.pod && filteredPodPorts.length > 0) {
                            setShowPodDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowPodDropdown(false), 200);
                        }}
                        placeholder="Type destination..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showPodDropdown && filteredPodPorts.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredPodPorts.map((destination, index) => (
                            <div
                              key={index}
                              onClick={() => handlePodSelect(destination)}
                              className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                            >
                              <div className="text-gray-800">{destination}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {getVisibleFields().includes("finalDestination") && (
                    <div className="md:col-span-2 relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Final Destination
                      </label>
                      <input
                        type="text"
                        name="finalDestination"
                        value={basicInfo.finalDestination}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (
                            basicInfo.finalDestination &&
                            filteredFinalDestinations.length > 0
                          ) {
                            setShowFinalDestDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(
                            () => setShowFinalDestDropdown(false),
                            200,
                          );
                        }}
                        placeholder="Type final destination..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showFinalDestDropdown &&
                        filteredFinalDestinations.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredFinalDestinations.map(
                              (destination, index) => (
                                <div
                                  key={index}
                                  onClick={() =>
                                    handleFinalDestSelect(destination)
                                  }
                                  className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                                >
                                  <div className="text-gray-800">
                                    {destination}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Pickup Location - Optional field */}
                  {getVisibleFields().includes("pickupLocation") && (
                    <div className="relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Pickup Location{" "}
                        <span className="text-gray-500 text-[10px]">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        name="pickupLocation"
                        value={basicInfo.pickupLocation}
                        onChange={handleBasicInfoChange}
                        placeholder="Enter pickup location..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Rail Ramp - Optional field */}
                  {getVisibleFields().includes("railRamp") && (
                    <div className="relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Rail Ramp{" "}
                        <span className="text-gray-500 text-[10px]">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        name="railRamp"
                        value={basicInfo.railRamp}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (
                            basicInfo.railRamp &&
                            filteredRailRampData.length > 0
                          ) {
                            setShowRailRampDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowRailRampDropdown(false), 200);
                        }}
                        placeholder="Type rail ramp..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showRailRampDropdown &&
                        filteredRailRampData.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredRailRampData.map((ramp, index) => (
                              <div
                                key={index}
                                onClick={() => handleRailRampSelect(ramp)}
                                className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                              >
                                <div className="text-gray-800">{ramp}</div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Row 3: Shipping & Time Details */}
                  {getVisibleFields().includes("shippingLine") && (
                    <div className="md:col-span-2 relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Shipping Line
                      </label>
                      <input
                        type="text"
                        name="shippingLine"
                        value={basicInfo.shippingLine}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (
                            basicInfo.shippingLine &&
                            filteredShippingLines.length > 0
                          ) {
                            setShowShippingLineDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow click on dropdown item
                          setTimeout(
                            () => setShowShippingLineDropdown(false),
                            200,
                          );
                        }}
                        placeholder="Start typing shipping line..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showShippingLineDropdown &&
                        filteredShippingLines.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredShippingLines.map((line, index) => (
                              <div
                                key={index}
                                onClick={() => handleShippingLineSelect(line)}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                              >
                                <div className="text-gray-800">{line}</div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                  {getVisibleFields().includes("etd") && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        ETD
                      </label>
                      <input
                        type="date"
                        name="etd"
                        value={basicInfo.etd}
                        onChange={handleBasicInfoChange}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  )}
                  {getVisibleFields().includes("eta") && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-0.5">
                        ETA
                      </label>
                      <input
                        type="date"
                        name="eta"
                        value={basicInfo.eta}
                        onChange={handleBasicInfoChange}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  )}
                  {getVisibleFields().includes("totalTransitTime") && (
                    <div className="md:col-span-2">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Transit Time
                      </label>
                      <select
                        name="totalTransitTime"
                        value={basicInfo.totalTransitTime}
                        onChange={handleBasicInfoChange}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-white"
                      >
                        <option value="">Select days</option>
                        {Array.from({ length: 100 }, (_, i) => i + 1).map(
                          (day) => (
                            <option
                              key={day}
                              value={`${day} ${day === 1 ? "day (approx)" : "days (approx)"}`}
                            >
                              {day}{" "}
                              {day === 1 ? "day (approx)" : "days (approx)"}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}

                  {/* Row 4: Additional Shipment Details */}
                  {getVisibleFields().includes("airPortOfDeparture") && (
                    <div className="md:col-span-2 relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Airport of Departure
                      </label>
                      <input
                        type="text"
                        name="airPortOfDeparture"
                        value={basicInfo.airPortOfDeparture}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (
                            basicInfo.airPortOfDeparture &&
                            filteredAirportsDeparture.length > 0
                          ) {
                            setShowAirportDepartureDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(
                            () => setShowAirportDepartureDropdown(false),
                            200,
                          );
                        }}
                        placeholder="Type airport name..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showAirportDepartureDropdown &&
                        filteredAirportsDeparture.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredAirportsDeparture.map((airport, index) => (
                              <div
                                key={index}
                                onClick={() =>
                                  handleAirportDepartureSelect(airport)
                                }
                                className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                              >
                                <div className="text-gray-800">{airport}</div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Row 5: More Shipment Details */}
                  {getVisibleFields().includes("airPortOfDestination") && (
                    <div className="md:col-span-2 relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Airport of Destination
                      </label>
                      <input
                        type="text"
                        name="airPortOfDestination"
                        value={basicInfo.airPortOfDestination}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (
                            basicInfo.airPortOfDestination &&
                            filteredAirportsDestination.length > 0
                          ) {
                            setShowAirportDestinationDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(
                            () => setShowAirportDestinationDropdown(false),
                            200,
                          );
                        }}
                        placeholder="Type airport name..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showAirportDestinationDropdown &&
                        filteredAirportsDestination.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredAirportsDestination.map(
                              (airport, index) => (
                                <div
                                  key={index}
                                  onClick={() =>
                                    handleAirportDestinationSelect(airport)
                                  }
                                  className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                                >
                                  <div className="text-gray-800">{airport}</div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  )}
                  {getVisibleFields().includes("airLines") && (
                    <div className="relative">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Airlines
                      </label>
                      <input
                        type="text"
                        name="airLines"
                        value={basicInfo.airLines}
                        onChange={handleBasicInfoChange}
                        onFocus={() => {
                          if (
                            basicInfo.airLines &&
                            filteredAirlines.length > 0
                          ) {
                            setShowAirlinesDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowAirlinesDropdown(false), 200);
                        }}
                        placeholder="Type airline name..."
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                      />
                      {showAirlinesDropdown && filteredAirlines.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredAirlines.map((airline, index) => (
                            <div
                              key={index}
                              onClick={() => handleAirlinesSelect(airline)}
                              className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                            >
                              <div className="text-gray-800">{airline}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Service Job Selection */}
                  {getVisibleFields().includes("serviceJobRadio") && (
                    <div className="md:col-span-5">
                      <label className="block font-medium text-gray-700 mb-2">
                        Service Type <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          "Sea Export LCL",
                          "Sea Export FCL",
                          "Sea Export Bulk",
                          "Sea Import LCL",
                          "Sea Import FCL",
                          "Sea Import Break Bulk",
                          "Air Import",
                          "Air Export",
                          "Warehousing",
                        ].map((type) => (
                          <label
                            key={type}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="serviceJobType"
                              value={type}
                              checked={serviceJobType === type}
                              onChange={(e) =>
                                setServiceJobType(e.target.value)
                              }
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-xs text-gray-700">
                              {type}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 6: Remarks */}
                  {getVisibleFields().includes("remarks") && (
                    <div className="md:col-span-5">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Remarks
                      </label>
                      <textarea
                        name="remarks"
                        value={basicInfo.remarks}
                        onChange={handleBasicInfoChange}
                        placeholder="Additional notes..."
                        rows="3"
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent resize-none"
                      />
                    </div>
                  )}

                  {/* Quotation Validity Date */}
                  {getVisibleFields().includes("ratesValidity") && (
                    <div className="md:col-span-2">
                      <label className="block font-medium text-gray-700 mb-0.5">
                        Quotation Validity Date
                      </label>
                      <input
                        type="date"
                        name="ratesValidity"
                        value={basicInfo.ratesValidity}
                        onChange={handleBasicInfoChange}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-white cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Section 3: Charges */}
            <section className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  3
                </span>
                Charges
              </h2>

              {/* Origin Charges */}
              <div className="mb-3">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-2.5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                      <span className="bg-blue-500 text-white w-5 h-5 rounded flex items-center justify-center text-xs">
                        O
                      </span>
                      Origin Charges
                    </h3>
                    <button
                      type="button"
                      onClick={addOriginCharge}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition shadow-sm hover:shadow"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>

                  {/* Compact Table */}
                  <div className="bg-white rounded-md border border-gray-200">
                    <table className="w-full text-xs overflow-x-auto">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                            Charge
                          </th>
                          <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                            Currency
                          </th>
                          {isMultiContainer ? (
                            containerSelections.map((sel) => (
                              <th
                                key={sel.type}
                                className="px-1 py-1.5 text-center font-semibold text-gray-700 w-28"
                              >
                                {sel.type.replace(" Container", "")} &times;{sel.qty}
                              </th>
                            ))
                          ) : (
                            <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                              Amount
                            </th>
                          )}
                          <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-24">
                            Unit
                          </th>
                          <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {originCharges.map((charge) => (
                          <tr
                            key={charge.id}
                            className="border-t border-gray-100 hover:bg-blue-50"
                          >
                            <td className="px-2 py-1.5 relative">
                              <input
                                type="text"
                                value={charge.charges}
                                onChange={(e) =>
                                  handleOriginChargeChange(
                                    charge.id,
                                    "charges",
                                    e.target.value,
                                  )
                                }
                                onFocus={() => {
                                  // Show all suggestions on focus, excluding already-added charges
                                  const usedCharges = new Set(
                                    originCharges
                                      .filter(
                                        (c) =>
                                          c.id !== charge.id &&
                                          c.charges.trim(),
                                      )
                                      .map((c) =>
                                        c.charges.trim().toLowerCase(),
                                      ),
                                  );
                                  const filtered =
                                    mergedOriginChargeSuggestions.filter(
                                      (suggestion) =>
                                        !usedCharges.has(
                                          suggestion.toLowerCase(),
                                        ) &&
                                        suggestion
                                          .toLowerCase()
                                          .includes(
                                            charge.charges.toLowerCase(),
                                          ),
                                    );
                                  setFilteredOriginChargeSuggestions(
                                    (prev) => ({
                                      ...prev,
                                      [charge.id]: filtered,
                                    }),
                                  );
                                  if (filtered.length > 0) {
                                    setShowOriginChargeSuggestions((prev) => ({
                                      ...prev,
                                      [charge.id]: true,
                                    }));
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setShowOriginChargeSuggestions((prev) => ({
                                      ...prev,
                                      [charge.id]: false,
                                    }));
                                  }, 200);
                                }}
                                placeholder="Type charge name..."
                                className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-400"
                              />
                              {showOriginChargeSuggestions[charge.id] &&
                                filteredOriginChargeSuggestions[charge.id]
                                  ?.length > 0 && (
                                  <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-blue-400 rounded-lg shadow-2xl max-h-60 overflow-y-auto left-0 top-full">
                                    {filteredOriginChargeSuggestions[
                                      charge.id
                                    ].map((suggestion, index) => (
                                      <div
                                        key={index}
                                        onClick={() =>
                                          handleOriginChargeSuggestionSelect(
                                            charge.id,
                                            suggestion,
                                          )
                                        }
                                        className="px-3 py-2.5 hover:bg-blue-100 active:bg-blue-200 cursor-pointer border-b border-gray-200 last:border-b-0 text-xs transition-all"
                                      >
                                        <div className="text-gray-900 font-medium">
                                          {suggestion}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </td>
                            <td className="px-1 py-1.5">
                              <select
                                value={charge.currency}
                                onChange={(e) =>
                                  handleOriginChargeChange(
                                    charge.id,
                                    "currency",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-400 bg-white"
                              >
                                <option value="USD">USD $</option>
                                <option value="INR">INR ₹</option>
                                <option value="EUR">EUR €</option>
                                <option value="GBP">GBP £</option>
                                <option value="AED">AED د.إ</option>
                                <option value="SAR">SAR ﷼</option>
                                <option value="AUD">AUD A$</option>
                                <option value="JPY">JPY ¥</option>
                                <option value="CAD">CAD C$</option>
                                <option value="CNY">CNY ¥</option>
                                <option value="BDT">BDT ৳</option>
                                <option value="BRL">BRL R$</option>
                                <option value="HKD">HKD HK$</option>
                                <option value="IDR">IDR Rp</option>
                                <option value="ILS">ILS ₪</option>
                                <option value="RUB">RUB ₽</option>
                                <option value="QAR">QAR ﷼</option>
                                <option value="SGD">SGD S$</option>
                              </select>
                            </td>
                            {isMultiContainer ? (
                              containerSelections.map((sel) => (
                                <td key={sel.type} className="px-1 py-1.5">
                                  <input
                                    type="text"
                                    value={charge.containerAmounts?.[sel.type] || ""}
                                    onChange={(e) =>
                                      handleOriginContainerAmount(
                                        charge.id,
                                        sel.type,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0.00"
                                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-blue-400"
                                  />
                                </td>
                              ))
                            ) : (
                              <td className="px-1 py-1.5">
                                <input
                                  type="text"
                                  value={charge.amount}
                                  onChange={(e) =>
                                    handleOriginChargeChange(
                                      charge.id,
                                      "amount",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                  className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-blue-400"
                                />
                              </td>
                            )}
                            <td className="px-1 py-1.5">
                              <select
                                value={charge.unit}
                                onChange={(e) =>
                                  handleOriginChargeChange(
                                    charge.id,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-400 bg-white"
                              >
                                <option value="Per BL">/BL</option>
                                <option value="Per PKG">/PKG</option>
                                <option value="Per HBL">/HBL</option>
                                <option value="Per KG">/KG</option>
                                <option value="Per Truck">/Truck</option>
                                <option value="Per Metric Ton">/MT</option>
                                <option value="Per MAWB">/MAWB</option>
                                <option value="Per HAWB">/HAWB</option>
                                <option value="Per Shipment">/Shipment</option>
                                <option value="Per Container">
                                  /Container
                                </option>
                              </select>
                            </td>
                            <td className="px-1 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeOriginCharge(charge.id)}
                                className="text-red-500 hover:text-red-700 p-0.5 rounded transition"
                                title="Remove"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Freight Charges */}
              <div className="mb-3">
                <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg p-2.5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-green-900 flex items-center gap-1.5">
                      <span className="bg-green-500 text-white w-5 h-5 rounded flex items-center justify-center text-xs">
                        F
                      </span>
                      Freight Charges
                    </h3>
                    <button
                      type="button"
                      onClick={addFreightCharge}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition shadow-sm hover:shadow"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>

                  {/* Compact Table */}
                  <div className="bg-white rounded-md border border-gray-200">
                    <table className="w-full text-xs overflow-x-auto">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                            Charge
                          </th>
                          <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                            Currency
                          </th>
                          {isMultiContainer ? (
                            containerSelections.map((sel) => (
                              <th
                                key={sel.type}
                                className="px-1 py-1.5 text-center font-semibold text-gray-700 w-28"
                              >
                                {sel.type.replace(" Container", "")} &times;{sel.qty}
                              </th>
                            ))
                          ) : (
                            <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                              Amount
                            </th>
                          )}
                          <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-24">
                            Unit
                          </th>
                          <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {freightCharges.map((charge) => (
                          <tr
                            key={charge.id}
                            className="border-t border-gray-100 hover:bg-green-50"
                          >
                            <td className="px-2 py-1.5 relative">
                              <input
                                type="text"
                                value={charge.charges}
                                onChange={(e) =>
                                  handleFreightChargeChange(
                                    charge.id,
                                    "charges",
                                    e.target.value,
                                  )
                                }
                                onFocus={() => {
                                  // Show all suggestions on focus, excluding already-added charges
                                  const usedCharges = new Set(
                                    freightCharges
                                      .filter(
                                        (c) =>
                                          c.id !== charge.id &&
                                          c.charges.trim(),
                                      )
                                      .map((c) =>
                                        c.charges.trim().toLowerCase(),
                                      ),
                                  );
                                  const filtered =
                                    mergedFreightChargeSuggestions.filter(
                                      (suggestion) =>
                                        !usedCharges.has(
                                          suggestion.toLowerCase(),
                                        ) &&
                                        suggestion
                                          .toLowerCase()
                                          .includes(
                                            charge.charges.toLowerCase(),
                                          ),
                                    );
                                  setFilteredFreightChargeSuggestions(
                                    (prev) => ({
                                      ...prev,
                                      [charge.id]: filtered,
                                    }),
                                  );
                                  if (filtered.length > 0) {
                                    setShowFreightChargeSuggestions((prev) => ({
                                      ...prev,
                                      [charge.id]: true,
                                    }));
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setShowFreightChargeSuggestions((prev) => ({
                                      ...prev,
                                      [charge.id]: false,
                                    }));
                                  }, 200);
                                }}
                                placeholder="Type charge name..."
                                className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-400"
                              />
                              {showFreightChargeSuggestions[charge.id] &&
                                filteredFreightChargeSuggestions[charge.id]
                                  ?.length > 0 && (
                                  <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-green-400 rounded-lg shadow-2xl max-h-60 overflow-y-auto left-0 top-full">
                                    {filteredFreightChargeSuggestions[
                                      charge.id
                                    ].map((suggestion, index) => (
                                      <div
                                        key={index}
                                        onClick={() =>
                                          handleFreightChargeSuggestionSelect(
                                            charge.id,
                                            suggestion,
                                          )
                                        }
                                        className="px-3 py-2.5 hover:bg-green-100 active:bg-green-200 cursor-pointer border-b border-gray-200 last:border-b-0 text-xs transition-all"
                                      >
                                        <div className="text-gray-900 font-medium">
                                          {suggestion}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </td>
                            <td className="px-1 py-1.5">
                              <select
                                value={charge.currency}
                                onChange={(e) =>
                                  handleFreightChargeChange(
                                    charge.id,
                                    "currency",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-400 bg-white"
                              >
                                <option value="USD">USD $</option>
                                <option value="INR">INR ₹</option>
                                <option value="EUR">EUR €</option>
                                <option value="GBP">GBP £</option>
                                <option value="AED">AED د.إ</option>
                                <option value="SAR">SAR ﷼</option>
                                <option value="AUD">AUD A$</option>
                                <option value="JPY">JPY ¥</option>
                                <option value="CAD">CAD C$</option>
                                <option value="CNY">CNY ¥</option>
                                <option value="BDT">BDT ৳</option>
                                <option value="BRL">BRL R$</option>
                                <option value="HKD">HKD HK$</option>
                                <option value="IDR">IDR Rp</option>
                                <option value="ILS">ILS ₪</option>
                                <option value="RUB">RUB ₽</option>
                                <option value="QAR">QAR ﷼</option>
                                <option value="SGD">SGD S$</option>
                              </select>
                            </td>
                            {isMultiContainer ? (
                              containerSelections.map((sel) => (
                                <td key={sel.type} className="px-1 py-1.5">
                                  <input
                                    type="text"
                                    value={charge.containerAmounts?.[sel.type] || ""}
                                    onChange={(e) =>
                                      handleFreightContainerAmount(
                                        charge.id,
                                        sel.type,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0.00"
                                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-green-400"
                                  />
                                </td>
                              ))
                            ) : (
                              <td className="px-1 py-1.5">
                                <input
                                  type="text"
                                  value={charge.amount}
                                  onChange={(e) =>
                                    handleFreightChargeChange(
                                      charge.id,
                                      "amount",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                  className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-green-400"
                                />
                              </td>
                            )}
                            <td className="px-1 py-1.5">
                              <select
                                value={charge.unit}
                                onChange={(e) =>
                                  handleFreightChargeChange(
                                    charge.id,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-400 bg-white"
                              >
                                <option value="Per BL">/BL</option>
                                <option value="Per PKG">/PKG</option>
                                <option value="Per HBL">/HBL</option>
                                <option value="Per KG">/KG</option>
                                <option value="Per Truck">/Truck</option>
                                <option value="Per Metric Ton">/MT</option>
                                <option value="Per MAWB">/MAWB</option>
                                <option value="Per HAWB">/HAWB</option>
                                <option value="Per Shipment">/Shipment</option>
                                <option value="Per Container">
                                  /Container
                                </option>
                              </select>
                            </td>
                            <td className="px-1 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeFreightCharge(charge.id)}
                                className="text-red-500 hover:text-red-700 p-0.5 rounded transition"
                                title="Remove"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Destination Charges */}
              <div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 rounded-lg p-2.5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                      <span className="bg-purple-500 text-white w-5 h-5 rounded flex items-center justify-center text-xs">
                        D
                      </span>
                      Destination Charges
                    </h3>
                    <button
                      type="button"
                      onClick={addDestinationCharge}
                      className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition shadow-sm hover:shadow"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>

                  {/* Compact Table */}
                  <div className="bg-white rounded-md border border-gray-200">
                    <table className="w-full text-xs overflow-x-auto">
                      <thead className="bg-purple-100">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                            Charge
                          </th>
                          <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                            Currency
                          </th>
                          {isMultiContainer ? (
                            containerSelections.map((sel) => (
                              <th
                                key={sel.type}
                                className="px-1 py-1.5 text-center font-semibold text-gray-700 w-28"
                              >
                                {sel.type.replace(" Container", "")} &times;{sel.qty}
                              </th>
                            ))
                          ) : (
                            <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                              Amount
                            </th>
                          )}
                          <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-24">
                            Unit
                          </th>
                          <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {destinationCharges.map((charge) => (
                          <tr
                            key={charge.id}
                            className="border-t border-gray-100 hover:bg-purple-50"
                          >
                            <td className="px-2 py-1.5 relative">
                              <input
                                type="text"
                                value={charge.charges}
                                onChange={(e) =>
                                  handleDestinationChargeChange(
                                    charge.id,
                                    "charges",
                                    e.target.value,
                                  )
                                }
                                onFocus={() => {
                                  // Show all suggestions on focus, excluding already-added charges
                                  const usedCharges = new Set(
                                    destinationCharges
                                      .filter(
                                        (c) =>
                                          c.id !== charge.id &&
                                          c.charges.trim(),
                                      )
                                      .map((c) =>
                                        c.charges.trim().toLowerCase(),
                                      ),
                                  );
                                  const filtered =
                                    mergedDestinationChargeSuggestions.filter(
                                      (suggestion) =>
                                        !usedCharges.has(
                                          suggestion.toLowerCase(),
                                        ) &&
                                        suggestion
                                          .toLowerCase()
                                          .includes(
                                            charge.charges.toLowerCase(),
                                          ),
                                    );
                                  setFilteredDestinationChargeSuggestions(
                                    (prev) => ({
                                      ...prev,
                                      [charge.id]: filtered,
                                    }),
                                  );
                                  if (filtered.length > 0) {
                                    setShowDestinationChargeSuggestions(
                                      (prev) => ({
                                        ...prev,
                                        [charge.id]: true,
                                      }),
                                    );
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setShowDestinationChargeSuggestions(
                                      (prev) => ({
                                        ...prev,
                                        [charge.id]: false,
                                      }),
                                    );
                                  }, 200);
                                }}
                                placeholder="Type charge name..."
                                className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-400"
                              />
                              {showDestinationChargeSuggestions[charge.id] &&
                                filteredDestinationChargeSuggestions[charge.id]
                                  ?.length > 0 && (
                                  <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-purple-400 rounded-lg shadow-2xl max-h-60 overflow-y-auto left-0 top-full">
                                    {filteredDestinationChargeSuggestions[
                                      charge.id
                                    ].map((suggestion, index) => (
                                      <div
                                        key={index}
                                        onClick={() =>
                                          handleDestinationChargeSuggestionSelect(
                                            charge.id,
                                            suggestion,
                                          )
                                        }
                                        className="px-3 py-2.5 hover:bg-purple-100 active:bg-purple-200 cursor-pointer border-b border-gray-200 last:border-b-0 text-xs transition-all"
                                      >
                                        <div className="text-gray-900 font-medium">
                                          {suggestion}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </td>
                            <td className="px-1 py-1.5">
                              <select
                                value={charge.currency}
                                onChange={(e) =>
                                  handleDestinationChargeChange(
                                    charge.id,
                                    "currency",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-400 bg-white"
                              >
                                <option value="USD">USD $</option>
                                <option value="INR">INR ₹</option>
                                <option value="EUR">EUR €</option>
                                <option value="GBP">GBP £</option>
                                <option value="AED">AED د.إ</option>
                                <option value="SAR">SAR ﷼</option>
                                <option value="AUD">AUD A$</option>
                                <option value="JPY">JPY ¥</option>
                                <option value="CAD">CAD C$</option>
                                <option value="CNY">CNY ¥</option>
                                <option value="BDT">BDT ৳</option>
                                <option value="BRL">BRL R$</option>
                                <option value="HKD">HKD HK$</option>
                                <option value="IDR">IDR Rp</option>
                                <option value="ILS">ILS ₪</option>
                                <option value="RUB">RUB ₽</option>
                                <option value="QAR">QAR ﷼</option>
                                <option value="SGD">SGD S$</option>
                              </select>
                            </td>
                            {isMultiContainer ? (
                              containerSelections.map((sel) => (
                                <td key={sel.type} className="px-1 py-1.5">
                                  <input
                                    type="text"
                                    value={charge.containerAmounts?.[sel.type] || ""}
                                    onChange={(e) =>
                                      handleDestContainerAmount(
                                        charge.id,
                                        sel.type,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0.00"
                                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-purple-400"
                                  />
                                </td>
                              ))
                            ) : (
                              <td className="px-1 py-1.5">
                                <input
                                  type="text"
                                  value={charge.amount}
                                  onChange={(e) =>
                                    handleDestinationChargeChange(
                                      charge.id,
                                      "amount",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                  className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-purple-400"
                                />
                              </td>
                            )}
                            <td className="px-1 py-1.5">
                              <select
                                value={charge.unit}
                                onChange={(e) =>
                                  handleDestinationChargeChange(
                                    charge.id,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-400 bg-white"
                              >
                                <option value="Per BL">/BL</option>
                                <option value="Per PKG">/PKG</option>
                                <option value="Per HBL">/HBL</option>
                                <option value="Per KG">/KG</option>
                                <option value="Per Truck">/Truck</option>
                                <option value="Per Metric Ton">/MT</option>
                                <option value="Per MAWB">/MAWB</option>
                                <option value="Per HAWB">/HAWB</option>
                                <option value="Per Shipment">/Shipment</option>
                                <option value="Per Container">
                                  /Container
                                </option>
                              </select>
                            </td>
                            <td className="px-1 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  removeDestinationCharge(charge.id)
                                }
                                className="text-red-500 hover:text-red-700 p-0.5 rounded transition"
                                title="Remove"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* Terms and Conditions Section */}
            <section className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText size={18} className="text-yellow-600" />
                Terms and Conditions
                {quotationSegment && (
                  <span className="text-xs font-normal text-gray-500 ml-2">
                    ({quotationSegment}
                    {[
                      "Sea Export FCL",
                      "Sea Export LCL",
                      "Sea Export Break Bulk",
                    ].includes(quotationSegment) &&
                      basicInfo.terms &&
                      ` - ${basicInfo.terms}`}
                    )
                  </span>
                )}
              </h3>

              {/* Add Term Section */}
              <div className="mb-4 relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                      <Search size={14} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search or add custom term..."
                      value={termSearchInput}
                      onChange={(e) => handleTermSearchChange(e.target.value)}
                      onFocus={() => {
                        setFilteredTermsSuggestions(
                          mergedTermsData.filter(
                            (term) => !selectedTerms.includes(term),
                          ),
                        );
                        setShowTermsSuggestions(true);
                      }}
                      onBlur={() =>
                        setTimeout(() => setShowTermsSuggestions(false), 200)
                      }
                      className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                  </div>
                  {termSearchInput.trim() && (
                    <button
                      type="button"
                      onClick={handleAddCustomTerm}
                      className="flex items-center gap-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-md transition"
                    >
                      <Plus size={14} />
                      Add Custom
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showTermsSuggestions &&
                  filteredTermsSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredTermsSuggestions
                        .slice(0, 10)
                        .map((term, index) => (
                          <div
                            key={index}
                            onClick={() => handleAddTerm(term)}
                            className="px-3 py-2 text-xs text-gray-700 hover:bg-yellow-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            {term}
                          </div>
                        ))}
                      {filteredTermsSuggestions.length > 10 && (
                        <div className="px-3 py-2 text-xs text-gray-400 text-center">
                          +{filteredTermsSuggestions.length - 10} more terms...
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {/* Selected Terms List */}
              {selectedTerms.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  {quotationSegment
                    ? "No terms selected. Add terms using the search above."
                    : "Please select a quotation segment to load default terms."}
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleTermsDragEnd}
                >
                  <SortableContext
                    items={selectedTerms.map(
                      (term, i) => `term-${i}-${term.substring(0, 20)}`,
                    )}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-1.5 text-xs text-gray-700">
                      {selectedTerms.map((term, index) => (
                        <SortableTermItem
                          key={`term-${index}-${term.substring(0, 20)}`}
                          id={`term-${index}-${term.substring(0, 20)}`}
                          term={term}
                          index={index}
                          onRemove={handleRemoveTerm}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}

              {/* Term Count */}
              {selectedTerms.length > 0 && (
                <p className="mt-3 text-xs text-gray-400 text-right">
                  {selectedTerms.length} term
                  {selectedTerms.length !== 1 ? "s" : ""} added
                </p>
              )}
            </section>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              {/* Submit & Download PDF Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isSavingDraft || !isFormValid()}
                className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3 rounded-md text-sm font-medium transition shadow-md hover:shadow-lg ${isSubmitting || isSavingDraft || !isFormValid() ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {draftQuotation
                      ? "Submit Draft & Download PDF"
                      : "Submit & Download PDF"}
                  </>
                )}
              </button>

              {/* Save as Draft Button */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting || isSavingDraft || !canSaveDraft()}
                className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition shadow-md hover:shadow-lg ${isSubmitting || isSavingDraft || !canSaveDraft() ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSavingDraft ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Draft...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save & Submit Later
                  </>
                )}
              </button>
            </div>

            {/* Summary Footer */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Quotation Form • OmTrans Logistics Ltd.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full animate-bounce-in">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle size={48} className="text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
              Quotation Submitted Successfully!
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-600 font-medium text-center mb-1">
                Quotation Number
              </p>
              <p className="text-lg font-bold text-blue-900 text-center">
                {quotationNumber}
              </p>
            </div>
            <p className="text-center text-gray-600 text-sm mb-4">
              Your quotation has been generated and the PDF is downloading.
            </p>
            <button
              onClick={() => setShowPopup(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <X size={16} />
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExportQuotationForm;
