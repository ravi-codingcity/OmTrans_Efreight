import { useEffect, useState } from 'react';
import { FileText, FileCheck2, ClipboardList } from 'lucide-react';
import { aiApi } from '../api/endpoints.js';

const ICONS = {
  sea_waybill: FileCheck2,
  consolidated_report: FileText,
  shipment_report: ClipboardList,
};

/**
 * Radio-card selector for the output document template.
 * Props: value (template id), onChange(id).
 */
export default function TemplateSelector({ value, onChange }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    aiApi.templates().then((r) => setTemplates(r.templates || [])).catch(() => setTemplates([]));
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((t) => {
        const Icon = ICONS[t.id] || FileText;
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange?.(t.id)}
            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
              active ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-300'
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{t.label}</span>
                {t.isDefault && <span className="badge bg-brand-50 text-brand-700">Default</span>}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{t.description}</span>
            </span>
          </button>
        );
      })}
      {templates.length === 0 && <p className="text-sm text-slate-400">Loading templates…</p>}
    </div>
  );
}
