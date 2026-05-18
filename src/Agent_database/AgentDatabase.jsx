import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Users,
  Globe,
  ChevronLeft,
  ChevronRight,
  Filter,
  Upload,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const API_BASE = "https://papayawhip-antelope-424743.hostingersite.com/api/agents";

const AgentDatabase = ({ currentUser }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);
  const rowsPerPage = 20;

  const isAdmin = currentUser?.role?.toLowerCase() === "admin" || currentUser?.role?.toLowerCase() === "super admin";
  const token = localStorage.getItem("authToken");

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  /* ---------- Fetch all agents ---------- */
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : data.data || data.agents || [];
        setAgents(list);
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const emptyForm = {
    country: "",
    companyName: "",
    companyAddress: "",
    contactPersonName: "",
    personDesignation: "",
    contactNumber: "",
    landlineNumber: "",
    personEmail: "",
    remarks: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  // Unique countries for dropdown
  const countries = useMemo(() => {
    const set = new Set(agents.map((a) => a.country).filter(Boolean));
    return [...set].sort();
  }, [agents]);

  /* Helper: read agent field flexibly (handles both old & new backend field names) */
  const f = (agent, ...keys) => {
    for (const k of keys) { if (agent[k]) return agent[k]; }
    return "";
  };

  // Filtered agents (search + country)
  const filteredAgents = useMemo(() => {
    let result = agents;
    if (countryFilter) {
      result = result.filter((a) => (a.country || "") === countryFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) => {
          const fields = [
            a.country, a.companyName, a.company,
            a.companyAddress, a.address,
            a.contactPersonName, a.contactPerson,
            a.personDesignation, a.designation,
            a.contactNumber, a.mobile,
            a.landlineNumber, a.landline,
            a.personEmail, a.email,
            a.remarks,
          ];
          return fields.some((v) => (v || "").toLowerCase().includes(term));
        }
      );
    }
    return result;
  }, [agents, searchTerm, countryFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / rowsPerPage));
  const paginatedAgents = filteredAgents.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSearch = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const handleCountryFilter = (value) => { setCountryFilter(value); setCurrentPage(1); };

  // Open form for Add
  const handleAdd = () => {
    setEditingAgent(null);
    setFormData(emptyForm);
    setShowFormModal(true);
  };

  // Open form for Edit
  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setFormData({
      country: agent.country || "",
      companyName: f(agent, "companyName", "company") || "",
      companyAddress: f(agent, "companyAddress", "address") || "",
      contactPersonName: f(agent, "contactPersonName", "contactPerson") || "",
      personDesignation: f(agent, "personDesignation", "designation") || "",
      contactNumber: f(agent, "contactNumber", "mobile") || "",
      landlineNumber: f(agent, "landlineNumber", "landline") || "",
      personEmail: f(agent, "personEmail", "email") || "",
      remarks: agent.remarks || "",
    });
    setShowFormModal(true);
  };

  // Save (Add or Edit) via API
  const handleSave = async () => {
    if (!formData.country.trim() || !formData.companyName.trim() || !formData.contactPersonName.trim()) return;
    setSaving(true);
    const agentId = editingAgent?._id || editingAgent?.id;
    try {
      const url = agentId ? `${API_BASE}/${agentId}` : API_BASE;
      const res = await fetch(url, {
        method: agentId ? "PUT" : "POST",
        headers: authHeaders,
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setShowFormModal(false);
        setEditingAgent(null);
        setFormData(emptyForm);
        await fetchAgents();
      } else {
        alert(data.message || `Failed to ${agentId ? "update" : "add"} agent.`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Delete via API
  const handleDelete = async (agent) => {
    const agentId = agent._id || agent.id;
    if (!window.confirm("Are you sure you want to delete this agent?")) return;
    try {
      const res = await fetch(`${API_BASE}/${agentId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        await fetchAgents();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete agent.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Network error. Please try again.");
    }
  };

  /* ---------- Excel Upload ---------- */
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  /* ---------- Excel column → DB field mapping ---------- */
  const COLUMN_MAP = {
    "country": "country",
    "company name": "companyName",
    "company address": "companyAddress",
    "contact person name": "contactPersonName",
    "contact person": "contactPersonName",
    "person designation": "personDesignation",
    "designation": "personDesignation",
    "contact number": "contactNumber",
    "contact number (mobile / landline)": "contactNumber",
    "mobile number": "contactNumber",
    "mobile": "contactNumber",
    "phone": "contactNumber",
    "landline number": "landlineNumber",
    "landline": "landlineNumber",
    "email": "personEmail",
    "person email": "personEmail",
    "remarks": "remarks",
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("Please select a valid Excel file (.xlsx, .xls, or .csv)");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      // Parse Excel client-side
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rawRows.length === 0) {
        setUploadResult({ success: false, message: "Excel file is empty or has no data rows." });
        setUploading(false);
        e.target.value = "";
        return;
      }

      // Map Excel column headers → DB field names
      const mappedRows = rawRows
        .map((row) => {
          const mapped = {};
          Object.entries(row).forEach(([header, value]) => {
            const key = COLUMN_MAP[header.trim().toLowerCase()];
            if (key) mapped[key] = String(value).trim();
          });
          return mapped;
        })
        .filter((r) => r.companyName); // Skip rows without Company Name

      if (mappedRows.length === 0) {
        setUploadResult({ success: false, message: "No valid rows found. Ensure 'Company Name' column has data." });
        setUploading(false);
        e.target.value = "";
        return;
      }

      console.log("Parsed Excel rows:", mappedRows.length, "Sample:", mappedRows[0]);

      // --- Duplicate detection ---
      // Build a set of fingerprints from existing DB agents
      const fingerprint = (r) =>
        `${(r.companyName || r.company || "").trim()}|${(r.contactPersonName || r.contactPerson || "").trim()}|${(r.contactNumber || r.mobile || "").trim()}`.toLowerCase();

      const existingFingerprints = new Set(agents.map(fingerprint));

      // Deduplicate within the file itself too
      const seenInFile = new Set();
      const uniqueRows = [];
      let duplicatesInDb = 0;
      let duplicatesInFile = 0;

      for (const row of mappedRows) {
        const fp = fingerprint(row);
        if (existingFingerprints.has(fp)) {
          duplicatesInDb++;
        } else if (seenInFile.has(fp)) {
          duplicatesInFile++;
        } else {
          seenInFile.add(fp);
          uniqueRows.push(row);
        }
      }

      const totalDuplicates = duplicatesInDb + duplicatesInFile;

      if (uniqueRows.length === 0) {
        setUploadResult({
          success: false,
          message: totalDuplicates > 0
            ? `All ${mappedRows.length} record${mappedRows.length !== 1 ? "s" : ""} are duplicates — ${duplicatesInDb} already exist in the database${duplicatesInFile > 0 ? ` and ${duplicatesInFile} duplicate${duplicatesInFile !== 1 ? "s" : ""} within the file` : ""}. No new agents added.`
            : "No valid rows found after duplicate check.",
        });
        setUploading(false);
        e.target.value = "";
        return;
      }

      console.log(`Duplicates: ${duplicatesInDb} in DB, ${duplicatesInFile} in file. Uploading ${uniqueRows.length} unique rows.`);

      // Strategy 1: Send original file as form-data to /upload endpoint
      let inserted = 0;
      let errors = 0;
      let bulkDone = false;

      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        const data = await res.json();
        console.log("Upload endpoint response:", res.status, data);
        if (res.ok) {
          inserted = data.inserted ?? data.insertedCount ?? mappedRows.length;
          errors = data.errors ?? data.errorCount ?? 0;
          bulkDone = true;
        }
      } catch (err) {
        console.log("Upload endpoint failed, falling back to individual POSTs:", err);
      }

      // Strategy 2: If bulk failed, POST each unique row individually
      if (!bulkDone) {
        for (const row of uniqueRows) {
          try {
            const res = await fetch(API_BASE, {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify(row),
            });
            if (res.ok) {
              inserted++;
            } else {
              const errData = await res.json().catch(() => ({}));
              console.log("Individual POST failed:", res.status, errData, "Row:", row);
              errors++;
            }
          } catch (err) {
            console.log("Individual POST network error:", err);
            errors++;
          }
        }
      }

      setUploadResult({
        success: inserted > 0,
        inserted,
        errors,
        duplicates: totalDuplicates,
        message: inserted > 0
          ? `Upload complete! ${inserted} agent${inserted !== 1 ? "s" : ""} added.${totalDuplicates > 0 ? ` ${totalDuplicates} duplicate${totalDuplicates !== 1 ? "s" : ""} skipped.` : ""}${errors > 0 ? ` ${errors} error${errors !== 1 ? "s" : ""}.` : ""}`
          : "Upload failed. No agents were added.",
      });
      await fetchAgents();
    } catch (err) {
      console.error("Upload error:", err);
      setUploadResult({ success: false, message: "Failed to parse Excel file. Please check the format." });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  /* ---------- Dismiss upload result after 6s ---------- */
  useEffect(() => {
    if (!uploadResult) return;
    const t = setTimeout(() => setUploadResult(null), 6000);
    return () => clearTimeout(t);
  }, [uploadResult]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pt-6">
        {/* Header + Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex flex-col gap-3">
            {/* Top row: title + action buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-2 rounded-xl">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Agent Database</h1>
                  <p className="text-xs text-gray-500">
                    {loading ? "Loading..." : `${filteredAgents.length} agent${filteredAgents.length !== 1 ? "s" : ""} found`}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  {/* Upload Excel */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <button
                    onClick={handleFileSelect}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm disabled:opacity-60"
                  >
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    <span className="hidden sm:inline">{uploading ? "Uploading..." : "Upload Excel"}</span>
                  </button>
                  {/* Add Agent */}
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                  >
                    <Plus size={15} />
                    <span className="hidden sm:inline">Add Agent</span>
                  </button>
                </div>
              )}
            </div>

            {/* Upload result banner */}
            {uploadResult && (
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
                uploadResult.success
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}>
                {uploadResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{uploadResult.message}</span>
                {uploadResult.inserted != null && (
                  <span className="ml-1 text-xs opacity-75">
                    ({uploadResult.inserted} inserted{uploadResult.duplicates > 0 ? `, ${uploadResult.duplicates} duplicates skipped` : ""}{uploadResult.errors > 0 ? `, ${uploadResult.errors} errors` : ""})
                  </span>
                )}
                <button onClick={() => setUploadResult(null)} className="ml-auto p-0.5 hover:opacity-70"><X size={14} /></button>
              </div>
            )}

            {/* Filter row: country dropdown + search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Country dropdown */}
              <div className="relative">
                <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={countryFilter}
                  onChange={(e) => handleCountryFilter(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white appearance-none cursor-pointer min-w-[180px]"
                >
                  <option value="">All Countries</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, company, address, phone..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Clear filters */}
              {(searchTerm || countryFilter) && (
                <button
                  onClick={() => { handleSearch(""); handleCountryFilter(""); }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-teal-500" />
              <span className="ml-3 text-sm text-gray-500">Loading agents...</span>
            </div>
          ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '3%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: isAdmin ? '18%' : '20%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: isAdmin ? '10%' : '13%' }} />
                {isAdmin && <col style={{ width: '5%' }} />}
              </colgroup>
              <thead>
                <tr className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
                  <th className="px-1.5 py-2 text-left font-semibold text-[11px] border-r border-white/30">S.No.</th>
                  <th className="px-1.5 py-2 text-left font-semibold text-[11px] border-r border-white/30">Country</th>
                  <th className="px-1.5 py-2 text-left font-semibold text-[11px] border-r border-white/30">Company Name</th>
                  <th className="px-1.5 py-2 text-left font-semibold text-[11px] border-r border-white/30">Company Address</th>
                  <th className="px-1.5 py-2 text-left font-semibold text-[11px] border-r border-white/30">Contact Person</th>
                  <th className="px-1.5 py-2 text-left font-semibold text-[11px] border-r border-white/30">Designation</th>
                  <th className="px-1.5 py-2 text-left font-semibold text-[11px] border-r border-white/30">Contact No.</th>
                  <th className="px-1.5 py-2 text-left font-semibold text-[11px] border-r border-white/30">Email</th>
                  <th className={`px-1.5 py-2 text-left font-semibold text-[11px]${isAdmin ? ' border-r border-white/30' : ''}`}>Remarks</th>
                  {isAdmin && <th className="px-1.5 py-2 text-center font-semibold text-[11px]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedAgents.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="px-4 py-10 text-center text-gray-400">
                      <Globe size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No agents found</p>
                      <p className="text-xs mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    // Pre-compute rowSpan info for Country, Company Name, Company Address
                    const spans = paginatedAgents.map(() => ({ country: 1, company: 1, address: 1, showCountry: true, showCompany: true, showAddress: true }));
                    for (let i = 0; i < paginatedAgents.length; i++) {
                      if (!spans[i].showCountry) continue;
                      const ctry = (paginatedAgents[i].country || "").toLowerCase();
                      let countrySpan = 1;
                      for (let j = i + 1; j < paginatedAgents.length; j++) {
                        if ((paginatedAgents[j].country || "").toLowerCase() === ctry) { countrySpan++; spans[j].showCountry = false; } else break;
                      }
                      spans[i].country = countrySpan;
                      // Within same-country group, compute company spans
                      for (let ci = i; ci < i + countrySpan;) {
                        if (!spans[ci].showCompany) { ci++; continue; }
                        const comp = f(paginatedAgents[ci], "companyName", "company").toLowerCase();
                        let compSpan = 1;
                        for (let cj = ci + 1; cj < i + countrySpan; cj++) {
                          if (f(paginatedAgents[cj], "companyName", "company").toLowerCase() === comp) { compSpan++; spans[cj].showCompany = false; } else break;
                        }
                        spans[ci].company = compSpan;
                        // Within same-company group, compute address spans
                        for (let ai = ci; ai < ci + compSpan;) {
                          if (!spans[ai].showAddress) { ai++; continue; }
                          const addr = f(paginatedAgents[ai], "companyAddress", "address").toLowerCase();
                          let addrSpan = 1;
                          for (let aj = ai + 1; aj < ci + compSpan; aj++) {
                            if (f(paginatedAgents[aj], "companyAddress", "address").toLowerCase() === addr) { addrSpan++; spans[aj].showAddress = false; } else break;
                          }
                          spans[ai].address = addrSpan;
                          ai += addrSpan;
                        }
                        ci += compSpan;
                      }
                    }

                    return paginatedAgents.map((agent, idx) => {
                      const rowNum = (currentPage - 1) * rowsPerPage + idx + 1;
                      const isEven = idx % 2 === 0;
                      const sp = spans[idx];
                      const mergedCellCls = "align-center bg-white border-b border-gray-200";
                      return (
                      <tr key={agent._id || agent.id || idx} className={`${isEven ? 'bg-white' : 'bg-teal-50/40'} hover:bg-cyan-50 transition-colors border-b border-gray-200`}>
                        <td className="px-1.5 py-1.5 text-gray-400 font-mono border-r border-gray-200">{rowNum}</td>
                        {sp.showCountry && (
                          <td rowSpan={sp.country} className={`px-1.5 py-1.5 break-words border-r border-gray-200 ${mergedCellCls}`}>
                            <span className="inline-flex items-center gap-0.5 text-teal-700 font-semibold">
                              <Globe size={10} className="text-teal-500 flex-shrink-0" />
                              {agent.country}
                            </span>
                          </td>
                        )}
                        {sp.showCompany && (
                          <td rowSpan={sp.company} className={`px-1.5 py-1.5 text-gray-800 font-semibold break-words border-r border-gray-200 ${mergedCellCls}`}>{f(agent, "companyName", "company")}</td>
                        )}
                        {sp.showAddress && (
                          <td rowSpan={sp.address} className={`px-1.5 py-1.5 text-gray-500 break-words border-r border-gray-200 ${mergedCellCls}`}>{f(agent, "companyAddress", "address")}</td>
                        )}
                        <td className="px-1.5 py-1.5 text-indigo-700 font-medium break-words border-r border-gray-200">{f(agent, "contactPersonName", "contactPerson")}</td>
                        <td className="px-1.5 py-1.5 break-words border-r border-gray-200">
                          {f(agent, "personDesignation", "designation") ? (
                            <span className="bg-purple-50 text-purple-700 px-1 py-0.5 rounded text-[10px] font-medium">{f(agent, "personDesignation", "designation")}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-1.5 py-1.5 break-all border-r border-gray-200">
                          <div className="leading-snug">
                            {f(agent, "contactNumber", "mobile") && <div className="text-gray-700"><span className="text-[10px] text-red-400 font-semibold">M</span> {f(agent, "contactNumber", "mobile")}</div>}
                            {f(agent, "landlineNumber", "landline") && <div className="text-gray-500"><span className="text-[10px] text-red-400 font-semibold">L</span> {f(agent, "landlineNumber", "landline")}</div>}
                          </div>
                        </td>
                        <td className="px-1.5 py-1.5 text-blue-600 break-all border-r border-gray-200">{f(agent, "personEmail", "email")}</td>
                        <td className={`px-1.5 py-1.5 text-gray-400 italic break-words${isAdmin ? ' border-r border-gray-200' : ''}`}>{agent.remarks || <span className="text-gray-200">—</span>}</td>
                        {isAdmin && (
                          <td className="px-2 py-1.5">
                            <div className="flex items-center justify-center gap-0.5">
                              <button onClick={() => handleEdit(agent)} className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit"><Pencil size={13} /></button>
                              <button onClick={() => handleDelete(agent)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-500">
                Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredAgents.length)} of {filteredAgents.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                      page === currentPage
                        ? "bg-teal-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-5 py-3 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingAgent ? "Edit Agent" : "Add Agent"}</h3>
              <button
                onClick={() => { setShowFormModal(false); setEditingAgent(null); setFormData(emptyForm); }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g. United Kingdom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g. Thames Cargo Ltd"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Address</label>
                <textarea
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.contactPersonName}
                    onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g. James Whitfield"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Person Designation</label>
                  <input
                    type="text"
                    value={formData.personDesignation}
                    onChange={(e) => setFormData({ ...formData, personDesignation: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g. Operations Manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="+44 7700 900123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Landline Number</label>
                  <input
                    type="text"
                    value={formData.landlineNumber}
                    onChange={(e) => setFormData({ ...formData, landlineNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="+44 20 7946 0958"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Person Email</label>
                  <input
                    type="email"
                    value={formData.personEmail}
                    onChange={(e) => setFormData({ ...formData, personEmail: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g. james@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-5 py-3 flex justify-end gap-3 border-t rounded-b-xl">
              <button
                onClick={() => { setShowFormModal(false); setEditingAgent(null); setFormData(emptyForm); }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.country.trim() || !formData.companyName.trim() || !formData.contactPersonName.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingAgent ? (saving ? "Updating..." : "Update") : (saving ? "Adding..." : "Add Agent")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDatabase;
