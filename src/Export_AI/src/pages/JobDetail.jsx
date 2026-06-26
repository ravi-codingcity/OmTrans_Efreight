import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Download, FileText, AlertTriangle, CheckCircle2, HelpCircle,
  FileWarning, Sparkles, Cpu,
} from 'lucide-react';
import { jobApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ProcessTracker from '../components/ProcessTracker.jsx';
import SeaWaybillResult from '../components/SeaWaybillResult.jsx';
import ShipmentReviewForm from '../components/ShipmentReviewForm.jsx';
import AnalysisView from '../components/AnalysisView.jsx';
import { FIELD_STATUS_META, prettyField, formatDate, scoreColor } from '../lib/format.js';

const isActive = (s) => ['uploading', 'analyzing', 'generating'].includes(s);

export default function JobDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { job } = await jobApi.get(id);
      setJob(job);
      return job;
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while processing; stop once terminal.
  useEffect(() => {
    if (!job) return;
    if (isActive(job.status)) {
      pollRef.current = setInterval(load, 2500);
      return () => clearInterval(pollRef.current);
    }
    clearInterval(pollRef.current);
  }, [job, load]);

  const download = async (format, template) => {
    setDownloading(format);
    try {
      const res = await jobApi.download(id, format, template);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      const suffix = template === 'sea_waybill' ? '-sea-waybill' : '-report';
      a.href = url;
      a.download = `${(job.jobNumber || 'document').replace(/[^\w.\- ]+/g, '_')}${suffix}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <PageLoader />;
  if (!job) return <p className="text-slate-500">Job not found.</p>;

  const c = job.consolidated || {};
  const comparison = c.comparison || [];
  const matches = comparison.filter((r) => r.status === 'match').length;
  const conflicts = (c.discrepancies || []).length;
  const missing = (c.missingFields || []).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{job.jobNumber}</h1>
          <p className="text-sm text-slate-500">
            {job.hblNumber ? `HBL: ${job.hblNumber} · ` : ''}Created {formatDate(job.createdAt)}
            {isAdmin && job.owner && ` · by ${job.owner.username || job.owner.fullName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(job.aiModelUsed || job.aiModel) && (
            <span className="badge bg-slate-100 text-slate-600" title="AI model used for this analysis">
              <Cpu className="h-3 w-3" /> {job.aiModelUsed || job.aiModel}
            </span>
          )}
          <StatusBadge status={job.status} />
        </div>
      </div>

      <ProcessTracker status={job.status} progress={job.progress} />

      {isActive(job.status) && (
        <p className="text-center text-sm text-slate-500">{job.statusMessage || 'Working…'}</p>
      )}

      {job.status === 'failed' && (
        <div className="card flex items-start gap-3 border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Processing failed</p>
            <p className="text-sm">{job.error || 'An unexpected error occurred.'}</p>
          </div>
        </div>
      )}

      {/* Source documents */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Source Documents</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(job.documents || []).map((d) => (
            <div key={d._id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{d.originalName}</p>
                <p className="text-xs text-slate-400">
                  {prettyField(d.detectedType)}
                  {d.confidence ? ` · ${Math.round(d.confidence * 100)}% confidence` : ''}
                </p>
                {d.status === 'failed' && d.error && (
                  <p className="mt-1 text-xs text-red-600">{d.error}</p>
                )}
              </div>
              <span className={`badge ${d.status === 'failed' ? 'bg-red-100 text-red-600' : d.status === 'extracted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {d.status === 'extracted' ? 'analyzed' : d.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {job.status === 'completed' && (
        <>
          {/* Structured review form — edit extracted values, then generate final Word/PDF */}
          <ShipmentReviewForm
            mode="hbl"
            jobId={job._id}
            jobNumber={job.jobNumber}
            serverData={job.shipmentReport?.data}
            aiData={job.shipmentReport?.aiData}
            generated={job.shipmentReport?.generated}
            pdfEngine={job.shipmentReport?.pdfEngine}
            onChanged={load}
          />
          <SeaWaybillResult job={job} onDownload={download} downloading={downloading} />

          {/* In-app detailed analysis (never part of the downloadable files) */}
          <AnalysisView analysis={job.analysis} />

          {/* Cross-document validation is shown only for the Consolidated Report output. */}
          {job.outputTemplate === 'consolidated_report' && (
          <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Cross-Document Validation
          </h2>

          {/* Summary scorecard */}
          <section className="grid gap-4 sm:grid-cols-4">
            <div className="card flex flex-col items-center justify-center p-4">
              <p className={`text-3xl font-bold ${scoreColor(c.validationScore)}`}>{c.validationScore}%</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">Consistency</p>
            </div>
            <Stat icon={CheckCircle2} value={matches} label="Matched fields" color="text-emerald-600" />
            <Stat icon={AlertTriangle} value={conflicts} label="Conflicts" color="text-red-600" />
            <Stat icon={FileWarning} value={missing} label="Missing fields" color="text-amber-600" />
          </section>

          {/* AI summary + downloads */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <Sparkles className="h-4 w-4 text-brand-500" /> Executive Summary
              </h2>
              <div className="flex gap-2">
                <button onClick={() => download('pdf', 'consolidated_report')} disabled={downloading} className="btn-primary">
                  <Download className="h-4 w-4" /> {downloading === 'pdf' ? 'Preparing…' : 'PDF'}
                </button>
                <button onClick={() => download('docx', 'consolidated_report')} disabled={downloading} className="btn-ghost">
                  <Download className="h-4 w-4" /> {downloading === 'docx' ? 'Preparing…' : 'DOCX'}
                </button>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{c.summary}</p>
          </section>

          {/* Conflicts */}
          {conflicts > 0 && (
            <section className="card border-red-200 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-600">
                <AlertTriangle className="h-4 w-4" /> Discrepancies & Conflicts
              </h2>
              <div className="space-y-3">
                {c.discrepancies.map((d, i) => (
                  <div key={i} className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                    <p className="mb-1 font-medium text-slate-800">{prettyField(d.field)}</p>
                    <ul className="space-y-0.5 text-sm text-slate-600">
                      {d.values.map((v, j) => (
                        <li key={j} className="flex gap-2">
                          <span className="text-slate-400">{v.documentName}:</span>
                          <span className="font-medium">{String(v.value)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-sm text-emerald-700">Resolved to: <span className="font-medium">{String(d.resolvedTo)}</span></p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Consolidated field table */}
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Consolidated & Validated Fields</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2 font-medium">Field</th>
                    <th className="px-5 py-2 font-medium">Consolidated Value</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 font-medium">Sources</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {comparison.map((row) => {
                    const meta = FIELD_STATUS_META[row.status];
                    return (
                      <tr key={row.field} className="hover:bg-slate-50/50">
                        <td className="px-5 py-2.5 font-medium text-slate-700">{prettyField(row.field)}</td>
                        <td className="px-5 py-2.5 text-slate-600">{row.consolidatedValue ?? '—'}</td>
                        <td className="px-5 py-2.5">
                          <span className={`badge ${meta.color}`}>{meta.label}</span>
                        </td>
                        <td className="px-5 py-2.5 text-xs text-slate-400">{row.sources?.length || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Missing fields */}
          {missing > 0 && (
            <section className="card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-600">
                <HelpCircle className="h-4 w-4" /> Missing / Unverified Fields
              </h2>
              <div className="flex flex-wrap gap-2">
                {c.missingFields.map((f) => (
                  <span key={f} className="badge bg-slate-100 text-slate-500">{prettyField(f)}</span>
                ))}
              </div>
            </section>
          )}
          </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, value, label, color }) {
  return (
    <div className="card flex flex-col items-center justify-center p-4">
      <Icon className={`mb-1 h-5 w-5 ${color}`} />
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
