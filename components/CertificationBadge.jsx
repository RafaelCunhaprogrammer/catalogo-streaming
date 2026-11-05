import { certificationLabel, CERTIFICATION_STYLES } from '@/lib/format';

export function CertificationBadge({ value }) {
  if (!value) return null;
  return (
    <span
      aria-label={certificationLabel(value)}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm font-black ${CERTIFICATION_STYLES[value] ?? 'bg-white/20 text-white'}`}
    >
      {value}
    </span>
  );
}
