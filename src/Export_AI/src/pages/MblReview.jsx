import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Ship } from 'lucide-react';
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
  const [state, setState] = useState({ loading: true, data: null, generated: false, pdfEngine: undefined, jobNumber: '' });

  const load = useCallback(async () => {
    try {
      const r = await jobApi.mblData(id);
      setState({ loading: false, data: r.data, generated: Boolean(r.generated), pdfEngine: r.pdfEngine, jobNumber: r.jobNumber });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setState((s) => ({ ...s, loading: false }));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (state.loading) return <PageLoader />;
  if (!state.data) return <p className="text-slate-500">Could not load MBL data. Finalize the HBL first.</p>;

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/jobs/${id}`} className="mb-1 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-4 w-4" /> Back to HBL
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <Ship className="h-6 w-6 text-brand-500" /> Generate MBL
        </h1>
        <p className="text-sm text-slate-500">{state.jobNumber} · Master Bill of Lading (reuses finalized HBL data)</p>
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
    </div>
  );
}
