import React, { useState } from "react";
import { FileText, Send, CheckCircle, X, Plus, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import OmTransLogo from "../assets/OmTrans.png";

const ImportExportQuotationForm = ({ currentUser }) => {
  // Basic Information State
  const [basicInfo, setBasicInfo] = useState({
    customerNameAndAddress: "",
    consigneeAddress: "",
    equipment: "",
    weight: "",
    terms: "",
    por: "",
    pol: "",
    pod: "",
    finalDestination: "",
    shippingLine: "",
    etd: "",
    totalTransitTime: "",
    remarks: "",
  });

  // Popup state
  const [showPopup, setShowPopup] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [transportMode, setTransportMode] = useState("Air"); // Air or Sea

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

  // Origin Charge Suggestions
  const originChargeSuggestions = [
    "Transport",
    "BL Fee",
    "Customs Clearance",
    "Loading Charges",
    "Unloading Charges",
    "Documentation Charges",
    "Port Handling Charges",
    "THC",
    "CFS ",
    "Seal Charges",
    "VGM Charges",
    "DGFT Charges",
  ].sort();

  // Freight Charge Suggestions
  const freightChargeSuggestions = [
    "Ocean Charges",
    "ISPS",
    "Seal",
    "ACD",
    "ENS",
    "BL Charges",
    "THC",
    "Lift On/Lift Off",
  ].sort();

  // Destination Charge Suggestions
  const destinationChargeSuggestions = [
    "Shipping Line",
    "Documentation",
    "EDI Fees",
    "Certification",
    "BL Fee",
    "Customs Clearance",
  ].sort();

  // Dummy customer data
  const customerData = [
    {
      name: "Adani Electronics Ltd",
      address: "123 Tech Park, Silicon Valley San Francisco, CA 94016, USA",
    },
    {
      name: "Reliance Manufacturing",
      address: "789 Industrial Area Detroit, MI 48201, USA",
    },
    {
      name: "Tech Solutions Inc",
      address: "321 Innovation Drive Austin, TX 78701, USA",
    },
    {
      name: "Ocean Logistics Pvt Ltd",
      address: "Plot 45, MIDC Area Mumbai, Maharashtra 400001, India",
    },
  ];

  // Dummy consignee data
  const consigneeData = [
    {
      name: "Asia Warehouse Solutions",
      address: "99 Cargo Terminal Road Hong Kong",
    },
    {
      name: "UK Import Services",
      address: "45 Dover Port London, SE1 9SG, UK",
    },
    {
      name: "Australian Freight Co",
      address: "78 Port Road Sydney, NSW 2000, Australia",
    },
    {
      name: "Canadian Storage Inc",
      address: "321 Maple Avenue Toronto, ON M5H 2N2, Canada",
    },
    {
      name: "Japan Trading House",
      address: "5-10 Minato-ku Tokyo 105-0013, Japan",
    },
  ];

  // Shipping lines data (alphabetically sorted)
  const shippingLines = [
    "Maersk Line",
    "CMA CGM",
    "COSCO Shipping",
    "Evergreen Marine",
    "Hapag-Lloyd",
    "HMM",
    "MSC",
    "ONE",
    "Orient Overseas Container Line (OOCL)",
    "PIL",
    "Yang Ming Marine Transport",
    "Zim",
    "Wan Hai Lines",
    "Matson Navigation",
    "KMTC",
    "Arkas Line",
    "TS Lines",
    "IRISL",
    "X-Press Feeders",
  ].sort();

  // ICD locations in India (alphabetically sorted)
  const icdLocations = [
    "ICD Agra, Uttar Pradesh",
    "ICD Ahmedabad, Gujarat",
    "ICD Ajmer, Rajasthan",
    "ICD Amingaon, Assam",
    "ICD Anaparthy, Andhra Pradesh",
    "ICD Bangalore, Karnataka",
    "ICD Bhadohi, Uttar Pradesh",
    "ICD Bhilwara, Rajasthan",
    "ICD Bhiwadi, Rajasthan",
    "ICD Coimbatore, Tamil Nadu",
    "ICD Dadri, Uttar Pradesh",
    "ICD Durgapur, West Bengal",
    "ICD Faridabad (Ballabhgarh), Haryana",
    "ICD Garhi Harsaru, Haryana",
    "ICD Guntur, Andhra Pradesh",
    "ICD Hyderabad, Telangana",
    "ICD Jaipur, Rajasthan",
    "ICD Jallandhar, Punjab",
    "ICD Jodhpur, Rajasthan",
    "ICD Kanpur, Uttar Pradesh",
    "ICD Kota, Rajasthan",
    "ICD Loni, Uttar Pradesh",
    "ICD Ludhiana, Punjab",
    "ICD Moradabad, Uttar Pradesh",
    "ICD Nagpur, Maharashtra",
    "ICD Nasik, Maharashtra",
    "ICD Patli Gurgaon, Haryana",
    "ICD Pithampur, Madhya Pradesh",
    "ICD Piyala Rewari, Haryana",
    "ICD Pune, Maharashtra",
    "ICD Raipur, Chhattisgarh",
    "ICD Rewari, Haryana",
    "ICD Sachhin, Gujarat",
    "ICD Singanalur, Tamil Nadu",
    "ICD Talegaon, Maharashtra",
    "ICD TKD, Delhi",
    "ICD Vadodara, Gujarat",
    "ICD Varanasi, Uttar Pradesh",
    "ICD Whitefield Bangalore, Karnataka",
  ].sort();

  // Indian Ports (alphabetically sorted)
  const indianPorts = [
    "Chennai Port, Tamil Nadu",
    "Cochin Port, Kerala",
    "Ennore Port, Tamil Nadu",
    "Hazira Port, Gujarat",
    "JNPT (Jawaharlal Nehru Port), Maharashtra",
    "Kamarajar Port, Tamil Nadu",
    "Kandla Port, Gujarat",
    "Kolkata Port, West Bengal",
    "Mangalore Port, Karnataka",
    "Mormugao Port, Goa",
    "Mumbai Port, Maharashtra",
    "Mundra Port, Gujarat",
    "Paradip Port, Odisha",
    "Pipavav Port, Gujarat",
    "Sikka Port, Gujarat",
    "Tuticorin Port, Tamil Nadu",
    "Visakhapatnam Port, Andhra Pradesh",
    "Dahej Port, Gujarat",
    "Haldia Port, West Bengal",
    "Krishnapatnam Port, Andhra Pradesh",
    "Dhamra Port, Odisha",
    "Kakinada Port, Andhra Pradesh",
    "Magdalla Port, Gujarat",
    "Porbandar Port, Gujarat",
    "Okha Port, Gujarat",
    "Bhavnagar Port, Gujarat",
    "Veraval Port, Gujarat",
    "Nagapattinam Port, Tamil Nadu",
    "Karaikal Port, Puducherry",
    "Cuddalore Port, Tamil Nadu",
    "Port Blair, Andaman and Nicobar",
  ].sort();

  // Foreign Destinations - Major Ports and Cities (alphabetically sorted)
  const foreignDestinations = [
    // Middle East
    "Dubai, UAE",
    "Jebel Ali, UAE",
    "Abu Dhabi, UAE",
    "Sharjah, UAE",
    "Doha, Qatar",
    "Muscat, Oman",
    "Sohar, Oman",
    "Salalah, Oman",
    "Kuwait City, Kuwait",
    "Dammam, Saudi Arabia",
    "Jeddah, Saudi Arabia",
    "Riyadh, Saudi Arabia",
    "Bahrain",
    // Southeast Asia
    "Singapore",
    "Port Klang, Malaysia",
    "Penang, Malaysia",
    "Kuala Lumpur, Malaysia",
    "Bangkok, Thailand",
    "Laem Chabang, Thailand",
    "Ho Chi Minh City, Vietnam",
    "Haiphong, Vietnam",
    "Manila, Philippines",
    "Jakarta, Indonesia",
    "Surabaya, Indonesia",
    "Yangon, Myanmar",
    // East Asia
    "Shanghai, China",
    "Ningbo, China",
    "Shenzhen, China",
    "Guangzhou, China",
    "Qingdao, China",
    "Tianjin, China",
    "Hong Kong",
    "Tokyo, Japan",
    "Yokohama, Japan",
    "Osaka, Japan",
    "Kobe, Japan",
    "Busan, South Korea",
    "Incheon, South Korea",
    "Seoul, South Korea",
    // Europe
    "Rotterdam, Netherlands",
    "Hamburg, Germany",
    "Antwerp, Belgium",
    "Felixstowe, UK",
    "London, UK",
    "Southampton, UK",
    "Le Havre, France",
    "Barcelona, Spain",

    "Genoa, Italy",

    "Istanbul, Turkey",
    // North America
    "Los Angeles, USA",
    "Long Beach, USA",
    "New York, USA",
    "Newark, USA",
    "Savannah, USA",
    "Houston, USA",
    "Miami, USA",
    "Seattle, USA",
    "Vancouver, Canada",
    "Montreal, Canada",
    "Toronto, Canada",
    // Australia & New Zealand
    "Sydney, Australia",
    "Melbourne, Australia",
    "Brisbane, Australia",
    "Perth, Australia",
    "Adelaide, Australia",
    "Auckland, New Zealand",
    // Africa
    "Durban, South Africa",
    "Cape Town, South Africa",
    "Lagos, Nigeria",
    "Mombasa, Kenya",
    "Dar es Salaam, Tanzania",
    // South America
    "Santos, Brazil",
    "Buenos Aires, Argentina",
    "Valparaiso, Chile",
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

  // Generate quotation number based on transport mode
  const generateQuotationNumber = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const randomNum = Math.floor(Math.random() * 10); // Random digit 0-9

    const prefix = transportMode === "Air" ? "AIR" : "SEA";
    return `${prefix}-${day}${month}${year}${randomNum}`;
  };

  // Generate PDF and Submit
  const handleSubmit = () => {
    const doc = new jsPDF();

    // Generate quotation number at the start
    const newQuotationNumber = generateQuotationNumber();
    setQuotationNumber(newQuotationNumber);

    let yPos = 15;

    // Add Logo (convert to base64 or load from URL)
    const img = new Image();
    img.src = OmTransLogo;

    // Add logo at top left
    doc.addImage(img, "PNG", 15, yPos, 40, 15);

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

    // Quotation Number Box
    doc.setFillColor(240, 248, 255);
    doc.rect(15, yPos, 180, 10, "F");
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Quotation No: ${newQuotationNumber}`, 105, yPos + 7, {
      align: "center",
    });

    yPos += 15;
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

    autoTable(doc, {
      startY: yPos,
      head: [["Field", "Details", "Field", "Details"]],
      body: [
        [
          "Equipment",
          basicInfo.equipment || "N/A",
          "Weight",
          basicInfo.weight || "N/A",
        ],
        ["Terms", basicInfo.terms || "N/A", "POR", basicInfo.por || "N/A"],
        ["POL", basicInfo.pol || "N/A", "POD", basicInfo.pod || "N/A"],
        [
          "Final Destination",
          basicInfo.finalDestination || "N/A",
          "ETD",
          basicInfo.etd || "N/A",
        ],
        [
          "Shipping Line",
          basicInfo.shippingLine || "N/A",
          "Transit Time",
          basicInfo.totalTransitTime || "N/A",
        ],
      ],
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
    const terms = [
      "1. Freight rates are subject to equipment and space availability.",
      "2. Transit insurance will be at the customer's cost. OmTrans will not be responsible for any claims.",
      "3. All charges are subject to change without prior notice.",
      "4. Payment terms: As per agreed contract.",
      "5. This quotation is valid for 30 days from the date of issue.",
    ];

    terms.forEach((term) => {
      doc.text(term, 17, yPos);
      yPos += 5;
    });

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

    // Save quotation data to localStorage for approval dashboard
    const quotationData = {
      id: newQuotationNumber,
      customerName: basicInfo.customerNameAndAddress,
      consigneeName: basicInfo.consigneeAddress,
      equipment: basicInfo.equipment,
      weight: basicInfo.weight,
      terms: basicInfo.terms,
      por: basicInfo.por,
      pol: basicInfo.pol,
      pod: basicInfo.pod,
      finalDestination: basicInfo.finalDestination,
      shippingLine: basicInfo.shippingLine,
      etd: basicInfo.etd,
      transitTime: basicInfo.totalTransitTime,
      remarks: basicInfo.remarks,
      originCharges: originCharges,
      freightCharges: freightCharges,
      destinationCharges: destinationCharges,
      status: "Pending",
      createdBy:
        currentUser?.fullName || currentUser?.username || "Unknown User",
      createdByRole: currentUser?.role || "User",
      createdDate: new Date().toISOString(),
      pdfFileName: pdfFileName,
    };

    // Get existing quotations from localStorage
    const existingQuotations = JSON.parse(
      localStorage.getItem("importExportQuotations") || "[]"
    );

    // Add new quotation
    existingQuotations.push(quotationData);

    // Save back to localStorage
    localStorage.setItem(
      "importExportQuotations",
      JSON.stringify(existingQuotations)
    );

    // Console log all form data
    console.log("=== QUOTATION SUBMITTED ===");
    console.log("Quotation Number:", newQuotationNumber);
    console.log("Transport Mode:", transportMode);
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
    });

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-3 md:p-6">
      <div className="w-full px-8 sm:px-10 lg:px-20 py-5">
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

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-5 space-y-4">
          {/* Basic Information Section */}
          <section>
            <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-blue-500">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  1
                </span>
                Scope of Activities
              </h2>
              {/* Air/Sea Radio Buttons */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transportMode"
                    value="Air"
                    checked={transportMode === "Air"}
                    onChange={(e) => setTransportMode(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Air</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transportMode"
                    value="Sea"
                    checked={transportMode === "Sea"}
                    onChange={(e) => setTransportMode(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Sea</span>
                </label>
              </div>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              {/* Row 1: Container & Measurements */}
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
              <div>
                <label className="block font-medium text-gray-700 mb-0.5">
                  Weight (kg) <span className="text-red-500">*</span>
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
              <div>
                <label className="block font-medium text-gray-700 mb-0.5">
                  Commodity
                </label>
                <input
                  type="text"
                  name="items"
                  value={basicInfo.items}
                  onChange={handleBasicInfoChange}
                  placeholder="Electronics, etc."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              {/* Row 2: Ports */}
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

              {/* Row 3: Shipping & Time Details */}
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

              {/* Row 4: Remarks */}
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
            </div>
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
            </h3>
            <ul className="space-y-2 text-xs text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-0.5">•</span>
                <span>
                  Freight rates are subject to equipment and space availability.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-0.5">•</span>
                <span>
                  Transit insurance will be at the customer's cost. OmTrans will
                  not be responsible for any claims.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-0.5">•</span>
                <span>
                  *2hrs free for offloading after this 75euro/half hour
                  detention will be applied.{" "}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-0.5">•</span>
                <span>*Freight valid till 16th Oct 2025 sailing only </span>
              </li>
            </ul>
          </section>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3 rounded-md text-sm font-medium transition shadow-md hover:shadow-lg"
            >
              <Send size={18} />
              Submit & Download PDF
            </button>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Door-to-Door Quotation Form • All amounts in INR (₹)
          </p>
        </div>
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
