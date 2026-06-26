import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { jobApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { PageLoader } from '../components/Spinner.jsx';
import IsfReviewForm from '../components/IsfReviewForm.jsx';

/**
 * ISF Review & Edit page. Loads the ISF data derived from the finalized HBL/MBL +
 * Booking Confirmation (no re-analysis), then lets the user edit before generating
 * the final ISF Word & PDF.
 */
export default function IsfReview() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, data: null, generated: false, pdfEngine: undefined, jobNumber: '' });

  const load = useCallback(async () => {
    try {
      const r = await jobApi.isfData(id);
      setState({ loading: false, data: r.data, generated: Boolean(r.generated), pdfEngine: r.pdfEngine, jobNumber: r.jobNumber });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setState((s) => ({ ...s, loading: false }));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (state.loading) return <PageLoader />;
  if (!state.data) return <p className="text-slate-500">Could not load ISF data. Generate the HBL and MBL first.</p>;

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/jobs/${id}`} className="mb-1 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-4 w-4" /> Back to shipment
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <ShieldCheck className="h-6 w-6 text-brand-500" /> Generate ISF
        </h1>
        <p className="text-sm text-slate-500">{state.jobNumber} · Importer Security Filing (reuses HBL/MBL + Booking data)</p>
      </div>

      <IsfReviewForm
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
