import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle,
  TrendingUp,
  Package,
  Ship,
  BarChart3,
  Eye,
  User,
  Calendar,
  X,
  XCircle,
  Briefcase,
  Filter,
  MapPin,
} from "lucide-react";
import OmTransLogo from "../assets/omtrans.jpg";
import VikramImg from "../assets/vikram.jpg";
import TarunImg from "../assets/tarun.jpeg";
import HarmeetImg from "../assets/harmeet.jpg";

const API_BASE_URL = "https://omtransefreight-rjph1xtg.b4a.run/api";

const Dashboard = () => {
  // Helper function to get user image based on username
  const getUserImage = (username) => {
    if (!username) return OmTransLogo;
    
    const name = username.toLowerCase().trim();
    
    if (name.includes("vikram")) return VikramImg;
    if (name.includes("tarun")) return TarunImg;
    if (name.includes("harmeet")) return HarmeetImg;
    
    return OmTransLogo; // Default fallback
  };
  // State for statistics
  const [stats, setStats] = useState({
    totalQuotations: 0,
    businessNotConverted: 0,
    jobsCreated: 0,
    totalBookings: 0,
  });

  // State for quotations and filtering
  const [quotations, setQuotations] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Filter states
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterYear, setFilterYear] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  
  // Location options
  const locations = ["Delhi", "Mumbai", "Pune", "Kolkata", "Chennai"];
  
  // Get unique years from quotations
  const getAvailableYears = () => {
    const years = quotations.map(q => new Date(q.createdDate).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  };
  
  // Month options
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Load quotations from API
  useEffect(() => {
    loadQuotations();
    
    // Set up interval to refresh data every 5 seconds
    const interval = setInterval(() => {
      loadQuotations();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStatistics = (quotationsData = []) => {
    // Calculate statistics from quotations data
    const totalQuotations = quotationsData.length;
    const businessNotConverted = 0;
    const jobsCreated = 0;

    // Load bookings (placeholder - will be implemented later)
    const bookings = JSON.parse(localStorage.getItem("bookings") || "[]");
    const totalBookings = bookings.length;

    setStats({
      totalQuotations,
      businessNotConverted,
      jobsCreated,
      totalBookings,
    });
  };

  const loadQuotations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quotations`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        const quotationsData = data.data || [];
        setQuotations(quotationsData);
        loadStatistics(quotationsData);
      } else {
        console.error("Failed to load quotations:", data.message);
        setQuotations([]);
        loadStatistics([]);
      }
    } catch (error) {
      console.error("Error fetching quotations:", error);
      setQuotations([]);
      loadStatistics([]);
    }
  };

  // Handle card click to filter quotations
  const handleCardClick = (status) => {
    setFilterStatus(status);
  };

  // Filter quotations based on selected filters and sort by date (most recent first)
  const filteredQuotations = quotations
    .filter((quote) => {
      // Location filter
      if (filterLocation !== "All" && quote.createdByLocation !== filterLocation) {
        return false;
      }
      
      // Year filter
      if (filterYear !== "All") {
        const quoteYear = new Date(quote.createdDate).getFullYear();
        if (quoteYear !== parseInt(filterYear)) {
          return false;
        }
      }
      
      // Month filter
      if (filterMonth !== "All") {
        const quoteMonth = new Date(quote.createdDate).getMonth();
        const selectedMonthIndex = months.indexOf(filterMonth);
        if (quoteMonth !== selectedMonthIndex) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

  // View quotation details
  const viewDetails = (quotation) => {
    setSelectedQuotation(quotation);
    setShowDetailsModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="w-full px-4 sm:px-12 lg:px-20 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
              <BarChart3 className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Dashboard Overview
              </h1>
              <p className="text-sm text-gray-600">
                OmTrans Freight Management System
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Quotations Created */}
          <div 
            onClick={() => handleCardClick("All")}
            className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer ${
              filterStatus === "All" ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Quotations Created
                </p>
                <h3 className="text-4xl font-bold text-gray-900">
                  {stats.totalQuotations}
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  Import/Export quotations
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <FileText className="text-blue-600" size={28} />
              </div>
            </div>
          </div>

          {/* Business Not Converted */}
          <div 
            onClick={() => handleCardClick("Not Converted")}
            className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer ${
              filterStatus === "Not Converted" ? "ring-2 ring-red-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Business Not Converted
                </p>
                <h3 className="text-4xl font-bold text-gray-900">
                  {stats.businessNotConverted}
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  Lost opportunities
                </p>
              </div>
              <div className="bg-red-100 p-4 rounded-full">
                <XCircle className="text-red-600" size={28} />
              </div>
            </div>
          </div>

          {/* Jobs Created */}
          <div 
            onClick={() => handleCardClick("Job Created")}
            className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer ${
              filterStatus === "Job Created" ? "ring-2 ring-green-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Jobs Created
                </p>
                <h3 className="text-4xl font-bold text-gray-900">
                  {stats.jobsCreated}
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  Converted to jobs
                </p>
              </div>
              <div className="bg-green-100 p-4 rounded-full">
                <Briefcase className="text-green-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Bookings */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Bookings Created
                </p>
                <h3 className="text-4xl font-bold text-gray-900">
                  {stats.totalBookings}
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  Freight bookings
                </p>
              </div>
              <div className="bg-purple-100 p-4 rounded-full">
                <Package className="text-purple-600" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Filter size={18} className="text-blue-600" />
              <span>Filters:</span>
            </div>
            
            {/* Location Filter */}
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="All">All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="All">All Years</option>
              {getAvailableYears().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="All">All Months</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {(filterLocation !== "All" || filterYear !== "All" || filterMonth !== "All") && (
              <button
                onClick={() => {
                  setFilterLocation("All");
                  setFilterYear("All");
                  setFilterMonth("All");
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText size={24} />
              {filterStatus === "All" ? "All Quotations" : `${filterStatus} Quotations`}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              {filteredQuotations.length} {filteredQuotations.length === 1 ? "quotation" : "quotations"} found
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Quotation No.
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Segment
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Package className="text-gray-300" size={48} />
                        <p className="text-gray-500 text-lg">
                          No quotations found
                        </p>
                        <p className="text-gray-400 text-sm">
                          {filterStatus === "All"
                            ? "No quotations have been created yet"
                            : `No quotations with "${filterStatus}" status`}
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
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="text-blue-600" size={18} />
                          <span className="font-semibold text-gray-900 text-xs">
                            {quote.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {quote.quotationSegment || "N/A"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getUserImage(quote.createdBy)}
                            alt={quote.createdBy}
                            className="w-10 h-10 rounded-full object-cover border-[1px] border-black"
                          />
                          <div>
                            <div className="font-medium text-gray-900 text-xs">
                              {quote.createdBy}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {quote.createdByLocation || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-medium text-gray-900">
                          {quote.customerName
                            ? quote.customerName.split("\n")[0].substring(0, 30) +
                              (quote.customerName.length > 30 ? "..." : "")
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs">
                          {quote.quotationSegment && (quote.quotationSegment.toLowerCase().includes("air")) ? (
                            // Air Route
                            <>
                              <div className="font-medium text-gray-900">
                                {quote.airPortOfDeparture || "N/A"}
                              </div>
                              <div className="text-gray-500 flex items-center gap-1">
                                <span>→</span> {quote.airPortOfDestination || "N/A"}
                              </div>
                            </>
                          ) : (
                            // Sea/Other Route
                            <>
                              <div className="font-medium text-gray-900">
                                {quote.pol || "N/A"}
                              </div>
                              <div className="text-gray-500 flex items-center gap-1">
                                <span>→</span> {quote.pod || "N/A"}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar size={16} />
                          {new Date(quote.createdDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => viewDetails(quote)}
                          className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all font-medium text-sm border border-blue-200"
                          title="View Details"
                        >
                          <Eye size={16} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <FileText className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Quotation Management
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Create new quotations or review existing ones. Track
                    approval status and manage client requests.
                  </p>
                  <div className="text-xs text-gray-500">
                    Use the navigation menu to access quotation features
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-start gap-4">
                <div className="bg-purple-600 p-3 rounded-lg">
                  <Package className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Booking Management
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage freight bookings, track shipments, and coordinate
                    with shipping lines.
                  </p>
                  <div className="text-xs text-gray-500">
                    Coming soon - Comprehensive booking features
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TrendingUp className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  System Status: Active
                </p>
                <p className="text-xs text-gray-600">
                  All systems operational • Last updated: just now
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">OmTrans Freight Services</p>
              <p className="text-xs text-gray-500">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Details Modal */}
      {showDetailsModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Quotation Details</h3>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {selectedQuotation.id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedQuotation(null);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 max-h-[calc(90vh-120px)] overflow-y-auto space-y-4">
              {/* Segment and Status */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2.5">
                  <div className="bg-blue-600 p-2 rounded-full">
                    <User className="text-white" size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Created By</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedQuotation.createdBy} <span className="text-xs text-gray-600">({selectedQuotation.createdByRole})</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin size={12} className="text-blue-600" />
                      <p className="text-xs text-gray-600">
                        {selectedQuotation.createdByLocation || "N/A"}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(selectedQuotation.createdDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {selectedQuotation.quotationSegment && (
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Quotation Segment</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                      {selectedQuotation.quotationSegment}
                    </span>
                  </div>
                )}
              </div>

              {/* Customer & Consignee Information */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <h4 className="text-xs font-semibold text-blue-900 mb-1.5 flex items-center gap-1.5">
                    <User size={14} />
                    Customer
                  </h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line line-clamp-3">
                    {selectedQuotation.customerName || "N/A"}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <h4 className="text-xs font-semibold text-purple-900 mb-1.5 flex items-center gap-1.5">
                    <User size={14} />
                    Consignee
                  </h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line line-clamp-3">
                    {selectedQuotation.consigneeName || "N/A"}
                  </p>
                </div>
              </div>

              {/* Shipment Details */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Package size={14} />
                  Shipment Details
                </h4>
                {selectedQuotation.quotationSegment && selectedQuotation.quotationSegment.toLowerCase().includes("air") ? (
                  // Air Shipment Details
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedQuotation.numberOfPackets && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Number of Packets</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.numberOfPackets}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.weight && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Gross Weight (kg)</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.weight}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.cargoSize && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Cargo Size</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.cargoSize}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.volumeWeight && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Volume Weight</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.volumeWeight}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.chargeableWeight && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Chargeable Weight</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.chargeableWeight}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.commodity && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Commodity</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.commodity}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Sea/Other Shipment Details
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedQuotation.equipment && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Equipment</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.equipment}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.weight && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Weight</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.weight}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.cbm && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">CBM</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.cbm}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.commodity && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Commodity</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.commodity}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.terms && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Terms</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.terms}
                        </p>
                      </div>
                    )}
                    {selectedQuotation.numberOfPackets && (
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Number of Packets</p>
                        <p className="text-xs font-medium text-gray-900">
                          {selectedQuotation.numberOfPackets}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Route Information */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Ship size={14} />
                  Route Information
                </h4>
                {selectedQuotation.quotationSegment && selectedQuotation.quotationSegment.toLowerCase().includes("air") ? (
                  // Air Route Information
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Airport of Departure</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.airPortOfDeparture || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Airport of Destination</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.airPortOfDestination || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Airlines</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.airLines || "N/A"}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Sea/Other Route Information
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">POR</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.por || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">POL</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.pol || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">POD</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.pod || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Final Dest.</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.finalDestination || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Shipping Line</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.shippingLine || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">ETD</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.etd || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Transit Time</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.transitTime || "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Charges Tables */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-900">Charges Breakdown</h4>
                
                {selectedQuotation.originCharges && selectedQuotation.originCharges.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-blue-600 text-white px-3 py-1.5">
                      <h5 className="text-xs font-semibold">Origin Charges</h5>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700">Description</th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700">Currency</th>
                          <th className="px-3 py-1.5 text-right font-medium text-gray-700">Amount</th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedQuotation.originCharges.map((charge, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-gray-900">{charge.charges || "N/A"}</td>
                            <td className="px-3 py-1.5 text-gray-700">{charge.currency || "USD"}</td>
                            <td className="px-3 py-1.5 text-right text-gray-900 font-medium">{charge.amount || "0"}</td>
                            <td className="px-3 py-1.5 text-gray-700">{charge.unit || "Per Shipment"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedQuotation.freightCharges && selectedQuotation.freightCharges.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-purple-600 text-white px-3 py-1.5">
                      <h5 className="text-xs font-semibold">Freight Charges</h5>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700">Description</th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700">Currency</th>
                          <th className="px-3 py-1.5 text-right font-medium text-gray-700">Amount</th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedQuotation.freightCharges.map((charge, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-gray-900">{charge.charges || "N/A"}</td>
                            <td className="px-3 py-1.5 text-gray-700">{charge.currency || "USD"}</td>
                            <td className="px-3 py-1.5 text-right text-gray-900 font-medium">{charge.amount || "0"}</td>
                            <td className="px-3 py-1.5 text-gray-700">{charge.unit || "Per Container"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedQuotation.destinationCharges && selectedQuotation.destinationCharges.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-green-600 text-white px-3 py-1.5">
                      <h5 className="text-xs font-semibold">Destination Charges</h5>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700">Description</th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700">Currency</th>
                          <th className="px-3 py-1.5 text-right font-medium text-gray-700">Amount</th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedQuotation.destinationCharges.map((charge, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-gray-900">{charge.charges || "N/A"}</td>
                            <td className="px-3 py-1.5 text-gray-700">{charge.currency || "USD"}</td>
                            <td className="px-3 py-1.5 text-right text-gray-900 font-medium">{charge.amount || "0"}</td>
                            <td className="px-3 py-1.5 text-gray-700">{charge.unit || "Per Shipment"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Remarks */}
              {selectedQuotation.remarks && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <h4 className="text-xs font-semibold text-yellow-900 mb-1">Remarks</h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line">
                    {selectedQuotation.remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-5 py-3 flex justify-end border-t rounded-b-xl">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedQuotation(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
