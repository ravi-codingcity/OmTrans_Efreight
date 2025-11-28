import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  LogOut,
  User,
  FileText,
  Package,
  LayoutDashboard,
} from "lucide-react";
import OmTransLogo from "../assets/OmTrans.png";

const Navbar = ({ currentUser, onLogout, onNavigate, currentView }) => {
  const [showQuotationMenu, setShowQuotationMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const quotationMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        quotationMenuRef.current &&
        !quotationMenuRef.current.contains(event.target)
      ) {
        setShowQuotationMenu(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleQuotationClick = (view) => {
    onNavigate(view);
    setShowQuotationMenu(false);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={OmTransLogo}
                alt="OmTrans Logo"
                className="h-10 w-auto"
              />
             
            </div>
          </div>

          {/* Center Section - Navigation Menu */}
          <div className="flex items-center gap-1">
            {/* Dashboard Menu */}
            <button
              onClick={() => onNavigate("dashboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                currentView === "dashboard"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>

            {/* Quotation Menu with Dropdown */}
            <div className="relative" ref={quotationMenuRef}>
              <button
                onClick={() => setShowQuotationMenu(!showQuotationMenu)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  currentView === "form"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FileText size={18} />
                <span>Quotation</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    showQuotationMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Quotation Dropdown */}
              {showQuotationMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 animate-slideDown">
                  <button
                    onClick={() => handleQuotationClick("form")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      currentView === "form"
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Create Quotation</div>
                      <div className="text-xs text-gray-500">
                        Generate new quotation
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Booking Menu */}
            <button
              onClick={() => onNavigate("booking")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                currentView === "booking"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Package size={18} />
              <span>Booking</span>
            </button>
          </div>

          {/* Right Section - User Profile & Logout */}
          <div className="flex items-center gap-3">
            {/* User Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 px-4 py-2 rounded-lg transition-all border border-blue-200"
              >
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-full">
                    <User size={16} className="text-white" />
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-sm font-semibold text-gray-900">
                      {currentUser?.fullName || currentUser?.username}
                    </div>
                    <div className="text-xs text-gray-600">
                      {currentUser?.role}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-600 transition-transform ${
                    showUserMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 animate-slideDown">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                        <User size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {currentUser?.fullName || currentUser?.username}
                        </div>
                        <div className="text-sm text-gray-600">
                          {currentUser?.role}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <div className="px-2 py-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Indicator */}
      <div className="lg:hidden bg-gray-50 border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Logged in as: {currentUser?.username}</span>
          <span className="font-medium text-blue-600">{currentUser?.role}</span>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
