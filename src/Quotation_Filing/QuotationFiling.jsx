import React, { useState } from "react";
import {
  ArrowLeft,
  FilePlus,
  List,
  FileText,
} from "lucide-react";
import QuotationList from "./QuotationList";

const QuotationFiling = ({
  currentUser,
  onBack,
  onCreateQuotation,
  onEditDraft,
  onCopyQuotation,
  onCompareRates,
}) => {
  const [activeTab, setActiveTab] = useState("view"); // "view"

  const navItems = [
    { id: "view", label: "View Quotations", icon: List },
    { id: "create", label: "Create Quotation", icon: FilePlus },
  ];

  const handleNavigate = (id) => {
    if (id === "create") {
      if (onCreateQuotation) onCreateQuotation();
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Sub-Navigation Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Left - Back button */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} />
              <span>Back to Main</span>
            </button>

            {/* Center - Sub-navigation */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right - Module label */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText size={14} />
              <span className="font-medium">Quotation Module</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === "view" && (
          <QuotationList
            currentUser={currentUser}
            onEditDraft={onEditDraft}
            onCopyQuotation={onCopyQuotation}
            onCompareRates={onCompareRates}
          />
        )}
      </div>
    </div>
  );
};

export default QuotationFiling;
