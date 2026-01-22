import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Pencil,
  Save,
  Download,
  Mail,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import OmTransLogo from "../assets/omtrans.jpg";
import OmTransLogo_for_PDF from "../assets/OmTrans_PDF.jpg";
import VikramImg from "../assets/vikram.jpg";
import TarunImg from "../assets/tarun.jpeg";
import HarmeetImg from "../assets/harmeet.jpg";

const API_BASE_URL = "https://omtransefreight-ss7idyoh.b4a.run/api";

// Cache for quotations data
const quotationsCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 30000, // 30 seconds cache
};

const Dashboard = ({ currentUser }) => {
  // Loading state for better UX
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortControllerRef = useRef(null);
  
  // Get logged-in user from props or localStorage
  const loggedInUser = useMemo(() => {
    if (currentUser) return currentUser;
    try {
      const storedUser = localStorage.getItem('currentUser');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }, [currentUser]);

  // Check if user is Admin (only Vikram has Admin access to view all quotations)
  const isAdmin = useMemo(() => {
    if (!loggedInUser) return false;
    const username = (loggedInUser.username || "").toLowerCase();
    const role = (loggedInUser.role || "").toLowerCase();
    return username === "vikram" || role === "admin";
  }, [loggedInUser]);
  
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
  
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQuotation, setEditQuotation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter states
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterYear, setFilterYear] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterToday, setFilterToday] = useState(false);
  const [filterOwnership, setFilterOwnership] = useState("all"); // "all" or "my"
  
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

  // Optimized loadStatistics with useCallback
  const loadStatistics = useCallback((quotationsData = [], userInfo = null, adminStatus = false) => {
    // Filter quotations based on user role
    let userQuotations = quotationsData;
    
    // Non-admin users only see their own quotations in stats
    if (!adminStatus && userInfo) {
      const usernameLower = (userInfo.username || "").toLowerCase();
      const fullNameLower = (userInfo.fullName || "").toLowerCase();
      
      userQuotations = quotationsData.filter(quote => {
        const createdByLower = (quote.createdBy || "").toLowerCase();
        return (
          createdByLower === usernameLower ||
          createdByLower === fullNameLower ||
          createdByLower.includes(usernameLower) ||
          createdByLower.includes(fullNameLower)
        );
      });
    }
    
    // Calculate statistics from filtered quotations data
    const totalQuotations = userQuotations.length;
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
  }, []);

  // Optimized loadQuotations with caching and abort controller
  const loadQuotations = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless force refresh)
    const now = Date.now();
    if (
      !forceRefresh &&
      quotationsCache.data &&
      quotationsCache.timestamp &&
      now - quotationsCache.timestamp < quotationsCache.CACHE_DURATION
    ) {
      setQuotations(quotationsCache.data);
      loadStatistics(quotationsCache.data);
      setIsLoading(false);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Set refreshing state (not loading for subsequent fetches)
      if (quotationsCache.data) {
        setIsRefreshing(true);
      }

      const response = await fetch(`${API_BASE_URL}/quotations`, {
        signal: abortControllerRef.current.signal,
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        const quotationsData = data.data || [];
        
        // Update cache
        quotationsCache.data = quotationsData;
        quotationsCache.timestamp = Date.now();
        
        setQuotations(quotationsData);
        loadStatistics(quotationsData);
      } else {
        console.error("Failed to load quotations:", data.message);
        // Use cached data if available
        if (quotationsCache.data) {
          setQuotations(quotationsCache.data);
          loadStatistics(quotationsCache.data);
        } else {
          setQuotations([]);
          loadStatistics([]);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      console.error("Error fetching quotations:", error);
      // Use cached data if available
      if (quotationsCache.data) {
        setQuotations(quotationsCache.data);
        loadStatistics(quotationsCache.data);
      } else {
        setQuotations([]);
        loadStatistics([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadStatistics]);

  // Load quotations on mount with preload from cache
  useEffect(() => {
    // Immediately show cached data if available
    if (quotationsCache.data) {
      setQuotations(quotationsCache.data);
      loadStatistics(quotationsCache.data);
      setIsLoading(false);
    }
    
    // Then fetch fresh data
    loadQuotations();
    
    // Set up interval to refresh data every 30 seconds (reduced from 5s)
    const interval = setInterval(() => {
      loadQuotations(true); // Force refresh on interval
    }, 30000);
    
    return () => {
      clearInterval(interval);
      // Cancel any pending request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadQuotations, loadStatistics]);

  // Recalculate statistics when user/admin status changes
  useEffect(() => {
    if (quotations.length > 0 || quotationsCache.data) {
      const dataToUse = quotations.length > 0 ? quotations : (quotationsCache.data || []);
      loadStatistics(dataToUse, loggedInUser, isAdmin);
    }
  }, [quotations, loggedInUser, isAdmin, loadStatistics]);

  // Handle card click to filter quotations
  const handleCardClick = (status) => {
    setFilterStatus(status);
  };

  // Memoized filtered quotations for better performance
  const filteredQuotations = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    return quotations
      .filter((quote) => {
        // Today filter
        if (filterToday) {
          const quoteDate = new Date(quote.createdDate).toISOString().split('T')[0];
          if (quoteDate !== todayStr) {
            return false;
          }
        }
        
        // Ownership filter - Non-admin users can only see their own quotations
        const shouldFilterByOwnership = !isAdmin || filterOwnership === "my";
        if (shouldFilterByOwnership && loggedInUser) {
          const createdByLower = (quote.createdBy || "").toLowerCase();
          const usernameLower = (loggedInUser.username || "").toLowerCase();
          const fullNameLower = (loggedInUser.fullName || "").toLowerCase();
          
          // Match if createdBy contains username or fullName (case-insensitive)
          const isMyQuotation = 
            createdByLower === usernameLower ||
            createdByLower === fullNameLower ||
            createdByLower.includes(usernameLower) ||
            createdByLower.includes(fullNameLower);
          
          if (!isMyQuotation) {
            return false;
          }
        }
        
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
  }, [quotations, filterLocation, filterYear, filterMonth, filterToday, filterOwnership, loggedInUser, isAdmin, months]);

  // View quotation details
  const viewDetails = (quotation) => {
    setSelectedQuotation(quotation);
    setShowDetailsModal(true);
  };

  // Handle edit quotation
  const handleEditQuotation = (quotation) => {
    console.log('Editing quotation:', quotation);
    console.log('Quotation id:', quotation.id);
    console.log('Quotation _id:', quotation._id);
    setEditQuotation({ ...quotation });
    setShowEditModal(true);
  };

  // Handle edit form field change
  const handleEditChange = (field, value) => {
    setEditQuotation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle charge change in edit form
  const handleEditChargeChange = (chargeType, index, field, value) => {
    setEditQuotation(prev => {
      const charges = [...(prev[chargeType] || [])];
      charges[index] = { ...charges[index], [field]: value };
      return { ...prev, [chargeType]: charges };
    });
  };

  // Save edited quotation
  const handleSaveQuotation = async () => {
    if (!editQuotation) return;
    
    setIsSaving(true);
    try {
      // The backend expects the quotation id (quotation number like "OMLFSE-202601-0001")
      // MongoDB _id might also work if available
      const quotationId = editQuotation.id;
      
      console.log('Saving quotation with ID:', quotationId);
      console.log('Edit quotation data:', editQuotation);
      
      // First try with the quotation id (quotation number)
      let response = await fetch(`${API_BASE_URL}/quotations/${encodeURIComponent(quotationId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editQuotation),
      });
      
      // If that fails and we have _id, try with MongoDB _id
      if (!response.ok && editQuotation._id && editQuotation._id !== quotationId) {
        console.log('Retrying with MongoDB _id:', editQuotation._id);
        response = await fetch(`${API_BASE_URL}/quotations/${editQuotation._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editQuotation),
        });
      }
      
      if (response.ok) {
        const updatedData = await response.json();
        const updatedQuotation = updatedData.data || editQuotation;
        
        // Update local state
        setQuotations(prev => 
          prev.map(q => (q._id === editQuotation._id || q.id === quotationId) ? { ...q, ...updatedQuotation } : q)
        );
        // Clear cache to force refresh
        quotationsCache.data = null;
        quotationsCache.timestamp = null;
        setShowEditModal(false);
        setEditQuotation(null);
        alert('Quotation updated successfully!');
      } else {
        const error = await response.json();
        console.error('Update failed:', error);
        alert(`Failed to update quotation: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating quotation:', error);
      alert('Failed to update quotation. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle term change in edit form
  const handleEditTermChange = (index, value) => {
    setEditQuotation(prev => {
      const terms = [...(prev.termsAndConditions || [])];
      terms[index] = value;
      return { ...prev, termsAndConditions: terms };
    });
  };

  // Remove term from edit form
  const handleRemoveEditTerm = (index) => {
    setEditQuotation(prev => {
      const terms = [...(prev.termsAndConditions || [])];
      terms.splice(index, 1);
      return { ...prev, termsAndConditions: terms };
    });
  };

  // Add new term in edit form
  const handleAddEditTerm = () => {
    setEditQuotation(prev => ({
      ...prev,
      termsAndConditions: [...(prev.termsAndConditions || []), '']
    }));
  };

  // Generate and download PDF for a quotation
  const generateQuotationPDF = (quotation) => {
    const doc = new jsPDF({ compress: true });
    let yPos = 15;

    // Add logo with correct aspect ratio and high quality
    try {
      // Using OmTransLogo_for_PDF with proper dimensions to maintain aspect ratio
      doc.addImage(OmTransLogo_for_PDF, "JPEG", 15, yPos, 45, 17, "logo", "NONE");
    } catch (e) {
        doc.addImage(OmTransLogo_for_PDF, "JPEG", 15, yPos, 45, 17);
    }

    // Company Info (top right)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("OmTrans Logistics Ltd.", 195, yPos + 5, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Simplifying Your Business", 195, yPos + 10, { align: "right" });
    doc.text(`Date: ${new Date(quotation.createdDate).toLocaleDateString()}`, 195, yPos + 15, { align: "right" });

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
    doc.text(`Quotation No: ${quotation.id}`, 105, yPos + 6, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Segment: ${quotation.quotationSegment || 'N/A'}`, 105, yPos + 12, { align: "center" });
   
    yPos += 24;
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

    yPos += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const customerLines = doc.splitTextToSize(quotation.customerName || "N/A", 80);
    doc.text(customerLines, 17, yPos);
    const consigneeLines = doc.splitTextToSize(quotation.consigneeName || "N/A", 80);
    doc.text(consigneeLines, 112, yPos);

    yPos += Math.max(customerLines.length, consigneeLines.length) * 4 + 8;

    // Shipment Details Table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("SHIPMENT DETAILS", 15, yPos);
    yPos += 2;

    const segment = (quotation.quotationSegment || "").toLowerCase();
    const isAir = segment.includes("air");
    const isServiceJob = segment === "service job";
    const isFCL = segment.includes("fcl");
    const isLCLOrBreakBulk = segment.includes("lcl") || segment.includes("break bulk");
    const pdfBody = [];

    // Helper to add a row - always shows field pair if at least one value exists
    const addRow = (label1, value1, label2, value2) => {
      const v1 = value1 || "N/A";
      const v2 = value2 || "N/A";
      if (v1 !== "N/A" || v2 !== "N/A") {
        pdfBody.push([label1, v1, label2, v2]);
      }
    };

    if (isServiceJob) {
      // Service Job - show service type and any available details
      addRow("Service Type", quotation.serviceJobType, "Terms", quotation.terms);
      addRow("Commodity", quotation.commodity, "Weight (kg)", quotation.weight);
    } else if (isAir) {
      // Air Export / Air Import
      addRow("Number of Packets", quotation.numberOfPackets, "Weight (kg)", quotation.weight);
      addRow("Cargo Size", quotation.cargoSize || quotation.size, "Volume Weight", quotation.volumeWeight);
      addRow("Chargeable Weight", quotation.chargeableWeight, "Commodity", quotation.commodity);
      addRow("Terms", quotation.terms, "Airlines", quotation.airLines);
      addRow("Airport of Departure", quotation.airPortOfDeparture, "Airport of Destination", quotation.airPortOfDestination);
    } else if (isFCL) {
      // Sea FCL (Import/Export)
      addRow("Equipment", quotation.equipment, "Weight (kg)", quotation.weight);
      addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
      addRow("POR", quotation.por, "POL", quotation.pol);
      addRow("POD", quotation.pod, "Final Destination", quotation.finalDestination);
      addRow("Shipping Line", quotation.shippingLine, "Transit Time", quotation.transitTime);
      addRow("ETD", quotation.etd, "ETA", quotation.eta);
    } else if (isLCLOrBreakBulk) {
      // Sea LCL or Break Bulk (Import/Export)
      addRow("Number of Packets", quotation.numberOfPackets, "Weight (kg)", quotation.weight);
      addRow("Cargo Size", quotation.cargoSize || quotation.size, "CBM (m³)", quotation.cbm);
      addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
      addRow("POR", quotation.por, "POL", quotation.pol);
      addRow("POD", quotation.pod, "Final Destination", quotation.finalDestination);
      addRow("Shipping Line", quotation.shippingLine, "Transit Time", quotation.transitTime);
      addRow("ETD", quotation.etd, "ETA", quotation.eta);
    } else {
      // Generic fallback - show all available fields
      addRow("Equipment", quotation.equipment, "Weight (kg)", quotation.weight);
      addRow("Number of Packets", quotation.numberOfPackets, "CBM (m³)", quotation.cbm);
      addRow("Cargo Size", quotation.cargoSize || quotation.size, "Volume Weight", quotation.volumeWeight);
      addRow("Chargeable Weight", quotation.chargeableWeight, "Commodity", quotation.commodity);
      addRow("Terms", quotation.terms, "Service Type", quotation.serviceJobType);
      addRow("POR", quotation.por, "POL", quotation.pol);
      addRow("POD", quotation.pod, "Final Destination", quotation.finalDestination);
      addRow("Airport of Departure", quotation.airPortOfDeparture, "Airport of Destination", quotation.airPortOfDestination);
      addRow("Shipping Line", quotation.shippingLine, "Airlines", quotation.airLines);
      addRow("Transit Time", quotation.transitTime, "", "");
      addRow("ETD", quotation.etd, "ETA", quotation.eta);
    }

    if (pdfBody.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["Field", "Details", "Field", "Details"]],
        body: pdfBody,
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 1: { cellWidth: 55 }, 2: { fontStyle: "bold", cellWidth: 35 }, 3: { cellWidth: 55 } },
        margin: { left: 15, right: 15 },
      });
      yPos = doc.lastAutoTable.finalY + 10;
    }

    // Origin Charges
    if (quotation.originCharges && quotation.originCharges.length > 0 && quotation.originCharges.some(c => c.charges || c.amount)) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("ORIGIN CHARGES", 15, yPos);
      yPos += 2;

      const originData = quotation.originCharges.filter(c => c.charges || c.amount).map(charge => [
        charge.charges || "N/A", charge.currency || "USD", charge.amount || "0", charge.unit || "Per Shipment"
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Charge Description", "Currency", "Amount", "Unit"]],
        body: originData,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 } },
        margin: { left: 15, right: 15 },
      });
      yPos = doc.lastAutoTable.finalY + 8;
    }

    // Freight Charges
    if (quotation.freightCharges && quotation.freightCharges.length > 0 && quotation.freightCharges.some(c => c.charges || c.amount)) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("FREIGHT CHARGES", 15, yPos);
      yPos += 2;

      const freightData = quotation.freightCharges.filter(c => c.charges || c.amount).map(charge => [
        charge.charges || "N/A", charge.currency || "USD", charge.amount || "0", charge.unit || "Per Container"
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Charge Description", "Currency", "Amount", "Unit"]],
        body: freightData,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 } },
        margin: { left: 15, right: 15 },
      });
      yPos = doc.lastAutoTable.finalY + 8;
    }

    // Destination Charges
    if (quotation.destinationCharges && quotation.destinationCharges.length > 0 && quotation.destinationCharges.some(c => c.charges || c.amount)) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("DESTINATION CHARGES", 15, yPos);
      yPos += 2;

      const destData = quotation.destinationCharges.filter(c => c.charges || c.amount).map(charge => [
        charge.charges || "N/A", charge.currency || "USD", charge.amount || "0", charge.unit || "Per Shipment"
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Charge Description", "Currency", "Amount", "Unit"]],
        body: destData,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 } },
        margin: { left: 15, right: 15 },
      });
      yPos = doc.lastAutoTable.finalY + 8;
    }

    // Check for new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Remarks
    if (quotation.remarks) {
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
      const remarksLines = doc.splitTextToSize(quotation.remarks, 175);
      doc.text(remarksLines, 17, yPos);
      yPos += remarksLines.length * 4 + 10;
    }

    // Check for new page for T&C
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    // Terms and Conditions
    if (quotation.termsAndConditions && quotation.termsAndConditions.length > 0) {
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

      const sanitizeForPDF = (text) => text.replace(/₹/g, "Rs.");

      quotation.termsAndConditions.forEach((term, index) => {
        if (yPos > 275) {
          doc.addPage();
          yPos = 20;
        }
        const termText = `${index + 1}. ${sanitizeForPDF(term)}`;
        const termLines = doc.splitTextToSize(termText, 175);
        doc.text(termLines, 17, yPos);
        yPos += termLines.length * 4 + 2;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(15, 285, 195, 285);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("OmTrans Logistics Ltd. | Simplifying Your Business", 15, 290);
      doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: "right" });
    }

    // Save PDF
    const pdfFileName = `${quotation.quotationSegment || 'Quotation'} ${quotation.id}.pdf`;
    doc.save(pdfFileName);
  };

  // Send quotation via email - copies HTML to clipboard and opens email client
  const sendQuotationEmail = async (quotation) => {
    const segment = (quotation.quotationSegment || "").toLowerCase();
    const isAir = segment.includes("air");
    const isServiceJob = segment === "service job";
    const isFCL = segment.includes("fcl");
    const isLCLOrBreakBulk = segment.includes("lcl") || segment.includes("break bulk");

    // Common styles for email compatibility (same as Copy to Email)
    const headerStyle = "background-color: #2563eb; color: white; padding: 8px 12px; font-weight: bold; font-size: 13px;";
    const cellStyle = "border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 12px;";
    const labelStyle = `${cellStyle} background-color: #f3f4f6; font-weight: 600; color: #374151; width: 140px;`;
    const valueStyle = `${cellStyle} color: #1f2937;`;
    const tableStyle = "border-collapse: collapse; width: 100%; margin-bottom: 16px; font-family: Arial, sans-serif;";

    // Build shipment details rows based on segment
    const getShipmentRows = () => {
      const rows = [];
      const addRow = (label1, value1, label2, value2) => {
        const v1 = value1 || "N/A";
        const v2 = value2 || "N/A";
        if (v1 !== "N/A" || v2 !== "N/A") {
          rows.push(`<tr><td style="${labelStyle}">${label1}</td><td style="${valueStyle}">${v1}</td><td style="${labelStyle}">${label2}</td><td style="${valueStyle}">${v2}</td></tr>`);
        }
      };
      
      // Helper to add optional field row only if value exists
      const addOptionalRow = (label, value) => {
        if (value && value.trim()) {
          rows.push(`<tr><td style="${labelStyle}">${label}</td><td style="${valueStyle}" colspan="3">${value}</td></tr>`);
        }
      };

      if (isServiceJob) {
        addRow("Service Type", quotation.serviceJobType, "Terms", quotation.terms);
        addRow("Commodity", quotation.commodity, "Weight (kg)", quotation.weight);
        addOptionalRow("Rail Ramp", quotation.railRamp);
      } else if (isAir) {
        addRow("Number of Packets", quotation.numberOfPackets, "Weight (kg)", quotation.weight);
        addRow("Cargo Size", quotation.cargoSize || quotation.size, "CBM (m³)", quotation.cbm);
        addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
        addRow("Volume Weight", quotation.volumeWeight, "Chargeable Weight", quotation.chargeableWeight);
        addRow("Airport of Departure", quotation.airPortOfDeparture, "Airport of Destination", quotation.airPortOfDestination);
        addRow("Airlines", quotation.airLines, "", "");
        addOptionalRow("Rail Ramp", quotation.railRamp);
      } else if (isFCL) {
        addRow("Equipment", quotation.equipment, "Weight (kg)", quotation.weight);
        addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
        addRow("POR", quotation.por, "POL", quotation.pol);
        addRow("POD", quotation.pod, "Final Destination", quotation.finalDestination);
        addOptionalRow("Rail Ramp", quotation.railRamp);
        addRow("Shipping Line", quotation.shippingLine, "Transit Time", quotation.transitTime);
        addRow("ETD", quotation.etd, "ETA", quotation.eta);
      } else if (isLCLOrBreakBulk) {
        addRow("Number of Packets", quotation.numberOfPackets, "Weight (kg)", quotation.weight);
        addRow("Cargo Size", quotation.cargoSize || quotation.size, "CBM (m³)", quotation.cbm);
        addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
        addRow("POR", quotation.por, "POL", quotation.pol);
        addRow("POD", quotation.pod, "Final Destination", quotation.finalDestination);
        addOptionalRow("Rail Ramp", quotation.railRamp);
        addRow("Shipping Line", quotation.shippingLine, "Transit Time", quotation.transitTime);
        addRow("ETD", quotation.etd, "ETA", quotation.eta);
      } else {
        addRow("Equipment", quotation.equipment, "Weight (kg)", quotation.weight);
        addRow("Number of Packets", quotation.numberOfPackets, "CBM (m³)", quotation.cbm);
        addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
        addRow("POR", quotation.por, "POL", quotation.pol);
        addRow("POD", quotation.pod, "Final Destination", quotation.finalDestination);
        addOptionalRow("Rail Ramp", quotation.railRamp);
        addRow("Shipping Line", quotation.shippingLine, "Transit Time", quotation.transitTime);
        addRow("ETD", quotation.etd, "ETA", quotation.eta);
      }
      return rows.join("");
    };

    // Build charges table HTML
    const getChargesTable = (title, charges, bgColor) => {
      if (!charges || charges.length === 0 || !charges.some(c => c.charges || c.amount)) return "";
      
      const chargeHeaderStyle = `background-color: ${bgColor}; color: white; padding: 6px 10px; font-weight: bold; font-size: 12px; border: 1px solid ${bgColor};`;
      const filteredCharges = charges.filter(c => c.charges || c.amount);
      
      let html = `<table style="${tableStyle}">`;
      html += `<tr><td colspan="4" style="${chargeHeaderStyle}">${title}</td></tr>`;
      html += `<tr style="background-color: #f9fafb;">
        <td style="${labelStyle}">Charge Description</td>
        <td style="${labelStyle}">Currency</td>
        <td style="${labelStyle}">Amount</td>
        <td style="${labelStyle}">Unit</td>
      </tr>`;
      
      filteredCharges.forEach(charge => {
        html += `<tr>
          <td style="${valueStyle}">${charge.charges || "N/A"}</td>
          <td style="${valueStyle}">${charge.currency || "USD"}</td>
          <td style="${valueStyle}">${charge.amount || "0"}</td>
          <td style="${valueStyle}">${charge.unit || "Per Shipment"}</td>
        </tr>`;
      });
      html += `</table>`;
      return html;
    };

    // Build complete HTML email body
    let html = `<div style="font-family: Arial, sans-serif; max-width: 700px;">`;
    html += `<p style="margin: 0 0 16px 0; font-size: 14px;">Dear Sir/Madam,</p>`;
    html += `<p style="margin: 0 0 16px 0; font-size: 14px;">Please find quotation based on your RFQ.</p>`;
    
    // Header info
    html += `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Quotation No:</strong> ${quotation.id}</p>`;
    html += `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Segment:</strong> ${quotation.quotationSegment || "N/A"}</p>`;
    html += `<p style="margin: 0 0 16px 0; font-size: 14px;"><strong>Date:</strong> ${new Date(quotation.createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>`;

    // Customer & Consignee
    html += `<table style="${tableStyle}">`;
    html += `<tr><td style="${labelStyle}">Customer</td><td style="${valueStyle}" colspan="3">${(quotation.customerName || "N/A").replace(/\n/g, "<br>")}</td></tr>`;
    html += `<tr><td style="${labelStyle}">Consignee</td><td style="${valueStyle}" colspan="3">${(quotation.consigneeName || "N/A").replace(/\n/g, "<br>")}</td></tr>`;
    html += `</table>`;

    // Shipment Details
    html += `<table style="${tableStyle}">`;
    html += `<tr><td colspan="4" style="${headerStyle}">SHIPMENT DETAILS</td></tr>`;
    html += getShipmentRows();
    html += `</table>`;

    // Charges
    html += getChargesTable("ORIGIN CHARGES", quotation.originCharges, "#2563eb");
    html += getChargesTable("FREIGHT CHARGES", quotation.freightCharges, "#7c3aed");
    html += getChargesTable("DESTINATION CHARGES", quotation.destinationCharges, "#059669");

    // Remarks
    if (quotation.remarks) {
      html += `<table style="${tableStyle}">`;
      html += `<tr><td style="background-color: #fef3c7; padding: 8px 12px; font-weight: bold; font-size: 13px; border: 1px solid #fcd34d;">REMARKS</td></tr>`;
      html += `<tr><td style="${valueStyle}">${quotation.remarks.replace(/\n/g, "<br>")}</td></tr>`;
      html += `</table>`;
    }

    // Terms and Conditions
    if (quotation.termsAndConditions && quotation.termsAndConditions.length > 0) {
      html += `<table style="${tableStyle}">`;
      html += `<tr><td style="background-color: #059669; color: white; padding: 8px 12px; font-weight: bold; font-size: 13px; border: 1px solid #059669;">TERMS & CONDITIONS</td></tr>`;
      html += `<tr><td style="${valueStyle}">`;
      html += `<ol style="margin: 8px 0; padding-left: 20px;">`;
      quotation.termsAndConditions.forEach((term) => {
        html += `<li style="margin-bottom: 6px; font-size: 12px;">${term}</li>`;
      });
      html += `</ol>`;
      html += `</td></tr>`;
      html += `</table>`;
    }

    try {
      // Copy HTML to clipboard (same as Copy to Email feature)
      const blob = new Blob([html], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({
        'text/html': blob,
        'text/plain': new Blob([`Quotation ${quotation.id} - Please see formatted content when pasted in email`], { type: 'text/plain' })
      });
      await navigator.clipboard.write([clipboardItem]);

      // Open email client with subject
      const subject = `Quotation ${quotation.id} - ${quotation.quotationSegment || 'Quote'}`;
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}`;
      
      // Small delay to ensure clipboard operation completes
      setTimeout(() => {
        window.location.href = mailtoLink;
        // Show instruction alert
      },300);

    } catch (err) {
      console.error('Failed to prepare email:', err);
      // Fallback - open email with basic subject
      const subject = `Quotation ${quotation.id} - ${quotation.quotationSegment || 'Quote'}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}`;
      alert(`Please paste quotation details manually in the email body.`);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="lg:w-5/6 sm:w-6/6 md:w-6/6 m-auto sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
              <BarChart3 className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard Overview
              </h1>
              <p className="text-sm text-gray-600">
                OmTrans Freight Management System
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-4">
          {/* Total Quotations Created */}
          <div 
            onClick={() => handleCardClick("All")}
            className={`bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer ${
              filterStatus === "All" ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Quotations Created
                </p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {stats.totalQuotations}
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  Import/Export quotations
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <FileText className="text-blue-600" size={20} />
              </div>
            </div>
          </div>
          {/* Business Not Converted */}
          <div 
            onClick={() => handleCardClick("Not Converted")}
            className={`bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer ${
              filterStatus === "Not Converted" ? "ring-2 ring-red-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Business Not Converted
                </p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {stats.businessNotConverted}
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  Lost opportunities
                </p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <XCircle className="text-red-600" size={20} />
              </div>
            </div>
          </div>

          {/* Jobs Created */}
          <div 
            onClick={() => handleCardClick("Job Created")}
            className={`bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer ${
              filterStatus === "Job Created" ? "ring-2 ring-green-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Jobs Created
                </p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {stats.jobsCreated}
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  Converted to jobs
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <Briefcase className="text-green-600" size={20} />
              </div>
            </div>
          </div>

          {/* Total Bookings */}
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500 hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Bookings Created
                </p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {stats.totalBookings}
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  Freight bookings
                </p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <Package className="text-purple-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-3">
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

            {/* Today Filter */}
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="checkbox"
                checked={filterToday}
                onChange={(e) => setFilterToday(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 font-medium">Today</span>
            </label>

            {/* Clear Filters Button */}
            {(filterLocation !== "All" || filterYear !== "All" || filterMonth !== "All" || filterToday) && (
              <button
                onClick={() => {
                  setFilterLocation("All");
                  setFilterYear("All");
                  setFilterMonth("All");
                  setFilterToday(false);
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <X size={14} />
                Clear
              </button>
            )}

            {/* Spacer to push ownership filter to right */}
            <div className="flex-1"></div>

            {/* Ownership Filter - Radio Buttons (Only visible for Admin) */}
            {isAdmin ? (
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
                <label
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                    filterOwnership === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ownership"
                    value="all"
                    checked={filterOwnership === "all"}
                    onChange={(e) => setFilterOwnership(e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-medium">All Quotations</span>
                </label>
                <label
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                    filterOwnership === "my"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ownership"
                    value="my"
                    checked={filterOwnership === "my"}
                    onChange={(e) => setFilterOwnership(e.target.value)}
                    className="sr-only"
                  />
                  <User size={14} />
                  <span className="font-medium">My Quotations</span>
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <User size={14} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700">My Quotations</span>
              </div>
            )}
          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText size={20} />
                  {filterStatus === "All" ? "All Quotations" : `${filterStatus} Quotations`}
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  {filteredQuotations.length} {filteredQuotations.length === 1 ? "quotation" : "quotations"} found
                </p>
              </div>
              {isRefreshing && (
                <div className="flex items-center gap-2 text-blue-100">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span className="text-sm">Refreshing...</span>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
              <p className="text-gray-500 text-lg">Loading quotations...</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="divide-x divide-gray-200">
                  <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">
                    Quotation No.
                  </th>
                 
                  <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">
                    Created By
                  </th>
                   <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">
                    Segment
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">
                    Action
                  </th>
                  {(!isAdmin || filterOwnership === "my") && (
                    <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">
                      Edit
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={(!isAdmin || filterOwnership === "my") ? 8 : 7} className="px-6 py-12 text-center">
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
                      className="hover:bg-blue-50 transition-colors divide-x divide-gray-200"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="text-blue-600" size={18} />
                          <span className="font-semibold text-gray-900 text-xs">
                            {quote.id}
                          </span>
                        </div>
                      </td>
                     
                      <td className="px-3 py-3">
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
                       <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-full text-xs font-medium text-indigo-800">
                          {quote.quotationSegment || "N/A"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-medium text-gray-900">
                          {quote.customerName
                            ? quote.customerName.split("\n")[0].substring(0, 20) +
                              (quote.customerName.length > 20 ? "..." : "")
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          {quote.quotationSegment && (quote.quotationSegment.toLowerCase().includes("air")) ? (
                            // Air Route
                            <>
                              <div className="font-medium text-gray-900">
                                {quote.airPortOfDeparture
                                  ? quote.airPortOfDeparture.substring(0, 20) +
                                    (quote.airPortOfDeparture.length > 20 ? "..." : "")
                                  : "N/A"}
                              </div>
                              <div className="text-gray-500 flex items-center gap-1">
                                <span>→</span> {quote.airPortOfDestination
                                  ? quote.airPortOfDestination.substring(0, 20) +
                                    (quote.airPortOfDestination.length > 20 ? "..." : "")
                                  : "N/A"}
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
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar size={16} />
                          {new Date(quote.createdDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewDetails(quote)}
                            className="flex items-center gap-1 px-2 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all font-medium text-sm border border-blue-200"
                            title="View Details"
                          >
                            <Eye size={15} />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => generateQuotationPDF(quote)}
                            className="flex items-center gap-1 px-2 py-1 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-all font-medium text-sm border border-green-200"
                            title="Download PDF"
                          >
                            <Download size={15} />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => sendQuotationEmail(quote)}
                            className="flex items-center gap-1 px-2 py-1 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all font-medium text-sm border border-purple-200"
                            title="Click & Paste on Mail"
                          >
                            <Mail size={15} />
                            <span>Mail</span>
                          </button>
                        </div>
                      </td>
                      {(!isAdmin || filterOwnership === "my") && (
                        <td className="px-3 py-3">
                          <button
                            onClick={() => handleEditQuotation(quote)}
                            className="flex items-center gap-1 px-2 py-1 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all font-medium text-sm border border-orange-200"
                            title="Edit Quotation"
                          >
                            <Pencil size={15} />
                            <span>Edit</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
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
                <div className="flex items-center gap-2">
                  <div className="bg-blue-600 p-1 rounded-full">
                    <User className="text-white" size={15} />
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
                  <p className="text-xs text-gray-700 whitespace-pre-line line-clamp-3 font-medium">
                    {selectedQuotation.customerName || "N/A"}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <h4 className="text-xs font-semibold text-purple-900 mb-1.5 flex items-center gap-1.5">
                    <User size={14} />
                    Consignee
                  </h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line line-clamp-3 font-medium">
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
                        <p className="text-xs text-gray-600 mb-0.5">Chargeable Weight (kg)</p>
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
                        <p className="text-xs text-gray-600 mb-0.5">Weight (kg)</p>
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
                    {selectedQuotation.railRamp && (
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Rail Ramp</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.railRamp}
                      </p>
                    </div>
                    )}
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
                    {selectedQuotation.railRamp && (
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Rail Ramp</p>
                      <p className="text-xs font-medium text-gray-900">
                        {selectedQuotation.railRamp}
                      </p>
                    </div>
                    )}
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

              {/* Terms and Conditions */}
              {selectedQuotation.termsAndConditions && selectedQuotation.termsAndConditions.length > 0 && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <h4 className="text-xs font-semibold text-green-900 mb-2">Terms & Conditions</h4>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {selectedQuotation.termsAndConditions.map((term, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 font-medium">{idx + 1}.</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
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

      {/* Edit Quotation Modal */}
      {showEditModal && editQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-3 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Pencil size={20} />
                    Edit Quotation
                  </h3>
                  <p className="text-xs text-orange-100 mt-0.5">
                    {editQuotation.id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditQuotation(null);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 max-h-[calc(90vh-180px)] overflow-y-auto space-y-4">
              {/* Customer & Consignee Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name & Address</label>
                  <textarea
                    value={editQuotation.customerName || ''}
                    onChange={(e) => handleEditChange('customerName', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Consignee Name & Address</label>
                  <textarea
                    value={editQuotation.consigneeName || ''}
                    onChange={(e) => handleEditChange('consigneeName', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {/* Shipment Details */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Shipment Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {editQuotation.quotationSegment && !editQuotation.quotationSegment.toLowerCase().includes("air") && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Equipment</label>
                        <select
                          value={editQuotation.equipment || ''}
                          onChange={(e) => handleEditChange('equipment', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                        >
                          <option value="">Select</option>
                          <option value="20ft Standard">20ft Standard</option>
                          <option value="20ft High Cube">20ft High Cube</option>
                          <option value="40ft Standard">40ft Standard</option>
                          <option value="40ft High Cube">40ft High Cube</option>
                          <option value="45ft High Cube">45ft High Cube</option>
                          <option value="20ft Reefer">20ft Reefer</option>
                          <option value="40ft Reefer">40ft Reefer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">CBM</label>
                        <input
                          type="text"
                          value={editQuotation.cbm || ''}
                          onChange={(e) => handleEditChange('cbm', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
                    <input
                      type="text"
                      value={editQuotation.weight || ''}
                      onChange={(e) => handleEditChange('weight', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Number of Packets</label>
                    <input
                      type="text"
                      value={editQuotation.numberOfPackets || ''}
                      onChange={(e) => handleEditChange('numberOfPackets', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Commodity</label>
                    <input
                      type="text"
                      value={editQuotation.commodity || ''}
                      onChange={(e) => handleEditChange('commodity', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Terms</label>
                    <select
                      value={editQuotation.terms || ''}
                      onChange={(e) => handleEditChange('terms', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
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
                  {editQuotation.quotationSegment && editQuotation.quotationSegment.toLowerCase().includes("air") && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Volume Weight</label>
                        <input
                          type="text"
                          value={editQuotation.volumeWeight || ''}
                          onChange={(e) => handleEditChange('volumeWeight', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Chargeable Weight</label>
                        <input
                          type="text"
                          value={editQuotation.chargeableWeight || ''}
                          onChange={(e) => handleEditChange('chargeableWeight', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Route Information */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Route Information</h4>
                {editQuotation.quotationSegment && editQuotation.quotationSegment.toLowerCase().includes("air") ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Airport of Departure</label>
                      <input
                        type="text"
                        value={editQuotation.airPortOfDeparture || ''}
                        onChange={(e) => handleEditChange('airPortOfDeparture', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Airport of Destination</label>
                      <input
                        type="text"
                        value={editQuotation.airPortOfDestination || ''}
                        onChange={(e) => handleEditChange('airPortOfDestination', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Airlines</label>
                      <input
                        type="text"
                        value={editQuotation.airLines || ''}
                        onChange={(e) => handleEditChange('airLines', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rail Ramp <span className="text-gray-400">(Optional)</span></label>
                      <input
                        type="text"
                        value={editQuotation.railRamp || ''}
                        onChange={(e) => handleEditChange('railRamp', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">POR</label>
                      <input
                        type="text"
                        value={editQuotation.por || ''}
                        onChange={(e) => handleEditChange('por', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">POL</label>
                      <input
                        type="text"
                        value={editQuotation.pol || ''}
                        onChange={(e) => handleEditChange('pol', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">POD</label>
                      <input
                        type="text"
                        value={editQuotation.pod || ''}
                        onChange={(e) => handleEditChange('pod', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Final Destination</label>
                      <input
                        type="text"
                        value={editQuotation.finalDestination || ''}
                        onChange={(e) => handleEditChange('finalDestination', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rail Ramp <span className="text-gray-400">(Optional)</span></label>
                      <input
                        type="text"
                        value={editQuotation.railRamp || ''}
                        onChange={(e) => handleEditChange('railRamp', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Shipping Line</label>
                      <input
                        type="text"
                        value={editQuotation.shippingLine || ''}
                        onChange={(e) => handleEditChange('shippingLine', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ETD</label>
                      <input
                        type="date"
                        value={editQuotation.etd || ''}
                        onChange={(e) => handleEditChange('etd', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ETA</label>
                      <input
                        type="date"
                        value={editQuotation.eta || ''}
                        onChange={(e) => handleEditChange('eta', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Transit Time</label>
                      <input
                        type="text"
                        value={editQuotation.transitTime || ''}
                        onChange={(e) => handleEditChange('transitTime', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Origin Charges */}
              {editQuotation.originCharges && editQuotation.originCharges.length > 0 && (
                <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                  <div className="bg-blue-600 text-white px-3 py-2">
                    <h5 className="text-sm font-semibold">Origin Charges</h5>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 w-24">Currency</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700 w-24">Amount</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 w-28">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editQuotation.originCharges.map((charge, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={charge.charges || ''}
                              onChange={(e) => handleEditChargeChange('originCharges', idx, 'charges', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={charge.currency || 'USD'}
                              onChange={(e) => handleEditChargeChange('originCharges', idx, 'currency', e.target.value)}
                              className="w-full px-1 py-1 border border-gray-200 rounded text-xs bg-white"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="INR">INR</option>
                              <option value="AED">AED</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={charge.amount || ''}
                              onChange={(e) => handleEditChargeChange('originCharges', idx, 'amount', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={charge.unit || 'Per Shipment'}
                              onChange={(e) => handleEditChargeChange('originCharges', idx, 'unit', e.target.value)}
                              className="w-full px-1 py-1 border border-gray-200 rounded text-xs bg-white"
                            >
                              <option value="Per BL">/BL</option>
                              <option value="Per PKG">/PKG</option>
                              <option value="Per HBL">/HBL</option>
                              <option value="Per Shipment">/Shipment</option>
                              <option value="Per Container">/Container</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Freight Charges */}
              {editQuotation.freightCharges && editQuotation.freightCharges.length > 0 && (
                <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                  <div className="bg-purple-600 text-white px-3 py-2">
                    <h5 className="text-sm font-semibold">Freight Charges</h5>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 w-24">Currency</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700 w-24">Amount</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 w-28">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editQuotation.freightCharges.map((charge, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={charge.charges || ''}
                              onChange={(e) => handleEditChargeChange('freightCharges', idx, 'charges', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={charge.currency || 'USD'}
                              onChange={(e) => handleEditChargeChange('freightCharges', idx, 'currency', e.target.value)}
                              className="w-full px-1 py-1 border border-gray-200 rounded text-xs bg-white"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="INR">INR</option>
                              <option value="AED">AED</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={charge.amount || ''}
                              onChange={(e) => handleEditChargeChange('freightCharges', idx, 'amount', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={charge.unit || 'Per Shipment'}
                              onChange={(e) => handleEditChargeChange('freightCharges', idx, 'unit', e.target.value)}
                              className="w-full px-1 py-1 border border-gray-200 rounded text-xs bg-white"
                            >
                              <option value="Per BL">/BL</option>
                              <option value="Per PKG">/PKG</option>
                              <option value="Per HBL">/HBL</option>
                              <option value="Per Shipment">/Shipment</option>
                              <option value="Per Container">/Container</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Destination Charges */}
              {editQuotation.destinationCharges && editQuotation.destinationCharges.length > 0 && (
                <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
                  <div className="bg-green-600 text-white px-3 py-2">
                    <h5 className="text-sm font-semibold">Destination Charges</h5>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 w-24">Currency</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700 w-24">Amount</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 w-28">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editQuotation.destinationCharges.map((charge, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={charge.charges || ''}
                              onChange={(e) => handleEditChargeChange('destinationCharges', idx, 'charges', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={charge.currency || 'USD'}
                              onChange={(e) => handleEditChargeChange('destinationCharges', idx, 'currency', e.target.value)}
                              className="w-full px-1 py-1 border border-gray-200 rounded text-xs bg-white"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="INR">INR</option>
                              <option value="AED">AED</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={charge.amount || ''}
                              onChange={(e) => handleEditChargeChange('destinationCharges', idx, 'amount', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={charge.unit || 'Per Shipment'}
                              onChange={(e) => handleEditChargeChange('destinationCharges', idx, 'unit', e.target.value)}
                              className="w-full px-1 py-1 border border-gray-200 rounded text-xs bg-white"
                            >
                              <option value="Per BL">/BL</option>
                              <option value="Per PKG">/PKG</option>
                              <option value="Per HBL">/HBL</option>
                              <option value="Per Shipment">/Shipment</option>
                              <option value="Per Container">/Container</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={editQuotation.remarks || ''}
                  onChange={(e) => handleEditChange('remarks', e.target.value)}
                  rows="2"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Terms and Conditions */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-green-900">Terms & Conditions</h4>
                  <button
                    type="button"
                    onClick={handleAddEditTerm}
                    className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                  >
                    + Add Term
                  </button>
                </div>
                {editQuotation.termsAndConditions && editQuotation.termsAndConditions.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editQuotation.termsAndConditions.map((term, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 font-medium text-xs mt-2 min-w-[20px]">{idx + 1}.</span>
                        <textarea
                          value={term}
                          onChange={(e) => handleEditTermChange(idx, e.target.value)}
                          rows="2"
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500 resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEditTerm(idx)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors mt-1"
                          title="Remove term"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No terms and conditions. Click "Add Term" to add one.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-5 py-3 flex justify-end gap-3 border-t rounded-b-xl">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditQuotation(null);
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuotation}
                disabled={isSaving}
                className={`px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
