import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Cpu, Gauge, Target, DollarSign } from 'lucide-react';
import { aiApi } from '../api/endpoints.js';

const COST_COLOR = {
  Lowest: 'text-emerald-600',
  Low: 'text-emerald-600',
  Medium: 'text-amber-600',
  High: 'text-red-600',
};

function MetricPills({ model }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" /> {model.speed}</span>
      <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> {model.accuracy}</span>
      <span className={`inline-flex items-center gap-1 ${COST_COLOR[model.cost] || 'text-slate-500'}`}>
        <DollarSign className="h-3 w-3" /> {model.cost}
      </span>
    </div>
  );
}

/**
 * Reusable AI model dropdown.
 * Props:
 *  - value: selected model id
 *  - onChange(id): called when the user picks a model
 *  - compact: smaller styling for inline use (e.g. the upload page)
 */
export default function ModelSelector({ value, onChange, compact = false }) {
  const [models, setModels] = useState([]);
  const [mockMode, setMockMode] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    aiApi
      .models()
      .then((r) => {
        setModels(r.models || []);
        setMockMode(r.mockMode);
      })
      .catch(() => setModels([]));
  }, []);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = models.find((m) => m.id === value) || models.find((m) => m.isDefault) || models[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white text-left transition hover:border-brand-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${
          compact ? 'px-3 py-2' : 'px-4 py-3'
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Cpu className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-slate-800">{selected?.label || 'Select model'}</span>
              {selected?.isDefault && <span className="badge bg-brand-50 text-brand-700">Default</span>}
            </span>
            {selected && !compact && <MetricPills model={selected} />}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {mockMode && (
            <div className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
             Its Runnig in Live API 
            </div>
          )}
          <ul className="max-h-80 overflow-y-auto py-1">
            {models.map((m) => {
              const active = m.id === selected?.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.(m.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                      active ? 'bg-brand-50/50' : ''
                    }`}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center ${active ? 'text-brand-600' : 'text-transparent'}`}>
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{m.label}</span>
                        {m.isDefault && <span className="badge bg-brand-50 text-brand-700">Default</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{m.description}</span>
                      <span className="mt-1 block">
                        <MetricPills model={m} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {models.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">Loading models…</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
