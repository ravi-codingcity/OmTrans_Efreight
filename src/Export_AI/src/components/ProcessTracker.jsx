import { Check, Loader2, X } from 'lucide-react';

const STAGES = [
  { key: 'uploading', label: 'Uploading' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'generating', label: 'Generating Report' },
  { key: 'completed', label: 'Completed' },
];

const ORDER = { uploading: 0, analyzing: 1, generating: 2, completed: 3 };

export default function ProcessTracker({ status, progress }) {
  const failed = status === 'failed';
  const current = ORDER[status] ?? 0;

  return (
    <div className="card p-5">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const done = current > i || status === 'completed';
          const active = current === i && status !== 'completed';
          return (
            <div key={stage.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                    failed && active
                      ? 'border-red-500 bg-red-500 text-white'
                      : done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : active
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : 'border-slate-200 bg-white text-slate-300'
                  }`}
                >
                  {failed && active ? (
                    <X className="h-4 w-4" />
                  ) : done ? (
                    <Check className="h-4 w-4" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs font-semibold">{i + 1}</span>
                  )}
                </div>
                <span className={`mt-1.5 text-[11px] font-medium ${done || active ? 'text-slate-700' : 'text-slate-400'}`}>
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="mx-2 h-0.5 flex-1 rounded bg-slate-100">
                  <div
                    className="h-full rounded bg-emerald-500 transition-all"
                    style={{ width: current > i ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {status !== 'completed' && !failed && (
        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress || 0}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
