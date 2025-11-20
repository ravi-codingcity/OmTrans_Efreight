import React, { useState } from "react";
import { FileText, Send, CheckCircle, X, Plus, Trash2 } from "lucide-react";
import jsPDF from "jspdf";

const ImportExportQuotationForm = () => {
  // Basic Information State
  const [basicInfo, setBasicInfo] = useState({
    customerAddress: "",
    consigneeAddress: "",
    equipment: "",
    weight: "",
    terms: "",
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

  // Autocomplete state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const [showShippingLineDropdown, setShowShippingLineDropdown] = useState(false);
  const [showPorDropdown, setShowPorDropdown] = useState(false);
  const [showPolDropdown, setShowPolDropdown] = useState(false);
  const [showPodDropdown, setShowPodDropdown] = useState(false);
  const [showFinalDestDropdown, setShowFinalDestDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredConsignees, setFilteredConsignees] = useState([]);
  const [filteredShippingLines, setFilteredShippingLines] = useState([]);
  const [filteredPorLocations, setFilteredPorLocations] = useState([]);
  const [filteredPolPorts, setFilteredPolPorts] = useState([]);
  const [filteredPodPorts, setFilteredPodPorts] = useState([]);
  const [filteredFinalDestinations, setFilteredFinalDestinations] = useState([]);

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
          .filter((line) =>
            line.toLowerCase().includes(value.toLowerCase())
          )
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
          .filter((port) =>
            port.toLowerCase().includes(value.toLowerCase())
          )
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
          .filter((dest) =>
            dest.toLowerCase().includes(value.toLowerCase())
          )
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
          .filter((dest) =>
            dest.toLowerCase().includes(value.toLowerCase())
          )
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
  };

  // Generate PDF and Submit
  const handleSubmit = () => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("DOOR-TO-DOOR QUOTATION", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("OmTrans Freight Services", 105, 25, { align: "center" });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    let yPos = 45;

    // Basic Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Scope of Activities", 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Name Address:", 15, yPos);
    doc.setFont("helvetica", "normal");
    const customerLines = doc.splitTextToSize(
      basicInfo.customerAddress || "N/A",
      85
    );
    doc.text(customerLines, 15, yPos + 5);

    doc.setFont("helvetica", "bold");
    doc.text("Delivery Address (Consignee):", 110, yPos);
    doc.setFont("helvetica", "normal");
    const consigneeLines = doc.splitTextToSize(
      basicInfo.consigneeAddress || "N/A",
      85
    );
    doc.text(consigneeLines, 110, yPos + 5);
    yPos += 20;

    // Shipment Details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Shipment Details", 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    const details = [
      [
        "Equipment:",
        basicInfo.equipment || "N/A",
        "Weight:",
        basicInfo.weight || "N/A",
      ],
      ["Terms:", basicInfo.terms || "N/A", "POL:", basicInfo.pol || "N/A"],
      [
        "POD:",
        basicInfo.pod || "N/A",
        "Final Destination:",
        basicInfo.finalDestination || "N/A",
      ],
      [
        "Shipping Line:",
        basicInfo.shippingLine || "N/A",
        "ETD:",
        basicInfo.etd || "N/A",
      ],
      ["Total Transit Time:", basicInfo.totalTransitTime || "N/A", "", ""],
    ];

    details.forEach((row) => {
      doc.setFont("helvetica", "bold");
      doc.text(row[0], 15, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(row[1], 50, yPos);
      if (row[2]) {
        doc.setFont("helvetica", "bold");
        doc.text(row[2], 110, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(row[3], 145, yPos);
      }
      yPos += 6;
    });

    yPos += 5;

    // Charges Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Charges", 15, yPos);
    yPos += 10;

    // Origin Charges
    if (originCharges.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Origin Charges:", 15, yPos);
      yPos += 6;
      doc.setFontSize(9);
      originCharges.forEach((charge) => {
        if (charge.charges || charge.amount) {
          doc.setFont("helvetica", "normal");
          const text = `${charge.charges || "N/A"} - ${charge.currency} ${
            charge.amount || "0"
          } ${charge.unit}`;
          doc.text(text, 20, yPos);
          yPos += 5;
        }
      });
      yPos += 3;
    }

    // Freight Charges
    if (freightCharges.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Freight Charges:", 15, yPos);
      yPos += 6;
      doc.setFontSize(9);
      freightCharges.forEach((charge) => {
        if (charge.charges || charge.amount) {
          doc.setFont("helvetica", "normal");
          const text = `${charge.charges || "N/A"} - ${charge.currency} ${
            charge.amount || "0"
          } ${charge.unit}`;
          doc.text(text, 20, yPos);
          yPos += 5;
        }
      });
      yPos += 3;
    }

    // Destination Charges
    if (destinationCharges.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Destination Charges:", 15, yPos);
      yPos += 6;
      doc.setFontSize(9);
      destinationCharges.forEach((charge) => {
        if (charge.charges || charge.amount) {
          doc.setFont("helvetica", "normal");
          const text = `${charge.charges || "N/A"} - ${charge.currency} ${
            charge.amount || "0"
          } ${charge.unit}`;
          doc.text(text, 20, yPos);
          yPos += 5;
        }
      });
      yPos += 5;
    }

    // Remarks
    if (basicInfo.remarks) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Remarks:", 15, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const remarksLines = doc.splitTextToSize(basicInfo.remarks, 180);
      doc.text(remarksLines, 15, yPos);
      yPos += remarksLines.length * 5 + 5;
    }

    // Terms and Conditions
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Terms and Conditions", 15, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const terms = [
      "• Freight rates are subject to equipment and space availability.",
      "• Transit insurance will be at the customer's cost. OmTrans will not be",
      "  responsible for any claims.",
    ];

    terms.forEach((term) => {
      doc.text(term, 15, yPos);
      yPos += 5;
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        105,
        290,
        { align: "center" }
      );
    }

    // Save PDF
    doc.save(`Door_to_Door_Quotation_${Date.now()}.pdf`);

    // Show popup
    setShowPopup(true);

    // Hide popup after 3 seconds
    setTimeout(() => {
      setShowPopup(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-3 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText size={24} />
              <div>
                <h1 className="text-xl font-bold">Door-to-Door Quotation</h1>
                <p className="text-xs text-blue-100">
                  Complete shipping quotation form
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-5 space-y-4">
          {/* Basic Information Section */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-blue-500 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                1
              </span>
              Scope of Activities
            </h2>
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
                    if (basicInfo.finalDestination && filteredFinalDestinations.length > 0) {
                      setShowFinalDestDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowFinalDestDropdown(false), 200);
                  }}
                  placeholder="Type final destination..."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {showFinalDestDropdown && filteredFinalDestinations.length > 0 && (
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
                    if (basicInfo.shippingLine && filteredShippingLines.length > 0) {
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
                {showShippingLineDropdown && filteredShippingLines.length > 0 && (
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
                    <option key={day} value={`${day} ${day === 1 ? 'day' : 'days'}`}>
                      {day} {day === 1 ? 'day' : 'days'}
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
                <div className="bg-white rounded-md overflow-hidden border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                          Charge
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-16">
                          Curr.
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                          Amount
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-14">
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
                          <td className="px-2 py-1.5">
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
                              placeholder="Charge name"
                              className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-400"
                            />
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
                <div className="bg-white rounded-md overflow-hidden border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                          Charge
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-16">
                          Curr.
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                          Amount
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-14">
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
                          <td className="px-2 py-1.5">
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
                              placeholder="Charge name"
                              className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-400"
                            />
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
                <div className="bg-white rounded-md overflow-hidden border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-purple-100">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                          Charge
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-16">
                          Curr.
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-20">
                          Amount
                        </th>
                        <th className="px-1 py-1.5 text-center font-semibold text-gray-700 w-14">
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
                          <td className="px-2 py-1.5">
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
                              placeholder="Charge name"
                              className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-400"
                            />
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
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full animate-bounce-in">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle size={48} className="text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
              Quotation Submitted Successfully!
            </h3>
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
