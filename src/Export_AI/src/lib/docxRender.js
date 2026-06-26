// ------------------------------------------------------------------
//  Faithful client-side DOCX rendering & DOCX→PDF.
//  The server fills the OFFICIAL HBL/MBL/ISF .docx templates. To guarantee the
//  Preview and the downloaded PDF match that template *in every environment*
//  (even servers without MS Word / LibreOffice), we render the real generated
//  DOCX in the browser with `docx-preview` — the original document structure,
//  tables, borders, fonts and page layout — never a custom HTML approximation.
//  The PDF is produced from that same rendering, so Preview, PDF and DOCX are
//  visually identical; only the file format differs.
// ------------------------------------------------------------------
import { renderAsync } from 'docx-preview';

const RENDER_OPTIONS = {
  className: 'docx',
  inWrapper: true,
  ignoreWidth: false,
  ignoreHeight: false,
  ignoreFonts: false,
  breakPages: true,
  renderHeaders: true,
  renderFooters: true,
  experimental: true,
  useBase64URL: true,
};

/** Render a DOCX Blob/ArrayBuffer into `container`, preserving template layout. */
export async function renderDocx(container, data) {
  container.innerHTML = '';
  await renderAsync(data, container, null, RENDER_OPTIONS);
  return container;
}

/**
 * Convert a DOCX Blob to a PDF Blob by rendering the real document off-screen
 * and snapshotting each A4 page. The PDF therefore matches the template (and the
 * on-screen preview) exactly.
 */
export async function docxToPdfBlob(docxData) {
  const [{ jsPDF }, html2canvasMod] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const html2canvas = html2canvasMod.default || html2canvasMod;

  // Off-screen host sized to the rendered document.
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.background = '#ffffff';
  document.body.appendChild(host);

  try {
    await renderDocx(host, docxData);
    // docx-preview emits one element per page under the wrapper.
    let pages = Array.from(host.querySelectorAll('.docx-wrapper > section.docx'));
    if (pages.length === 0) pages = Array.from(host.querySelectorAll('section.docx'));
    if (pages.length === 0) pages = [host.firstElementChild || host];

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i += 1) {
      const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      const img = canvas.toDataURL('image/jpeg', 0.95);
      // Fit the page snapshot to A4 width, preserving aspect ratio.
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (i > 0) pdf.addPage();
      // If a single rendered page is taller than A4, scale it down to fit.
      const drawH = Math.min(imgH, pageH);
      const drawW = drawH === imgH ? imgW : (canvas.width * drawH) / canvas.height;
      pdf.addImage(img, 'JPEG', (pageW - drawW) / 2, 0, drawW, drawH);
    }
    return pdf.output('blob');
  } finally {
    document.body.removeChild(host);
  }
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
