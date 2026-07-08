import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Ship, Info, ChevronDown, FileText } from 'lucide-react';
import { jobApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { PageLoader } from '../components/Spinner.jsx';
import ShipmentReviewForm from '../components/ShipmentReviewForm.jsx';

/**
 * MBL Review & Edit page. Loads the MBL data derived from the finalized HBL record
 * (no re-analysis), pre-filled with the MBL-specific field rules, and lets the user
 * edit before generating the final MBL Word & PDF.
 */
export default function MblReview() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, data: null, generated: false, pdfEngine: undefined, dataSources: null, jobNumber: '' });

  const load = useCallback(async () => {
    try {
      const r = await jobApi.mblData(id);
      setState({ loading: false, data: r.data, generated: Boolean(r.generated), pdfEngine: r.pdfEngine, dataSources: r.dataSources || null, jobNumber: r.jobNumber });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setState((s) => ({ ...s, loading: false }));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (state.loading) return <PageLoader />;
  if (!state.data) return <p className="text-slate-500">Could not load MBL data. Finalize the HBL first.</p>;

  const sources = Array.isArray(state.dataSources) ? state.dataSources : [];

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/jobs/${id}`} className="mb-1 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-4 w-4" /> Back to HBL
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <Ship className="h-6 w-6 text-brand-500" /> Generate MBL
        </h1>
        <p className="text-sm text-slate-500">{state.jobNumber} · Consolidated Master Bill of Lading (reuses finalized HBL data)</p>
      </div>

      <ShipmentReviewForm
        mode="mbl"
        jobId={id}
        jobNumber={state.jobNumber}
        serverData={state.data}
        generated={state.generated}
        pdfEngine={state.pdfEngine}
        onChanged={load}
      />

      {sources.length > 0 && <MblDataSourceSummary sources={sources} />}
    </div>
  );
}

/**
 * Reference-only summary for the consolidated MBL (Multiple LEO with Multiple HBL):
 * shows which uploaded document each field was extracted from. Not part of the
 * generated HBL / MBL / ISF documents.
 */
function MblDataSourceSummary({ sources }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden border-brand-200">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 bg-brand-50/60 px-4 py-2.5 text-left hover:bg-brand-50">
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-800">
          <Info className="h-4 w-4 text-brand-500" /> Data Source Summary — Consolidated MBL
        </span>
        <ChevronDown className={`h-4 w-4 text-brand-500 transition ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="border-t border-brand-100">
          <p className="px-4 pt-2.5 text-xs text-slate-500">
            For reference only — shows where every field used to build the consolidated MBL was extracted from (which document and which source field). This is <strong>not</strong> included in the generated HBL, MBL or ISF.
          </p>
          <div className="overflow-x-auto p-2">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-medium">Field</th>
                  <th className="px-3 py-2 font-medium">Extracted Value</th>
                  <th className="px-3 py-2 font-medium">Source Document</th>
                  <th className="px-3 py-2 font-medium">Source Field</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sources.map((r, i) => {
                  const firstOfField = i === 0 || sources[i - 1].field !== r.field;
                  return (
                    <tr key={i} className={`align-top hover:bg-slate-50/50 ${firstOfField ? 'border-t border-slate-100' : ''}`}>
                      <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{firstOfField ? r.field : ''}</td>
                      <td className="px-3 py-2 text-slate-600" style={{ whiteSpace: 'pre-wrap' }}>{r.value || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                          <FileText className="h-3 w-3 text-slate-400" /> {r.source || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">{r.sourceField || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
