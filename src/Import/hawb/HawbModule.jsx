import React, { useState } from "react";
import { List, FilePlus2 } from "lucide-react";
import HawbList from "./HawbList";
import HawbForm from "./HawbForm";
import HawbPreview from "./HawbPreview";

/* ------------------------------------------------------------------ */
/*  HAWB Module — self-contained list ↔ form with preview overlay.    */
/*  Independent from the MAWB module.                                 */
/* ------------------------------------------------------------------ */
const HawbModule = ({ currentUser }) => {
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

  return (
    <div>
      {/* Sub navbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 h-11">
            <button
              onClick={goList}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "list" ? "bg-violet-50 text-violet-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <List size={14} /> All Records
            </button>
            <button
              onClick={goNew}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "form" ? "bg-violet-50 text-violet-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <FilePlus2 size={14} /> New HAWB
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {view === "list" && <HawbList key={listKey} currentUser={currentUser} onNew={goNew} onEdit={goEdit} />}
        {view === "form" && (
          <HawbForm currentUser={currentUser} initialData={editing} onBack={goList} onSaved={goList} onPreview={(d) => setPreview(d)} />
        )}
      </div>

      {preview && <HawbPreview data={preview} onClose={() => setPreview(null)} />}
    </div>
  );
};

export default HawbModule;
