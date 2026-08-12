import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, UserPlus, Search, Pencil, Trash2, KeyRound, Power, PowerOff,
  X, AlertCircle, CheckCircle, Loader2, Eye, EyeOff, RefreshCw,
} from "lucide-react";

const API_URL = "https://api.efreightpro.in/api/users";

const ROLES = ["Super Admin", "Admin", "Manager", "User", "Viewer", "Import", "Export", "Agent"];
const LOCATIONS = ["Delhi", "Mumbai", "Pune", "Kolkata", "Chennai", "Bengaluru", "Ahmedabad"];

const ROLE_BADGE = {
  "super admin": "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  manager: "bg-indigo-100 text-indigo-700",
  user: "bg-gray-100 text-gray-700",
  viewer: "bg-slate-100 text-slate-600",
  import: "bg-sky-100 text-sky-700",
  export: "bg-teal-100 text-teal-700",
  agent: "bg-amber-100 text-amber-700",
};

const authHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/**
 * User Management dashboard — Super Admin only. Provides the complete lifecycle for
 * user accounts: list (with search + role/status filters + last-login), create, edit,
 * reset password, activate/deactivate, and permanent delete. Every request is
 * authenticated as the Super Admin; the backend re-checks the role and returns 403 for
 * anyone else, so this UI is only ever rendered for Super Admin users.
 */
const UserManagement = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null); // { type, message }

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modal, setModal] = useState(null); // { type: 'create'|'edit'|'reset'|'delete', user }

  const notify = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API_URL}?${params.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load users");
      setUsers(data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  // Debounce list reloads as the filters change.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);

  const toggleStatus = async (user) => {
    try {
      const res = await fetch(`${API_URL}/${user._id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update status");
      notify("success", data.message);
      load();
    } catch (err) {
      notify("error", err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2.5 rounded-xl">
              <Users className="text-purple-700" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500">Create and manage user accounts — Super Admin only</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              onClick={() => setModal({ type: "create" })}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow hover:shadow-md transition"
            >
              <UserPlus size={16} /> Create User
            </button>
          </div>
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <StatChip label="Total Users" value={users.length} icon={Users} color="text-blue-600 bg-blue-50" />
          <StatChip label="Active" value={activeCount} icon={Power} color="text-emerald-600 bg-emerald-50" />
          <StatChip label="Inactive" value={users.length - activeCount} icon={PowerOff} color="text-rose-600 bg-rose-50" />
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 cursor-pointer">
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 cursor-pointer">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Last Login</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400"><Loader2 className="inline animate-spin mr-2" size={18} /> Loading users…</td></tr>
                ) : error ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-rose-500">{error}</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No users match the current filters.</td></tr>
                ) : users.map((u) => {
                  const isSelf = currentUser && (currentUser.username || "").toLowerCase() === (u.username || "").toLowerCase();
                  return (
                    <tr key={u._id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {u.fullName}
                        {isSelf && <span className="ml-2 text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">You</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.username}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE[(u.role || "").toLowerCase()] || "bg-gray-100 text-gray-700"}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(u.lastLogin)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn title="Edit" onClick={() => setModal({ type: "edit", user: u })} className="text-blue-600 hover:bg-blue-50"><Pencil size={15} /></IconBtn>
                          <IconBtn title="Reset password" onClick={() => setModal({ type: "reset", user: u })} className="text-amber-600 hover:bg-amber-50"><KeyRound size={15} /></IconBtn>
                          <IconBtn
                            title={u.isActive ? "Deactivate" : "Activate"}
                            onClick={() => toggleStatus(u)}
                            className={u.isActive ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}
                          >
                            {u.isActive ? <PowerOff size={15} /> : <Power size={15} />}
                          </IconBtn>
                          <IconBtn title="Delete" disabled={isSelf} onClick={() => setModal({ type: "delete", user: u })} className="text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 size={15} /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {(modal?.type === "create" || modal?.type === "edit") && (
        <UserFormModal
          mode={modal.type}
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={(msg) => { setModal(null); notify("success", msg); load(); }}
          onError={(msg) => notify("error", msg)}
        />
      )}
      {modal?.type === "reset" && (
        <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} onSaved={(msg) => { setModal(null); notify("success", msg); }} onError={(msg) => notify("error", msg)} />
      )}
      {modal?.type === "delete" && (
        <DeleteModal user={modal.user} onClose={() => setModal(null)} onDeleted={(msg) => { setModal(null); notify("success", msg); load(); }} onError={(msg) => notify("error", msg)} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
          {toast.message}
        </div>
      )}
    </div>
  );
};

const StatChip = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
    <div className={`p-2 rounded-lg ${color}`}><Icon size={18} /></div>
    <div>
      <div className="text-lg font-bold text-gray-900 leading-none">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  </div>
);

const IconBtn = ({ children, className = "", ...props }) => (
  <button {...props} className={`p-1.5 rounded-lg transition ${className}`}>{children}</button>
);

/* --------------------------------- Modals --------------------------------- */

const ModalShell = ({ title, icon: Icon, iconColor, onClose, children }) => (
  <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="flex items-center gap-2 text-base font-bold text-gray-800">
          {Icon && <Icon className={iconColor} size={18} />} {title}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Labeled = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500";

const UserFormModal = ({ mode, user, onClose, onSaved, onError }) => {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    username: user?.username || "",
    password: "",
    role: user?.role || "User",
    location: user?.location || "",
    isActive: user?.isActive ?? true,
  });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || (!isEdit && !form.username.trim())) return onError("Full name and username are required");
    if (!isEdit && form.password.length < 3) return onError("Password must be at least 3 characters");
    setBusy(true);
    try {
      const url = isEdit ? `${API_URL}/${user._id}` : API_URL;
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { fullName: form.fullName, role: form.role, location: form.location, isActive: form.isActive }
        : { fullName: form.fullName, username: form.username, password: form.password, role: form.role, location: form.location, isActive: form.isActive };
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Request failed");
      onSaved(data.message || (isEdit ? "User updated" : "User created"));
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title={isEdit ? "Edit User" : "Create User"} icon={isEdit ? Pencil : UserPlus} iconColor="text-purple-600" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Labeled label="Full Name"><input className={inputCls} value={form.fullName} onChange={set("fullName")} placeholder="Full name" /></Labeled>
          <Labeled label="Username">
            <input className={`${inputCls} ${isEdit ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`} value={form.username} onChange={set("username")} placeholder="Username" disabled={isEdit} />
          </Labeled>
        </div>

        {!isEdit && (
          <Labeled label="Initial Password">
            <div className="relative">
              <input className={`${inputCls} pr-10`} type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Set a password" />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Labeled>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Labeled label="Role">
            <select className={`${inputCls} cursor-pointer`} value={form.role} onChange={set("role")}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Labeled>
          <Labeled label="Location">
            <select className={`${inputCls} cursor-pointer`} value={form.location} onChange={set("location")}>
              <option value="">— None —</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Labeled>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input type="checkbox" checked={form.isActive} onChange={set("isActive")} className="w-4 h-4 accent-purple-600" />
          Account is active {!isEdit && <span className="text-xs text-gray-400">(uncheck to create a deactivated account)</span>}
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" disabled={busy} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-60">
            {busy ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />} {isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const ResetPasswordModal = ({ user, onClose, onSaved, onError }) => {
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 3) return onError("Password must be at least 3 characters");
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/${user._id}/password`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ newPassword: pw }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to reset password");
      onSaved(data.message || "Password reset");
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Reset Password" icon={KeyRound} iconColor="text-amber-600" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <p className="text-sm text-gray-600">Set a new password for <span className="font-semibold text-gray-800">{user.fullName}</span> (<span className="text-gray-500">{user.username}</span>).</p>
        <Labeled label="New Password">
          <div className="relative">
            <input className={`${inputCls} pr-10`} type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoFocus />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Labeled>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" disabled={busy} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-60">
            {busy ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />} Reset Password
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const DeleteModal = ({ user, onClose, onDeleted, onError }) => {
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/${user._id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete user");
      onDeleted(data.message || "User deleted");
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell title="Delete User" icon={Trash2} iconColor="text-rose-600" onClose={onClose}>
      <p className="text-sm text-gray-600">
        Permanently delete <span className="font-semibold text-gray-800">{user.fullName}</span> (<span className="text-gray-500">{user.username}</span>)? This cannot be undone. To temporarily disable access instead, deactivate the account.
      </p>
      <div className="flex items-center justify-end gap-2 pt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
        <button onClick={submit} disabled={busy} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-60">
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Delete Permanently
        </button>
      </div>
    </ModalShell>
  );
};

export default UserManagement;
