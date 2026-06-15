import React, { useState, useEffect } from "react";
import { X, FileDown, FileText, Loader2 } from "lucide-react";
import { buildHawbPdfBytes, generateHawbPDF } from "./generateHawbDocument";

/* HAWB preview modal — renders the ACTUAL generated PDF (real template
   populated with data) in an iframe, with PDF download. */
const HawbPreview = ({ data, onClose }) => {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl = null;
    (async () => {
      try {
        setBusy(true);
        const bytes = await buildHawbPdfBytes(data || {});
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-t-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText size={16} /> HAWB Document Preview
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => generateHawbPDF(data)} className="flex items-center gap-1.5 bg-white text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-violet-50">
              <FileDown size={14} /> Download PDF
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
            <iframe title="HAWB Preview" src={url} className="w-full h-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
};

export default HawbPreview;
