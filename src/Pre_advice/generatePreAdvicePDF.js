import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import OmTransLogo from "../assets/OmTrans_PDF.jpg";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const fmtAmt = (v) => {
  if (v === "" || v === null || v === undefined) return "-";
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString("en-IN");
};

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const hasVal = (v) => v && String(v).trim() !== "" && String(v).trim() !== "-";

/** Replace Unicode chars unsupported by jsPDF built-in fonts */
const sanitize = (v) => {
  if (!v) return v;
  return String(v).replace(/\u2192/g, "->").replace(/\u2190/g, "<-").replace(/\u2194/g, "<->");
};

/** Short container label for PDF sub-headers */
const shortContainerLabel = (ct) =>
  (ct || "")
    .replace(" Container", "")
    .replace("Standard", "Std")
    .replace("High Cube", "H.C")
    .replace("Reefer", "RF")
    .replace("Open Top", "OT")
    .replace("Flat Rack", "FR")
    .replace("Hazardous", "Haz")
    .trim();

/* ------------------------------------------------------------------ */
/*  Main generator                                                     */
/* ------------------------------------------------------------------ */
export const generatePreAdvicePDF = (formData) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const usable = pageW - 2 * margin;
  let y = 12;

  const addPageIfNeeded = (needed = 20) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 15;
    }
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
  doc.text("OmTrans Logistics Ltd.", pageW - margin, y + 4, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Simplifying Your Business", pageW - margin, y + 8, { align: "right" });

  y += 15;

  /* Compact header bar: Job No + Date */
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, usable, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Pre-Advice  |  Job No: ${formData.jobNo || "-"}`,
    pageW / 2,
    y + 6.5,
    { align: "center" },
  );
  y += 13;

  /* ---------- Section helper ---------- */
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

  /* ---------- Key-value pair row (wraps long text) ---------- */
  const kvRow = (pairs) => {
    // pairs = [[label, value], ...]
    const colW = usable / pairs.length;

    // Pre-calculate wrapped lines for each value to determine row height
    const maxValueW = colW - 4;
    const wrapped = pairs.map(([, value]) => {
      const text = sanitize(String(value || "-"));
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
      doc.text(label, x + 2, y + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(wrapped[i], x + 2, y + 7);
      doc.setFont("helvetica", "normal");
    });
    y += rowH;
  };

  /* ========== CUSTOMER DETAILS ========== */
  sectionTitle("Customer Details");
  kvRow([
    ["Customer Name", formData.customerName],
    ["Address", formData.customerAddress],
  ]);

  /* ========== CONSIGNEE DETAILS ========== */
  if (hasVal(formData.consigneeName) || hasVal(formData.consigneeAddress)) {
    sectionTitle("Consignee Details");
    kvRow([
      ["Consignee Name", formData.consigneeName],
      ["Address", formData.consigneeAddress],
    ]);
  }

  /* ========== SHIPMENT DETAILS ========== */
  sectionTitle("Shipment Details");
  kvRow([
    ["Job No", formData.jobNo],
    ["Shipping Line", formData.shippingLine],
    ["Booked By", formData.bookedBy],
  ]);
  kvRow([
    ["Commodity", formData.commodity],
    ["Cargo Weight", formData.cargoWeight],
    ["Equipment Size", formData.equipmentSize],
  ]);
  kvRow([
    ["T/T", formData.transitTime],
    ["Term", formData.term],
  ]);

  /* ========== ROUTE INFORMATION ========== */
  sectionTitle("Route Information");
  kvRow([
    ["POR", formData.por],
    ["POL", formData.pol],
    ["POD", formData.pod],
    ["Final Destination", formData.finalDestination],
  ]);

  /* ---------- Charge table helper ---------- */
  const hasRealChargeData = (charges) =>
    Array.isArray(charges) &&
    charges.some(
      (c) =>
        (c.charges && String(c.charges).trim() !== "") &&
        (Number(c.buyingAmount) > 0 || Number(c.sellingAmount) > 0),
    );

  const chargeTable = (title, charges) => {
    // Skip section entirely if no real data
    if (!hasRealChargeData(charges)) return;

    sectionTitle(title);
    addPageIfNeeded(20);

    const head = [["Charge", "Currency", "Buying Rate", "Selling Rate", "Unit"]];
    const body = (charges || [])
      .filter(
        (c) =>
          (c.charges && String(c.charges).trim() !== "") &&
          (Number(c.buyingAmount) > 0 || Number(c.sellingAmount) > 0),
      )
      .map((c) => [
        c.charges || "-",
        c.currency || "-",
        fmtAmt(c.buyingAmount),
        fmtAmt(c.sellingAmount),
        c.unit || "-",
      ]);

    if (body.length === 0) return;

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
      columnStyles: {
        0: { cellWidth: usable * 0.30 },
        1: { cellWidth: usable * 0.12, halign: "center" },
        2: { cellWidth: usable * 0.20, halign: "right" },
        3: { cellWidth: usable * 0.20, halign: "right" },
        4: { cellWidth: usable * 0.18, halign: "center" },
      },
    });
    y = doc.lastAutoTable.finalY + 4;
  };

  /* ---------- Multi-container charge table helper ---------- */
  const chargeTableMulti = (title, charges, equipmentSizes) => {
    if (!hasRealChargeData(charges)) return;

    // Group charges by container label suffix
    const groups = {};
    const common = [];
    (charges || []).forEach((c) => {
      const m = (c.charges || "").match(/\[([^\]]+)\]$/);
      if (m) {
        const lbl = m[1];
        if (!groups[lbl]) groups[lbl] = [];
        groups[lbl].push({ ...c, cleanName: c.charges.replace(/\s*\[[^\]]+\]$/, "").trim() });
      } else if (c.charges && String(c.charges).trim() !== "") {
        common.push(c);
      }
    });

    const orderedLabels = equipmentSizes?.length > 0
      ? [
          ...equipmentSizes.map(shortContainerLabel).filter((l) => groups[l]),
          ...Object.keys(groups).filter((l) => !equipmentSizes.map(shortContainerLabel).includes(l)),
        ]
      : Object.keys(groups);

    // Skip if nothing to show
    const hasAny = orderedLabels.some((l) => (groups[l] || []).some((r) => Number(r.buyingAmount) > 0 || Number(r.sellingAmount) > 0))
      || common.some((r) => Number(r.buyingAmount) > 0 || Number(r.sellingAmount) > 0);
    if (!hasAny) return;

    sectionTitle(title);

    const drawContainerSubTable = (ctLabel, rows) => {
      const filtered = rows.filter((r) => Number(r.buyingAmount) > 0 || Number(r.sellingAmount) > 0);
      if (filtered.length === 0) return;
      addPageIfNeeded(22);
      // Container sub-header
      doc.setFillColor(229, 231, 235);
      doc.rect(margin, y, usable, 6, "F");
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(ctLabel, pageW / 2, y + 4.3, { align: "center" });
      doc.setFont("helvetica", "normal");
      y += 7;
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Charge", "Currency", "Buying Rate", "Selling Rate", "Unit"]],
        body: filtered.map((c) => [
          c.cleanName || c.charges || "-",
          c.currency || "-",
          fmtAmt(c.buyingAmount),
          fmtAmt(c.sellingAmount),
          c.unit || "-",
        ]),
        styles: { fontSize: 7, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: usable * 0.30 },
          1: { cellWidth: usable * 0.12, halign: "center" },
          2: { cellWidth: usable * 0.20, halign: "right" },
          3: { cellWidth: usable * 0.20, halign: "right" },
          4: { cellWidth: usable * 0.18, halign: "center" },
        },
      });
      y = doc.lastAutoTable.finalY + 3;
    };

    orderedLabels.forEach((lbl) => drawContainerSubTable(lbl, groups[lbl] || []));

    if (common.length > 0) drawContainerSubTable("Common", common);

    y += 1;
  };

  /* ========== CHARGE SECTIONS ========== */
  const equipmentSizes = formData.equipmentSizes;
  const isMulti = equipmentSizes?.length > 1;
  if (isMulti) {
    chargeTableMulti("Origin Charges", formData.originCharges, equipmentSizes);
    chargeTableMulti("Freight Charges", formData.freightCharges, equipmentSizes);
    chargeTableMulti("Destination Charges", formData.destinationCharges, equipmentSizes);
  } else {
    chargeTable("Origin Charges", formData.originCharges);
    chargeTable("Freight Charges", formData.freightCharges);
    chargeTable("Destination Charges", formData.destinationCharges);
  }

  /* ========== DDP CHARGES (skip if both are 0) ========== */
  if (Number(formData.ddpBuying) > 0 || Number(formData.ddpSelling) > 0) {
    sectionTitle("DDP Charges");
    kvRow([
      ["DDP Charges B/R", fmtAmt(formData.ddpBuying)],
      ["DDP Charges S/R", fmtAmt(formData.ddpSelling)],
    ]);
  }

  /* ========== RATE TOTALS ========== */
  if (Number(formData.totalBuying) > 0 || Number(formData.totalSelling) > 0 || Number(formData.totalMargin) !== 0) {
    sectionTitle("Rate Totals");
    addPageIfNeeded(20);
    const totalsHead = [["", "Buying (B/R)", "Selling (S/R)", "Margin"]];
    const totalsBody = [[
      "Grand Total",
      fmtAmt(formData.totalBuying) || "0",
      fmtAmt(formData.totalSelling) || "0",
      fmtAmt(formData.totalMargin) || "0",
    ]];
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: totalsHead,
      body: totalsBody,
      styles: { fontSize: 8, cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: usable * 0.28, fontStyle: "bold", textColor: [55, 65, 81] },
        1: { cellWidth: usable * 0.24, halign: "right", textColor: [29, 78, 216] },
        2: { cellWidth: usable * 0.24, halign: "right", textColor: [5, 150, 105] },
        3: { cellWidth: usable * 0.24, halign: "right", textColor: Number(formData.totalMargin) >= 0 ? [5, 150, 105] : [220, 38, 38] },
      },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  /* ========== REMARKS ========== */
  if (hasVal(formData.remarks)) {
    sectionTitle("Remarks");
    addPageIfNeeded(15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const remarkLines = doc.splitTextToSize(
      formData.remarks,
      usable - 4,
    );
    doc.text(remarkLines, margin + 2, y);
    y += remarkLines.length * 4 + 4;
  }

  /* ========== SHIPPING LINE CONTACT ========== */
  if (hasVal(formData.slContactName) || hasVal(formData.slContactEmail) || hasVal(formData.slContactPhone) || hasVal(formData.slContactDesignation)) {
    sectionTitle("Shipping Line Contact");
    kvRow([
      ["Contact Name", formData.slContactName],
      ["Designation", formData.slContactDesignation],
      ["Phone", formData.slContactPhone],
      ["Email", formData.slContactEmail],
    ]);
  }

  /* ---------- Footer on every page ---------- */
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    // Footer line
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    // Footer text
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

  /* ---------- Save ---------- */
  const filename = `Pre-Advice_${formData.jobNo || "Draft"}_${today()}.pdf`;
  doc.save(filename);
};
