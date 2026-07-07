import React, { useState } from "react";
import { ScanSearch, List } from "lucide-react";
import DocVerify from "./DocVerify";
import VerifyRecords from "./VerifyRecords";

/* ------------------------------------------------------------------ */
/*  Import → AI Verification module. Self-contained sub-navigation      */
/*  between running a new verification and browsing saved records.      */
/*  Rendered by ImportModule for Super Admin & Import-role users.       */
/* ------------------------------------------------------------------ */
const VerifyModule = ({ currentUser }) => {
  const [view, setView] = useState("new"); // "new" | "records"
  // Bumping the key remounts the records list so a freshly-saved report appears.
  const [recordsKey, setRecordsKey] = useState(0);

  const tabCls = (active) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      active ? "bg-teal-50 text-teal-700" : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="py-2">
      <div className="max-w-6xl mx-auto px-1 mb-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-2 py-1.5 w-fit">
          <button onClick={() => setView("new")} className={tabCls(view === "new")}>
            <ScanSearch size={14} /> New Verification
          </button>
          <button onClick={() => { setRecordsKey((k) => k + 1); setView("records"); }} className={tabCls(view === "records")}>
            <List size={14} /> Saved Records
          </button>
        </div>
      </div>

      {view === "new" ? (
        <DocVerify onSaved={() => { setRecordsKey((k) => k + 1); setView("records"); }} />
      ) : (
        <VerifyRecords key={recordsKey} currentUser={currentUser} />
      )}
    </div>
  );
};

export default VerifyModule;
