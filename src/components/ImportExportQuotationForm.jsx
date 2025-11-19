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

  // Summary Sections State
  const [originSummary, setOriginSummary] = useState({
    currency: "USD",
    amount: "",
    unit: "/BL",
  });

  const [freightSummary, setFreightSummary] = useState({
    currency: "USD",
    amount: "",
    unit: "/BL",
  });

  const [destinationSummary, setDestinationSummary] = useState({
    currency: "USD",
    amount: "",
    unit: "/BL",
  });

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
  };

  // Handle Summary Changes
  const handleOriginSummaryChange = (field, value) => {
    setOriginSummary((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFreightSummaryChange = (field, value) => {
    setFreightSummary((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDestinationSummaryChange = (field, value) => {
    setDestinationSummary((prev) => ({
      ...prev,
      [field]: value,
    }));
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
    doc.text("Customer Address (Consignor):", 15, yPos);
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
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Customer Address (Consignor){" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="customerAddress"
                  value={basicInfo.customerAddress}
                  onChange={handleBasicInfoChange}
                  placeholder="Enter customer address"
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Delivery Address (Consignee){" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="consigneeAddress"
                  value={basicInfo.consigneeAddress}
                  onChange={handleBasicInfoChange}
                  placeholder="Enter consignee address"
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </section>

          {/* Shipment Details */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-blue-500 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                2
              </span>
              Shipment Details
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Equipment
                </label>
                <input
                  type="text"
                  name="equipment"
                  value={basicInfo.equipment}
                  onChange={handleBasicInfoChange}
                  placeholder="e.g., 20ft Container"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="text"
                  name="weight"
                  value={basicInfo.weight}
                  onChange={handleBasicInfoChange}
                  placeholder="e.g., 5000"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Terms
                </label>
                <select
                  name="terms"
                  value={basicInfo.terms}
                  onChange={handleBasicInfoChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select Terms</option>
                  <option value="DDP">DDP</option>
                  <option value="CIF">CIF</option>
                  <option value="DAP">DAP</option>
                  <option value="Ex-WORK">Ex-WORK</option>
                  <option value="FOB">FOB</option>
                  <option value="FCA">FCA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  POL (Port of Loading)
                </label>
                <input
                  type="text"
                  name="pol"
                  value={basicInfo.pol}
                  onChange={handleBasicInfoChange}
                  placeholder="e.g., Mumbai"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  POD (Port of Discharge)
                </label>
                <input
                  type="text"
                  name="pod"
                  value={basicInfo.pod}
                  onChange={handleBasicInfoChange}
                  placeholder="e.g., Singapore"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Final Destination
                </label>
                <input
                  type="text"
                  name="finalDestination"
                  value={basicInfo.finalDestination}
                  onChange={handleBasicInfoChange}
                  placeholder="Enter final destination"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Shipping Line
                </label>
                <input
                  type="text"
                  name="shippingLine"
                  value={basicInfo.shippingLine}
                  onChange={handleBasicInfoChange}
                  placeholder="e.g., Maersk, MSC"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ETD (Estimated Time of Departure)
                </label>
                <input
                  type="date"
                  name="etd"
                  value={basicInfo.etd}
                  onChange={handleBasicInfoChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Total Transit Time
                </label>
                <input
                  type="text"
                  name="totalTransitTime"
                  value={basicInfo.totalTransitTime}
                  onChange={handleBasicInfoChange}
                  placeholder="e.g., 15-20 days"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={basicInfo.remarks}
                  onChange={handleBasicInfoChange}
                  placeholder="Enter any additional remarks or notes..."
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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

                {/* Summary Row */}
                <div className="bg-white rounded-md p-2 mb-2 flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-700">
                    Add Origin Charges:
                  </span>
                  <select
                    value={originSummary.currency}
                    onChange={(e) =>
                      handleOriginSummaryChange("currency", e.target.value)
                    }
                    className="px-1.5 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 bg-white text-xs"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="AED">AED</option>
                  </select>
                  <input
                    type="number"
                    value={originSummary.amount}
                    onChange={(e) =>
                      handleOriginSummaryChange("amount", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-20 px-1.5 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 text-xs"
                  />
                  <select
                    value={originSummary.unit}
                    onChange={(e) =>
                      handleOriginSummaryChange("unit", e.target.value)
                    }
                    className="px-1.5 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 bg-white text-xs"
                  >
                    <option value="/BL">/BL</option>
                    <option value="/PKG">/PKG</option>
                    <option value="/HBL">/HBL</option>
                  </select>
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

                {/* Summary Row */}
                <div className="bg-white rounded-md p-2 mb-2 flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-700">
                    Add Freight Charges:
                  </span>
                  <select
                    value={freightSummary.currency}
                    onChange={(e) =>
                      handleFreightSummaryChange("currency", e.target.value)
                    }
                    className="px-1.5 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-green-400 bg-white text-xs"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="AED">AED</option>
                  </select>
                  <input
                    type="number"
                    value={freightSummary.amount}
                    onChange={(e) =>
                      handleFreightSummaryChange("amount", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-20 px-1.5 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-green-400 text-xs"
                  />
                  <select
                    value={freightSummary.unit}
                    onChange={(e) =>
                      handleFreightSummaryChange("unit", e.target.value)
                    }
                    className="px-1.5 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-green-400 bg-white text-xs"
                  >
                    <option value="/BL">/BL</option>
                    <option value="/PKG">/PKG</option>
                    <option value="/HBL">/HBL</option>
                  </select>
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

                {/* Summary Row */}
                <div className="bg-white rounded-md p-2 mb-2 flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-700">
                    Add Destination Charges:
                  </span>
                  <select
                    value={destinationSummary.currency}
                    onChange={(e) =>
                      handleDestinationSummaryChange("currency", e.target.value)
                    }
                    className="px-1.5 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-purple-400 bg-white text-xs"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="AED">AED</option>
                  </select>
                  <input
                    type="number"
                    value={destinationSummary.amount}
                    onChange={(e) =>
                      handleDestinationSummaryChange("amount", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-20 px-1.5 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-purple-400 text-xs"
                  />
                  <select
                    value={destinationSummary.unit}
                    onChange={(e) =>
                      handleDestinationSummaryChange("unit", e.target.value)
                    }
                    className="px-1.5 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-purple-400 bg-white text-xs"
                  >
                    <option value="/BL">/BL</option>
                    <option value="/PKG">/PKG</option>
                    <option value="/HBL">/HBL</option>
                  </select>
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
