import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  FileText,
  Package,
  Ship,
  Eye,
  User,
  Calendar,
  X,
  Filter,
  MapPin,
  Pencil,
  Download,
  Mail,
  Edit3,
  Copy,
  ClipboardList,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import OmTransLogo from "../assets/omtrans_dp.jpg";
import OmTransLogo_for_PDF from "../assets/OmTrans_PDF.jpg";
import VikramImg from "../assets/vikram.jpg";
import TarunImg from "../assets/tarun.jpeg";
import HarmeetImg from "../assets/harmeet.jpg";

const API_BASE_URL = "https://papayawhip-antelope-424743.hostingersite.com/api";

// Cache for quotations data
export const quotationsCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 30000, // 30 seconds cache
};

// Function to invalidate cache (call this after saving/updating quotations)
export const invalidateQuotationsCache = () => {
  quotationsCache.data = null;
  quotationsCache.timestamp = null;
};

// Robust helper to check if a quotation is a draft
const isDraftQuotation = (quote) => {
  if (!quote) return false;
  return (
    quote.isDraft === true ||
    quote.isDraft === "true" ||
    quote.status === "draft"
  );
};

const fmtDate = (s) => {
  if (!s) return "";
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const [y, m, d] = parts;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[+m - 1] || ""} ${y}`;
};

const QuotationList = ({ currentUser, onEditDraft, onCopyQuotation, onCompareRates }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortControllerRef = useRef(null);

  const loggedInUser = useMemo(() => {
    if (currentUser) return currentUser;
    try {
      const storedUser = localStorage.getItem("currentUser");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }, [currentUser]);

  const isAdmin = useMemo(() => {
    if (!loggedInUser) return false;
    const username = (loggedInUser.username || "").toLowerCase();
    const role = (loggedInUser.role || "").toLowerCase();
    return username === "vikram" || role === "admin" || role === "super admin";
  }, [loggedInUser]);

  const getUserImage = (username) => {
    if (!username) return OmTransLogo;
    const name = username.toLowerCase().trim();
    if (name.includes("vikram")) return VikramImg;
    if (name.includes("tarun")) return TarunImg;
    if (name.includes("harmeet")) return HarmeetImg;
    return OmTransLogo;
  };

  // State for quotations and filtering
  const [quotations, setQuotations] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);



  // Filter states
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterYear, setFilterYear] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterToday, setFilterToday] = useState(false);
  const [filterOwnership, setFilterOwnership] = useState("all");

  const locations = ["Delhi", "Mumbai", "Pune", "Kolkata", "Chennai"];

  const getAvailableYears = () => {
    const years = quotations.map((q) => new Date(q.createdDate).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const loadStatistics = useCallback(
    (quotationsData = [], userInfo = null, adminStatus = false) => {
      // Statistics are now handled by Dashboard; this is kept for cache usage
    },
    [],
  );

  const loadQuotations = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();
      if (
        !forceRefresh &&
        quotationsCache.data &&
        quotationsCache.timestamp &&
        now - quotationsCache.timestamp < quotationsCache.CACHE_DURATION
      ) {
        setQuotations(quotationsCache.data);
        setIsLoading(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        if (quotationsCache.data) {
          setIsRefreshing(true);
        }

        const response = await fetch(`${API_BASE_URL}/quotations`, {
          signal: abortControllerRef.current.signal,
        });
        const data = await response.json();

        if (response.ok && data.success) {
          const quotationsData = data.data || [];
          quotationsCache.data = quotationsData;
          quotationsCache.timestamp = Date.now();
          setQuotations(quotationsData);
        } else {
          console.error("Failed to load quotations:", data.message);
          if (quotationsCache.data) {
            setQuotations(quotationsCache.data);
          } else {
            setQuotations([]);
          }
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Error fetching quotations:", error);
        if (quotationsCache.data) {
          setQuotations(quotationsCache.data);
        } else {
          setQuotations([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [loadStatistics],
  );

  useEffect(() => {
    if (quotationsCache.data) {
      setQuotations(quotationsCache.data);
      setIsLoading(false);
    }
    loadQuotations();

    const interval = setInterval(() => {
      loadQuotations(true);
    }, 30000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadQuotations]);

  const filteredQuotations = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    return quotations
      .filter((quote) => {
        if (filterToday) {
          const quoteDate = new Date(quote.createdDate).toISOString().split("T")[0];
          if (quoteDate !== todayStr) return false;
        }

        if (isDraftQuotation(quote)) {
          if (!loggedInUser) return false;
          const createdByLower = (quote.createdBy || "").toLowerCase();
          const usernameLower = (loggedInUser.username || "").toLowerCase();
          const fullNameLower = (loggedInUser.fullName || "").toLowerCase();
          const isMyDraft =
            createdByLower === usernameLower ||
            createdByLower === fullNameLower ||
            createdByLower.includes(usernameLower) ||
            createdByLower.includes(fullNameLower);
          if (!isMyDraft) return false;
        }

        const shouldFilterByOwnership = !isAdmin || filterOwnership === "my";
        if (shouldFilterByOwnership && loggedInUser) {
          const createdByLower = (quote.createdBy || "").toLowerCase();
          const usernameLower = (loggedInUser.username || "").toLowerCase();
          const fullNameLower = (loggedInUser.fullName || "").toLowerCase();
          const isMyQuotation =
            createdByLower === usernameLower ||
            createdByLower === fullNameLower ||
            createdByLower.includes(usernameLower) ||
            createdByLower.includes(fullNameLower);
          if (!isMyQuotation) return false;
        }

        if (filterLocation !== "All" && quote.createdByLocation !== filterLocation) return false;

        if (filterYear !== "All") {
          const quoteYear = new Date(quote.createdDate).getFullYear();
          if (quoteYear !== parseInt(filterYear)) return false;
        }

        if (filterMonth !== "All") {
          const quoteMonth = new Date(quote.createdDate).getMonth();
          const selectedMonthIndex = months.indexOf(filterMonth);
          if (quoteMonth !== selectedMonthIndex) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
  }, [
    quotations, filterLocation, filterYear, filterMonth, filterToday,
    filterOwnership, loggedInUser, isAdmin, months,
  ]);

  // View quotation details
  const viewDetails = (quotation) => {
    setSelectedQuotation(quotation);
    setShowDetailsModal(true);
  };

  // Generate and download PDF for a quotation (matches auto-generated PDF style)
  const generateQuotationPDF = (quotation) => {
    const doc = new jsPDF({ compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const usable = pageW - 2 * margin;
    let y = 12;

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
      v && String(v).trim() !== "" && String(v).trim() !== "-" && String(v).trim() !== "N/A";

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

    /* ---------- Header with Logo (compact) ---------- */
    try {
      doc.addImage(OmTransLogo_for_PDF, "JPEG", margin, y, 30, 11, "logo", "NONE");
    } catch (e) {
      doc.addImage(OmTransLogo_for_PDF, "JPEG", margin, y, 30, 11);
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("OmTrans Logistics Ltd.", pageW - margin, y + 4, { align: "right" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Simplifying Your Business", pageW - margin, y + 8, { align: "right" });

    y += 15;

    /* ---------- Compact Quotation Header Bar ---------- */
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y, usable, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Quotation No: ${quotation.id}  |  Segment: ${quotation.quotationSegment || "N/A"}  |  Date: ${new Date(quotation.createdDate).toLocaleDateString()}`,
      pageW / 2,
      y + 6.5,
      { align: "center" },
    );
    y += 13;

    /* ========== CUSTOMER & CONSIGNEE DETAILS (side by side) ========== */
    addPageIfNeeded(22);
    const halfW = usable / 2 - 2;

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, halfW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("CUSTOMER DETAILS", margin + 2, y + 5);

    doc.setFillColor(245, 245, 245);
    doc.rect(margin + halfW + 4, y, halfW, 7, "F");
    doc.text("CONSIGNEE DETAILS", margin + halfW + 6, y + 5);

    y += 9;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    const custLines = doc.splitTextToSize(sanitizeForPDF(quotation.customerName || "N/A"), halfW - 4);
    const consLines = doc.splitTextToSize(sanitizeForPDF(quotation.consigneeName || "N/A"), halfW - 4);
    doc.text(custLines, margin + 2, y + 1);
    doc.text(consLines, margin + halfW + 6, y + 1);
    y += Math.max(custLines.length, consLines.length) * 3.5 + 6;

    // Shipper details (full-width row, only if present)
    if (quotation.shipperName && quotation.shipperName.trim()) {
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
      const shipperLines = doc.splitTextToSize(sanitizeForPDF(quotation.shipperName), usable - 4);
      doc.text(shipperLines, margin + 2, y + 1);
      y += shipperLines.length * 3.5 + 6;
    }

    /* ========== SHIPMENT DETAILS ========== */
    sectionTitle("Shipment Details");

    const segment = (quotation.quotationSegment || "").toLowerCase();
    const isAir = segment.includes("air");
    const isServiceJob = segment === "service job";
    const isFCL = segment.includes("fcl");
    const isLCLOrBreakBulk = segment.includes("lcl") || segment.includes("break bulk");

    // Build ordered list of candidate fields per segment (only those with data are kept)
    let candidateFields = [];

    if (isServiceJob) {
      candidateFields = [
        ["Service Type", quotation.serviceJobType],
        ["Terms", quotation.terms],
        ["Commodity", quotation.commodity],
        ["Gross Weight (kg)", quotation.weight],
        ["Pickup Location", quotation.pickup_location],
        ["Rail Ramp", quotation.railRamp],
        ["Quotation Validity Date", fmtDate(quotation.ratesValidity)],
      ];
    } else if (isAir) {
      candidateFields = [
        ["No. of Packets", quotation.numberOfPackets],
        ["Gross Weight (kg)", quotation.weight],
        ["Cargo Size", (Array.isArray(quotation.cargoSizes) && quotation.cargoSizes.some(Boolean)) ? quotation.cargoSizes.filter(Boolean).join(", ") : (quotation.cargoSize || quotation.size)],
        ["Volume Weight", quotation.volumeWeight],
        ["Chargeable Weight (kg)", quotation.chargeableWeight],
        ["Commodity", quotation.commodity],
        ["Terms", quotation.terms],
        ["Airlines", quotation.airLines],
        ["Airport of Departure", quotation.airPortOfDeparture],
        ["Airport of Destination", quotation.airPortOfDestination],
        ["Transit Time", quotation.transitTime],
        ["Quotation Validity Date", fmtDate(quotation.ratesValidity)],
        ["Pickup Location", quotation.pickup_location],
        ["Rail Ramp", quotation.railRamp],
      ];
    } else if (isFCL) {
      // Build equipment display: prefer equipmentList summary, fall back to equipment string
      const equipDisplay =
        quotation.equipmentList && quotation.equipmentList.length > 0
          ? quotation.equipmentList
              .map((s) => `${s.type.replace(" Container", "")} ×${s.qty}`)
              .join(", ")
          : quotation.equipment;
      candidateFields = [
        ["Equipment", equipDisplay],
        ["Gross Weight (kg)", quotation.weight],
        ["Commodity", quotation.commodity],
        ["Terms", quotation.terms],
        ["POR", quotation.por],
        ["POL", quotation.pol],
        ["POD", quotation.pod],
        ["Final Destination", quotation.finalDestination],
        ["Shipping Line", quotation.shippingLine],
        ["Transit Time", quotation.transitTime],
        ["ETD", quotation.etd],
        ["ETA", quotation.eta],
        ["Quotation Validity Date", fmtDate(quotation.ratesValidity)],
        ["Pickup Location", quotation.pickup_location],
        ["Rail Ramp", quotation.railRamp],
      ];
    } else if (isLCLOrBreakBulk) {
      candidateFields = [
        ["No. of Packets", quotation.numberOfPackets],
        ["Gross Weight (kg)", quotation.weight],
        ["Cargo Size", (Array.isArray(quotation.cargoSizes) && quotation.cargoSizes.some(Boolean)) ? quotation.cargoSizes.filter(Boolean).join(", ") : (quotation.cargoSize || quotation.size)],
        ["CBM (m\u00B3)", quotation.cbm],
        ["Commodity", quotation.commodity],
        ["Terms", quotation.terms],
        ["POR", quotation.por],
        ["POL", quotation.pol],
        ["POD", quotation.pod],
        ["Final Destination", quotation.finalDestination],
        ["Shipping Line", quotation.shippingLine],
        ["Transit Time", quotation.transitTime],
        ["ETD", quotation.etd],
        ["ETA", quotation.eta],
        ["Quotation Validity Date", fmtDate(quotation.ratesValidity)],
        ["Pickup Location", quotation.pickup_location],
        ["Rail Ramp", quotation.railRamp],
      ];
    } else {
      candidateFields = [
        ["Equipment", quotation.equipment],
        ["Gross Weight (kg)", quotation.weight],
        ["No. of Packets", quotation.numberOfPackets],
        ["CBM (m\u00B3)", quotation.cbm],
        ["Cargo Size", (Array.isArray(quotation.cargoSizes) && quotation.cargoSizes.some(Boolean)) ? quotation.cargoSizes.filter(Boolean).join(", ") : (quotation.cargoSize || quotation.size)],
        ["Volume Weight", quotation.volumeWeight],
        ["Chargeable Weight (kg)", quotation.chargeableWeight],
        ["Commodity", quotation.commodity],
        ["Terms", quotation.terms],
        ["Service Type", quotation.serviceJobType],
        ["POR", quotation.por],
        ["POL", quotation.pol],
        ["POD", quotation.pod],
        ["Final Destination", quotation.finalDestination],
        ["Airport of Departure", quotation.airPortOfDeparture],
        ["Airport of Destination", quotation.airPortOfDestination],
        ["Shipping Line", quotation.shippingLine],
        ["Airlines", quotation.airLines],
        ["Transit Time", quotation.transitTime],
        ["ETD", quotation.etd],
        ["ETA", quotation.eta],
        ["Quotation Validity Date", fmtDate(quotation.ratesValidity)],
        ["Pickup Location", quotation.pickup_location],
        ["Rail Ramp", quotation.railRamp],
      ];
    }

    // Keep only fields with actual data, then pack into 2-column rows
    const validFields = candidateFields.filter(([, val]) => hasVal(val));
    const pdfBody = [];
    let currentRow = [];
    validFields.forEach(([label, value]) => {
      currentRow.push(label, sanitizeForPDF(String(value)));
      if (currentRow.length === 4) {
        pdfBody.push([...currentRow]);
        currentRow = [];
      }
    });
    if (currentRow.length > 0) {
      while (currentRow.length < 4) currentRow.push("");
      pdfBody.push(currentRow);
    }

    if (pdfBody.length > 0) {
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
    }

    /* ========== CHARGE TABLE HELPER ========== */
    // Determine if this quotation uses multi-container FCL layout
    const qEquipList =
      quotation.equipmentList && quotation.equipmentList.length > 1
        ? quotation.equipmentList
        : null;

    const chargeTable = (title, charges) => {
      const hasData = (c) =>
        c.charges ||
        c.amount ||
        (c.containerAmounts && Object.values(c.containerAmounts).some((v) => v));
      if (!charges || !charges.length || !charges.some(hasData)) return;
      const filteredCharges = charges.filter(hasData);
      if (filteredCharges.length === 0) return;

      sectionTitle(title);
      addPageIfNeeded(20);

      let head, body, columnStyles;

      if (qEquipList) {
        const cLabels = qEquipList.map(
          (s) => `${s.type.replace(" Container", "")} ×${s.qty}`,
        );
        head = [["Charge Description", "Currency", ...cLabels, "Unit"]];
        body = filteredCharges.map((c) => [
          sanitizeForPDF(c.charges || "-"),
          (c.currency || "USD").replace(/[^A-Za-z]/g, "").toUpperCase() || "USD",
          ...qEquipList.map(
            (s) => (c.containerAmounts && c.containerAmounts[s.type]) || "0",
          ),
          c.unit || "Per Shipment",
        ]);
        const descW = usable * 0.30;
        const currW = usable * 0.11;
        const unitW = usable * 0.12;
        const amtW = (usable - descW - currW - unitW) / qEquipList.length;
        columnStyles = {
          0: { cellWidth: descW },
          1: { cellWidth: currW, halign: "center" },
        };
        qEquipList.forEach((_, idx) => {
          columnStyles[idx + 2] = { cellWidth: amtW, halign: "right" };
        });
        columnStyles[qEquipList.length + 2] = {
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
          3: { cellWidth: usable * 0.20, halign: "center" },
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
    chargeTable("Origin Charges", quotation.originCharges);
    chargeTable("Freight Charges", quotation.freightCharges);
    chargeTable("Destination Charges", quotation.destinationCharges);

    /* ========== REMARKS ========== */
    if (hasVal(quotation.remarks)) {
      sectionTitle("Remarks");
      addPageIfNeeded(15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const remarksLines = doc.splitTextToSize(sanitizeForPDF(quotation.remarks), usable - 4);
      doc.text(remarksLines, margin + 2, y);
      y += remarksLines.length * 4 + 4;
    }

    /* ========== TERMS AND CONDITIONS ========== */
    if (quotation.termsAndConditions && quotation.termsAndConditions.length > 0) {
      sectionTitle("Terms and Conditions");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      quotation.termsAndConditions.forEach((term, index) => {
        addPageIfNeeded(8);
        const termText = `${index + 1}. ${sanitizeForPDF(term)}`;
        const termLines = doc.splitTextToSize(termText, usable - 4);
        doc.text(termLines, margin + 2, y);
        y += termLines.length * 3.5 + 1;
      });
    }

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
      doc.text("OmTrans Logistics Ltd. | Simplifying Your Business", margin, pageH - 7);
      doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 7, { align: "right" });
    }

    const pdfFileName = `${quotation.quotationSegment || "Quotation"} ${quotation.id}.pdf`;
    doc.save(pdfFileName);
  };

  // Send quotation via email
  const sendQuotationEmail = async (quotation) => {
    const segment = (quotation.quotationSegment || "").toLowerCase();
    const isAir = segment.includes("air");
    const isServiceJob = segment === "service job";
    const isFCL = segment.includes("fcl");
    const isLCLOrBreakBulk = segment.includes("lcl") || segment.includes("break bulk");

    const headerStyle = "background-color: #2563eb; color: white; padding: 8px 12px; font-weight: bold; font-size: 13px;";
    const cellStyle = "border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 12px;";
    const labelStyle = `${cellStyle} background-color: #f3f4f6; font-weight: 600; color: #374151; width: 140px;`;
    const valueStyle = `${cellStyle} color: #1f2937;`;
    const tableStyle = "border-collapse: collapse; width: 100%; margin-bottom: 16px; font-family: Arial, sans-serif;";

    const getShipmentRows = () => {
      const rows = [];
      const addRow = (label1, value1, label2, value2) => {
        const v1 = value1 || "N/A";
        const v2 = value2 || "N/A";
        if (v1 !== "N/A" || v2 !== "N/A") {
          rows.push(`<tr><td style="${labelStyle}">${label1}</td><td style="${valueStyle}">${v1}</td><td style="${labelStyle}">${label2}</td><td style="${valueStyle}">${v2}</td></tr>`);
        }
      };

      const addOptionalRow = (label1, value1, label2, value2) => {
        const v1 = value1 && value1.trim() ? value1.trim() : null;
        const v2 = value2 && value2.trim() ? value2.trim() : null;
        if (v1 && v2) {
          rows.push(`<tr><td style="${labelStyle}">${label1}</td><td style="${valueStyle}">${v1}</td><td style="${labelStyle}">${label2}</td><td style="${valueStyle}">${v2}</td></tr>`);
        } else if (v1) {
          rows.push(`<tr><td style="${labelStyle}">${label1}</td><td style="${valueStyle}" colspan="3">${v1}</td></tr>`);
        } else if (v2) {
          rows.push(`<tr><td style="${labelStyle}">${label2}</td><td style="${valueStyle}" colspan="3">${v2}</td></tr>`);
        }
      };

      if (isServiceJob) {
        addRow("Service Type", quotation.serviceJobType, "Terms", quotation.terms);
        addRow("Commodity", quotation.commodity, "Weight (kg)", quotation.weight);
        addOptionalRow("Rail Ramp", quotation.railRamp, "Pickup Location", quotation.pickup_location);
        addOptionalRow("Quotation Validity Date", fmtDate(quotation.ratesValidity), "", "");
      } else if (isAir) {
        addRow("Number of Packets", quotation.numberOfPackets, "Weight (kg)", quotation.weight);
        addRow("Cargo Size", (Array.isArray(quotation.cargoSizes) && quotation.cargoSizes.some(Boolean)) ? quotation.cargoSizes.filter(Boolean).join(", ") : (quotation.cargoSize || quotation.size), "CBM (m³)", quotation.cbm);
        addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
        addRow("Volume Weight (kg)", quotation.volumeWeight, "Chargeable Weight (kg)", quotation.chargeableWeight);
        addRow("Airport of Departure", quotation.airPortOfDeparture, "Airport of Destination", quotation.airPortOfDestination);
        addRow("Airlines", quotation.airLines, "Transit Time", quotation.transitTime);
        addOptionalRow("Rail Ramp", quotation.railRamp, "Pickup Location", quotation.pickup_location);
        addOptionalRow("Quotation Validity Date", fmtDate(quotation.ratesValidity), "", "");
      } else if (isFCL) {
        // Build equipment display with list or fallback to string
        const equipStr =
          quotation.equipmentList && quotation.equipmentList.length > 0
            ? quotation.equipmentList
                .map((s) => `${s.type.replace(" Container", "")} ×${s.qty}`)
                .join(", ")
            : quotation.equipment;
        addRow("Equipment", equipStr, "Weight (kg)", quotation.weight);
        addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
        addRow("POR", quotation.por, "POL", quotation.pol);
        addRow("POD", quotation.pod, "Final Destination", quotation.finalDestination);
        addOptionalRow("Rail Ramp", quotation.railRamp, "Pickup Location", quotation.pickup_location);
        addRow("Shipping Line", quotation.shippingLine, "Transit Time", quotation.transitTime);
        addRow("ETD", quotation.etd, "ETA", quotation.eta);
        addOptionalRow("Quotation Validity Date", fmtDate(quotation.ratesValidity), "", "");
      } else if (isLCLOrBreakBulk) {
        addRow("Number of Packets", quotation.numberOfPackets, "Weight (kg)", quotation.weight);
        addRow("Cargo Size", (Array.isArray(quotation.cargoSizes) && quotation.cargoSizes.some(Boolean)) ? quotation.cargoSizes.filter(Boolean).join(", ") : (quotation.cargoSize || quotation.size), "CBM (m³)", quotation.cbm);
        addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
        addRow("POR", quotation.por, "POL", quotation.pol);
        addRow("POD", quotation.pod, "Final Destination", quotation.finalDestination);
        addOptionalRow("Rail Ramp", quotation.railRamp, "Pickup Location", quotation.pickup_location);
        addRow("Shipping Line", quotation.shippingLine, "Transit Time", quotation.transitTime);
        addRow("ETD", quotation.etd, "ETA", quotation.eta);
        addOptionalRow("Quotation Validity Date", fmtDate(quotation.ratesValidity), "", "");
      } else {
        addRow("Equipment", quotation.equipment, "Weight (kg)", quotation.weight);
        addRow("Number of Packets", quotation.numberOfPackets, "CBM (m³)", quotation.cbm);
        addRow("Commodity", quotation.commodity, "Terms", quotation.terms);
        addRow("POR", quotation.por, "POL", quotation.pol);
        addRow("POD", quotation.pod, "Final Destination", quotation.finalDestination);
        addOptionalRow("Rail Ramp", quotation.railRamp, "Pickup Location", quotation.pickup_location);
        addRow("Shipping Line", quotation.shippingLine, "Transit Time", quotation.transitTime);
        addRow("ETD", quotation.etd, "ETA", quotation.eta);
        addOptionalRow("Quotation Validity Date", fmtDate(quotation.ratesValidity), "", "");
      }
      return rows.join("");
    };

    const emailEquipList =
      quotation.equipmentList && quotation.equipmentList.length > 1
        ? quotation.equipmentList
        : null;

    const getChargesTable = (title, charges, bgColor) => {
      const hasData = (c) =>
        c.charges ||
        c.amount ||
        (c.containerAmounts && Object.values(c.containerAmounts).some((v) => v));
      if (!charges || charges.length === 0 || !charges.some(hasData)) return "";
      const chargeHeaderStyle = `background-color: ${bgColor}; color: white; padding: 6px 10px; font-weight: bold; font-size: 12px; border: 1px solid ${bgColor};`;
      const filteredCharges = charges.filter(hasData);

      if (emailEquipList) {
        const colCount = emailEquipList.length + 3; // Charge + Currency + N×container + Unit
        const cHeaders = emailEquipList
          .map((s) => `<td style="${labelStyle}">${s.type.replace(" Container", "")} ×${s.qty}</td>`)
          .join("");
        let html = `<table style="${tableStyle}">`;
        html += `<tr><td colspan="${colCount}" style="${chargeHeaderStyle}">${title}</td></tr>`;
        html += `<tr style="background-color: #f9fafb;"><td style="${labelStyle}">Charge Description</td><td style="${labelStyle}">Currency</td>${cHeaders}<td style="${labelStyle}">Unit</td></tr>`;
        filteredCharges.forEach((charge) => {
          const amtCells = emailEquipList
            .map(
              (s) =>
                `<td style="${valueStyle}">${(charge.containerAmounts && charge.containerAmounts[s.type]) || "0"}</td>`,
            )
            .join("");
          html += `<tr><td style="${valueStyle}">${charge.charges || "N/A"}</td><td style="${valueStyle}">${charge.currency || "USD"}</td>${amtCells}<td style="${valueStyle}">${charge.unit || "Per Shipment"}</td></tr>`;
        });
        html += `</table>`;
        return html;
      }

      let html = `<table style="${tableStyle}">`;
      html += `<tr><td colspan="4" style="${chargeHeaderStyle}">${title}</td></tr>`;
      html += `<tr style="background-color: #f9fafb;"><td style="${labelStyle}">Charge Description</td><td style="${labelStyle}">Currency</td><td style="${labelStyle}">Amount</td><td style="${labelStyle}">Unit</td></tr>`;
      filteredCharges.forEach((charge) => {
        html += `<tr><td style="${valueStyle}">${charge.charges || "N/A"}</td><td style="${valueStyle}">${charge.currency || "USD"}</td><td style="${valueStyle}">${charge.amount || "0"}</td><td style="${valueStyle}">${charge.unit || "Per Shipment"}</td></tr>`;
      });
      html += `</table>`;
      return html;
    };

    let html = `<div style="font-family: Arial, sans-serif; max-width: 700px;">`;
    html += `<p style="margin: 0 0 16px 0; font-size: 14px;">Dear Sir/Madam,</p>`;
    html += `<p style="margin: 0 0 16px 0; font-size: 14px;">Please find quotation based on your RFQ.</p>`;
    html += `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Quotation No:</strong> ${quotation.id}</p>`;
    html += `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Segment:</strong> ${quotation.quotationSegment || "N/A"}</p>`;
    html += `<p style="margin: 0 0 16px 0; font-size: 14px;"><strong>Date:</strong> ${new Date(quotation.createdDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>`;
    html += `<table style="${tableStyle}">`;
    html += `<tr><td style="${labelStyle}">Customer</td><td style="${valueStyle}" colspan="3">${(quotation.customerName || "N/A").replace(/\n/g, "<br>")}</td></tr>`;
    if (quotation.shipperName && quotation.shipperName.trim()) {
      html += `<tr><td style="${labelStyle}">Shipper</td><td style="${valueStyle}" colspan="3">${quotation.shipperName.replace(/\n/g, "<br>")}</td></tr>`;
    }
    html += `<tr><td style="${labelStyle}">Consignee</td><td style="${valueStyle}" colspan="3">${(quotation.consigneeName || "N/A").replace(/\n/g, "<br>")}</td></tr>`;
    html += `</table>`;
    html += `<table style="${tableStyle}">`;
    html += `<tr><td colspan="4" style="${headerStyle}">SHIPMENT DETAILS</td></tr>`;
    html += getShipmentRows();
    html += `</table>`;
    html += getChargesTable("ORIGIN CHARGES", quotation.originCharges, "#2563eb");
    html += getChargesTable("FREIGHT CHARGES", quotation.freightCharges, "#7c3aed");
    html += getChargesTable("DESTINATION CHARGES", quotation.destinationCharges, "#059669");

    if (quotation.remarks) {
      html += `<table style="${tableStyle}">`;
      html += `<tr><td style="background-color: #fef3c7; padding: 8px 12px; font-weight: bold; font-size: 13px; border: 1px solid #fcd34d;">REMARKS</td></tr>`;
      html += `<tr><td style="${valueStyle}">${quotation.remarks.replace(/\n/g, "<br>")}</td></tr>`;
      html += `</table>`;
    }

    if (quotation.termsAndConditions && quotation.termsAndConditions.length > 0) {
      html += `<table style="${tableStyle}">`;
      html += `<tr><td style="background-color: #059669; color: white; padding: 8px 12px; font-weight: bold; font-size: 13px; border: 1px solid #059669;">TERMS & CONDITIONS</td></tr>`;
      html += `<tr><td style="${valueStyle}">`;
      html += `<ol style="margin: 8px 0; padding-left: 20px;">`;
      quotation.termsAndConditions.forEach((term) => {
        html += `<li style="margin-bottom: 6px; font-size: 12px;">${term}</li>`;
      });
      html += `</ol></td></tr></table>`;
    }

    try {
      const blob = new Blob([html], { type: "text/html" });
      const clipboardItem = new ClipboardItem({
        "text/html": blob,
        "text/plain": new Blob([`Quotation ${quotation.id} - Please see formatted content when pasted in email`], { type: "text/plain" }),
      });
      await navigator.clipboard.write([clipboardItem]);

      const subject = `Quotation ${quotation.id} - ${quotation.quotationSegment || "Quote"}`;
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}`;
      setTimeout(() => {
        window.location.href = mailtoLink;
      }, 300);
    } catch (err) {
      console.error("Failed to prepare email:", err);
      const subject = `Quotation ${quotation.id} - ${quotation.quotationSegment || "Quote"}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}`;
      alert(`Please paste quotation details manually in the email body.`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Status Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 mr-4">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Filters:</span>
            </div>

            {/* Location Filter */}
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="All">All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>{location}</option>
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
                <option key={year} value={year}>{year}</option>
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
                <option key={month} value={month}>{month}</option>
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

            <div className="flex-1"></div>

            {/* Ownership Filter */}
            {isAdmin ? (
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
                <label className={`flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer transition-colors ${filterOwnership === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                  <input type="radio" name="ownership" value="all" checked={filterOwnership === "all"} onChange={(e) => setFilterOwnership(e.target.value)} className="sr-only" />
                  <span className="font-medium">All Quotations</span>
                </label>
                <label className={`flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer transition-colors ${filterOwnership === "my" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                  <input type="radio" name="ownership" value="my" checked={filterOwnership === "my"} onChange={(e) => setFilterOwnership(e.target.value)} className="sr-only" />
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
                    <th className="px-2 py-2 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Quotation No.</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Created By</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Segment</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Customer</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Route</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Created Date</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Action</th>
                    {(!isAdmin || filterOwnership === "my") && (
                      <th className="px-2 py-2 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Edit</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={!isAdmin || filterOwnership === "my" ? 8 : 7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Package className="text-gray-300" size={48} />
                          <p className="text-gray-500 text-lg">No quotations found</p>
                          <p className="text-gray-400 text-sm">
                            {filterStatus === "All" ? "No quotations have been created yet" : `No quotations with "${filterStatus}" status`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((quote) => (
                      <tr
                        key={quote.id}
                        className={`transition-colors divide-x divide-gray-200 ${isDraftQuotation(quote) ? "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-400" : "hover:bg-blue-50"}`}
                      >
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <FileText className="text-blue-600" size={16} />
                            <span className="font-semibold text-gray-900 text-xs">{quote.id}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <img src={getUserImage(quote.createdBy)} alt={quote.createdBy} className="w-8 h-8 rounded-full object-cover border-[1px] border-black" />
                            <div>
                              <div className="font-medium text-gray-900 text-xs">{quote.createdBy}</div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">{quote.createdByLocation || "N/A"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <span className="inline-flex items-center rounded-full text-xs font-medium text-indigo-800">{quote.quotationSegment || "N/A"}</span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="text-xs font-medium text-gray-900">
                            {quote.customerName ? quote.customerName.split("\n")[0].substring(0, 20) + (quote.customerName.length > 20 ? "..." : "") : "N/A"}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="text-xs">
                            {quote.quotationSegment && quote.quotationSegment.toLowerCase().includes("air") ? (
                              <>
                                <div className="font-medium text-gray-900">{quote.airPortOfDeparture ? quote.airPortOfDeparture.substring(0, 20) + (quote.airPortOfDeparture.length > 20 ? "..." : "") : "N/A"}</div>
                                <div className="text-gray-500 flex items-center gap-1"><span>→</span> {quote.airPortOfDestination ? quote.airPortOfDestination.substring(0, 20) + (quote.airPortOfDestination.length > 20 ? "..." : "") : "N/A"}</div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium text-gray-900">{quote.pol || "N/A"}</div>
                                <div className="text-gray-500 flex items-center gap-1"><span>→</span> {quote.pod || "N/A"}</div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Calendar size={14} />
                            {new Date(quote.createdDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            {isDraftQuotation(quote) ? (
                              onEditDraft && (
                                <button
                                  onClick={() => onEditDraft(quote)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all font-semibold text-xs border-2 border-teal-300 shadow-sm"
                                  title="Edit & Submit Draft"
                                >
                                  <Edit3 size={14} />
                                  <span>Edit & Submit</span>
                                </button>
                              )
                            ) : (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => viewDetails(quote)} className="flex items-center gap-1 px-2 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all font-medium text-xs border border-blue-200" title="View Details">
                                    <Eye size={14} /><span>View</span>
                                  </button>
                                  <button onClick={() => generateQuotationPDF(quote)} className="flex items-center gap-1 px-2 py-1 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-all font-medium text-xs border border-green-200" title="Download PDF">
                                    <Download size={14} /><span>PDF</span>
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => sendQuotationEmail(quote)} className="flex items-center gap-1 px-2 py-1 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all font-medium text-xs border border-purple-200" title="Click & Paste on Mail">
                                    <Mail size={14} /><span>Mail</span>
                                  </button>
                                  {onCopyQuotation && (isAdmin || (() => {
                                    const createdByLower = (quote.createdBy || "").toLowerCase();
                                    const usernameLower = (currentUser?.username || "").toLowerCase();
                                    const fullNameLower = (currentUser?.fullName || "").toLowerCase();
                                    return createdByLower === usernameLower || createdByLower === fullNameLower || createdByLower.includes(usernameLower) || createdByLower.includes(fullNameLower);
                                  })()) && (
                                    <button onClick={() => onCopyQuotation(quote)} className="flex items-center gap-1 px-2 py-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all font-medium text-xs border border-indigo-200" title="Copy Quotation">
                                      <Copy size={14} /><span>Copy</span>
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {onCompareRates && (
                                    <button onClick={() => onCompareRates(quote)} className="flex items-center gap-1 px-2 py-1 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all font-medium text-xs border border-teal-300" title="Create Pre-Advice">
                                      <ClipboardList size={14} /><span>Create Pre-Advice</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        {(!isAdmin || filterOwnership === "my") && (
                          <td className="px-2 py-2">
                            {isDraftQuotation(quote) ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-200 text-yellow-900 border border-yellow-400 shadow-sm animate-pulse">
                                ⏳ Draft
                              </span>
                            ) : (
                              <button
                                onClick={() => onEditDraft(quote)}
                                className="flex items-center gap-1 px-2 py-1 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all font-medium text-xs border border-orange-200"
                                title="Edit Quotation"
                              >
                                <Pencil size={14} /><span>Edit</span>
                              </button>
                            )}
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
      </div>

      {/* Quotation Details Modal */}
      {showDetailsModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Quotation Details</h3>
                  <p className="text-xs text-blue-100 mt-0.5">{selectedQuotation.id}</p>
                </div>
                <button onClick={() => { setShowDetailsModal(false); setSelectedQuotation(null); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Close">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5 max-h-[calc(90vh-120px)] overflow-y-auto space-y-4">
              {/* Segment and Status */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-600 p-1 rounded-full"><User className="text-white" size={15} /></div>
                  <div>
                    <p className="text-xs text-gray-600">Created By</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedQuotation.createdBy} <span className="text-xs text-gray-600">({selectedQuotation.createdByRole})</span></p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin size={12} className="text-blue-600" />
                      <p className="text-xs text-gray-600">{selectedQuotation.createdByLocation || "N/A"}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{new Date(selectedQuotation.createdDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                {selectedQuotation.quotationSegment && (
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Quotation Segment</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">{selectedQuotation.quotationSegment}</span>
                  </div>
                )}
              </div>

              {/* Customer, Shipper & Consignee Information */}
              <div className={`grid gap-3 ${selectedQuotation.shipperName ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <h4 className="text-xs font-semibold text-blue-900 mb-1.5 flex items-center gap-1.5"><User size={14} />Customer</h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line line-clamp-3 font-medium">{selectedQuotation.customerName || "N/A"}</p>
                </div>
                {selectedQuotation.shipperName && (
                  <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                    <h4 className="text-xs font-semibold text-teal-900 mb-1.5 flex items-center gap-1.5"><User size={14} />Shipper</h4>
                    <p className="text-xs text-gray-700 whitespace-pre-line line-clamp-3 font-medium">{selectedQuotation.shipperName}</p>
                  </div>
                )}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <h4 className="text-xs font-semibold text-purple-900 mb-1.5 flex items-center gap-1.5"><User size={14} />Consignee</h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line line-clamp-3 font-medium">{selectedQuotation.consigneeName || "N/A"}</p>
                </div>
              </div>

              {/* Shipment Details */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5"><Package size={14} />Shipment Details</h4>
                {selectedQuotation.quotationSegment && selectedQuotation.quotationSegment.toLowerCase().includes("air") ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedQuotation.numberOfPackets && (<div><p className="text-xs text-gray-600 mb-0.5">Number of Packets</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.numberOfPackets}</p></div>)}
                    {selectedQuotation.weight && (<div><p className="text-xs text-gray-600 mb-0.5">Gross Weight (kg)</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.weight}</p></div>)}
                    {((Array.isArray(selectedQuotation.cargoSizes) && selectedQuotation.cargoSizes.some(Boolean)) || selectedQuotation.cargoSize) && (<div><p className="text-xs text-gray-600 mb-0.5">Cargo Size</p><p className="text-xs font-medium text-gray-900">{(Array.isArray(selectedQuotation.cargoSizes) && selectedQuotation.cargoSizes.some(Boolean)) ? selectedQuotation.cargoSizes.filter(Boolean).join(", ") : selectedQuotation.cargoSize}</p></div>)}
                    {selectedQuotation.volumeWeight && (<div><p className="text-xs text-gray-600 mb-0.5">Volume Weight (kg)</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.volumeWeight}</p></div>)}
                    {selectedQuotation.chargeableWeight && (<div><p className="text-xs text-gray-600 mb-0.5">Chargeable Weight (kg)</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.chargeableWeight}</p></div>)}
                    {selectedQuotation.commodity && (<div><p className="text-xs text-gray-600 mb-0.5">Commodity</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.commodity}</p></div>)}
                    {selectedQuotation.commodity && (<div><p className="text-xs text-gray-600 mb-0.5">Terms</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.terms}</p></div>)}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {(selectedQuotation.equipmentList && selectedQuotation.equipmentList.length > 0) ? (
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600 mb-0.5">Equipment</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedQuotation.equipmentList.map((sel) => (
                            <span key={sel.type} className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full border border-blue-200">
                              {sel.type.replace(" Container", "")} &times;{sel.qty}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      selectedQuotation.equipment && (<div><p className="text-xs text-gray-600 mb-0.5">Equipment</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.equipment}</p></div>)
                    )}
                    {selectedQuotation.weight && (<div><p className="text-xs text-gray-600 mb-0.5">Weight (kg)</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.weight}</p></div>)}
                    {selectedQuotation.cbm && (<div><p className="text-xs text-gray-600 mb-0.5">CBM</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.cbm}</p></div>)}
                    {selectedQuotation.commodity && (<div><p className="text-xs text-gray-600 mb-0.5">Commodity</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.commodity}</p></div>)}
                    {selectedQuotation.terms && (<div><p className="text-xs text-gray-600 mb-0.5">Terms</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.terms}</p></div>)}
                    {selectedQuotation.numberOfPackets && (<div><p className="text-xs text-gray-600 mb-0.5">Number of Packets</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.numberOfPackets}</p></div>)}
                  </div>
                )}
              </div>

              {/* Route Information */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5"><Ship size={14} />Route Information</h4>
                {selectedQuotation.quotationSegment && selectedQuotation.quotationSegment.toLowerCase().includes("air") ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><p className="text-xs text-gray-600 mb-0.5">Airport of Departure</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.airPortOfDeparture || "N/A"}</p></div>
                    <div><p className="text-xs text-gray-600 mb-0.5">Airport of Destination</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.airPortOfDestination || "N/A"}</p></div>
                    <div><p className="text-xs text-gray-600 mb-0.5">Airlines</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.airLines || "N/A"}</p></div>
                    {selectedQuotation.railRamp && (<div><p className="text-xs text-gray-600 mb-0.5">Rail Ramp</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.railRamp}</p></div>)}
                    {selectedQuotation.pickup_location && (<div><p className="text-xs text-gray-600 mb-0.5">Pickup Location</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.pickup_location}</p></div>)}
                    {selectedQuotation.transitTime && (<div><p className="text-xs text-gray-600 mb-0.5">Transit Time</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.transitTime}</p></div>)}
                    {selectedQuotation.ratesValidity && (<div><p className="text-xs text-gray-600 mb-0.5">Quotation Validity Date</p><p className="text-xs font-medium text-gray-900">{fmtDate(selectedQuotation.ratesValidity)}</p></div>)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><p className="text-xs text-gray-600 mb-0.5">POR</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.por || "N/A"}</p></div>
                    <div><p className="text-xs text-gray-600 mb-0.5">POL</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.pol || "N/A"}</p></div>
                    <div><p className="text-xs text-gray-600 mb-0.5">POD</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.pod || "N/A"}</p></div>
                    <div><p className="text-xs text-gray-600 mb-0.5">Final Dest.</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.finalDestination || "N/A"}</p></div>
                    {selectedQuotation.railRamp && (<div><p className="text-xs text-gray-600 mb-0.5">Rail Ramp</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.railRamp}</p></div>)}
                    {selectedQuotation.pickup_location && (<div><p className="text-xs text-gray-600 mb-0.5">Pickup Location</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.pickup_location}</p></div>)}
                    <div><p className="text-xs text-gray-600 mb-0.5">Shipping Line</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.shippingLine || "N/A"}</p></div>
                    <div><p className="text-xs text-gray-600 mb-0.5">ETD</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.etd || "N/A"}</p></div>
                    <div><p className="text-xs text-gray-600 mb-0.5">Transit Time</p><p className="text-xs font-medium text-gray-900">{selectedQuotation.transitTime || "N/A"}</p></div>
                    {selectedQuotation.ratesValidity && (<div><p className="text-xs text-gray-600 mb-0.5">Quotation Validity Date</p><p className="text-xs font-medium text-gray-900">{fmtDate(selectedQuotation.ratesValidity)}</p></div>)}
                  </div>
                )}
              </div>

              {/* Charges Tables */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-900">Charges Breakdown</h4>

                {(() => {
                  // Compute multi-container layout for the modal once
                  const modalEquipList =
                    selectedQuotation.equipmentList &&
                    selectedQuotation.equipmentList.length > 1
                      ? selectedQuotation.equipmentList
                      : null;

                  const renderChargeTable = (charges, headerBg, title, defaultUnit) => {
                    if (!charges || charges.length === 0) return null;
                    return (
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
                        <div className={`${headerBg} text-white px-3 py-1.5`}>
                          <h5 className="text-xs font-semibold">{title}</h5>
                        </div>
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-1.5 text-left font-medium text-gray-700">Description</th>
                              <th className="px-3 py-1.5 text-left font-medium text-gray-700">Currency</th>
                              {modalEquipList ? (
                                modalEquipList.map((sel) => (
                                  <th key={sel.type} className="px-3 py-1.5 text-right font-medium text-gray-700 whitespace-nowrap">
                                    {sel.type.replace(" Container", "")} &times;{sel.qty}
                                  </th>
                                ))
                              ) : (
                                <th className="px-3 py-1.5 text-right font-medium text-gray-700">Amount</th>
                              )}
                              <th className="px-3 py-1.5 text-left font-medium text-gray-700">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {charges.map((charge, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-1.5 text-gray-900">{charge.charges || "N/A"}</td>
                                <td className="px-3 py-1.5 text-gray-700">{charge.currency || "USD"}</td>
                                {modalEquipList ? (
                                  modalEquipList.map((sel) => (
                                    <td key={sel.type} className="px-3 py-1.5 text-right text-gray-900 font-medium">
                                      {(charge.containerAmounts && charge.containerAmounts[sel.type]) || "0"}
                                    </td>
                                  ))
                                ) : (
                                  <td className="px-3 py-1.5 text-right text-gray-900 font-medium">{charge.amount || "0"}</td>
                                )}
                                <td className="px-3 py-1.5 text-gray-700">{charge.unit || defaultUnit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  };

                  return (
                    <>
                      {renderChargeTable(selectedQuotation.originCharges, "bg-blue-600", "Origin Charges", "Per Shipment")}
                      {renderChargeTable(selectedQuotation.freightCharges, "bg-purple-600", "Freight Charges", "Per Container")}
                      {renderChargeTable(selectedQuotation.destinationCharges, "bg-green-600", "Destination Charges", "Per Shipment")}
                    </>
                  );
                })()}
              </div>

              {/* Remarks */}
              {selectedQuotation.remarks && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <h4 className="text-xs font-semibold text-yellow-900 mb-1">Remarks</h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line">{selectedQuotation.remarks}</p>
                </div>
              )}

              {/* Terms and Conditions */}
              {selectedQuotation.termsAndConditions && selectedQuotation.termsAndConditions.length > 0 && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <h4 className="text-xs font-semibold text-green-900 mb-2">Terms & Conditions</h4>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {selectedQuotation.termsAndConditions.map((term, idx) => (
                      <li key={idx} className="flex items-start gap-2"><span className="text-green-600 font-medium">{idx + 1}.</span><span>{term}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-5 py-3 flex justify-end border-t rounded-b-xl">
              <button onClick={() => { setShowDetailsModal(false); setSelectedQuotation(null); }} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default QuotationList;
