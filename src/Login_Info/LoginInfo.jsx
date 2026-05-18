import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
  Calendar,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  Activity,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

const API_BASE_URL =
  "https://papayawhip-antelope-424743.hostingersite.com/api";

const ROWS_PER_PAGE = 25;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const titleCase = (s) =>
  (s || "").replace(/\b\w/g, (c) => c.toUpperCase());

const roleBadge = (role) => {
  const r = (role || "").toLowerCase();
  if (r === "super admin")
    return "bg-red-100 text-red-700 border-red-200";
  if (r === "admin")
    return "bg-purple-100 text-purple-700 border-purple-200";
  if (r === "manager")
    return "bg-teal-100 text-teal-700 border-teal-200";
  if (r === "viewer")
    return "bg-gray-100 text-gray-600 border-gray-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
};

/* ================================================================== */
/*  LoginInfo Component (Super Admin only)                             */
/* ================================================================== */
const LoginInfo = ({ currentUser }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* Filters */
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUsername, setFilterUsername] = useState("");

  /* Sort & Pagination */
  const [sortField, setSortField] = useState("loginAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  /* ============ FETCH ============ */
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/login-info`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setRecords(json.data || []);
      } else {
        setError(json.message || "Failed to load login records");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ============ UNIQUE VALUES FOR DROPDOWN ============ */
  const uniqueUsernames = useMemo(
    () =>
      [...new Set(records.map((r) => r.username).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [records],
  );

  /* ============ FILTERED & SORTED ============ */
  const filtered = useMemo(() => {
    let list = records;

    /* text search */
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          (r.username || "").toLowerCase().includes(q) ||
          (r.fullName || "").toLowerCase().includes(q) ||
          (r.role || "").toLowerCase().includes(q),
      );
    }

    /* username filter */
    if (filterUsername) {
      list = list.filter(
        (r) => (r.username || "").toLowerCase() === filterUsername.toLowerCase(),
      );
    }

    /* sort */
    list = [...list].sort((a, b) => {
      let va = a[sortField] || "";
      let vb = b[sortField] || "";
      if (sortField === "loginAt" || sortField === "logoutAt") {
        va = new Date(va);
        vb = new Date(vb);
      } else {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [records, searchQuery, filterUsername, sortField, sortDir]);

  /* Reset page when filters change */
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterUsername]);

  /* ============ PAGINATION ============ */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(
    () => filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE),
    [filtered, page],
  );

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-indigo-600" />
    ) : (
      <ChevronDown size={12} className="text-indigo-600" />
    );
  };

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setFilterUsername("");
  }, []);

  /* ============ STATS ============ */
  const uniqueUsers = useMemo(
    () => new Set(records.map((r) => (r.username || "").toLowerCase())).size,
    [records],
  );
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return records.filter(
      (r) => new Date(r.loginAt).toDateString() === today,
    ).length;
  }, [records]);
  const activeCount = useMemo(
    () => records.filter((r) => !r.logoutAt).length,
    [records],
  );

  /* ============ RENDER ============ */
  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl border border-indigo-100 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 flex items-center gap-2">
                <Activity size={20} className="text-indigo-600" />
                Login Activity
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-600">
                Track and monitor user login activity across the platform
              </p>
            </div>
            <button
              onClick={fetchRecords}
              disabled={loading}
              className="self-start sm:self-auto flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Total Logins", value: records.length, icon: Activity, bg: "bg-indigo-100", fg: "text-indigo-600" },
            { label: "Unique Users", value: uniqueUsers, icon: User, bg: "bg-emerald-100", fg: "text-emerald-600" },
            { label: "Active Now", value: activeCount, icon: Activity, bg: "bg-green-100", fg: "text-green-600" },
            { label: "Today's Logins", value: todayCount, icon: Calendar, bg: "bg-amber-100", fg: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`${s.bg} p-1.5 sm:p-2 rounded-lg`}>
                  <s.icon size={16} className={`${s.fg} sm:w-[18px] sm:h-[18px]`} />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    {s.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, username, or role..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              />
            </div>
            <select
              value={filterUsername}
              onChange={(e) => setFilterUsername(e.target.value)}
              className="border border-gray-300 rounded-md text-xs py-1.5 px-2 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white sm:w-44"
            >
              <option value="">All Users</option>
              {uniqueUsernames.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            {(searchQuery || filterUsername) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center justify-center gap-1 text-[11px] text-gray-500 hover:text-red-600 px-2 py-1.5 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
                title="Clear filters"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-8">
            <Loader2 size={16} className="animate-spin" />
            Loading login records...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <p>{error}</p>
              <button
                onClick={fetchRecords}
                className="mt-1 text-xs text-red-600 underline hover:text-red-800 flex items-center gap-1"
              >
                <RefreshCw size={10} /> Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && records.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="bg-indigo-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity size={24} className="text-indigo-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-700 mb-1">
              No Login Records Yet
            </h3>
            <p className="text-xs text-gray-500">
              Login activity will appear here once users start logging in.
            </p>
          </div>
        )}

        {/* Desktop Table */}
        {!loading && filtered.length > 0 && (
          <>
            {/* Desktop / Tablet */}
            <div className="hidden sm:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-10">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("fullName")}>
                        <div className="flex items-center gap-1">User <SortIcon field="fullName" /></div>
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("username")}>
                        <div className="flex items-center gap-1">Username <SortIcon field="username" /></div>
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("role")}>
                        <div className="flex items-center gap-1">Role <SortIcon field="role" /></div>
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("loginAt")}>
                        <div className="flex items-center gap-1">Login Date <SortIcon field="loginAt" /></div>
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Login Time</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Logout Time</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((r, idx) => (
                      <tr key={r._id || idx} className="border-b border-gray-100 hover:bg-indigo-50/40 transition-colors">
                        <td className="px-3 py-2.5 text-gray-400 font-mono">
                          {(page - 1) * ROWS_PER_PAGE + idx + 1}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                              {(r.fullName || r.username || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800 truncate max-w-[140px]">
                              {titleCase(r.fullName || r.username)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 font-mono">{r.username || "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleBadge(r.role)}`}>
                            <Shield size={9} />
                            {r.role || "User"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar size={11} className="text-gray-400" />
                            {fmtDate(r.loginAt)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock size={11} className="text-gray-400" />
                            {fmtTime(r.loginAt)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 text-gray-600">
                            <LogOut size={11} className="text-gray-400" />
                            {r.logoutAt ? fmtTime(r.logoutAt) : "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {r.logoutAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-red-100 text-red-700 border-red-200">
                              <LogOut size={9} /> Inactive
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-green-100 text-green-700 border-green-200">
                              <Activity size={9} /> Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2">
              {paginatedRows.map((r, idx) => (
                <div key={r._id || idx} className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(r.fullName || r.username || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">
                          {titleCase(r.fullName || r.username)}
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono">{r.username || "—"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleBadge(r.role)}`}>
                      <Shield size={9} />
                      {r.role || "User"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-gray-400" />
                      {fmtDate(r.loginAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-gray-400" />
                      {fmtTime(r.loginAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <LogOut size={11} className="text-gray-400" />
                      Logout: {r.logoutAt ? fmtTime(r.logoutAt) : "—"}
                    </span>
                    {r.logoutAt ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-red-100 text-red-700 border border-red-200">
                        Inactive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-green-100 text-green-700 border border-green-200">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">
                Showing {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length} records
                {filtered.length !== records.length && ` (filtered from ${records.length})`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - page) <= 1,
                  )
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`e${i}`} className="px-1 text-[11px] text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[28px] h-7 rounded-md text-[11px] font-medium transition-colors ${
                          p === page
                            ? "bg-indigo-600 text-white border border-indigo-600"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* No search results */}
        {!loading && filtered.length === 0 && records.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Search size={20} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No records match your filters.</p>
            <button
              onClick={clearAllFilters}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginInfo;
