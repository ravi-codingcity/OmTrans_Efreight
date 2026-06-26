import { useState } from 'react';
import {
  FileSearch, FileText, Star, GitCompareArrows, FileWarning, ChevronDown, ListChecks, Scale, CheckCircle2, AlertTriangle,
} from 'lucide-react';

function Card({ icon: Icon, title, count, children }) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4 text-brand-500" /> {title}
        {count != null && <span className="badge bg-slate-100 text-slate-500">{count}</span>}
      </h3>
      {children}
    </div>
  );
}

/**
 * Detailed extraction analysis — shown in the app ONLY (never in the report files):
 * source mapping, primary source, conflicts, why each value was chosen, and
 * document-wise findings.
 */
export default function AnalysisView({ analysis }) {
  const [open, setOpen] = useState(false);
  if (!analysis) return null;

  const { documentsAnalyzed = [], primarySources = [], fieldSources = [], conflicts = [], missing = [], perDocument = [], weightCheck = null } = analysis;

  return (
    <section className="space-y-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileSearch className="h-4 w-4 text-brand-600" /> Detailed Analysis Summary
          <span className="text-xs font-normal text-slate-400">(in-app only — not included in the report)</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4">
          {/* Multi-container Gross Weight + Quantity validation (Forwarding Note vs Shipping Bill) */}
          {weightCheck?.isMulti && (
            <div className={`card p-5 ${weightCheck.mismatch || weightCheck.qtyMismatch ? 'border-amber-300 bg-amber-50/50' : ''}`}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <Scale className="h-4 w-4 text-brand-500" /> Container-wise Weight &amp; Quantity
                <span className="badge bg-slate-100 text-slate-500">{weightCheck.containers.length} containers</span>
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2 font-medium">Container No.</th>
                      <th className="px-3 py-2 font-medium">Quantity (PKG)</th>
                      <th className="px-3 py-2 font-medium">Gross Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weightCheck.containers.map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-slate-700">{c.containerNo}</td>
                        <td className={`px-3 py-2 ${c.packages === 'Not Found' ? 'italic text-amber-600' : 'text-slate-600'}`}>{c.packages}</td>
                        <td className={`px-3 py-2 ${c.weight === 'Not Found' ? 'italic text-amber-600' : 'text-slate-600'}`}>{c.weight}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50/60 font-medium text-slate-700">
                      <td className="px-3 py-2">Shipping Bill total</td>
                      <td className="px-3 py-2">{weightCheck.shippingBillQty}</td>
                      <td className="px-3 py-2">{weightCheck.shippingBillTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 space-y-1.5">
                {weightCheck.mismatch ? (
                  <p className="flex items-start gap-2 text-sm text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    Weight warning: container weights (Forwarding Note) don’t sum to the Shipping Bill total ({weightCheck.shippingBillTotal}). Please verify.
                  </p>
                ) : weightCheck.missingWeights?.length ? (
                  <p className="flex items-start gap-2 text-sm text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Weight not found for: {weightCheck.missingWeights.join(', ')}.
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Container weights match the Shipping Bill total ({weightCheck.shippingBillTotal}).
                  </p>
                )}
                {weightCheck.qtyMismatch ? (
                  <p className="flex items-start gap-2 text-sm text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    Quantity warning: container package counts (Forwarding Note) don’t sum to the Shipping Bill total ({weightCheck.shippingBillQty}). Please verify.
                  </p>
                ) : weightCheck.missingPackages?.length ? (
                  <p className="flex items-start gap-2 text-sm text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Package count not found for: {weightCheck.missingPackages.join(', ')}.
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Container quantities match the Shipping Bill total ({weightCheck.shippingBillQty}).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Documents analyzed + primary source */}
          <Card icon={FileText} title="Documents Analyzed" count={documentsAnalyzed.length}>
            <div className="space-y-2">
              {documentsAnalyzed.map((d) => (
                <div key={d.name} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-700">{d.name}</span>
                  <span className="badge bg-slate-100 capitalize text-slate-500">{d.type}</span>
                  {d.isPrimary && <span className="badge bg-amber-100 text-amber-700"><Star className="h-3 w-3" /> Primary source</span>}
                  <span className="text-xs text-slate-400">{d.fieldCount} fields · {d.status}</span>
                </div>
              ))}
            </div>
            {primarySources.length > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Primary source(s) prioritized: <span className="font-medium">{primarySources.join(', ')}</span> — their values override conflicting data.
              </p>
            )}
          </Card>

          {/* Field-by-field source mapping */}
          <Card icon={ListChecks} title="Field Source Mapping" count={fieldSources.length}>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Field</th>
                    <th className="px-3 py-2 font-medium">Selected Value</th>
                    <th className="px-3 py-2 font-medium">Source(s)</th>
                    <th className="px-3 py-2 font-medium">Why selected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fieldSources.map((f, i) => (
                    <tr key={i} className={f.conflict ? 'bg-red-50/40' : ''}>
                      <td className="px-3 py-2 font-medium text-slate-700">{f.field}</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-pre-line">{String(f.value)}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {f.sources.map((s, j) => (
                          <div key={j} className={s.primary ? 'font-medium text-amber-700' : ''}>
                            {s.document}: {String(s.value)}{s.primary ? ' ★' : ''}
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{f.reason}</td>
                    </tr>
                  ))}
                  {fieldSources.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-3 text-center text-slate-400">No fields extracted.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <Card icon={GitCompareArrows} title="Conflicting Values Across Documents" count={conflicts.length}>
              <div className="space-y-3">
                {conflicts.map((c, i) => (
                  <div key={i} className="rounded-lg border border-red-100 bg-red-50/40 p-3">
                    <p className="text-sm font-medium text-slate-800">{c.field}</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
                      {c.values.map((v, j) => (
                        <li key={j} className={v.primary ? 'font-medium text-amber-700' : ''}>
                          {v.document}: “{String(v.value)}”{v.primary ? ' ★ primary' : ''}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-emerald-700">Resolved to “{String(c.resolvedTo)}” — {c.reason}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Missing */}
          <Card icon={FileWarning} title="Missing Information" count={missing.length}>
            {missing.length === 0 ? (
              <p className="text-sm text-emerald-700">All relevant fields were found.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {missing.map((m) => <span key={m} className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">{m}</span>)}
              </div>
            )}
          </Card>

          {/* Document-wise findings */}
          <Card icon={FileText} title="Document-wise Extracted Information">
            <div className="grid gap-3 md:grid-cols-2">
              {perDocument.map((d) => (
                <div key={d.name} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{d.name}</span>
                    {d.isPrimary && <span className="badge bg-amber-100 text-amber-700">Primary</span>}
                  </div>
                  <dl className="space-y-0.5 text-xs">
                    {Object.entries(d.fields).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="shrink-0 text-slate-400">{k}:</dt>
                        <dd className="text-slate-700">{v}</dd>
                      </div>
                    ))}
                    {Object.keys(d.fields).length === 0 && <p className="text-slate-400">No relevant fields.</p>}
                  </dl>
                  {(d.hsCodes.length > 0 || d.seals.length > 0 || d.containerCount > 0) && (
                    <p className="mt-2 text-xs text-slate-400">
                      {d.containerCount > 0 && `${d.containerCount} container(s) · `}
                      {d.hsCodes.length > 0 && `HSN: ${d.hsCodes.join(', ')} · `}
                      {d.seals.length > 0 && `Seals: ${d.seals.join(', ')}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
