import React from "react";
import {
  ArrowLeft,
  FilePlus,
  List,
  Clock,
  MapPin,
  DollarSign,
} from "lucide-react";

const RateFilingNavbar = ({ onBack, currentSubView, onNavigate }) => {
  const navItems = [
    { id: "view", label: "View Rates", icon: List },
    { id: "add", label: "Add Rates", icon: FilePlus },
    { id: "expired", label: "Expired Rates", icon: Clock },
   // { id: "destinations", label: "Destinations", icon: MapPin },
  ];

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Left - Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-700 transition-colors text-sm font-medium"
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
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    currentSubView === item.id
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
            <DollarSign size={14} />
            <span className="font-medium">Rate Filing Module</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateFilingNavbar;
