import { STATUS_META } from '../lib/format.js';

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.uploading;
  const animate = ['analyzing', 'generating', 'uploading'].includes(status);
  return (
    <span className={`badge ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${animate ? 'animate-pulse' : ''}`} />
      {meta.label}
    </span>
  );
}
