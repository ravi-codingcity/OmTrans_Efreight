import React, { useState } from "react";
import { Plane, List, FilePlus2, FileText } from "lucide-react";
import MawbList from "./MawbList";
import MawbForm from "./MawbForm";
import MawbPreview from "./MawbPreview";
import HawbModule from "./hawb/HawbModule";

/* ------------------------------------------------------------------ */
/*  Import Module — container for the Import documentation workflows.  */
/*  Top-level switch between MAWB and HAWB; each is self-contained.    */
/*  Rendered by App.jsx only for Super Admin and Import-role users.    */
/* ------------------------------------------------------------------ */
const ImportModule = ({ currentUser }) => {
  // Top-level document type: "mawb" | "hawb"
  const [docType, setDocType] = useState("mawb");

  // ---- MAWB workflow state (unchanged) ----
  const [view, setView] = useState("list"); // "list" | "form"
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [listKey, setListKey] = useState(0);

  const goNew = () => {
    setEditing(null);
    setView("form");
  };
  const goEdit = (record) => {
    setEditing(record);
    setView("form");
  };
  const goList = () => {
    setEditing(null);
    setView("list");
    setListKey((k) => k + 1);
  };

  const docTabCls = (active, color) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
      active ? color : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50">
      {/* Document-type switcher */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 h-12">
            <span className="flex items-center gap-2 mr-3 text-gray-700 font-bold text-sm">
              <Plane size={16} /> Import
            </span>
            <button onClick={() => setDocType("mawb")} className={docTabCls(docType === "mawb", "bg-sky-100 text-sky-700")}>
              <FileText size={14} /> MAWB
            </button>
            <button onClick={() => setDocType("hawb")} className={docTabCls(docType === "hawb", "bg-violet-100 text-violet-700")}>
              <FileText size={14} /> HAWB
            </button>
          </div>
        </div>
      </div>

      {docType === "mawb" ? (
        <>
          {/* MAWB sub navbar */}
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-1 h-11">
                <button
                  onClick={goList}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    view === "list" ? "bg-sky-50 text-sky-700" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <List size={14} /> All Records
                </button>
                <button
                  onClick={goNew}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    view === "form" ? "bg-sky-50 text-sky-700" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <FilePlus2 size={14} /> New MAWB
                </button>
              </div>
            </div>
          </div>

          {/* MAWB content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {view === "list" && (
              <MawbList key={listKey} currentUser={currentUser} onNew={goNew} onEdit={goEdit} />
            )}
            {view === "form" && (
              <MawbForm
                currentUser={currentUser}
                initialData={editing}
                onBack={goList}
                onSaved={goList}
                onPreview={(d) => setPreview(d)}
              />
            )}
          </div>

          {preview && <MawbPreview data={preview} onClose={() => setPreview(null)} />}
        </>
      ) : (
        <HawbModule currentUser={currentUser} />
      )}
    </div>
  );
};

export default ImportModule;
