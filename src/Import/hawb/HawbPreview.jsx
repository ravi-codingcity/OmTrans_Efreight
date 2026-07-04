import React, { useState, useEffect } from "react";
import { X, FileDown, FileText, Loader2, Check, Eye } from "lucide-react";
import { buildHawbPdfBytes, generateHawbPDF, HAWB_COPIES } from "./generateHawbDocument";

/* HAWB preview modal — renders the ACTUAL generated PDF (real template populated
   with data) in an iframe. Four copies are available; they are byte-for-byte
   identical except for the copy label drawn after "ORIGINAL" at the bottom.
   The user previews any copy and downloads each independently, with a clear
   indicator of which copies have already been downloaded. */
const HawbPreview = ({ data, onClose }) => {
  const [activeId, setActiveId] = useState(HAWB_COPIES[0].id);
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(null);
  const [downloaded, setDownloaded] = useState({}); // copyId -> true
  const [downloadingId, setDownloadingId] = useState(null);

  // Rebuild the preview whenever the selected copy (or data) changes.
  useEffect(() => {
    if (!data) return;
    let revoked = false;
    let objectUrl = null;
    (async () => {
      try {
        setBusy(true);
        setErr(null);
        const copy = HAWB_COPIES.find((c) => c.id === activeId);
        const bytes = await buildHawbPdfBytes(data, copy ? copy.suffix : "");
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
  }, [activeId, data]);

  const download = async (copy) => {
    setDownloadingId(copy.id);
    try {
      await generateHawbPDF(data, copy);
      setDownloaded((p) => ({ ...p, [copy.id]: true }));
    } catch (e) {
      alert(e.message || "PDF download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!data) return null;

  const doneCount = HAWB_COPIES.filter((c) => downloaded[c.id]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-t-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText size={16} /> HAWB Document Preview
            <span className="ml-1 text-[11px] font-medium text-white/80">({doneCount}/{HAWB_COPIES.length} copies downloaded)</span>
          </h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Copy toolbar — preview + independent download per copy */}
        <div className="border-b border-gray-200 bg-gray-50/80 px-3 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {HAWB_COPIES.map((copy) => {
              const isActive = activeId === copy.id;
              const isDone = !!downloaded[copy.id];
              return (
                <div
                  key={copy.id}
                  className={`rounded-lg border p-2 flex flex-col gap-1.5 ${isActive ? "border-violet-400 bg-white ring-1 ring-violet-200" : "border-gray-200 bg-white"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700">
                      ORIGINAL {copy.suffix}
                    </span>
                    {isDone && (
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        <Check size={10} /> Downloaded
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveId(copy.id)}
                      title={`Preview ${copy.name}`}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${isActive ? "bg-violet-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}
                    >
                      <Eye size={11} /> Preview
                    </button>
                    <button
                      onClick={() => download(copy)}
                      disabled={downloadingId === copy.id}
                      title={`Download ${copy.name}`}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold disabled:opacity-50 ${isDone ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                    >
                      {downloadingId === copy.id ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                      Download {copy.name}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview of the selected copy */}
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
