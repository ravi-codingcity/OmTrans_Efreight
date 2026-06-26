import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Download, Save, RotateCcw, X, FileCheck2, Plus, Trash2, Loader2, ClipboardEdit,
  CheckCircle2, ChevronDown, Copy,
} from 'lucide-react';
import { jobApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { downloadBlob } from '../lib/docxRender.js';

const clone = (o) => JSON.parse(JSON.stringify(o || {}));

// Per-mode configuration. HBL edits job.shipmentReport; MBL edits job.mbl (derived
// from the finalized HBL data, with three field overrides).
const MODES = {
  hbl: {
    title: 'Review & Edit Extracted Data', numberKey: 'hblNumber', numberLabel: 'HBL Number',
    showBooking: true, autoFillNotify: false, template: 'shipment_report',
    save: jobApi.saveReportData, generate: jobApi.generate,
  },
  mbl: {
    title: 'Review & Edit MBL Data', numberKey: 'mblNumber', numberLabel: 'MBL Number',
    showBooking: false, autoFillNotify: true, template: 'mbl',
    save: jobApi.saveMblData, generate: jobApi.generateMbl,
  },
};

const DETAIL_FIELDS = [
  { label: 'Place of Receipt' },
  { label: 'Pre-Carriage By' },
  { label: 'Ocean Vessel / Voyage No. / Flag' },
  { label: 'Port of Loading (POL)' },
  { label: 'Port of Discharge (POD)' },
  { label: 'Place of Delivery' },
  { label: 'Final Destination (For Merchant Reference Only)', label2: 'Final Destination' },
];

const DESC_META = {
  containerType: { label: 'Container Type / Count' },
  goods: { label: 'Description of Goods', multiline: true, wide: true },
  hsn: { label: 'HSN Code' },
  invoiceNo: { label: 'Invoice Number' },
  invoiceDate: { label: 'Invoice Date' },
  sbNo: { label: 'Shipping Bill Number' },
  sbDate: { label: 'Shipping Bill Date' },
  iec: { label: 'IEC / BR Number' },
  netWt: { label: 'Net WT' },
  freight: { label: 'FREIGHT' },
};

/**
 * Compact structured review form, shared by the HBL and MBL workflows (`mode`).
 * Every extracted/derived value is shown in collapsible sections; the user edits,
 * then Save & Generate fills the matching template and produces the final Word + PDF
 * from the saved values. No live preview — generation is the single source of truth.
 */
export default function ShipmentReviewForm({ mode = 'hbl', jobId, jobNumber, serverData, aiData, generated, onChanged }) {
  const cfg = MODES[mode];
  const navigate = useNavigate();
  const [data, setData] = useState(() => clone(serverData));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [open, setOpen] = useState({ details: true, info: true, containers: true });

  useEffect(() => { setData(clone(serverData)); }, [jobId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(serverData), [data, serverData]);
  if (!data) return null;

  // ── field helpers ──
  const setTop = (key, value) => setData((d) => ({ ...d, [key]: value }));
  const getSummary = (label) => data.summary?.find((s) => s.label === label)?.value || '';
  const setSummary = (label, value) => setData((d) => {
    const n = clone(d); n.summary = n.summary || [];
    const f = n.summary.find((s) => s.label === label);
    if (f) f.value = value; else n.summary.push({ label, value });
    return n;
  });
  const autoFillNotify = () => { setSummary('Notify Party', getSummary('Consignee')); toast('Notify Party filled from Consignee'); };
  const setContainer = (i, key, value) => setData((d) => { const n = clone(d); n.cargo.containers[i][key] = value; return n; });
  const addContainer = () => setData((d) => { const n = clone(d); n.cargo = n.cargo || {}; n.cargo.containers = n.cargo.containers || []; n.cargo.containers.push({ containerSeal: '', quantity: '', grossWeight: '', cbm: '' }); return n; });
  const removeContainer = (i) => setData((d) => { const n = clone(d); n.cargo.containers.splice(i, 1); return n; });
  const setTotal = (key, value) => setData((d) => { const n = clone(d); n.cargo.totals = { ...(n.cargo.totals || {}), [key]: value }; return n; });
  const setDescLine = (id, value) => setData((d) => {
    const n = clone(d); n.cargo = n.cargo || {}; n.cargo.descLines = n.cargo.descLines || [];
    const l = n.cargo.descLines.find((x) => x.id === id);
    if (l) l.value = value;
    n.cargo.description = n.cargo.descLines.map((x) => (x.label ? `${x.label}: ${x.value || (x.blank ? '______________________' : '')}` : x.value)).filter((s) => s !== '').join('\n');
    return n;
  });

  const descLines = data.cargo?.descLines || [];
  const containers = data.cargo?.containers || [];
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // ── actions ──
  const save = async () => {
    setSaving(true);
    try { await cfg.save(jobId, data); toast.success('Changes saved'); await onChanged?.(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };
  const resetToAi = () => { setData(clone(aiData || serverData)); toast(mode === 'mbl' ? 'Reverted to last saved' : 'Reverted to AI-extracted values — Save to keep', { icon: '↩️' }); };
  const cancel = () => { setData(clone(serverData)); toast('Edits discarded'); };
  const generate = async () => {
    setGenerating(true);
    try {
      if (dirty) await cfg.save(jobId, data);
      await cfg.generate(jobId);
      // Stay on the page and reveal the download option immediately (HBL & MBL are
      // Word-only). The user is taken to the Dashboard only AFTER they download.
      toast.success('Document saved successfully. Your Word document is ready for download.');
      await onChanged?.();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setGenerating(false); }
  };
  const fileName = (format) => `${(jobNumber || mode.toUpperCase()).replace(/[^\w.\- ]+/g, '_')}-${mode}.${format}`;

  const download = async (format) => {
    setDownloading(format);
    try {
      const res = await jobApi.download(jobId, format, cfg.template);
      downloadBlob(res.data, fileName(format));
      toast.success(`${format.toUpperCase()} downloaded — returning to dashboard`);
      setTimeout(() => navigate('/'), 900);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDownloading(null); }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <ClipboardEdit className="h-4 w-4 text-brand-500" /> {cfg.title}
        </h2>
        <span className={`badge ${generated && !dirty ? 'bg-emerald-100 text-emerald-700' : dirty ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
          {generated && !dirty ? 'Generated' : dirty ? 'Unsaved edits' : 'Not generated yet'}
        </span>
      </div>
      {mode === 'mbl' && (
        <p className="text-xs text-slate-400">
          Pre-filled from the finalized HBL. <strong>Shipper</strong> defaults to OmTrans Logistics Ltd; <strong>Consignee</strong> &amp; <strong>Notify Party</strong> start blank. <strong>MBL Number</strong> is the Booking Confirmation No.
        </p>
      )}

      {/* ── Shipment Details ── */}
      <Section title="Shipment Details" open={open.details} onToggle={() => toggle('details')}>
        <div className="grid gap-2.5 md:grid-cols-3">
          <Field label={cfg.numberLabel}><input className="cell" value={data[cfg.numberKey] || ''} onChange={(e) => setTop(cfg.numberKey, e.target.value)} /></Field>
          {cfg.showBooking && <Field label="Booking Number"><input className="cell" value={data.bookingNumber || ''} onChange={(e) => setTop('bookingNumber', e.target.value)} /></Field>}
          <Field label="Date"><input className="cell" value={data.date || ''} placeholder="blank = today" onChange={(e) => setTop('date', e.target.value)} /></Field>
          {DETAIL_FIELDS.map((f) => (
            <Field key={f.label} label={f.label2 || f.label}>
              <input className="cell" value={getSummary(f.label)} onChange={(e) => setSummary(f.label, e.target.value)} />
            </Field>
          ))}
        </div>
        <div className="mt-2.5 grid gap-2.5 md:grid-cols-3">
          <Field label="Shipper / Exporter"><textarea rows={2} className="cell resize-y" value={getSummary('Shipper / Exporter')} onChange={(e) => setSummary('Shipper / Exporter', e.target.value)} /></Field>
          <Field label="Consignee"><textarea rows={2} className="cell resize-y" value={getSummary('Consignee')} onChange={(e) => setSummary('Consignee', e.target.value)} /></Field>
          <Field label={
            <span className="flex items-center justify-between gap-2">Notify Party
              {cfg.autoFillNotify && <button type="button" onClick={autoFillNotify} className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 hover:bg-brand-100"><Copy className="h-3 w-3" /> Auto Fill from Consignee</button>}
            </span>}>
            <textarea rows={2} className="cell resize-y" value={getSummary('Notify Party')} onChange={(e) => setSummary('Notify Party', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* ── Shipment Information ── */}
      <Section title="Shipment Information" open={open.info} onToggle={() => toggle('info')}>
        <div className="grid gap-2.5 md:grid-cols-3">
          {descLines.map((l) => {
            const meta = DESC_META[l.id] || { label: l.label || l.id };
            return (
              <Field key={l.id} label={meta.label} wide={meta.wide}>
                {meta.multiline
                  ? <textarea rows={2} className="cell resize-y" value={l.value || ''} onChange={(e) => setDescLine(l.id, e.target.value)} />
                  : <input className="cell" value={l.value || ''} placeholder={l.blank ? '(blank if N/A)' : ''} onChange={(e) => setDescLine(l.id, e.target.value)} />}
              </Field>
            );
          })}
          <Field label="Marks &amp; Numbers" wide>
            <textarea rows={2} className="cell resize-y" value={getSummary('Marks & Numbers')} placeholder="(blank if N/A)" onChange={(e) => setSummary('Marks & Numbers', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* ── Container-Wise Information ── */}
      <Section
        title={`Container-Wise Information${containers.length ? ` (${containers.length})` : ''}`}
        open={open.containers}
        onToggle={() => toggle('containers')}
        action={<button onClick={(e) => { e.stopPropagation(); addContainer(); }} className="btn-ghost text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-2 py-1.5 font-medium">#</th>
                <th className="px-2 py-1.5 font-medium">Container No. / Seal No.</th>
                <th className="w-24 px-2 py-1.5 font-medium">Qty (PKG)</th>
                <th className="w-28 px-2 py-1.5 font-medium">Gross Wt (G. WT)</th>
                <th className="w-20 px-2 py-1.5 font-medium">CBM</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {containers.map((c, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-1 py-1"><input className="cell" value={c.containerSeal || ''} onChange={(e) => setContainer(i, 'containerSeal', e.target.value)} /></td>
                  <td className="px-1 py-1"><input className="cell text-center" value={c.quantity || ''} onChange={(e) => setContainer(i, 'quantity', e.target.value)} /></td>
                  <td className="px-1 py-1"><input className="cell text-center" value={c.grossWeight || ''} onChange={(e) => setContainer(i, 'grossWeight', e.target.value)} /></td>
                  <td className="px-1 py-1"><input className="cell text-center" value={c.cbm || ''} onChange={(e) => setContainer(i, 'cbm', e.target.value)} /></td>
                  <td className="px-1 py-1 text-right">
                    <button onClick={() => removeContainer(i)} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
              {containers.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-3 text-center text-sm text-slate-400">No containers — click “Add”.</td></tr>
              )}
              {data.cargo?.totals && (
                <tr className="border-t-2 border-slate-200 font-medium">
                  <td />
                  <td className="px-2 py-1 text-right text-xs uppercase text-slate-500">Total</td>
                  <td className="px-1 py-1"><input className="cell text-center" value={data.cargo.totals.quantity || ''} onChange={(e) => setTotal('quantity', e.target.value)} /></td>
                  <td className="px-1 py-1"><input className="cell text-center" value={data.cargo.totals.grossWeight || ''} onChange={(e) => setTotal('grossWeight', e.target.value)} /></td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Action bar ── */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
        <button onClick={save} disabled={!dirty || saving} className="btn-ghost text-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
        <button onClick={resetToAi} className="btn-ghost text-sm"><RotateCcw className="h-4 w-4" /> {mode === 'mbl' ? 'Reset' : 'Reset to AI'}</button>
        <button onClick={cancel} disabled={!dirty} className="btn-ghost text-sm"><X className="h-4 w-4" /> Cancel</button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={generate} disabled={generating} className="btn-primary text-sm">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            {generated && !dirty ? 'Re-generate' : 'Save & Generate'}
          </button>
          {/* Final HBL/MBL download as DOCX. */}
          {generated && !dirty && (
            <button onClick={() => download('docx')} disabled={downloading} className="btn-primary text-sm"><Download className="h-4 w-4" /> {downloading === 'docx' ? 'Preparing…' : 'Download DOCX'}</button>
          )}
        </div>
      </div>

      {generated && !dirty && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Final Word document is ready and reflects the reviewed data.</p>
      )}

      <style>{`.cell{width:100%;border:1px solid rgb(226 232 240);border-radius:6px;padding:5px 8px;font-size:13px;line-height:1.3;background:#fff;outline:none}
.cell:focus{border-color:rgb(99 102 241);box-shadow:0 0 0 2px rgba(99,102,241,.15)}`}</style>
    </section>
  );
}

function Section({ title, open, onToggle, action, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50" onClick={onToggle}>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? '' : '-rotate-90'}`} /> {title}
        </h3>
        {action}
      </div>
      {open && <div className="border-t border-slate-100 p-3 sm:p-4">{children}</div>}
    </div>
  );
}

function Field({ label, wide, children }) {
  return (
    <div className={wide ? 'md:col-span-3' : ''}>
      {label ? <label className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{label}</label> : null}
      {children}
    </div>
  );
}
