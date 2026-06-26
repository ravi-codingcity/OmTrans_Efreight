import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { renderDocx } from '../lib/docxRender.js';

/**
 * Document preview modal. Shows the document built from the ACTUAL HBL/MBL/ISF
 * template so the user can verify layout & data before downloading.
 *
 *  - When the server produced a faithful PDF (MS Word / LibreOffice), that PDF is
 *    shown in an iframe.
 *  - Otherwise the real generated DOCX is rendered in-browser (docx-preview),
 *    preserving the original tables, borders, fonts and page layout — never a
 *    custom HTML approximation.
 *
 * Props:
 *  - open        : boolean
 *  - title       : heading text
 *  - mode        : 'pdf' | 'docx'  (which source to display)
 *  - pdfUrl      : object URL of the server PDF (mode === 'pdf')
 *  - docxBlob    : DOCX Blob to render (mode === 'docx')
 *  - loading     : show a spinner while the document is being prepared
 *  - downloading : 'pdf' | 'docx' | null
 *  - onDownload  : (format) => void
 *  - onClose     : () => void
 */
export default function PreviewModal({ open, title, mode, pdfUrl, docxBlob, loading, downloading, onDownload, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState('');
  const docxRef = useRef(null);

  useEffect(() => setMounted(true), []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Render the real DOCX into the preview pane when in docx mode.
  useEffect(() => {
    if (!open || mode !== 'docx' || !docxBlob || !docxRef.current) return;
    let cancelled = false;
    setRendering(true);
    setRenderError('');
    renderDocx(docxRef.current, docxBlob)
      .catch((err) => { if (!cancelled) setRenderError(err?.message || 'Could not render preview'); })
      .finally(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; };
  }, [open, mode, docxBlob]);

  if (!open || !mounted) return null;

  const busy = loading || rendering;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 sm:p-6" onClick={onClose}>
      <div
        className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-brand-500" /> {title || 'Document Preview'}
          </h3>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onDownload?.('pdf')} disabled={busy || downloading} className="btn-primary text-sm">
              {downloading === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </button>
            <button onClick={() => onDownload?.('docx')} disabled={busy || downloading} className="btn-ghost text-sm">
              {downloading === 'docx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} DOCX
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-auto bg-slate-200">
          {busy && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100/80 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-sm">Generating preview from the template…</p>
            </div>
          )}
          {renderError && !busy && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-red-600">
              <p>Could not render the preview: {renderError}</p>
              <p className="text-slate-500">You can still download the DOCX or PDF.</p>
            </div>
          )}
          {mode === 'pdf' && pdfUrl ? (
            <iframe title="Document preview" src={pdfUrl} className="h-full w-full border-0" />
          ) : (
            <div className="flex min-h-full justify-center p-4">
              {/* docx-preview renders the real document here */}
              <div ref={docxRef} className="docx-preview-host" />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-400">
          Rendered from the official template — the downloaded PDF and DOCX match this layout exactly.
        </div>
      </div>
    </div>,
    document.body
  );
}
