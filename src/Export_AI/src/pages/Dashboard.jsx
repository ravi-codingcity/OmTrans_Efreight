import { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FilePlus2, Search, Trash2, FileText, RefreshCw, SlidersHorizontal,
  ArrowUp, ArrowDown, ChevronsUpDown, ChevronRight, ChevronDown, X, Ship, ShieldCheck, Layers, Clock, CheckCircle2, Lock, User,
} from 'lucide-react';
import { jobApi, aiApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import { STATUS_META } from '../lib/format.js';

// Compact created-at: "06 Jun · 11:42 AM" (today/this year drop the year).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const compactDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const day = `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.getFullYear() === now.getFullYear() ? `${day} · ${time}` : `${day} ${d.getFullYear()}`;
};

// Each list row is one Dashboard entry: a single shipment, or a whole Multiple-LEO
// session (represented by its parent, with all shipments embedded for expansion).
// A Multiple-LEO session counts as ONE entry toward pagination.
function buildUnits(jobs) {
  return jobs.map((job) => {
    if (job.shipmentType === 'multiple' && job.uploadSessionId) {
      const members = (job.sessionShipments && job.sessionShipments.length ? job.sessionShipments : [job])
        .slice()
        .sort((a, b) => (a.shipmentIndex || 0) - (b.shipmentIndex || 0));
      return { type: 'group', sessionId: job.uploadSessionId, count: job.sessionCount || members.length, members };
    }
    return { type: 'single', job };
  });
}

// Short, stable, human-friendly session code from the uploadSessionId (a UUID).
const sessionCode = (id) => String(id || '').replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase();

const STATUS_OPTIONS = Object.keys(STATUS_META);
const EMPTY_FILTERS = { q: '', jobNumber: '', hblNumber: '', status: '', reportType: '', dateFrom: '', dateTo: '' };
const isActive = (s) => ['uploading', 'analyzing', 'generating'].includes(s);

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState({});
  const firstLoad = useRef(true);
  const toggleSession = (id) => setExpandedSessions((s) => ({ ...s, [id]: !s[id] }));
  // Group Multiple-LEO shipments by their upload session; single jobs stay standalone.
  const units = useMemo(() => buildUnits(data?.data || []), [data]);

  useEffect(() => {
    aiApi.templates().then((r) => setTemplates(r.templates || [])).catch(() => {});
  }, []);

  const loadSummary = useCallback(() => {
    jobApi.summary().then((r) => setSummary(r.summary)).catch(() => {});
  }, []);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  const load = useCallback(async () => {
    try {
      const params = { page, limit: 20, sort, order };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await jobApi.list(params);
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, sort, order, filters]);

  // Debounced reload on filter/sort/page changes.
  useEffect(() => {
    const t = setTimeout(load, firstLoad.current ? 0 : 350);
    firstLoad.current = false;
    return () => clearTimeout(t);
  }, [load]);

  // Poll while any job is still processing.
  useEffect(() => {
    const inProgress = data?.data?.some((j) => isActive(j.status));
    if (!inProgress) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [data, load]);

  const setFilter = (k, v) => { setPage(1); setFilters((f) => ({ ...f, [k]: v })); };
  const clearFilters = () => { setPage(1); setFilters(EMPTY_FILTERS); };
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'q' && v).length;

  const toggleSort = (col) => {
    if (sort === col) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(col); setOrder(col === 'createdAt' ? 'desc' : 'asc'); }
  };
  const SortHead = ({ col, label, className = '' }) => (
    <th className={`px-4 py-2.5 font-medium ${className}`}>
      <button onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 hover:text-slate-700">
        {label}
        {sort === col ? (order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );

  const remove = async (id, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!confirm('Delete this job and its report?')) return;
    try {
      await jobApi.remove(id);
      toast.success('Deleted');
      load();
      loadSummary();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };


  if (loading) return <PageLoader />;

  const jobs = data?.data || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">{isAdmin ? 'All shipment jobs across the team' : 'Your shipment jobs'}</p>
        </div>
        <Link to="/jobs/new" className="btn-primary">
          <FilePlus2 className="h-4 w-4" /> New Analysis
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <SummaryCard icon={Layers} label="Total Jobs" value={summary?.total} color="text-slate-600" bg="bg-slate-100" />
        <SummaryCard icon={FileText} label="HBL Generated" value={summary?.hblGenerated} color="text-brand-600" bg="bg-brand-50" />
        <SummaryCard icon={Ship} label="MBL Generated" value={summary?.mblGenerated} color="text-indigo-600" bg="bg-indigo-50" />
        <SummaryCard icon={ShieldCheck} label="ISF Generated" value={summary?.isfGenerated} color="text-amber-600" bg="bg-amber-50" />
        <SummaryCard icon={Clock} label="Pending Reviews" value={summary?.pendingReviews} color="text-orange-600" bg="bg-orange-50" />
        <SummaryCard icon={CheckCircle2} label="Completed" value={summary?.completed} color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      {/* Search + filter toggle */}
      <div className="flex flex-wrap items-center gap-1">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by Job Number or HBL Number…"
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
          />
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className={`btn-ghost ${activeFilterCount ? 'border-brand-300 text-brand-700' : ''}`}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {activeFilterCount > 0 && <span className="badge bg-brand-100 text-brand-700">{activeFilterCount}</span>}
        </button>
        <button onClick={() => { load(); loadSummary(); }} className="btn-ghost" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Job Number">
            <input className="input" value={filters.jobNumber} onChange={(e) => setFilter('jobNumber', e.target.value)} placeholder="e.g. JOB-2026" />
          </Field>
          <Field label="HBL Number">
            <input className="input" value={filters.hblNumber} onChange={(e) => setFilter('hblNumber', e.target.value)} placeholder="House B/L" />
          </Field>
          <Field label="Status">
            <select className="input" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </Field>
          <Field label="Report Type">
            <select className="input" value={filters.reportType} onChange={(e) => setFilter('reportType', e.target.value)}>
              <option value="">All types</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="From date">
            <input type="date" className="input" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} />
          </Field>
          <Field label="To date">
            <input type="date" className="input" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button onClick={clearFilters} className="btn-ghost" disabled={!activeFilterCount}>
              <X className="h-4 w-4" /> Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {jobs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <FileText className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No jobs found</p>
          <p className="text-sm text-slate-400">{activeFilterCount || filters.q ? 'Try adjusting your filters.' : 'Upload export documents to get started.'}</p>
          <Link to="/jobs/new" className="btn-primary mt-2"><FilePlus2 className="h-4 w-4" /> New Analysis</Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <SortHead col="jobNumber" label="Job Number" />
                <SortHead col="hblNumber" label="HBL Number" className="hidden md:table-cell" />
                {isAdmin && <th className="px-4 py-2.5 font-medium">Username</th>}
                <SortHead col="createdAt" label="Created" />
                <SortHead col="status" label="Status" />
                <th className="px-4 py-2.5 font-medium text-center hidden sm:table-cell">Docs</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => {
                if (u.type === 'single') {
                  return <JobRow key={u.job._id} job={u.job} isAdmin={isAdmin} remove={remove} />;
                }
                const open = !!expandedSessions[u.sessionId];
                const colCount = 6 + (isAdmin ? 1 : 0);
                return (
                  <Fragment key={u.sessionId}>
                    <tr className="border-l-4 border-indigo-400 bg-indigo-50/60">
                      <td colSpan={colCount} className="px-4 py-2.5">
                        <button onClick={() => toggleSession(u.sessionId)} className="flex w-full items-center gap-2 text-left">
                          {open ? <ChevronDown className="h-4 w-4 text-indigo-600" /> : <ChevronRight className="h-4 w-4 text-indigo-600" />}
                          <Layers className="h-4 w-4 text-indigo-600" />
                          <span className="font-semibold text-indigo-800">Multiple LEO Shipment — Session #{sessionCode(u.sessionId)}</span>
                          <span className="badge bg-indigo-100 text-indigo-700">{u.count} Shipment{u.count > 1 ? 's' : ''}</span>
                        </button>
                      </td>
                    </tr>
                    {open && u.members.map((job) => (
                      <JobRow key={job._id} job={job} isAdmin={isAdmin} remove={remove} nested />
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data?.pagination?.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost">Previous</button>
          <span className="text-sm text-slate-500">Page {data.pagination.page} of {data.pagination.pages}</span>
          <button disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)} className="btn-ghost">Next</button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

// HBL/MBL/ISF action button — a link when its prerequisite is met, otherwise a
// locked, disabled chip. Each opens the document's generate/edit/download page.
function DocButton({ to, icon: Icon, label, enabled, color, bg, title }) {
  if (!enabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 rounded bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-300" title={title}>
        <Lock className="h-3 w-3" /> {label}
      </span>
    );
  }
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()} className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${color} ${bg}`} title={title}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}

// A single shipment row. `nested` styles it as a member of a Multiple-LEO group.
function JobRow({ job, isAdmin, remove, nested = false }) {
  return (
    <tr className={`hover:bg-slate-50/60 ${nested ? 'bg-indigo-50/20' : ''}`}>
      <td className={`px-4 py-3 ${nested ? 'pl-10' : ''}`}>
        {nested && job.shipmentIndex && (
          <span className="mb-0.5 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
            Shipment {job.shipmentIndex}
          </span>
        )}
        <Link to={`/jobs/${job._id}`} className="block font-medium text-slate-800 hover:text-brand-600">{job.jobNumber || '—'}</Link>
        {(job.exporterName || job.shippingBillNumber) && (
          <p className="text-xs text-slate-400">
            {job.exporterName || ''}{job.exporterName && job.shippingBillNumber ? ' · ' : ''}{job.shippingBillNumber ? `SB: ${job.shippingBillNumber}` : ''}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{job.hblNumber || '—'}</td>
      {isAdmin && (
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            <User className="h-3 w-3 text-slate-400" />
            {job.owner?.username || job.owner?.fullName || '—'}
          </span>
        </td>
      )}
      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{compactDate(job.createdAt)}</td>
      <td className="px-4 py-3">
        <StatusBadge status={job.status} />
        {isActive(job.status) && (
          <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${job.progress || 0}%` }} />
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center text-slate-600 hidden sm:table-cell">{job.documents?.length ?? 0}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <DocButton
            to={`/jobs/${job._id}`} icon={FileText} label="HBL"
            enabled={job.status === 'completed'}
            color="text-brand-600" bg="bg-brand-50 hover:bg-brand-100"
            title={job.status === 'completed' ? 'Generate / edit / download HBL' : 'HBL available after analysis completes'}
          />
          <DocButton
            to={`/jobs/${job._id}/mbl`} icon={Ship} label="MBL"
            enabled={Boolean(job.shipmentReport?.generated)}
            color="text-indigo-600" bg="bg-indigo-50 hover:bg-indigo-100"
            title={job.shipmentReport?.generated ? 'Generate / edit / download MBL' : 'Generate the HBL first'}
          />
          <DocButton
            to={`/jobs/${job._id}/isf`} icon={ShieldCheck} label="ISF"
            enabled={Boolean(job.shipmentReport?.generated)}
            color="text-amber-700" bg="bg-amber-50 hover:bg-amber-100"
            title={job.shipmentReport?.generated ? 'Generate / edit / download ISF' : 'Generate the HBL first'}
          />
          {isAdmin && (
            <button onClick={(e) => remove(job._id, e)} className="rounded p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500" title="Delete (admin only)">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight text-slate-800">{value ?? '—'}</p>
        <p className="truncate text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      </div>
    </div>
  );
}
