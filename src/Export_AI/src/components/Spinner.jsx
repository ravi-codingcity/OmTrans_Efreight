import { Loader2 } from 'lucide-react';

export default function Spinner({ className = '', label }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-500">
      <Loader2 className={`animate-spin ${className || 'h-5 w-5'}`} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
