import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// The ACTUAL uploaded HAWB template, bundled as an asset. The generated output
// is the original template PDF with only the user data overlaid onto it.
import pdfTemplateUrl from "./HAWB_TEMPLATE.pdf?url";
import { formatDMY } from "../dateUtil";

const v = (x) => (x === undefined || x === null ? "" : String(x));

// The HAWB template already pre-prints this boilerplate in the Handling
// Information box. We only overlay handling info when the user customizes it,
// so the default case is never duplicated.
const DEFAULT_HANDLING =
  "BOXES ADDED AND MKD.// ONE ENV CONTG DOCS ( H.AWB, MANIFEST, INVOICE, PACKING LIST ) ATTD WITH THE SHPT.";

/* ------------------------------------------------------------------ */
/*  Encoding safety                                                    */
/*  pdf-lib's standard fonts use WinAnsi, which cannot encode many     */
/*  Unicode characters (e.g. mathematical bold letters like U+1D412    */
/*  "퐒"/𝐒, emoji, CJK). We:                                           */
/*   1. NFKC-normalize (𝐒 -> S, fancy digits -> normal),              */
/*   2. map common typographic glyphs to ASCII,                        */
/*   3. drop anything still outside the WinAnsi-safe range,            */
/*  logging whatever was stripped for diagnostics. This guarantees     */
/*  document generation never crashes on user-entered characters.      */
/* ------------------------------------------------------------------ */
export const sanitizeForPdf = (input, fieldKey) => {
  if (input === undefined || input === null) return "";
  let s = String(input);
  try {
    s = s.normalize("NFKC");
  } catch {
    /* normalize is universally supported, but never let it break generation */
  }
  s = s
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "*")
    .replace(/ /g, " ")
    .replace(/−/g, "-");

  const out = [];
  let stripped = "";
  for (const ch of s) {
    if (ch === "\n" || ch === "\t") {
      out.push(ch);
      continue;
    }
    const cp = ch.codePointAt(0);
    // WinAnsi-safe printable range: ASCII (0x20-0x7E) + Latin-1 (0xA0-0xFF).
    if ((cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff)) {
      out.push(ch);
    } else {
      stripped += ch;
    }
  }
  if (stripped) {
    try {
      console.warn(
        `[HAWB] Removed unsupported character(s) ${JSON.stringify(stripped)}` +
          (fieldKey ? ` from "${fieldKey}"` : "")
      );
    } catch {
      /* ignore logging failures */
    }
  }
  return out.join("");
};

// Nature of Goods, Invoice No, Invoice Date, HSN Code, Dimension and Volume WT
// are combined into the single "Nature and Quantity of Goods (Incl. Dimensions
// or Value)" box, as grouped blocks separated by blank lines.
export const buildNatureOfGoods = (d = {}) => {
  const groups = [];
  if (v(d.nature_of_goods).trim()) groups.push(v(d.nature_of_goods).trim());
  const inv = [];
  if (v(d.invoice_no).trim()) inv.push(`INV. NO: ${v(d.invoice_no).trim()}`);
  if (v(d.invoice_date).trim()) inv.push(`DT. ${formatDMY(d.invoice_date)}`);
  if (inv.length) groups.push(inv.join("\n"));
  if (v(d.hsn_code).trim()) groups.push(`HSCODE: ${v(d.hsn_code).trim()}`);
  if (v(d.dimension).trim()) groups.push(`DIMS IN CMS:\n${v(d.dimension).trim()}`);
  if (v(d.volume_wt).trim()) groups.push(`VOLUME WT: ${v(d.volume_wt).trim()}`);
  const sb = [];
  if (v(d.shipping_bill_no).trim()) sb.push(`SHIPPING BILL NO: ${v(d.shipping_bill_no).trim()}`);
  if (v(d.shipping_bill_date).trim()) sb.push(`DATE: ${formatDMY(d.shipping_bill_date)}`);
  if (sb.length) groups.push(sb.join("\n"));
  return groups.join("\n\n");
};

const toTemplateData = (d = {}) => ({
  airport_of_departure: v(d.airport_of_departure),
  airport_of_destination: v(d.airport_of_destination),
  master_awb_number: v(d.master_awb_number),
  house_awb_number: v(d.house_awb_number),
  shipper: v(d.shipper),
  consignee: v(d.consignee),
  notify: v(d.notify),
  notify_party_2: v(d.notify_party_2),
  accounting_information: v(d.accounting_information),
  destination_agent_detail: v(d.destination_agent_detail),
  routing_airport_of_departure: v(d.routing_airport_of_departure),
  routing_to: v(d.routing_to),
  routing_airport_of_destination: v(d.routing_airport_of_destination),
  handling_information: v(d.handling_information),
  no_of_pieces: v(d.no_of_pieces),
  gross_weight: v(d.gross_weight),
  chargeable_weight: v(d.chargeable_weight),
  nature_combined: buildNatureOfGoods(d),
  dated: formatDMY(d.dated), // DD/MM/YYYY in document output
});

const fileRef = (d) => (v(d.house_awb_number) || "draft").replace(/[^\w-]+/g, "_");

// The template pre-prints the word "ORIGINAL" at the bottom (bbox x≈803-880,
// top y≈1736, Arial-Bold ~16). Each copy's distinct label is drawn immediately
// after it — this suffix is the ONLY difference between the four copies; every
// other pixel/field is identical.
const ORIGINAL_LABEL = { x: 888, y: 1736.3, size: 16 };

// The four HAWB copies. `suffix` is the text drawn after "ORIGINAL".
export const HAWB_COPIES = [
  { id: "consignee", suffix: "1 Consignee Copy", name: "Consignee Copy" },
  { id: "delivery", suffix: "2 Delivery Receipt", name: "Delivery Receipt" },
  { id: "extra", suffix: "3 Extra Copy", name: "Extra Copy" },
  { id: "shipper", suffix: "4 Shipper Copy", name: "Shipper Copy" },
];

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

/* Page is 1293.9 x 1830 pt. Coordinates are top-left of each target cell. */
const PAGE_H = 1830;
const FIELDS = [
  // Shipment information (top row)
  { key: "airport_of_departure", x: 78, y: 93, size: 13, maxWidth: 240 },
  { key: "airport_of_destination", x: 338, y: 92, size: 13, maxWidth: 180 },
  { key: "master_awb_number", x: 537, y: 92, size: 18, maxWidth: 200 },
  { key: "house_awb_number", x: 756, y: 92, size: 18, maxWidth: 200 },
  // Parties — the template splits Notify into "Notify Party 1" (box y≈447-507)
  // and "Notify Party 2" (box y≈508-574). Accounting Information sits in the
  // right column (x≈533-1202, y≈447-630).
  { key: "shipper", x: 78, y: 162, size: 13, maxWidth: 250, lineHeight: 14 },
  { key: "consignee", x: 78, y: 330, size: 13, maxWidth: 250, lineHeight: 14 },
  { key: "notify", x: 78, y: 452, size: 12, maxWidth: 250, lineHeight: 13 },
  { key: "notify_party_2", x: 78, y: 528, size: 12, maxWidth: 250, lineHeight: 13 },
  { key: "accounting_information", x: 542, y: 455, size: 12, maxWidth: 650, lineHeight: 14 },
  // Routing — left column stacks: Airport of Departure (addr of first carrier),
  // then "To" directly below it, then the routing-section Airport of Destination
  // (which sits just above the Handling Information row).
  { key: "routing_airport_of_departure", x: 78, y: 608, size: 13, maxWidth: 125 },
  { key: "routing_to", x: 78, y: 680, size: 13, maxWidth: 125 },
  { key: "routing_airport_of_destination", x: 78, y: 745, size: 13, maxWidth: 125 },
  // Shipment details
  { key: "no_of_pieces", x: 80, y: 960, size: 14, maxWidth: 70 },
  { key: "gross_weight", x: 168, y: 960, size: 14, maxWidth: 90 },
  { key: "chargeable_weight", x: 410, y: 960, size: 14, maxWidth: 80 },
  // Nature & quantity of goods (combined block)
  { key: "nature_combined", x: 815, y: 960, size: 14, maxWidth: 420, lineHeight: 16 },
  // Destination Agent Detail — narrow left-column cell (x≈73-276) directly below
  // its heading (heading y≈1138; value band y≈1153-1275).
  { key: "destination_agent_detail", x: 80, y: 1160, size: 10, maxWidth: 190, lineHeight: 12 },
  // Handling Information — only overlaid when the user customizes it
  // (the template already pre-prints the default boilerplate).
  { key: "handling_information", x: 78, y: 828, size: 11, maxWidth: 740, lineHeight: 13, skipIfEquals: DEFAULT_HANDLING },
  // Dated (bottom)
  { key: "dated", x: 805, y: 1595, size: 12, maxWidth: 250 },
];

// Word-wrap to maxWidth AND hard-break any over-long token, so nothing ever
// crosses the cell border.
const wrapLine = (text, font, size, maxWidth) => {
  if (!maxWidth) return [String(text)];
  const lines = [];
  let cur = "";
  const fits = (s) => font.widthOfTextAtSize(s, size) <= maxWidth;
  for (let w of String(text).split(/\s+/)) {
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

export const buildHawbPdfBytes = async (data, copySuffix = "") => {
  const values = toTemplateData(data);
  const buf = await fetch(pdfTemplateUrl).then((r) => r.arrayBuffer());
  const pdf = await PDFDocument.load(buf);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.getPages()[0];
  const color = rgb(0, 0, 0);

  for (const f of FIELDS) {
    // Sanitize before drawing so unsupported characters can never crash
    // PDF generation (root cause of the "WinAnsi cannot encode" error).
    const raw = sanitizeForPdf(values[f.key], f.key).trim();
    if (!raw) continue;
    // Skip fields whose value matches the template's pre-printed default
    // (e.g. unchanged Handling Information) to avoid duplicate text.
    if (f.skipIfEquals && raw === sanitizeForPdf(f.skipIfEquals).trim()) continue;
    const lineHeight = f.lineHeight || f.size + 2;
    let row = 0;
    for (const para of raw.split("\n")) {
      for (const line of wrapLine(para, font, f.size, f.maxWidth)) {
        try {
          page.drawText(line, {
            x: f.x,
            y: PAGE_H - (f.y + row * lineHeight) - f.size,
            size: f.size,
            font,
            color,
          });
        } catch (err) {
          // Last-resort guard: skip an un-drawable fragment rather than fail
          // the whole document, and log it for diagnosis.
          console.error(`[HAWB] Failed to draw text for "${f.key}":`, err && err.message, JSON.stringify(line));
        }
        row += 1;
      }
    }
  }

  // Freight type → PP/CC indicators + "AS AGREED" placements (optional).
  drawFreightOverlays(page, font, color, data.freight);

  // Copy label — the ONLY per-copy difference. Drawn right after the template's
  // pre-printed "ORIGINAL" word at the bottom. No other content is changed.
  const suffix = sanitizeForPdf(copySuffix, "copy_label").trim();
  if (suffix) {
    try {
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      page.drawText(suffix, {
        x: ORIGINAL_LABEL.x,
        y: PAGE_H - ORIGINAL_LABEL.y - ORIGINAL_LABEL.size,
        size: ORIGINAL_LABEL.size,
        font: bold,
        color,
      });
    } catch (err) {
      console.error("[HAWB] copy label draw failed:", err && err.message);
    }
  }

  return pdf.save();
};

// Map Freight selection onto the template's PP/CC fields and charges cells.
// Coordinates are top-left of each target cell on the 1293.9 x 1830 page.
const drawFreightOverlays = (page, font, color, freightRaw) => {
  const freight = v(freightRaw).trim().toLowerCase();
  if (freight !== "prepaid" && freight !== "collect") return;

  const draw = (text, x, yTop, size) => {
    try {
      page.drawText(text, { x, y: PAGE_H - yTop - size, size, font, color });
    } catch (err) {
      console.error("[HAWB] freight overlay draw failed:", err && err.message);
    }
  };

  if (freight === "prepaid") {
    // Both PP fields = "PP"; CC fields left blank.
    draw("PP", 629, 670, 11);
    draw("PP", 688, 670, 11);
    // "AS AGREED" on the left (Prepaid) side of Valuation Charges.
    draw("AS AGREED", 140, 1350, 10);
    // "AS AGREED" below Currency Conversion Rates.
    draw("AS AGREED", 135, 1625, 10);
  } else {
    // Both CC fields = "CC"; PP fields left blank.
    draw("CC", 657, 670, 11);
    draw("CC", 731, 670, 11);
    // "AS AGREED" on the right (Collect) side of Valuation Charges.
    draw("AS AGREED", 360, 1350, 10);
    // "AS AGREED" below CC Charges in Dest Currency.
    draw("AS AGREED", 340, 1625, 10);
  }
};

// Download a single HAWB copy. `copy` is one of HAWB_COPIES (or null for the
// plain document — kept for backward compatibility).
export const generateHawbPDF = async (data, copy = null) => {
  const bytes = await buildHawbPdfBytes(data, copy ? copy.suffix : "");
  const tag = copy ? `-${copy.id}` : "";
  triggerDownload(new Blob([bytes], { type: "application/pdf" }), `HAWB-${fileRef(data)}${tag}.pdf`);
};
