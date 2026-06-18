import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// The ACTUAL uploaded templates, bundled as assets. The generated output is
// the original template with only the user data filled into its cells —
// no custom layout is created.
import docxTemplateUrl from "./MAWB_TEMPLATE.docx?url";
import pdfTemplateUrl from "./MAWB_TEMPLATE.pdf?url";
import { formatDMY } from "./dateUtil";

const v = (x) => (x === undefined || x === null ? "" : String(x));

/* ------------------------------------------------------------------ */
/*  Special logic: HSN Code + Goods Dimension are appended into the    */
/*  single "Nature & quantity of goods" box of the template.           */
/* ------------------------------------------------------------------ */
export const buildNatureOfGoods = (d = {}) => {
  const lines = [];
  if (v(d.nature_of_goods).trim()) lines.push(v(d.nature_of_goods).trim());
  if (v(d.hsn_code).trim()) lines.push(`HSN Code: ${v(d.hsn_code).trim()}`);
  if (v(d.goods_dimension).trim()) lines.push(`Dimensions (in CM): ${v(d.goods_dimension).trim()}`);
  return lines.join("\n");
};

// Map a record to the docx template placeholders.
const toTemplateData = (d = {}) => ({
  shipper: v(d.shipper),
  consignee: v(d.consignee),
  notify: v(d.notify),
  from_routing: v(d.from_routing),
  to_routing: v(d.to_routing),
  freight: v(d.freight) || "PP",
  hawb_nos: v(d.hawb_nos),
  airport_of_destination: v(d.airport_of_destination),
  handling_information: v(d.handling_information),
  no_of_pcs: v(d.no_of_pcs),
  gross_weight: v(d.gross_weight),
  chargeable_weight: v(d.chargeable_weight),
  nature_combined: buildNatureOfGoods(d),
  date: formatDMY(d.date), // DD/MM/YYYY in document output
});

const fileRef = (d) => (v(d.hawb_nos) || "draft").replace(/[^\w-]+/g, "_");

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/* ============================ DOCX ============================ */
/*  True template injection: fills the original .docx, preserving      */
/*  every border, font, table and the exact layout.                    */
export const buildMawbDocxBlob = async (data) => {
  const buf = await fetch(docxTemplateUrl).then((r) => r.arrayBuffer());
  const zip = new PizZip(buf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true, // render \n in multi-line fields as Word line breaks
  });
  doc.render(toTemplateData(data));
  return doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
};

export const generateMawbWord = async (data) => {
  const blob = await buildMawbDocxBlob(data);
  triggerDownload(blob, `AWB-Instruction-${fileRef(data)}.docx`);
};

/* ============================ PDF ============================ */
/*  Overlays the user data onto the ORIGINAL blank PDF template at the  */
/*  exact cell coordinates, so the output is the real template + data.  */

// Field placement on the template PDF (page is 612 x 828 pt; coordinates
// are measured from the top-left of each target cell).
const PAGE_H = 828;
const FIELDS = [
  { key: "shipper", x: 52, y: 46, size: 8.5, maxWidth: 268, lineHeight: 10.5 },
  { key: "consignee", x: 52, y: 128, size: 8.5, maxWidth: 268, lineHeight: 10.5 },
  { key: "notify", x: 52, y: 213, size: 8.5, maxWidth: 268, lineHeight: 10.5 },
  { key: "freight", x: 380, y: 221, size: 9 },
  { key: "hawb_nos", x: 393, y: 232, size: 9, maxWidth: 150 },
  { key: "from_routing", x: 88, y: 323, size: 9, maxWidth: 230 },
  { key: "to_routing", x: 75, y: 355, size: 9, maxWidth: 50 },
  { key: "airport_of_destination", x: 52, y: 395, size: 8.5, maxWidth: 150 },
  // Date is placed ONLY in the bottom "Executed on ... Date:" field.
  { key: "date", x: 424, y: 718, size: 8.5, maxWidth: 78 },
  { key: "handling_information", x: 150, y: 416, size: 8.5, maxWidth: 430, lineHeight: 10.5 },
  { key: "no_of_pcs", x: 55, y: 475, size: 8.5, maxWidth: 42 },
  { key: "gross_weight", x: 102, y: 475, size: 8.5, maxWidth: 56 },
  { key: "chargeable_weight", x: 262, y: 475, size: 8.5, maxWidth: 54 },
  // Nature & quantity of goods — tight padding, wraps inside the cell.
  { key: "nature_combined", x: 440, y: 475, size: 8.5, maxWidth: 143, lineHeight: 9 },
];

// Word-wrap to maxWidth, AND hard-break any single token longer than the
// cell width so nothing ever spills past the cell border.
const wrapLine = (text, font, size, maxWidth) => {
  if (!maxWidth) return [String(text)];
  const lines = [];
  let cur = "";
  const fits = (s) => font.widthOfTextAtSize(s, size) <= maxWidth;

  for (let w of String(text).split(/\s+/)) {
    // Hard-break an over-long token into pieces that fit.
    while (w && !fits(w)) {
      let lo = 1, hi = w.length, fit = 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (fits(w.slice(0, mid))) { fit = mid; lo = mid + 1; } else hi = mid - 1;
      }
      if (cur) { lines.push(cur); cur = ""; }
      lines.push(w.slice(0, fit));
      w = w.slice(fit);
    }
    if (!w) continue;
    const trial = cur ? `${cur} ${w}` : w;
    if (!fits(trial) && cur) { lines.push(cur); cur = w; } else cur = trial;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
};

export const buildMawbPdfBytes = async (data) => {
  const values = { ...toTemplateData(data) };
  const buf = await fetch(pdfTemplateUrl).then((r) => r.arrayBuffer());
  const pdf = await PDFDocument.load(buf);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.getPages()[0];
  const color = rgb(0, 0, 0);

  for (const f of FIELDS) {
    const raw = v(values[f.key]).trim();
    if (!raw) continue;
    const lineHeight = f.lineHeight || f.size + 2;
    const paras = raw.split("\n");
    let row = 0;
    for (const para of paras) {
      const lines = wrapLine(para, font, f.size, f.maxWidth);
      for (const line of lines) {
        const yTop = f.y + row * lineHeight;
        page.drawText(line, {
          x: f.x,
          y: PAGE_H - yTop - f.size,
          size: f.size,
          font,
          color,
        });
        row += 1;
      }
    }
  }

  return pdf.save();
};

export const generateMawbPDF = async (data) => {
  const bytes = await buildMawbPdfBytes(data);
  triggerDownload(
    new Blob([bytes], { type: "application/pdf" }),
    `AWB-Instruction-${fileRef(data)}.pdf`
  );
};
