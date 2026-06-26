export const STATUS_META = {
  uploading: { label: 'Uploading', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  analyzing: { label: 'Analyzing', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  generating: { label: 'Generating Report', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

export const FIELD_STATUS_META = {
  match: { label: 'Match', color: 'bg-emerald-100 text-emerald-700' },
  conflict: { label: 'Conflict', color: 'bg-red-100 text-red-700' },
  single_source: { label: 'Single source', color: 'bg-amber-100 text-amber-700' },
  missing: { label: 'Missing', color: 'bg-slate-100 text-slate-500' },
};

export const prettyField = (f = '') =>
  f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const formatDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const scoreColor = (score) => {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
};
