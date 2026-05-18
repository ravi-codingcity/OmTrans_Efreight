import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  FileText,
  CheckCircle,
  TrendingUp,
  Package,
  BarChart3,
  User,
  Calendar,
  Briefcase,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Globe,
  Ship,
} from "lucide-react";
import { quotationsCache } from "../Quotation_Filing/QuotationList";
import OmTransDP from "../assets/omtrans_dp.jpg";
import VikramImg from "../assets/vikram.jpg";
import TarunImg from "../assets/tarun.jpeg";
import HarmeetImg from "../assets/harmeet.jpg";

const API_BASE_URL = "https://papayawhip-antelope-424743.hostingersite.com/api";

// Re-export for backward compatibility
export { quotationsCache, invalidateQuotationsCache } from "../Quotation_Filing/QuotationList";

// Robust helper to check if a quotation is a draft
const isDraftQuotation = (quote) => {
  if (!quote) return false;
  return (
    quote.isDraft === true ||
    quote.isDraft === "true" ||
    quote.status === "draft"
  );
};

const Dashboard = ({ currentUser }) => {
  // Get logged-in user from props or localStorage
  const loggedInUser = useMemo(() => {
    if (currentUser) return currentUser;
    try {
      const storedUser = localStorage.getItem("currentUser");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }, [currentUser]);

  const isAdmin = useMemo(() => {
    if (!loggedInUser) return false;
    const username = (loggedInUser.username || "").toLowerCase();
    const role = (loggedInUser.role || "").toLowerCase();
    return username === "vikram" || role === "admin" || role === "super admin";
  }, [loggedInUser]);

  // State for statistics
  const [stats, setStats] = useState({
    totalQuotations: 0,
    businessNotConverted: 0,
    jobsCreated: 0,
    totalBookings: 0,
  });

  // Analytics data
  const [quotations, setQuotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load quotations for stats and analytics
  const loadStatistics = useCallback(
    (quotationsData = []) => {
      let userQuotations = quotationsData;

      if (!isAdmin && loggedInUser) {
        const usernameLower = (loggedInUser.username || "").toLowerCase();
        const fullNameLower = (loggedInUser.fullName || "").toLowerCase();

        userQuotations = quotationsData.filter((quote) => {
          const createdByLower = (quote.createdBy || "").toLowerCase();
          return (
            createdByLower === usernameLower ||
            createdByLower === fullNameLower ||
            createdByLower.includes(usernameLower) ||
            createdByLower.includes(fullNameLower)
          );
        });
      } else if (isAdmin) {
        userQuotations = quotationsData.filter((quote) => !isDraftQuotation(quote));
      }

      const totalQuotations = userQuotations.length;
      const businessNotConverted = 0;
      const jobsCreated = 0;
      const bookings = JSON.parse(localStorage.getItem("bookings") || "[]");
      const totalBookings = bookings.length;

      setStats({ totalQuotations, businessNotConverted, jobsCreated, totalBookings });
    },
    [isAdmin, loggedInUser],
  );

  useEffect(() => {
    const loadData = async () => {
      // Try cache first
      if (quotationsCache.data) {
        setQuotations(quotationsCache.data);
        loadStatistics(quotationsCache.data);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/quotations`);
        const data = await response.json();
        if (response.ok && data.success) {
          const quotationsData = data.data || [];
          quotationsCache.data = quotationsData;
          quotationsCache.timestamp = Date.now();
          setQuotations(quotationsData);
          loadStatistics(quotationsData);
        }
      } catch (error) {
        console.error("Error fetching quotations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [loadStatistics]);

  // Analytics computations
  const analytics = useMemo(() => {
    if (!quotations.length) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Filter out drafts for analytics
    const activeQuotations = quotations.filter((q) => !isDraftQuotation(q));

    // This month's quotations
    const thisMonthQuotations = activeQuotations.filter((q) => {
      const d = new Date(q.createdDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Last month's quotations
    const lastMonthQuotations = activeQuotations.filter((q) => {
      const d = new Date(q.createdDate);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    // Growth percentage
    const growth = lastMonthQuotations.length > 0
      ? ((thisMonthQuotations.length - lastMonthQuotations.length) / lastMonthQuotations.length * 100).toFixed(1)
      : thisMonthQuotations.length > 0 ? 100 : 0;

    // Segment breakdown
    const segmentMap = {};
    activeQuotations.forEach((q) => {
      const seg = q.quotationSegment || "Other";
      segmentMap[seg] = (segmentMap[seg] || 0) + 1;
    });
    const segments = Object.entries(segmentMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: ((count / activeQuotations.length) * 100).toFixed(1) }));

    // Location breakdown
    const locationMap = {};
    activeQuotations.forEach((q) => {
      const loc = q.createdByLocation || "Unknown";
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    });
    const locationBreakdown = Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // User breakdown (top creators)
    const userMap = {};
    activeQuotations.forEach((q) => {
      const user = q.createdBy || "Unknown";
      userMap[user] = (userMap[user] || 0) + 1;
    });
    const topCreators = Object.entries(userMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Monthly trend (last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m < 0) { m += 12; y -= 1; }
      const count = activeQuotations.filter((q) => {
        const d = new Date(q.createdDate);
        return d.getMonth() === m && d.getFullYear() === y;
      }).length;
      monthlyTrend.push({ month: monthNames[m], year: y, count });
    }
    const maxMonthly = Math.max(...monthlyTrend.map((m) => m.count), 1);

    // Today's quotations
    const todayStr = now.toISOString().split("T")[0];
    const todayCount = activeQuotations.filter((q) => {
      return new Date(q.createdDate).toISOString().split("T")[0] === todayStr;
    }).length;

    return {
      thisMonthCount: thisMonthQuotations.length,
      lastMonthCount: lastMonthQuotations.length,
      growth: parseFloat(growth),
      segments,
      locationBreakdown,
      topCreators,
      monthlyTrend,
      maxMonthly,
      todayCount,
      totalActive: activeQuotations.length,
    };
  }, [quotations]);

  // Segment color mapping
  const segmentColors = {
    "Sea Export FCL": "bg-blue-500",
    "Sea Import FCL": "bg-blue-400",
    "Sea Export LCL": "bg-cyan-500",
    "Sea Import LCL": "bg-cyan-400",
    "Air Export": "bg-purple-500",
    "Air Import": "bg-purple-400",
    "Break Bulk Export": "bg-amber-500",
    "Break Bulk Import": "bg-amber-400",
    "Service Job": "bg-emerald-500",
    "Other": "bg-gray-400",
  };

  const getSegmentColor = (name) => segmentColors[name] || "bg-gray-400";

  const getUserImage = (username) => {
    if (!username) return OmTransDP;
    const name = username.toLowerCase().trim();
    if (name.includes("vikram")) return VikramImg;
    if (name.includes("tarun")) return TarunImg;
    if (name.includes("harmeet")) return HarmeetImg;
    return OmTransDP;
  };

  const displayName = loggedInUser?.fullName || loggedInUser?.username || "User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={getUserImage(displayName)}
              alt={displayName}
              className="w-14 h-14 rounded-full object-cover border-2 border-blue-500 shadow-md"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {displayName}
              </h1>
              <p className="text-gray-600 mt-1">
                Here's what's happening with your freight operations
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Quotations */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quotations</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {isLoading ? "..." : stats.totalQuotations}
                </p>
                {analytics && (
                  <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${analytics.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {analytics.growth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>{Math.abs(analytics.growth)}% vs last month</span>
                  </div>
                )}
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <FileText className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Business Not Converted */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-amber-500 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Business Not Converted</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {isLoading ? "..." : stats.businessNotConverted}
                </p>
                <p className="text-xs text-gray-500 mt-2">Pending follow-up</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-xl">
                <Briefcase className="text-amber-600" size={24} />
              </div>
            </div>
          </div>

          {/* Jobs Created */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jobs Created</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {isLoading ? "..." : stats.jobsCreated}
                </p>
                <p className="text-xs text-gray-500 mt-2">Active shipments</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          {/* Bookings Created */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bookings Created</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {isLoading ? "..." : stats.totalBookings}
                </p>
                <p className="text-xs text-gray-500 mt-2">Total bookings</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Package className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Important Notification Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <div className="bg-amber-100 p-2 rounded-lg mt-0.5 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="text-amber-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Important Notice</h3>
            <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
              This E-Freight Pro online app is currently designed for <span className="font-semibold">Sea Export</span> operations only. Additional functionalities are under development and will be added soon.
            </p>
          </div>
        </div>

        {/* Analytics Section */}
        {!isLoading && analytics && (
          <>
            {/* Analytics Header */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <BarChart3 className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Platform Analytics</h2>
                <p className="text-sm text-gray-500">Real-time insights from your quotation data</p>
              </div>
            </div>

            {/* Analytics Row 1: Quick Stats + Monthly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Stats Cards */}
              <div className="space-y-4">
                {/* Today's Activity */}
                <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Clock className="text-blue-600" size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Today's Quotations</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.todayCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* This Month */}
                <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Calendar className="text-green-600" size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">This Month</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.thisMonthCount}</p>
                      </div>
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${analytics.growth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {analytics.growth >= 0 ? "+" : ""}{analytics.growth}%
                    </div>
                  </div>
                </div>

                {/* Last Month */}
                <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <Calendar className="text-gray-600" size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Last Month</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.lastMonthCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Trend Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  Quotation Trend (Last 6 Months)
                </h3>
                <div className="flex items-end gap-3 h-48">
                  {analytics.monthlyTrend.map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">{item.count}</span>
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 min-h-[4px]"
                        style={{ height: `${(item.count / analytics.maxMonthly) * 160}px` }}
                      ></div>
                      <span className="text-xs text-gray-500 font-medium">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Analytics Row 2: Segment Breakdown + Location + Top Creators */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Segment Breakdown */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Ship size={16} className="text-blue-600" />
                  Segment Breakdown
                </h3>
                <div className="space-y-3">
                  {analytics.segments.map((seg, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{seg.name}</span>
                        <span className="text-gray-500">{seg.count} ({seg.pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${getSegmentColor(seg.name)} h-2 rounded-full transition-all duration-500`} style={{ width: `${seg.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Breakdown */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe size={16} className="text-green-600" />
                  By Location
                </h3>
                <div className="space-y-3">
                  {analytics.locationBreakdown.map((loc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">{loc.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 bg-white px-3 py-1 rounded-full shadow-sm">{loc.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Creators */}
              {isAdmin && (
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User size={16} className="text-purple-600" />
                    Quotation Filing
                  </h3>
                  <div className="space-y-3">
                    {analytics.topCreators.map((creator, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-600" : "bg-blue-400"}`}>
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{creator.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{creator.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Access (for non-admin, takes the 3rd column) */}
              {!isAdmin && (
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-600" />
                    Quick Access
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg"><FileText className="text-white" size={18} /></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">Quotation Management</h4>
                          <p className="text-xs text-gray-600">Create, view, and manage quotations from the Quotation menu.</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-start gap-3">
                        <div className="bg-purple-600 p-2 rounded-lg"><Package className="text-white" size={18} /></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">Booking Management</h4>
                          <p className="text-xs text-gray-600">Coming soon — comprehensive booking features.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* System Information */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TrendingUp className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">System Status: Active</p>
                <p className="text-xs text-gray-600">All systems operational • Last updated: just now</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">OmTrans Freight Services</p>
              <p className="text-xs text-gray-500">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
