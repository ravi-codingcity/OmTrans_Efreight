import React, { useState, useEffect } from "react";
import {
  FileText,
  User,
  Calendar,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Download,
  Package,
  Ship,
  AlertCircle,
  X,
} from "lucide-react";
import OmTransLogo from "../assets/omtrans.jpg";
import VikramImg from "../assets/vikram.jpg";
import TarunImg from "../assets/tarun.jpeg";
import HarmeetImg from "../assets/harmeet.jpg";

const ImportExportQuotationStatus = ({ currentUser }) => {
  // Helper function to get user image based on username
  const getUserImage = (username) => {
    if (!username) return OmTransLogo;
    
    const name = username.toLowerCase().trim();
    
    if (name.includes("vikram")) return VikramImg;
    if (name.includes("tarun")) return TarunImg;
    if (name.includes("harmeet")) return HarmeetImg;
    
    return OmTransLogo; // Default fallback
  };
  // State for quotations
  const [quotations, setQuotations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Check if user is admin
  const isAdmin = currentUser?.role === "Admin";

  // Load quotations from localStorage
  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = () => {
    const storedQuotations = localStorage.getItem("importExportQuotations");
    if (storedQuotations) {
      setQuotations(JSON.parse(storedQuotations));
    }
  };

  // Filter quotations based on search and status, then sort by date (most recent first)
  const filteredQuotations = quotations
    .filter((quote) => {
      const matchesSearch =
        quote.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.consigneeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.pol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.pod?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "All" || quote.status === filterStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

  // Calculate statistics
  const totalQuotations = quotations.length;
  const pendingCount = quotations.filter((q) => q.status === "Pending").length;
  const approvedCount = quotations.filter(
    (q) => q.status === "Approved"
  ).length;

  // Handle status change (Admin only)
  const handleStatusChange = (quotationId, newStatus) => {
    if (!isAdmin) {
      alert("Access Denied: Only Admin users can approve quotations.");
      return;
    }

    const updatedQuotations = quotations.map((quote) =>
      quote.id === quotationId ? { ...quote, status: newStatus } : quote
    );
    setQuotations(updatedQuotations);
    localStorage.setItem(
      "importExportQuotations",
      JSON.stringify(updatedQuotations)
    );
  };

  // Handle card click to filter quotations
  const handleCardClick = (status) => {
    setFilterStatus(status);
  };

  // View quotation details
  const viewDetails = (quotation) => {
    setSelectedQuotation(quotation);
    setShowDetailsModal(true);
  };

  // If not admin, show access denied message
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md">
          <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-600" size={40} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            This page is restricted to Admin users only. You need Admin
            privileges to view and approve Import/Export Quotations.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Your Role:</span>{" "}
              {currentUser?.role}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-semibold">Required Role:</span> Admin
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="w-full px-4 sm:px-12 lg:px-20 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Ship className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Import/Export Quotation Approval
                </h1>
                <p className="text-sm text-gray-600">
                  Review and approve Door-to-Door quotations
                </p>
              </div>
            </div>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
              Admin Dashboard
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Quotations */}
          <div 
            onClick={() => handleCardClick("All")}
            className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all cursor-pointer ${
              filterStatus === "All" ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Quotations
                </p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {totalQuotations}
                </h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FileText className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Pending */}
          <div 
            onClick={() => handleCardClick("Pending")}
            className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500 hover:shadow-xl transition-all cursor-pointer ${
              filterStatus === "Pending" ? "ring-2 ring-yellow-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Pending Approval
                </p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {pendingCount}
                </h3>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          {/* Approved */}
          <div 
            onClick={() => handleCardClick("Approved")}
            className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-all cursor-pointer ${
              filterStatus === "Approved" ? "ring-2 ring-green-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Approved
                </p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {approvedCount}
                </h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by ID, customer, consignee, or port..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Quotation ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Created By
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Route
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Equipment
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Created Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Package className="text-gray-300" size={48} />
                        <p className="text-gray-500 text-lg">
                          No quotations found
                        </p>
                        <p className="text-gray-400 text-sm">
                          {quotations.length === 0
                            ? "No quotations have been created yet"
                            : "Try adjusting your search or filter criteria"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((quote) => (
                    <tr
                      key={quote.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      {/* Quotation ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="text-blue-600" size={18} />
                          <span className="font-semibold text-gray-900 text-sm">
                            {quote.id}
                          </span>
                        </div>
                      </td>

                      {/* Created By */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getUserImage(quote.createdBy)}
                            alt={quote.createdBy}
                            className="w-10 h-10 rounded-full object-cover border-[1px] border-black"
                          />
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {quote.createdBy}
                            </div>
                            <div className="text-xs text-gray-500">
                              {quote.createdByRole}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {quote.customerName || "N/A"}
                        </div>
                      </td>

                      {/* Route */}
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 ">
                            {quote.pol || "N/A"}
                          </div>
                          <div className="text-gray-500 flex items-center gap-1">
                            <span>→</span> {quote.pod || "N/A"}
                          </div>
                        </div>
                      </td>

                      {/* Equipment */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          {quote.equipment || "N/A"}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={16} />
                          {new Date(quote.createdDate).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {quote.status === "Pending" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                            <Clock size={14} />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                            <CheckCircle size={14} />
                            Approved
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* View Button */}
                          <button
                            onClick={() => viewDetails(quote)}
                            className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all font-medium text-sm border border-blue-200"
                            title="View Details"
                          >
                            <Eye size={16} />
                            <span>View</span>
                          </button>
                          
                          {/* Approve Button - Only for Pending */}
                          {quote.status === "Pending" && (
                            <button
                              onClick={() =>
                                handleStatusChange(quote.id, "Approved")
                              }
                              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-medium text-sm shadow-sm"
                              title="Approve Quotation"
                            >
                              <CheckCircle size={16} />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Summary */}
        {filteredQuotations.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Showing {filteredQuotations.length} of {totalQuotations} quotations
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-5xl w-full my-8 shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Quotation Details
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Quotation ID and Status */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Quotation ID</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedQuotation.id}
                  </p>
                </div>
                <div>
                  {selectedQuotation.status === "Pending" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                      <Clock size={14} />
                      Pending Approval
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                      <CheckCircle size={14} />
                      Approved
                    </span>
                  )}
                </div>
              </div>

              {/* Created By Information */}
              <div className="mb-4">
                <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2.5">
                  <div className="bg-blue-600 p-2 rounded-full">
                    <User size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedQuotation.createdBy} <span className="text-xs text-gray-600">({selectedQuotation.createdByRole})</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(
                        selectedQuotation.createdDate
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quotation Details */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Shipment Information
                </h3>

                {/* Customer & Consignee */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1 font-semibold">
                      Customer
                    </p>
                    <p className="text-xs text-gray-900 whitespace-pre-line line-clamp-3">
                      {selectedQuotation.customerName || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1 font-semibold">
                      Consignee
                    </p>
                    <p className="text-xs text-gray-900 whitespace-pre-line line-clamp-3">
                      {selectedQuotation.consigneeName || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Shipment Details */}
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">Equipment</p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.equipment || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">Weight</p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.weight || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">Terms</p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.terms || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">POR</p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.por || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">POL</p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.pol || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">POD</p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.pod || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">
                      Final Dest.
                    </p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.finalDestination || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">Shipping Line</p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.shippingLine || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">Transit Time</p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.transitTime || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">ETD</p>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedQuotation.etd || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Charges Section */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-gray-900">Charges Breakdown</h3>
                  
                  {/* Origin Charges */}
                  {selectedQuotation.originCharges && selectedQuotation.originCharges.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-blue-600 text-white px-3 py-2">
                        <h4 className="text-sm font-semibold">Origin Charges</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Currency</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedQuotation.originCharges.map((charge, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{charge.charges || "N/A"}</td>
                                <td className="px-3 py-2 text-gray-700">{charge.currency || "USD"}</td>
                                <td className="px-3 py-2 text-right text-gray-900 font-medium">{charge.amount || "0"}</td>
                                <td className="px-3 py-2 text-gray-700">{charge.unit || "Per Shipment"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Freight Charges */}
                  {selectedQuotation.freightCharges && selectedQuotation.freightCharges.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-purple-600 text-white px-3 py-2">
                        <h4 className="text-sm font-semibold">Freight Charges</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Currency</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedQuotation.freightCharges.map((charge, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{charge.charges || "N/A"}</td>
                                <td className="px-3 py-2 text-gray-700">{charge.currency || "USD"}</td>
                                <td className="px-3 py-2 text-right text-gray-900 font-medium">{charge.amount || "0"}</td>
                                <td className="px-3 py-2 text-gray-700">{charge.unit || "Per Container"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Destination Charges */}
                  {selectedQuotation.destinationCharges && selectedQuotation.destinationCharges.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-green-600 text-white px-3 py-2">
                        <h4 className="text-sm font-semibold">Destination Charges</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Currency</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedQuotation.destinationCharges.map((charge, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{charge.charges || "N/A"}</td>
                                <td className="px-3 py-2 text-gray-700">{charge.currency || "USD"}</td>
                                <td className="px-3 py-2 text-right text-gray-900 font-medium">{charge.amount || "0"}</td>
                                <td className="px-3 py-2 text-gray-700">{charge.unit || "Per Shipment"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                {selectedQuotation.remarks && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1 font-semibold">
                      Remarks
                    </p>
                    <p className="text-xs text-gray-900 whitespace-pre-line">
                      {selectedQuotation.remarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 pt-3 border-t">
                {selectedQuotation.status === "Pending" && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedQuotation.id, "Approved");
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExportQuotationStatus;
