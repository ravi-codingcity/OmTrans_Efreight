import { Download, AlertTriangle, FileWarning, FileCheck2 } from 'lucide-react';

const empty = (v) => v === undefined || v === null || String(v).trim() === '';

function Field({ label, value }) {
  return (
    <div className="break-inside-avoid">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {empty(value) ? (
        <p className="text-sm italic text-slate-300">— not found —</p>
      ) : (
        <p className="whitespace-pre-line text-sm font-medium text-slate-800">{value}</p>
      )}
    </div>
  );
}

function Grid({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            {columns.map((c) => (
              <th key={c.key} className="border-b border-slate-200 px-2 py-1.5 font-semibold">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows?.length ? rows : [Object.fromEntries(columns.map((c) => [c.key, '']))]).map((r, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-1.5 align-top text-slate-700 whitespace-pre-line">
                  {empty(r[c.key]) ? <span className="text-slate-300">—</span> : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SeaWaybillResult({ job, onDownload, downloading }) {
  const sw = job.seaWaybill;
  if (!sw?.fields) return null;
  const f = sw.fields;
  const missing = sw.missingFields || [];
  const conflicts = sw.conflicts || [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <FileCheck2 className="h-4 w-4 text-brand-500" /> Sea Waybill (Generated)
        </h2>
        <div className="flex gap-2">
          <button onClick={() => onDownload('pdf', 'sea_waybill')} disabled={downloading} className="btn-primary">
            <Download className="h-4 w-4" /> {downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
          <button onClick={() => onDownload('docx', 'sea_waybill')} disabled={downloading} className="btn-ghost">
            <Download className="h-4 w-4" /> {downloading === 'docx' ? 'Preparing…' : 'DOCX'}
          </button>
        </div>
      </div>

      {/* Required notifications — kept OUT of the generated document, surfaced here. */}
      {conflicts.length > 0 && (
        <div className="card border-red-200 bg-red-50/50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" /> {conflicts.length} conflicting value(s) detected — review before use
          </p>
          <ul className="space-y-1.5 text-sm">
            {conflicts.map((c, i) => (
              <li key={i} className="text-slate-700">
                <span className="font-medium">{c.label}:</span>{' '}
                {c.values.map((v, j) => (
                  <span key={j} className="text-slate-500">{j > 0 ? ' / ' : ''}{v.documentName}: “{String(v.value)}”</span>
                ))}
                <span className="text-emerald-700"> → used “{String(c.resolvedTo)}”</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="card border-amber-200 bg-amber-50/50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700">
            <FileWarning className="h-4 w-4" /> {missing.length} field(s) not found in the uploaded documents
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((m) => (
              <span key={m} className="badge bg-white text-amber-700 ring-1 ring-amber-200">{m}</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-amber-600">These appear blank in the generated document. Provide source documents containing them, or fill manually.</p>
        </div>
      )}

      {/* Filled template preview (mirrors the downloadable document). */}
      <div className="card p-6">
        <p className="mb-5 text-center text-base font-bold tracking-wide text-brand-700">{f.documentTitle}</p>

        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {f.topFields.map((x) => <Field key={x.label} label={x.label} value={x.value} />)}
        </div>

        <p className="mb-2 mt-6 text-sm font-semibold text-brand-700">{f.particulars.heading}</p>
        <Grid columns={f.particulars.columns} rows={f.particulars.rows} />

        <p className="mb-3 mt-6 text-sm font-semibold text-brand-700">{f.freight.heading}</p>
        <div className="mb-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {f.freight.fields.map((x) => <Field key={x.label} label={x.label} value={x.value} />)}
        </div>
        <Grid columns={f.freight.table.columns} rows={f.freight.table.rows} />

        <div className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {f.bottomFields.map((x) => <Field key={x.label} label={x.label} value={x.value} />)}
        </div>
      </div>
    </section>
  );
}
