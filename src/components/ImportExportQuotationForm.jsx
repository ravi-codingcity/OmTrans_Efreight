import React, { useState, useMemo } from 'react';
import { Calculator, FileText, Send, CheckCircle, X } from 'lucide-react';
import jsPDF from 'jspdf';

const ImportExportQuotationForm = () => {
  // Basic Information State
  const [basicInfo, setBasicInfo] = useState({
    shipperAddress: '',
    consigneeAddress: '',
    equipment: '',
    weight: '',
    terms: '',
    pol: '',
    pod: '',
    finalDestination: '',
    shippingLine: '',
    etd: '',
    totalTransitTime: '',
    remarks: '',
  });

  // Popup state
  const [showPopup, setShowPopup] = useState(false);

  // Heads Charges State
  const [headsCharges, setHeadsCharges] = useState({
    muc: '',
    mblFee: '',
    outGaugeCharges: '',
    shippingLineTHC: '',
  });

  // International Freight State
  const [internationalFreight, setInternationalFreight] = useState({
    oceanFreight: '',
    doFee: '',
    destinationShippingLineDues: '',
    doorDeliveryCharges: '',
    acd: '',
    customClearance: '',
  });

  // Handle Basic Info Changes
  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setBasicInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle Heads Charges Changes
  const handleHeadsChargesChange = (e) => {
    const { name, value } = e.target;
    setHeadsCharges((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle International Freight Changes
  const handleInternationalFreightChange = (e) => {
    const { name, value } = e.target;
    setInternationalFreight((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate Heads Total
  const headsTotal = useMemo(() => {
    const values = Object.values(headsCharges);
    return values.reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
  }, [headsCharges]);

  // Calculate International Freight Total
  const internationalFreightTotal = useMemo(() => {
    const values = Object.values(internationalFreight);
    return values.reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
  }, [internationalFreight]);

  // Calculate Grand Total
  const grandTotal = useMemo(() => {
    return headsTotal + internationalFreightTotal;
  }, [headsTotal, internationalFreightTotal]);

  // Generate PDF and Submit
  const handleSubmit = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('DOOR-TO-DOOR QUOTATION', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('OmTrans Freight Services', 105, 25, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    let yPos = 45;
    
    // Basic Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Scope of Activities', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Shipper Address (Consignor):', 15, yPos);
    doc.setFont('helvetica', 'normal');
    const shipperLines = doc.splitTextToSize(basicInfo.shipperAddress || 'N/A', 85);
    doc.text(shipperLines, 15, yPos + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Address (Consignee):', 110, yPos);
    doc.setFont('helvetica', 'normal');
    const consigneeLines = doc.splitTextToSize(basicInfo.consigneeAddress || 'N/A', 85);
    doc.text(consigneeLines, 110, yPos + 5);
    yPos += 20;
    
    // Shipment Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Shipment Details', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const details = [
      ['Equipment:', basicInfo.equipment || 'N/A', 'Weight:', basicInfo.weight || 'N/A'],
      ['Terms:', basicInfo.terms || 'N/A', 'POL:', basicInfo.pol || 'N/A'],
      ['POD:', basicInfo.pod || 'N/A', 'Final Destination:', basicInfo.finalDestination || 'N/A'],
      ['Shipping Line:', basicInfo.shippingLine || 'N/A', 'ETD:', basicInfo.etd || 'N/A'],
      ['Total Transit Time:', basicInfo.totalTransitTime || 'N/A', '', ''],
    ];
    
    details.forEach(row => {
      doc.setFont('helvetica', 'bold');
      doc.text(row[0], 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(row[1], 50, yPos);
      if (row[2]) {
        doc.setFont('helvetica', 'bold');
        doc.text(row[2], 110, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(row[3], 145, yPos);
      }
      yPos += 6;
    });
    
    yPos += 5;
    
    // Heads Charges
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Heads', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const headsItems = [
      ['MUC', headsCharges.muc],
      ['MBL Fee', headsCharges.mblFee],
      ['Out Gauge Charges', headsCharges.outGaugeCharges],
      ['Shipping Line THC', headsCharges.shippingLineTHC],
    ];
    
    headsItems.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(label, 15, yPos);
      doc.text('₹ ' + (parseFloat(value) || 0).toFixed(2), 180, yPos, { align: 'right' });
      yPos += 6;
    });
    
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(37, 99, 235);
    doc.line(15, yPos, 195, yPos);
    yPos += 5;
    doc.text('Total:', 15, yPos);
    doc.text('₹ ' + headsTotal.toFixed(2), 180, yPos, { align: 'right' });
    yPos += 10;
    
    // International Freight
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('International Freight', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const freightItems = [
      ['Ocean Freight', internationalFreight.oceanFreight],
      ['D.O Fee', internationalFreight.doFee],
      ['Destination Shipping Line Dues', internationalFreight.destinationShippingLineDues],
      ['Door Delivery Charges', internationalFreight.doorDeliveryCharges],
      ['ACD', internationalFreight.acd],
      ['Custom Clearance', internationalFreight.customClearance],
    ];
    
    freightItems.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(label, 15, yPos);
      doc.text('₹ ' + (parseFloat(value) || 0).toFixed(2), 180, yPos, { align: 'right' });
      yPos += 6;
    });
    
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(16, 185, 129);
    doc.line(15, yPos, 195, yPos);
    yPos += 5;
    doc.text('Total:', 15, yPos);
    doc.text('₹ ' + internationalFreightTotal.toFixed(2), 180, yPos, { align: 'right' });
    yPos += 10;
    
    // Grand Total
    doc.setFillColor(79, 70, 229);
    doc.rect(15, yPos - 5, 180, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('GRAND TOTAL:', 20, yPos + 3);
    doc.text('₹ ' + grandTotal.toFixed(2), 180, yPos + 3, { align: 'right' });
    yPos += 15;
    
    // Remarks
    if (basicInfo.remarks) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Remarks:', 15, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
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
    doc.setFont('helvetica', 'bold');
    doc.text('Terms and Conditions', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const terms = [
      '• Freight rates are subject to equipment and space availability.',
      '• Transit insurance will be at the customer\'s cost. OmTrans will not be',
      '  responsible for any claims.',
    ];
    
    terms.forEach(term => {
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
        { align: 'center' }
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
                <p className="text-xs text-blue-100">Complete shipping quotation form</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-5 space-y-4">
          {/* Basic Information Section */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-blue-500 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Scope of Activities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Shipper Address (Consignor) <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="shipperAddress"
                  value={basicInfo.shipperAddress}
                  onChange={handleBasicInfoChange}
                  placeholder="Enter shipper address"
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Delivery Address (Consignee) <span className="text-red-500">*</span>
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
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
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
                <input
                  type="text"
                  name="terms"
                  value={basicInfo.terms}
                  onChange={handleBasicInfoChange}
                  placeholder="e.g., CIF"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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

          {/* Charges Section - Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Heads Charges */}
            <section className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <h2 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-blue-500 flex items-center gap-2">
                <Calculator size={18} className="text-blue-600" />
                Heads
              </h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    MUC
                  </label>
                  <input
                    type="number"
                    name="muc"
                    value={headsCharges.muc}
                    onChange={handleHeadsChargesChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    MBL Fee
                  </label>
                  <input
                    type="number"
                    name="mblFee"
                    value={headsCharges.mblFee}
                    onChange={handleHeadsChargesChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Out Gauge Charges
                  </label>
                  <input
                    type="number"
                    name="outGaugeCharges"
                    value={headsCharges.outGaugeCharges}
                    onChange={handleHeadsChargesChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shipping Line THC
                  </label>
                  <input
                    type="number"
                    name="shippingLineTHC"
                    value={headsCharges.shippingLineTHC}
                    onChange={handleHeadsChargesChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="pt-2 mt-2 border-t-2 border-blue-400">
                  <div className="flex justify-between items-center bg-blue-600 text-white px-3 py-2 rounded-md">
                    <span className="text-sm font-semibold">Total:</span>
                    <span className="text-lg font-bold">
                      ₹ {headsTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* International Freight */}
            <section className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-lg border border-green-200">
              <h2 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-green-500 flex items-center gap-2">
                <Calculator size={18} className="text-green-600" />
                International Freight
              </h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ocean Freight
                  </label>
                  <input
                    type="number"
                    name="oceanFreight"
                    value={internationalFreight.oceanFreight}
                    onChange={handleInternationalFreightChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    D.O Fee
                  </label>
                  <input
                    type="number"
                    name="doFee"
                    value={internationalFreight.doFee}
                    onChange={handleInternationalFreightChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Destination Shipping Line Dues
                  </label>
                  <input
                    type="number"
                    name="destinationShippingLineDues"
                    value={internationalFreight.destinationShippingLineDues}
                    onChange={handleInternationalFreightChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Door Delivery Charges
                  </label>
                  <input
                    type="number"
                    name="doorDeliveryCharges"
                    value={internationalFreight.doorDeliveryCharges}
                    onChange={handleInternationalFreightChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ACD
                  </label>
                  <input
                    type="number"
                    name="acd"
                    value={internationalFreight.acd}
                    onChange={handleInternationalFreightChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Custom Clearance
                  </label>
                  <input
                    type="number"
                    name="customClearance"
                    value={internationalFreight.customClearance}
                    onChange={handleInternationalFreightChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="pt-2 mt-2 border-t-2 border-green-400">
                  <div className="flex justify-between items-center bg-green-600 text-white px-3 py-2 rounded-md">
                    <span className="text-sm font-semibold">Total:</span>
                    <span className="text-lg font-bold">
                      ₹ {internationalFreightTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Grand Total Section */}
          <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-indigo-100">Grand Total Amount</h3>
                <p className="text-xs text-indigo-200 mt-1">
                  Heads + International Freight
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  ₹ {grandTotal.toFixed(2)}
                </div>
                <div className="text-xs text-indigo-200 mt-1">
                  Inclusive of all charges
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
                <span>Freight rates are subject to equipment and space availability.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-0.5">•</span>
                <span>Transit insurance will be at the customer's cost. OmTrans will not be responsible for any claims.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-0.5">•</span>
                <span>*2hrs free for offloading after this 75euro/half hour detention will be applied. </span>
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
