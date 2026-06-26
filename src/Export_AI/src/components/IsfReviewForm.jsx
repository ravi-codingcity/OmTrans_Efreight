import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Save, RotateCcw, FileCheck2, Loader2, ShieldCheck, CheckCircle2, ChevronDown, Eye } from 'lucide-react';
import { jobApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import PreviewModal from './PreviewModal.jsx';
import { docxToPdfBlob, downloadBlob } from '../lib/docxRender.js';

const isFaithfulPdf = (engine) => engine === 'overlay' || engine === 'word' || engine === 'libreoffice';

const clone = (o) => JSON.parse(JSON.stringify(o || {}));

// ISF sections + fields (key → label). `area` = multiline; `wide` spans full width.
const SECTIONS = [
  {
    id: 'parties', title: 'Parties',
    fields: [
      { key: 'manufacturer', label: 'Manufacturer / Supplier', area: true },
      { key: 'seller', label: 'Seller', area: true },
      { key: 'stuffingLocation', label: 'Container Stuffing Location', area: true },
      { key: 'consolidator', label: 'Consolidator (Stuffer) / Export Forwarder', area: true },
      { key: 'buyer', label: 'Buyer (Importer of Record) and ID Number', area: true },
      { key: 'shipTo', label: 'Ship To', area: true },
    ],
  },
  {
    id: 'refs', title: 'References & Vessel',
    fields: [
      { key: 'hblNo', label: 'HBL No.' },
      { key: 'mblNo', label: 'MBL No.' },
      { key: 'scacCode', label: 'SCAC Code' },
      { key: 'amsNo', label: 'AMS No.' },
      { key: 'vesselVoyage', label: 'Vessel Name and Voyage Number', wide: true },
      { key: 'vesselEtd', label: 'Vessel ETD (Port of Loading)', wide: true },
      { key: 'vesselEta', label: 'Vessel ETA at US Port of Discharge', wide: true },
      { key: 'countryOfOrigin', label: 'Country of Origin' },
      { key: 'containerNo', label: 'Container No.', wide: true },
    ],
  },
  {
    id: 'goods', title: 'Goods & Invoice',
    fields: [
      { key: 'commodityDescription', label: 'Commodity Description of Goods (Booking Confirmation)', area: true, wide: true },
      { key: 'htsNumber', label: 'HTS / Harmonized Tariff Number' },
      { key: 'invoiceNumber', label: 'Invoice Number' },
      { key: 'invoiceDate', label: 'Invoice Date' },
    ],
  },
];

/**
 * ISF Review & Edit form. Pre-filled from finalized HBL/MBL + Booking Confirmation
 * (plus fixed values). The user edits any field, then Save & Generate produces the
 * ISF Word + PDF from the ISF Format template using the saved values.
 */
export default function IsfReviewForm({ jobId, jobNumber, serverData, generated, pdfEngine, onChanged }) {
  const navigate = useNavigate();
  const [data, setData] = useState(() => clone(serverData));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [open, setOpen] = useState({ parties: true, refs: true, goods: true });
  const [preview, setPreview] = useState({ open: false, mode: 'docx', pdfUrl: '', docxBlob: null, loading: false });
  const [previewDownloading, setPreviewDownloading] = useState(null);

  useEffect(() => { setData(clone(serverData)); }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(serverData), [data, serverData]);
  if (!data) return null;

  const set = (key, value) => setData((d) => ({ ...d, [key]: value }));
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const save = async () => {
    setSaving(true);
    try { await jobApi.saveIsfData(jobId, data); toast.success('ISF saved'); await onChanged?.(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };
  const reset = () => { setData(clone(serverData)); toast('Reverted to last saved'); };
  const generate = async () => {
    setGenerating(true);
    try {
      if (dirty) await jobApi.saveIsfData(jobId, data);
      await jobApi.generateIsf(jobId);
      // ISF offers both Word and PDF; stay on the page and reveal both downloads.
      toast.success('Document saved successfully. Your Word and PDF documents are ready for download.');
      await onChanged?.();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setGenerating(false); }
  };
  const fileName = (format) => `${(jobNumber || 'ISF').replace(/[^\w.\- ]+/g, '_')}-isf.${format}`;

  // Fetch the requested format as a Blob, building the PDF from the real ISF DOCX
  // template client-side whenever the server has no faithful office-engine PDF.
  const fetchDoc = async (format) => {
    if (format === 'pdf' && !isFaithfulPdf(pdfEngine)) {
      const docx = await jobApi.download(jobId, 'docx', 'isf');
      return docxToPdfBlob(docx.data);
    }
    const res = await jobApi.download(jobId, format, 'isf');
    return res.data;
  };

  const download = async (format) => {
    setDownloading(format);
    try {
      downloadBlob(await fetchDoc(format), fileName(format));
      toast.success(`${format.toUpperCase()} downloaded — returning to dashboard`);
      setTimeout(() => navigate('/'), 900);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDownloading(null); }
  };

  // Build (if needed) and show a live preview rendered from the real ISF template.
  const openPreview = async () => {
    setPreview({ open: true, mode: 'docx', pdfUrl: '', docxBlob: null, loading: true });
    try {
      let engine = pdfEngine;
      if (dirty || !generated) {
        if (dirty) await jobApi.saveIsfData(jobId, data);
        const r = await jobApi.generateIsf(jobId);
        engine = r.pdfEngine;
        await onChanged?.();
      }
      if (isFaithfulPdf(engine)) {
        const res = await jobApi.download(jobId, 'pdf', 'isf');
        setPreview({ open: true, mode: 'pdf', pdfUrl: URL.createObjectURL(res.data), docxBlob: null, loading: false });
      } else {
        const res = await jobApi.download(jobId, 'docx', 'isf');
        setPreview({ open: true, mode: 'docx', pdfUrl: '', docxBlob: res.data, loading: false });
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      setPreview({ open: false, mode: 'docx', pdfUrl: '', docxBlob: null, loading: false });
    }
  };
  const closePreview = () => setPreview((p) => { if (p.pdfUrl) URL.revokeObjectURL(p.pdfUrl); return { open: false, mode: 'docx', pdfUrl: '', docxBlob: null, loading: false }; });
  const previewDownload = async (format) => {
    setPreviewDownloading(format);
    try {
      let blob;
      if (format === 'pdf' && preview.mode === 'docx' && preview.docxBlob) blob = await docxToPdfBlob(preview.docxBlob);
      else if (format === 'docx' && preview.docxBlob) blob = preview.docxBlob;
      else blob = await fetchDoc(format);
      downloadBlob(blob, fileName(format));
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setPreviewDownloading(null); }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <ShieldCheck className="h-4 w-4 text-brand-500" /> Review &amp; Edit ISF Data
        </h2>
        <span className={`badge ${generated && !dirty ? 'bg-emerald-100 text-emerald-700' : dirty ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
          {generated && !dirty ? 'Generated' : dirty ? 'Unsaved edits' : 'Not generated yet'}
        </span>
      </div>
      <p className="text-xs text-slate-400">
        Pre-filled from the finalized HBL/MBL and Booking Confirmation. Manufacturer/Seller/Stuffing = Shipper; Buyer/Ship To = Consignee; Consolidator, Country of Origin, SCAC &amp; AMS are fixed. Edit anything before generating.
      </p>

      {SECTIONS.map((sec) => (
        <Section key={sec.id} title={sec.title} open={open[sec.id]} onToggle={() => toggle(sec.id)}>
          <div className="grid gap-2.5 md:grid-cols-3">
            {sec.fields.map((f) => (
              <Field key={f.key} label={f.label} wide={f.wide}>
                {f.area
                  ? <textarea rows={2} className="cell resize-y" value={data[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
                  : <input className="cell" value={data[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />}
              </Field>
            ))}
          </div>
        </Section>
      ))}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
        <button onClick={save} disabled={!dirty || saving} className="btn-ghost text-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
        <button onClick={reset} disabled={!dirty} className="btn-ghost text-sm"><RotateCcw className="h-4 w-4" /> Reset</button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={openPreview} disabled={generating} className="btn-ghost text-sm" title="Generate & preview before downloading">
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button onClick={generate} disabled={generating} className="btn-primary text-sm">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            {generated && !dirty ? 'Re-generate' : 'Save & Generate'}
          </button>
          {generated && !dirty && (
            <>
              <button onClick={() => download('pdf')} disabled={downloading} className="btn-primary text-sm"><Download className="h-4 w-4" /> {downloading === 'pdf' ? '…' : 'Download PDF'}</button>
              <button onClick={() => download('docx')} disabled={downloading} className="btn-ghost text-sm"><Download className="h-4 w-4" /> {downloading === 'docx' ? '…' : 'Download DOCX'}</button>
            </>
          )}
        </div>
      </div>

      <PreviewModal
        open={preview.open}
        title={`ISF Preview — ${jobNumber || ''}`}
        mode={preview.mode}
        pdfUrl={preview.pdfUrl}
        docxBlob={preview.docxBlob}
        loading={preview.loading}
        downloading={previewDownloading}
        onDownload={previewDownload}
        onClose={closePreview}
      />
      {generated && !dirty && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> ISF Word &amp; PDF are ready and reflect the reviewed data.</p>
      )}

      <style>{`.cell{width:100%;border:1px solid rgb(226 232 240);border-radius:6px;padding:5px 8px;font-size:13px;line-height:1.3;background:#fff;outline:none}
.cell:focus{border-color:rgb(99 102 241);box-shadow:0 0 0 2px rgba(99,102,241,.15)}`}</style>
    </section>
  );
}

function Section({ title, open, onToggle, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50" onClick={onToggle}>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? '' : '-rotate-90'}`} /> {title}
        </h3>
      </div>
      {open && <div className="border-t border-slate-100 p-3 sm:p-4">{children}</div>}
    </div>
  );
}

function Field({ label, wide, children }) {
  return (
    <div className={wide ? 'md:col-span-3' : ''}>
      <label className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}
