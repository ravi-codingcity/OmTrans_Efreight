import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  IndianRupee, Coins, CalendarDays, CalendarClock, Sparkles, Crown,
  RefreshCw, FileSpreadsheet, FileText, FileDown, Cpu,
} from 'lucide-react';
import { aiApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { PageLoader } from '../components/Spinner.jsx';

const fmtInr = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

// Column definition shared by the table and every export format.
const COLUMNS = [
  { key: 'username', label: 'Username' },
  { key: 'role', label: 'Role' },
  { key: 'totalJobs', label: 'Jobs', num: true },
  { key: 'documentsUploaded', label: 'Docs Uploaded', num: true },
  { key: 'hblGenerated', label: 'HBL', num: true },
  { key: 'mblGenerated', label: 'MBL', num: true },
  { key: 'isfGenerated', label: 'ISF', num: true },
  { key: 'analyses', label: 'AI Analyses', num: true },
  { key: 'model', label: 'Gemini Model' },
  { key: 'inputTokens', label: 'Input Tokens', num: true },
  { key: 'outputTokens', label: 'Output Tokens', num: true },
  { key: 'totalTokens', label: 'Total Tokens', num: true },
  { key: 'todayCostInr', label: "Today (₹)", inr: true },
  { key: 'monthCostInr', label: 'Month (₹)', inr: true },
  { key: 'costInr', label: 'Lifetime (₹)', inr: true },
];

export default function Costing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiApi.usage();
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-slate-500">Could not load usage analytics.</p>;

  const users = data.users || [];
  const s = data.summary || {};
  const stamp = new Date().toISOString().slice(0, 10);

  // ── Export rows shared by Excel/CSV/PDF ──
  const exportRows = users.map((u) =>
    COLUMNS.reduce((row, c) => {
      row[c.label] = c.inr ? Number(u[c.key] || 0) : u[c.key];
      return row;
    }, {})
  );

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AI Usage');
    XLSX.writeFile(wb, `ai-costing-${stamp}.xlsx`);
    toast.success('Excel exported');
  };

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-costing-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('AI Costing & Usage Report', 14, 14);
    doc.setFontSize(9);
    doc.text(
      `Generated ${new Date().toLocaleString('en-IN')}  ·  Total ${fmtInr(s.totalCostInr)}  ·  Today ${fmtInr(s.todayCostInr)}  ·  Month ${fmtInr(s.monthCostInr)}  ·  Tokens ${fmtNum(s.totalTokens)}`,
      14, 20
    );
    autoTable(doc, {
      startY: 24,
      head: [COLUMNS.map((c) => c.label)],
      body: users.map((u) => COLUMNS.map((c) => (c.inr ? fmtInr(u[c.key]) : c.num ? fmtNum(u[c.key]) : u[c.key] || '—'))),
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`ai-costing-${stamp}.pdf`);
    toast.success('PDF exported');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <IndianRupee className="h-6 w-6 text-brand-500" /> AI Costing &amp; Usage
          </h1>
          <p className="text-sm text-slate-500">
            Per-user Gemini token usage and estimated cost in INR (₹ at {data.usdToInr}/USD). Super Admin only.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={exportExcel} className="btn-ghost text-sm" title="Export to Excel"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
          <button onClick={exportCsv} className="btn-ghost text-sm" title="Export to CSV"><FileText className="h-4 w-4" /> CSV</button>
          <button onClick={exportPdf} className="btn-ghost text-sm" title="Export to PDF"><FileDown className="h-4 w-4" /> PDF</button>
          <button onClick={load} className="btn-ghost" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <Card icon={IndianRupee} label="Total AI Cost" value={fmtInr(s.totalCostInr)} color="text-emerald-600" bg="bg-emerald-50" />
        <Card icon={CalendarDays} label="Today's Cost" value={fmtInr(s.todayCostInr)} color="text-brand-600" bg="bg-brand-50" />
        <Card icon={CalendarClock} label="Monthly Cost" value={fmtInr(s.monthCostInr)} color="text-indigo-600" bg="bg-indigo-50" />
        <Card icon={Coins} label="Total Tokens" value={fmtNum(s.totalTokens)} color="text-amber-600" bg="bg-amber-50" />
        <Card icon={Sparkles} label="Most Active User" value={s.mostActiveUser?.username || '—'} sub={s.mostActiveUser ? `${s.mostActiveUser.totalJobs} jobs` : ''} color="text-sky-600" bg="bg-sky-50" />
        <Card icon={Crown} label="Highest Cost User" value={s.highestCostUser?.username || '—'} sub={s.highestCostUser ? fmtInr(s.highestCostUser.costInr) : ''} color="text-rose-600" bg="bg-rose-50" />
      </div>

      {/* Per-user table */}
      {users.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Cpu className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No usage recorded yet</p>
          <p className="text-sm text-slate-400">Costs appear once users run AI analyses.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                {COLUMNS.map((c) => (
                  <th key={c.key} className={`px-3 py-2.5 font-medium ${c.num || c.inr ? 'text-right' : ''}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.userId} className="hover:bg-slate-50/60">
                  {COLUMNS.map((c) => (
                    <td key={c.key} className={`px-3 py-2.5 ${c.num || c.inr ? 'text-right tabular-nums' : ''} ${c.key === 'username' ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                      {c.inr ? fmtInr(u[c.key]) : c.num ? fmtNum(u[c.key]) : (u[c.key] || '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                <td className="px-3 py-2.5">Team Total</td>
                <td />
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(sumKey(users, 'totalJobs'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(sumKey(users, 'documentsUploaded'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(sumKey(users, 'hblGenerated'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(sumKey(users, 'mblGenerated'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(sumKey(users, 'isfGenerated'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(sumKey(users, 'analyses'))}</td>
                <td />
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(sumKey(users, 'inputTokens'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(sumKey(users, 'outputTokens'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(sumKey(users, 'totalTokens'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtInr(sumKey(users, 'todayCostInr'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtInr(sumKey(users, 'monthCostInr'))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtInr(s.totalCostInr)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

const sumKey = (arr, key) => arr.reduce((a, x) => a + (Number(x[key]) || 0), 0);

function Card({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-tight text-slate-800">{value ?? '—'}</p>
        <p className="truncate text-[11px] uppercase tracking-wide text-slate-400">{label}{sub ? ` · ${sub}` : ''}</p>
      </div>
    </div>
  );
}
