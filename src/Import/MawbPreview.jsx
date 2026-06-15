import React, { useState, useEffect } from "react";
import { X, FileDown, FileText, Loader2 } from "lucide-react";
import { buildMawbPdfBytes, generateMawbPDF, generateMawbWord } from "./generateMawbDocument";

/* ------------------------------------------------------------------ */
/*  MAWB preview modal — renders the ACTUAL generated PDF (the real    */
/*  template populated with data) in an iframe, with PDF/Word download.*/
/* ------------------------------------------------------------------ */
const MawbPreview = ({ data, onClose }) => {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl = null;
    (async () => {
      try {
        setBusy(true);
        const bytes = await buildMawbPdfBytes(data || {});
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        if (!revoked) setUrl(objectUrl);
      } catch (e) {
        if (!revoked) setErr(e.message || "Failed to render document");
      } finally {
        if (!revoked) setBusy(false);
      }
    })();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-sky-600 to-indigo-600 rounded-t-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText size={16} /> MAWB Document Preview
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => generateMawbPDF(data)} className="flex items-center gap-1.5 bg-white text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-sky-50">
              <FileDown size={14} /> PDF
            </button>
            <button onClick={() => generateMawbWord(data)} className="flex items-center gap-1.5 bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-white/25 border border-white/40">
              <FileDown size={14} /> Word
            </button>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-100">
          {busy ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <Loader2 size={22} className="animate-spin mr-2" /> Rendering document...
            </div>
          ) : err ? (
            <div className="h-full flex items-center justify-center text-red-500 text-sm px-6 text-center">{err}</div>
          ) : (
            <iframe title="MAWB Preview" src={url} className="w-full h-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MawbPreview;
