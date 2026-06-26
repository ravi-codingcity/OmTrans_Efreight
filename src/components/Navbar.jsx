import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  LogOut,
  User,
  FileText,
  Package,
  LayoutDashboard,
  ClipboardList,
  DollarSign,
  Users,
  Activity,
  MapPin,
  Plane,
  Sparkles,
} from "lucide-react";
import OmTransLogo from "../assets/OmTrans.png";
import OmTransDP from "../assets/omtrans_dp.jpg";
import VikramImg from "../assets/vikram.jpg";
import TarunImg from "../assets/tarun.jpeg";
import HarmeetImg from "../assets/harmeet.jpg";

const getUserImage = (username) => {
  if (!username) return OmTransDP;
  const name = username.toLowerCase().trim();
  if (name.includes("vikram")) return VikramImg;
  if (name.includes("tarun")) return TarunImg;
  if (name.includes("harmeet")) return HarmeetImg;
  return OmTransDP;
};

const Navbar = ({ currentUser, onLogout, onNavigate, currentView }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Role-based menu visibility.
  // - Import-role users see ONLY the Import module.
  // - Export-role users see ONLY the Export AI module.
  // - Super Admin sees everything including Import.
  const role = (currentUser?.role || "").toLowerCase().trim();
  const isSuperAdmin = role === "super admin";
  const isImportUser = role === "import";
  const isExportUser = role === "export";
  // Standard menus are hidden for Import-only and Export-only users.
  const showStandardMenus = !isImportUser && !isExportUser;
  const showImportMenu = isSuperAdmin || isImportUser;
  // Export AI is available to everyone except Import-only users.
  const showExportAiMenu = !isImportUser;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
          <div className="flex items-center gap-1 text-sm">
            {/* Standard menus — hidden for Import-only users */}
            {showStandardMenus && (
              <>
                {/* Dashboard Menu */}
                <button
                  onClick={() => onNavigate("dashboard")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    currentView === "dashboard"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </button>

                {/* Rate Filing Menu */}
                <button
                  onClick={() => onNavigate("ratefiling")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    currentView === "ratefiling"
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <DollarSign size={15} />
                  <span>Rate Filing</span>
                </button>

                {/* Quotation Menu */}
                <button
                  onClick={() => onNavigate("quotation")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    currentView === "form" || currentView === "quotation"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <FileText size={15} />
                  <span>Quotation</span>
                </button>

                {/* Pre-Advice Menu */}
                <button
                  onClick={() => onNavigate("preadvice")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    currentView === "preadvice"
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <ClipboardList size={15} />
                  <span>Pre-Advice</span>
                </button>

                {/* Agent Database Menu */}
                <button
                  onClick={() => onNavigate("agentdb")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    currentView === "agentdb"
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Users size={15} />
                  <span>Agent</span>
                </button>

                {/* Destination Menu */}
                <button
                  onClick={() => onNavigate("destination")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    currentView === "destination"
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <MapPin size={15} />
                  <span>Destination</span>
                </button>

                {/* Login Info Menu - Super Admin only */}
                {isSuperAdmin && (
                  <button
                    onClick={() => onNavigate("logininfo")}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                      currentView === "logininfo"
                        ? "bg-rose-50 text-rose-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Activity size={15} />
                    <span>Login Info</span>
                  </button>
                )}
              </>
            )}

            {/* Import Menu — Super Admin and Import-role users */}
            {showImportMenu && (
              <button
                onClick={() => onNavigate("import")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                  currentView === "import"
                    ? "bg-sky-50 text-sky-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Plane size={15} />
                <span>Import</span>
              </button>
            )}

            {/* Export AI Menu — everyone except Import-only users (Super Admin = full,
                Export/standard users = own data only) */}
            {showExportAiMenu && (
              <button
                onClick={() => onNavigate("exportai")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                  currentView === "exportai"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Sparkles size={15} />
                <span>Export AI</span>
              </button>
            )}
          </div>

          {/* Right Section - User Profile & Logout */}
          <div className="flex items-center gap-3 ">
            {/* User Profile Dropdown */}
            <div className="relative " ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 px-4 py-2 rounded-lg transition-all border border-blue-200"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={getUserImage(currentUser?.fullName || currentUser?.username)}
                    alt={currentUser?.fullName || currentUser?.username || "User"}
                    className="w-9 h-9 rounded-full object-cover border-2 border-blue-500"
                  />
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
                      <img
                        src={getUserImage(currentUser?.fullName || currentUser?.username)}
                        alt={currentUser?.fullName || currentUser?.username || "User"}
                        className="w-11 h-11 rounded-full object-cover border-2 border-blue-500"
                      />
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
