import React, { useState, useEffect } from "react";
import { FileText, Send, CheckCircle, X, Plus, Trash2, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import OmTransLogo from "../assets/OmTrans.png";
import { icdLocations } from "./POR";
import { indianPorts } from "./POL";
import { foreignDestinations } from "./POD";
import { customerData } from "./CustomerData";
import { consigneeData } from "./ConsigneeData";
import { shippingLines } from "./ShippingLines";
import { airlines } from "./Airlines";
import { airportsOfDeparture } from "./AirportOfDeparture";
import { airportsOfDestination } from "./AirportOfDestination";
import { allAvailableTerms, getTermsForSegment } from "./Terms_and_Conditions";

const API_BASE_URL = "https://omtrans-efreight-backend.onrender.com/api";

const ImportExportQuotationForm = ({ currentUser }) => {
  // Basic Information State
  const [basicInfo, setBasicInfo] = useState({
    customerNameAndAddress: "",
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
    totalTransitTime: "",
    remarks: "",
    numberOfPackets: "",
    cargoSize: "",
    airLines: "",
    airPortOfDeparture: "",
    airPortOfDestination: "",
    chargeableWeight: "",
    volumeWeight: "",
    size: "",
  });

  // Popup state
  const [showPopup, setShowPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationSegment, setQuotationSegment] = useState(""); // Quotation segment selection
  const [serviceJobType, setServiceJobType] = useState(""); // For Service Job radio selection

  // Terms and Conditions state
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [termSearchInput, setTermSearchInput] = useState("");
  const [showTermsSuggestions, setShowTermsSuggestions] = useState(false);
  const [filteredTermsSuggestions, setFilteredTermsSuggestions] = useState([]);

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
  const [filteredConsignees, setFilteredConsignees] = useState([]);
  const [filteredShippingLines, setFilteredShippingLines] = useState([]);
  const [filteredPorLocations, setFilteredPorLocations] = useState([]);
  const [filteredPolPorts, setFilteredPolPorts] = useState([]);
  const [filteredPodPorts, setFilteredPodPorts] = useState([]);
  const [filteredFinalDestinations, setFilteredFinalDestinations] = useState(
    []
  );
  const [showAirlinesDropdown, setShowAirlinesDropdown] = useState(false);
  const [filteredAirlines, setFilteredAirlines] = useState([]);
  const [showAirportDepartureDropdown, setShowAirportDepartureDropdown] = useState(false);
  const [filteredAirportsDeparture, setFilteredAirportsDeparture] = useState([]);
  const [showAirportDestinationDropdown, setShowAirportDestinationDropdown] = useState(false);
  const [filteredAirportsDestination, setFilteredAirportsDestination] = useState([]);

  // Effect to load terms when quotation segment or terms option changes
  useEffect(() => {
    if (quotationSegment) {
      const terms = getTermsForSegment(quotationSegment, basicInfo.terms);
      setSelectedTerms(terms);
    } else {
      setSelectedTerms([]);
    }
  }, [quotationSegment, basicInfo.terms]);

  // Handler for term search input
  const handleTermSearchChange = (value) => {
    setTermSearchInput(value);
    if (value.trim().length > 0) {
      const filtered = allAvailableTerms.filter(
        (term) =>
          term.toLowerCase().includes(value.toLowerCase()) &&
          !selectedTerms.includes(term)
      );
      setFilteredTermsSuggestions(filtered);
      setShowTermsSuggestions(true);
    } else {
      setFilteredTermsSuggestions(
        allAvailableTerms.filter((term) => !selectedTerms.includes(term))
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

  // Origin Charge Suggestions
  const originChargeSuggestions = [
    "Transport Charge",
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
  ].sort();

  // Freight Charge Suggestions
  const freightChargeSuggestions = [
    "Ocean Charges",
    "ISPS Charge",
    "Seal Charge",
    "ACD Charge",
    "ENS Charge",
    "BL Charges",
    "THC Charge",
    "Lift On/Lift Off Charge",
  ].sort();

  // Destination Charge Suggestions
  const destinationChargeSuggestions = [
    "Shipping Line Charge",
    "Documentation Charge",
    "EDI Fees Charge",
    "Certification Charge",
    "BL Fee Charge",
    "Customs Clearance Charge",
  ].sort();

  // Origin Charges State
  const [originCharges, setOriginCharges] = useState([
    {
      id: Date.now(),
      charges: "",
      currency: "USD",
      amount: "",
      unit: "/BL",
    },
  ]);

  // Freight Charges State
  const [freightCharges, setFreightCharges] = useState([
    {
      id: Date.now() + 1,
      charges: "",
      currency: "USD",
      amount: "",
      unit: "/BL",
    },
  ]);

  // Destination Charges State
  const [destinationCharges, setDestinationCharges] = useState([
    {
      id: Date.now() + 2,
      charges: "",
      currency: "USD",
      amount: "",
      unit: "/BL",
    },
  ]);

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
        const filtered = customerData.filter(
          (customer) =>
            customer.name.toLowerCase().includes(value.toLowerCase()) ||
            customer.address.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredCustomers(filtered);
        setShowCustomerDropdown(filtered.length > 0);
      } else {
        setShowCustomerDropdown(false);
      }
    }

    // Handle autocomplete for consignee address
    if (name === "consigneeAddress") {
      if (value.trim().length > 0) {
        const filtered = consigneeData.filter(
          (consignee) =>
            consignee.name.toLowerCase().includes(value.toLowerCase()) ||
            consignee.address.toLowerCase().includes(value.toLowerCase())
        );
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

    // Handle autocomplete for POR
    if (name === "por") {
      if (value.trim().length > 0) {
        const filtered = icdLocations
          .filter((location) =>
            location.toLowerCase().includes(value.toLowerCase())
          )
          .sort();
        setFilteredPorLocations(filtered);
        setShowPorDropdown(filtered.length > 0);
      } else {
        setShowPorDropdown(false);
      }
    }

    // Handle autocomplete for POL
    if (name === "pol") {
      if (value.trim().length > 0) {
        const filtered = indianPorts
          .filter((port) => port.toLowerCase().includes(value.toLowerCase()))
          .sort();
        setFilteredPolPorts(filtered);
        setShowPolDropdown(filtered.length > 0);
      } else {
        setShowPolDropdown(false);
      }
    }

    // Handle autocomplete for POD
    if (name === "pod") {
      if (value.trim().length > 0) {
        const filtered = foreignDestinations
          .filter((dest) => dest.toLowerCase().includes(value.toLowerCase()))
          .sort();
        setFilteredPodPorts(filtered);
        setShowPodDropdown(filtered.length > 0);
      } else {
        setShowPodDropdown(false);
      }
    }

    // Handle autocomplete for Final Destination
    if (name === "finalDestination") {
      if (value.trim().length > 0) {
        const filtered = foreignDestinations
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
        const filtered = airlines
          .filter((airline) => airline.toLowerCase().includes(value.toLowerCase()))
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
        const filtered = airportsOfDeparture
          .filter((airport) => airport.toLowerCase().includes(value.toLowerCase()))
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
        const filtered = airportsOfDestination
          .filter((airport) => airport.toLowerCase().includes(value.toLowerCase()))
          .sort();
        setFilteredAirportsDestination(filtered);
        setShowAirportDestinationDropdown(filtered.length > 0);
      } else {
        setShowAirportDestinationDropdown(false);
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

  // Origin Charges Handlers
  const addOriginCharge = () => {
    setOriginCharges([
      ...originCharges,
      {
        id: Date.now(),
        charges: "",
        currency: "USD",
        amount: "",
        unit: "/BL",
      },
    ]);
  };

  const removeOriginCharge = (id) => {
    setOriginCharges(originCharges.filter((charge) => charge.id !== id));
  };

  const handleOriginChargeChange = (id, field, value) => {
    setOriginCharges(
      originCharges.map((charge) =>
        charge.id === id ? { ...charge, [field]: value } : charge
      )
    );

    // Handle autocomplete for charges field
    if (field === "charges") {
      const filtered = originChargeSuggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(value.toLowerCase())
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
        charge.id === id ? { ...charge, charges: suggestion } : charge
      )
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
        currency: "USD",
        amount: "",
        unit: "/BL",
      },
    ]);
  };

  const removeFreightCharge = (id) => {
    setFreightCharges(freightCharges.filter((charge) => charge.id !== id));
  };

  const handleFreightChargeChange = (id, field, value) => {
    setFreightCharges(
      freightCharges.map((charge) =>
        charge.id === id ? { ...charge, [field]: value } : charge
      )
    );

    // Handle autocomplete for charges field
    if (field === "charges") {
      const filtered = freightChargeSuggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(value.toLowerCase())
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
        charge.id === id ? { ...charge, charges: suggestion } : charge
      )
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
        currency: "USD",
        amount: "",
        unit: "/BL",
      },
    ]);
  };

  const removeDestinationCharge = (id) => {
    setDestinationCharges(
      destinationCharges.filter((charge) => charge.id !== id)
    );
  };

  const handleDestinationChargeChange = (id, field, value) => {
    setDestinationCharges(
      destinationCharges.map((charge) =>
        charge.id === id ? { ...charge, [field]: value } : charge
      )
    );

    // Handle autocomplete for charges field
    if (field === "charges") {
      const filtered = destinationChargeSuggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(value.toLowerCase())
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
        charge.id === id ? { ...charge, charges: suggestion } : charge
      )
    );
    setShowDestinationChargeSuggestions((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  // Generate quotation number based on selected segment
  const generateQuotationNumber = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2); // Get last 2 digits of year
    
    // Generate unique 2-3 digit random number
    const randomNum = Math.floor(Math.random() * 900) + 100; // Random 3-digit number (100-999)
    
    // Find the prefix for selected segment
    const selectedSegment = quotationSegments.find(seg => seg.label === quotationSegment);
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
        "shippingLine",
        "totalTransitTime",
        "etd",
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
        "shippingLine",
        "totalTransitTime",
        "etd",
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
        "airLines",
        "remarks",
      ];
    }

    // Service Job - show special section
    if (segment === "service job") {
      return ["serviceJobRadio", "remarks"];
    }

    return [];
  };

  // Generate PDF and Submit
  const handleSubmit = async () => {
    // Validate required segment selection
    if (!quotationSegment) {
      alert("Please select a Quotation Segment before submitting.");
      return;
    }

    setIsSubmitting(true);

    const doc = new jsPDF({
      compress: true
    });

    // Generate quotation number at the start
    const newQuotationNumber = generateQuotationNumber();
    setQuotationNumber(newQuotationNumber);

    let yPos = 15;

    // Compress and add logo - use canvas to resize and compress image
    const compressImage = (src, maxWidth, maxHeight, quality) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with compression
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    // Compress logo to smaller size (150px max width, 60px max height, 70% quality)
    const compressedLogo = await compressImage(OmTransLogo, 150, 60, 0.7);
    
    // Add compressed logo
    if (compressedLogo) {
      doc.addImage(compressedLogo, "JPEG", 15, yPos, 40, 15);
    }

    // Company Info (top right)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("OmTrans Freight Services", 195, yPos + 5, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Global Logistics Solutions", 195, yPos + 10, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, yPos + 15, {
      align: "right",
    });

    yPos += 25;

    // Quotation Header
    doc.setFillColor(37, 99, 235);
    doc.rect(15, yPos, 180, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("QUOTATION", 105, yPos + 10, { align: "center" });

    yPos += 20;

    // Quotation Number and Segment Box
    doc.setFillColor(240, 248, 255);
    doc.rect(15, yPos, 180, 16, "F");
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Quotation No: ${newQuotationNumber}`, 105, yPos + 6, {
      align: "center",
    });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Segment: ${quotationSegment}`, 105, yPos + 12, {
      align: "center",
    });

    yPos += 20;
    doc.setTextColor(0, 0, 0);

    // Customer & Consignee Section
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos, 85, 8, "F");
    doc.rect(110, yPos, 85, 8, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("CUSTOMER DETAILS", 17, yPos + 5.5);
    doc.text("CONSIGNEE DETAILS", 112, yPos + 5.5);

    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const customerLines = doc.splitTextToSize(
      basicInfo.customerNameAndAddress || "N/A",
      80
    );
    doc.text(customerLines, 17, yPos);

    const consigneeLines = doc.splitTextToSize(
      basicInfo.consigneeAddress || "N/A",
      80
    );
    doc.text(consigneeLines, 112, yPos);

    yPos += Math.max(customerLines.length, consigneeLines.length) * 4 + 8;

    // Shipment Details Table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("SHIPMENT DETAILS", 15, yPos);
    yPos += 2;

    // Build PDF body dynamically based on visible fields
    const visibleFields = getVisibleFields();
    const pdfBody = [];
    
    // Define field mappings
    const fieldMap = {
      numberOfPackets: ["Number of Packets", basicInfo.numberOfPackets || "N/A"],
      weight: ["Gross Weight (kg)", basicInfo.weight || "N/A"],
      equipment: ["Equipment", basicInfo.equipment || "N/A"],
      cargoSize: ["Cargo Size", basicInfo.cargoSize || "N/A"],
      cbm: ["CBM (m³)", basicInfo.cbm || "N/A"],
      commodity: ["Commodity", basicInfo.commodity || "N/A"],
      terms: ["Terms", basicInfo.terms || "N/A"],
      por: ["POR", basicInfo.por || "N/A"],
      pol: ["POL", basicInfo.pol || "N/A"],
      pod: ["POD", basicInfo.pod || "N/A"],
      finalDestination: ["Final Destination", basicInfo.finalDestination || "N/A"],
      shippingLine: ["Shipping Line", basicInfo.shippingLine || "N/A"],
      totalTransitTime: ["Transit Time", basicInfo.totalTransitTime || "N/A"],
      etd: ["ETD", basicInfo.etd || "N/A"],
      airLines: ["Airlines", basicInfo.airLines || "N/A"],
      airPortOfDeparture: ["Airport of Departure", basicInfo.airPortOfDeparture || "N/A"],
      airPortOfDestination: ["Airport of Destination", basicInfo.airPortOfDestination || "N/A"],
      chargeableWeight: ["Chargeable Weight", basicInfo.chargeableWeight || "N/A"],
      volumeWeight: ["Volume Weight", basicInfo.volumeWeight || "N/A"],
      size: ["Size", basicInfo.size || "N/A"],
    };

    // Add Service Job Type if applicable
    if (quotationSegment.toLowerCase() === "service job") {
      pdfBody.push(["Service Type", serviceJobType || "N/A", "", ""]);
    }

    // Build rows in pairs for 2-column layout
    let currentRow = [];
    visibleFields.forEach((field) => {
      if (field === "serviceJobRadio" || field === "remarks") return; // Skip these in shipment details
      
      if (fieldMap[field]) {
        currentRow.push(fieldMap[field][0], fieldMap[field][1]);
        
        if (currentRow.length === 4) {
          pdfBody.push([...currentRow]);
          currentRow = [];
        }
      }
    });
    
    // Add remaining fields if row is not complete
    if (currentRow.length > 0) {
      while (currentRow.length < 4) {
        currentRow.push("");
      }
      pdfBody.push(currentRow);
    }

    autoTable(doc, {
      startY: yPos,
      head: [["Field", "Details", "Field", "Details"]],
      body: pdfBody,
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 35 },
        1: { cellWidth: 55 },
        2: { fontStyle: "bold", cellWidth: 35 },
        3: { cellWidth: 55 },
      },
      margin: { left: 15, right: 15 },
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Origin Charges Table
    if (
      originCharges.length > 0 &&
      originCharges.some((c) => c.charges || c.amount)
    ) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("ORIGIN CHARGES", 15, yPos);
      yPos += 2;

      const originData = originCharges
        .filter((c) => c.charges || c.amount)
        .map((charge) => [
          charge.charges || "N/A",
          charge.currency || "USD",
          charge.amount || "0",
          charge.unit || "Per Shipment",
        ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Charge Description", "Currency", "Amount", "Unit"]],
        body: originData,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 30, halign: "left" },
          2: { cellWidth: 40, halign: "left" },
          3: { cellWidth: 30 },
        },
        margin: { left: 15, right: 15 },
      });

      yPos = doc.lastAutoTable.finalY + 8;
    }

    // Freight Charges Table
    if (
      freightCharges.length > 0 &&
      freightCharges.some((c) => c.charges || c.amount)
    ) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("FREIGHT CHARGES", 15, yPos);
      yPos += 2;

      const freightData = freightCharges
        .filter((c) => c.charges || c.amount)
        .map((charge) => [
          charge.charges || "N/A",
          charge.currency || "USD",
          charge.amount || "0",
          charge.unit || "Per Container",
        ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Charge Description", "Currency", "Amount", "Unit"]],
        body: freightData,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 30, halign: "left" },
          2: { cellWidth: 40, halign: "left" },
          3: { cellWidth: 30 },
        },
        margin: { left: 15, right: 15 },
      });

      yPos = doc.lastAutoTable.finalY + 8;
    }

    // Destination Charges Table
    if (
      destinationCharges.length > 0 &&
      destinationCharges.some((c) => c.charges || c.amount)
    ) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("DESTINATION CHARGES", 15, yPos);
      yPos += 2;

      const destinationData = destinationCharges
        .filter((c) => c.charges || c.amount)
        .map((charge) => [
          charge.charges || "N/A",
          charge.currency || "USD",
          charge.amount || "0",
          charge.unit || "Per Shipment",
        ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Charge Description", "Currency", "Amount", "Unit"]],
        body: destinationData,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 30, halign: "left" },
          2: { cellWidth: 40, halign: "left" },
          3: { cellWidth: 30 },
        },
        margin: { left: 15, right: 15 },
      });

      yPos = doc.lastAutoTable.finalY + 8;
    }

    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Remarks Section
    if (basicInfo.remarks) {
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos, 180, 8, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("REMARKS", 17, yPos + 5.5);
      yPos += 12;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const remarksLines = doc.splitTextToSize(basicInfo.remarks, 175);
      doc.text(remarksLines, 17, yPos);
      yPos += remarksLines.length * 4 + 10;
    }

    // Check if we need a new page for T&C
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    // Terms and Conditions
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos, 180, 8, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("TERMS AND CONDITIONS", 17, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // Helper function to replace ₹ with Rs. for PDF compatibility
    const sanitizeForPDF = (text) => {
      return text.replace(/₹/g, "Rs.");
    };

    // Use dynamic selectedTerms instead of hardcoded terms
    const termsToRender = selectedTerms.length > 0 ? selectedTerms : [
      "Freight rates are subject to equipment and space availability.",
      "Transit insurance will be at the customer's cost. OmTrans will not be responsible for any claims.",
      "All charges are subject to change without prior notice.",
      "Payment terms: As per agreed contract.",
      "This quotation is valid for 30 days from the date of issue.",
    ];

    termsToRender.forEach((term, index) => {
      // Check if we need a new page for more terms
      if (yPos > 275) {
        doc.addPage();
        yPos = 20;
      }
      const termText = `${index + 1}. ${sanitizeForPDF(term)}`;
      const termLines = doc.splitTextToSize(termText, 175);
      doc.text(termLines, 17, yPos);
      yPos += termLines.length * 4 + 2;
    });

    yPos += 5;

    // Footer with border
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Footer line
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(15, 285, 195, 285);

      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(
        "OmTrans Freight Services | Global Logistics Solutions",
        15,
        290
      );
      doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: "right" });
    }

    // Save PDF
    const pdfFileName = `Door_to_Door_Quotation_${newQuotationNumber}.pdf`;
    doc.save(pdfFileName);

    // Get the selected segment details
    const selectedSegmentDetails = quotationSegments.find(s => s.label === quotationSegment);

    // Save quotation data to localStorage for approval dashboard
    const quotationData = {
      id: newQuotationNumber,
      quotationSegment: quotationSegment,
      quotationSegmentPrefix: selectedSegmentDetails?.prefix || "",
      customerName: basicInfo.customerNameAndAddress,
      consigneeName: basicInfo.consigneeAddress,
      equipment: basicInfo.equipment,
      weight: basicInfo.weight,
      cbm: basicInfo.cbm,
      terms: basicInfo.terms,
      commodity: basicInfo.commodity,
      por: basicInfo.por,
      pol: basicInfo.pol,
      pod: basicInfo.pod,
      finalDestination: basicInfo.finalDestination,
      shippingLine: basicInfo.shippingLine,
      etd: basicInfo.etd,
      transitTime: basicInfo.totalTransitTime,
      remarks: basicInfo.remarks,
      // Air-specific fields
      numberOfPackets: basicInfo.numberOfPackets,
      cargoSize: basicInfo.cargoSize,
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
      createdBy:
        currentUser?.fullName || currentUser?.username || "Unknown User",
      createdByRole: currentUser?.role || "User",
      createdByLocation: currentUser?.location || "N/A",
      createdDate: new Date().toISOString(),
      pdfFileName: pdfFileName,
    };

    // Save quotation to backend API
    try {
      const response = await fetch(`${API_BASE_URL}/quotations`, {
        method: "POST",
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
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert("Failed to connect to server. Please try again later.");
      setIsSubmitting(false);
      return;
    }

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
      totalTransitTime: "",
      remarks: "",
      numberOfPackets: "",
      cargoSize: "",
      airLines: "",
      airPortOfDeparture: "",
      airPortOfDestination: "",
      chargeableWeight: "",
      volumeWeight: "",
      size: "",
    });

    // Reset service job type
    setServiceJobType("");

    setOriginCharges([
      {
        id: Date.now(),
        charges: "",
        currency: "USD",
        amount: "",
        unit: "/BL",
      },
    ]);

    setFreightCharges([
      {
        id: Date.now() + 1,
        charges: "",
        currency: "USD",
        amount: "",
        unit: "/BL",
      },
    ]);

    setDestinationCharges([
      {
        id: Date.now() + 2,
        charges: "",
        currency: "USD",
        amount: "",
        unit: "/BL",
      },
    ]);

    // Hide popup after 3 seconds
    setTimeout(() => {
      setShowPopup(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-0 md:py-6">
      <div className="w-full px-8 sm:px-10 lg:px-10 py-5">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={24} />
                <div>
                  <h1 className="text-xl font-bold">Door-to-Door Quotation</h1>
                  <p className="text-xs text-blue-100">
                    Complete shipping quotation form
                  </p>
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
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Available Services
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
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
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
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
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
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
                      <span className="font-semibold text-blue-700">Note:</span> Form fields will dynamically adjust based on your selected segment. Choose the service type that best matches your shipment requirements.
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
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Selected Segment</p>
                    <p className="text-lg font-bold text-gray-800">
                      {quotationSegment} 
                      <span className="text-sm text-green-600 ml-2">
                        ({quotationSegments.find(s => s.label === quotationSegment)?.prefix})
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  rows="2"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.map((customer, index) => (
                      <div
                        key={index}
                        onClick={() => handleCustomerSelect(customer)}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-semibold text-sm text-gray-800">
                          {customer.name}
                        </div>
                        <div className="text-xs text-gray-600 whitespace-pre-line">
                          {customer.address}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Delivery Address (Consignee){" "}
                  <span className="text-red-500">*</span>
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
                  rows="2"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                {showConsigneeDropdown && filteredConsignees.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredConsignees.map((consignee, index) => (
                      <div
                        key={index}
                        onClick={() => handleConsigneeSelect(consignee)}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-semibold text-sm text-gray-800">
                          {consignee.name}
                        </div>
                        <div className="text-xs text-gray-600 whitespace-pre-line">
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
                  ⚠️ Please select a Quotation Segment above to view shipment details fields
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
                  Gross Weight (kg) <span className="text-red-500">*</span>
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
              <div>
                <label className="block font-medium text-gray-700 mb-0.5">
                  Equipment <span className="text-red-500">*</span>
                </label>
                <select
                  name="equipment"
                  value={basicInfo.equipment}
                  onChange={handleBasicInfoChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-white"
                >
                  <option value="">Select Container</option>
                  <option value="20ft Standard">20ft Standard</option>
                  <option value="20ft High Cube">20ft High Cube</option>
                  <option value="40ft Standard">40ft Standard</option>
                  <option value="40ft High Cube">40ft High Cube</option>
                  <option value="45ft High Cube">45ft High Cube</option>
                  <option value="20ft Reefer">20ft Reefer</option>
                  <option value="40ft Reefer">40ft Reefer</option>
                  <option value="20ft Open Top">20ft Open Top</option>
                  <option value="40ft Open Top">40ft Open Top</option>
                  <option value="20ft Flat Rack">20ft Flat Rack</option>
                  <option value="40ft Flat Rack">40ft Flat Rack</option>
                </select>
              </div>
              )}
              {getVisibleFields().includes("cargoSize") && (
              <div>
                <label className="block font-medium text-gray-700 mb-0.5">
                  Cargo Size
                </label>
                <input
                  type="text"
                  name="cargoSize"
                  value={basicInfo.cargoSize}
                  onChange={handleBasicInfoChange}
                  placeholder="Enter cargo size"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              )}
              {getVisibleFields().includes("volumeWeight") && (
              <div>
                <label className="block font-medium text-gray-700 mb-0.5">
                  Volume Weight
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
                  Chargeable Weight
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
              <div>
                <label className="block font-medium text-gray-700 mb-0.5">
                  Commodity
                </label>
                <input
                  type="text"
                  name="commodity"
                  value={basicInfo.commodity}
                  onChange={handleBasicInfoChange}
                  placeholder="Electronics, etc."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
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
                  <span className="text-gray-500 text-[10px]">(Receipt)</span>
                </label>
                <input
                  type="text"
                  name="por"
                  value={basicInfo.por}
                  onChange={handleBasicInfoChange}
                  onFocus={() => {
                    if (basicInfo.por && filteredPorLocations.length > 0) {
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
                  <span className="text-gray-500 text-[10px]">(Loading)</span>
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
                  <span className="text-gray-500 text-[10px]">(Discharge)</span>
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
                    setTimeout(() => setShowFinalDestDropdown(false), 200);
                  }}
                  placeholder="Type final destination..."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {showFinalDestDropdown &&
                  filteredFinalDestinations.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredFinalDestinations.map((destination, index) => (
                        <div
                          key={index}
                          onClick={() => handleFinalDestSelect(destination)}
                          className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                        >
                          <div className="text-gray-800">{destination}</div>
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
                    setTimeout(() => setShowShippingLineDropdown(false), 200);
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
                  {Array.from({ length: 100 }, (_, i) => i + 1).map((day) => (
                    <option
                      key={day}
                      value={`${day} ${day === 1 ? "day" : "days"}`}
                    >
                      {day} {day === 1 ? "day" : "days"}
                    </option>
                  ))}
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
                    if (basicInfo.airPortOfDeparture && filteredAirportsDeparture.length > 0) {
                      setShowAirportDepartureDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowAirportDepartureDropdown(false), 200);
                  }}
                  placeholder="Type airport name..."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {showAirportDepartureDropdown && filteredAirportsDeparture.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredAirportsDeparture.map((airport, index) => (
                      <div
                        key={index}
                        onClick={() => handleAirportDepartureSelect(airport)}
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
                    if (basicInfo.airPortOfDestination && filteredAirportsDestination.length > 0) {
                      setShowAirportDestinationDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowAirportDestinationDropdown(false), 200);
                  }}
                  placeholder="Type airport name..."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {showAirportDestinationDropdown && filteredAirportsDestination.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredAirportsDestination.map((airport, index) => (
                      <div
                        key={index}
                        onClick={() => handleAirportDestinationSelect(airport)}
                        className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs"
                      >
                        <div className="text-gray-800">{airport}</div>
                      </div>
                    ))}
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
                    if (basicInfo.airLines && filteredAirlines.length > 0) {
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
                    <label key={type} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="serviceJobType"
                        value={type}
                        checked={serviceJobType === type}
                        onChange={(e) => setServiceJobType(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-xs text-gray-700">{type}</span>
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
                  rows="2"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent resize-none"
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
                  <table className="w-full text-xs">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                          Charge
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                          Currency
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                          Amount
                        </th>
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
                                  e.target.value
                                )
                              }
                              onFocus={() => {
                                // Show all suggestions on focus
                                const filtered = originChargeSuggestions.filter(
                                  (suggestion) =>
                                    suggestion
                                      .toLowerCase()
                                      .includes(charge.charges.toLowerCase())
                                );
                                setFilteredOriginChargeSuggestions((prev) => ({
                                  ...prev,
                                  [charge.id]: filtered,
                                }));
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
                                          suggestion
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
                                  e.target.value
                                )
                              }
                              className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-400 bg-white"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="INR">INR</option>
                              <option value="AED">AED</option>
                            </select>
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="number"
                              value={charge.amount}
                              onChange={(e) =>
                                handleOriginChargeChange(
                                  charge.id,
                                  "amount",
                                  e.target.value
                                )
                              }
                              placeholder="0.00"
                              className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-blue-400"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <select
                              value={charge.unit}
                              onChange={(e) =>
                                handleOriginChargeChange(
                                  charge.id,
                                  "unit",
                                  e.target.value
                                )
                              }
                              className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-400 bg-white"
                            >
                              <option value="/BL">/BL</option>
                              <option value="/PKG">/PKG</option>
                              <option value="/HBL">/HBL</option>
                              <option value="/Shipment">/Shipment</option>
                              <option value="/Container">/Container</option>
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
                  <table className="w-full text-xs">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                          Charge
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                          Currency
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                          Amount
                        </th>
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
                                  e.target.value
                                )
                              }
                              onFocus={() => {
                                // Show all suggestions on focus
                                const filtered =
                                  freightChargeSuggestions.filter(
                                    (suggestion) =>
                                      suggestion
                                        .toLowerCase()
                                        .includes(charge.charges.toLowerCase())
                                  );
                                setFilteredFreightChargeSuggestions((prev) => ({
                                  ...prev,
                                  [charge.id]: filtered,
                                }));
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
                                          suggestion
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
                                  e.target.value
                                )
                              }
                              className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-400 bg-white"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="INR">INR</option>
                              <option value="AED">AED</option>
                            </select>
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="number"
                              value={charge.amount}
                              onChange={(e) =>
                                handleFreightChargeChange(
                                  charge.id,
                                  "amount",
                                  e.target.value
                                )
                              }
                              placeholder="0.00"
                              className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-green-400"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <select
                              value={charge.unit}
                              onChange={(e) =>
                                handleFreightChargeChange(
                                  charge.id,
                                  "unit",
                                  e.target.value
                                )
                              }
                              className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-400 bg-white"
                            >
                              <option value="/BL">/BL</option>
                              <option value="/PKG">/PKG</option>
                              <option value="/HBL">/HBL</option>
                              <option value="/Shipment">/Shipment</option>
                              <option value="/Container">/Container</option>
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
                  <table className="w-full text-xs">
                    <thead className="bg-purple-100">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                          Charge
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                          Currency
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                          Amount
                        </th>
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
                                  e.target.value
                                )
                              }
                              onFocus={() => {
                                // Show all suggestions on focus
                                const filtered =
                                  destinationChargeSuggestions.filter(
                                    (suggestion) =>
                                      suggestion
                                        .toLowerCase()
                                        .includes(charge.charges.toLowerCase())
                                  );
                                setFilteredDestinationChargeSuggestions(
                                  (prev) => ({
                                    ...prev,
                                    [charge.id]: filtered,
                                  })
                                );
                                if (filtered.length > 0) {
                                  setShowDestinationChargeSuggestions(
                                    (prev) => ({
                                      ...prev,
                                      [charge.id]: true,
                                    })
                                  );
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setShowDestinationChargeSuggestions(
                                    (prev) => ({
                                      ...prev,
                                      [charge.id]: false,
                                    })
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
                                          suggestion
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
                                  e.target.value
                                )
                              }
                              className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-400 bg-white"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="INR">INR</option>
                              <option value="AED">AED</option>
                            </select>
                          </td>
                          <td className="px-1 py-1.5">
                            <input
                              type="number"
                              value={charge.amount}
                              onChange={(e) =>
                                handleDestinationChargeChange(
                                  charge.id,
                                  "amount",
                                  e.target.value
                                )
                              }
                              placeholder="0.00"
                              className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-purple-400"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <select
                              value={charge.unit}
                              onChange={(e) =>
                                handleDestinationChargeChange(
                                  charge.id,
                                  "unit",
                                  e.target.value
                                )
                              }
                              className="w-full px-0.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-400 bg-white"
                            >
                              <option value="/BL">/BL</option>
                              <option value="/PKG">/PKG</option>
                              <option value="/HBL">/HBL</option>
                              <option value="/Shipment">/Shipment</option>
                              <option value="/Container">/Container</option>
                            </select>
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeDestinationCharge(charge.id)}
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
                  {["Sea Export FCL", "Sea Export LCL", "Sea Export Break Bulk"].includes(quotationSegment) && 
                   basicInfo.terms && 
                   ` - ${basicInfo.terms}`})
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
                        allAvailableTerms.filter((term) => !selectedTerms.includes(term))
                      );
                      setShowTermsSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowTermsSuggestions(false), 200)}
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
              {showTermsSuggestions && filteredTermsSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredTermsSuggestions.slice(0, 10).map((term, index) => (
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
              <ul className="space-y-1.5 text-xs text-gray-700">
                {selectedTerms.map((term, index) => (
                  <li key={index} className="flex items-start gap-1 bg-white rounded px-2 py-1 border border-yellow-200 hover:border-red-300 transition group">
                    <span className="text-yellow-600 font-bold mt-0.5 min-w-[20px]">{index + 1}.</span>
                    <span className="flex-1 leading-relaxed">{term}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTerm(index)}
                      className="ml-1 text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition flex-shrink-0"
                      title="Remove term"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Term Count */}
            {selectedTerms.length > 0 && (
              <p className="mt-3 text-xs text-gray-400 text-right">
                {selectedTerms.length} term{selectedTerms.length !== 1 ? "s" : ""} added
              </p>
            )}
          </section>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3 rounded-md text-sm font-medium transition shadow-md hover:shadow-lg ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit & Download PDF
                </>
              )}
            </button>
          </div>

          {/* Summary Footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Door-to-Door Quotation Form • All amounts in INR (₹)
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
