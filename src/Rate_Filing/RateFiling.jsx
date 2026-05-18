import React, { useState } from "react";
import RateFilingNavbar from "./RateFilingNavbar";
import AddRates from "./AddRates";
import ViewRates from "./ViewRates";
import ExpiredRates from "./ExpiredRates";
import Destinations from "./Destinations";

const RateFiling = ({ currentUser, onBack, onCreateQuotation }) => {
  const [subView, setSubView] = useState("view"); // view | add | expired | destinations
  const [editingRate, setEditingRate] = useState(null);

  const handleEditRate = (rate) => {
    setEditingRate(rate);
    setSubView("add");
  };

  const handleCopyRate = (rate) => {
    // Strip _id, createdAt, updatedAt so AddRates treats it as a new entry
    const { _id, createdAt, updatedAt, __v, ...copied } = rate;
    copied.name = currentUser?.username || copied.name;
    setEditingRate(copied);
    setSubView("add");
  };

  const handleSaved = () => {
    setEditingRate(null);
    setSubView("view");
  };

  const handleSubNavigate = (view) => {
    if (view !== "add") setEditingRate(null);
    setSubView(view);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <RateFilingNavbar
        onBack={onBack}
        currentSubView={subView}
        onNavigate={handleSubNavigate}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {subView === "add" && (
          <AddRates
            currentUser={currentUser}
            editingRate={editingRate}
            onSaved={handleSaved}
          />
        )}
        {subView === "view" && (
          <ViewRates onEdit={handleEditRate} onCopy={handleCopyRate} onCreateQuotation={onCreateQuotation} />
        )}
        {subView === "expired" && <ExpiredRates onCopy={handleCopyRate} />}
        {subView === "destinations" && <Destinations />}
      </div>
    </div>
  );
};

export default RateFiling;
