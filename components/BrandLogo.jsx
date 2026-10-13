import { useId } from 'react';
import { APP_NAME } from '@/lib/brand';

// Símbolo do Pai d'Égua: um fruto de açaí preso direto à ráquila (o raminho claro e pintado do
// cacho, sem cabinho), roxo-azulado quase preto e fosco, com o play neon no centro.
export function AcaiSymbol({ className = '', title }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
    >
      <defs>
        <radialGradient id={`${id}-fruto`} cx="36%" cy="34%" r="74%">
          <stop offset="0" stopColor="#4b3a78" />
          <stop offset=".45" stopColor="#24173f" />
          <stop offset="1" stopColor="#0c0717" />
        </radialGradient>
        <radialGradient id={`${id}-po`} cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#b8c2dc" stopOpacity=".28" />
          <stop offset="1" stopColor="#b8c2dc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-neon`} x1="0" x2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
        <pattern id={`${id}-pintas`} width="7" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <rect width="7" height="5" fill="#ece3cf" />
          <path d="M1 1.2 h2.6 M4.2 3.6 h2" stroke="#9a7650" strokeWidth="1.1" strokeLinecap="round" />
        </pattern>
      </defs>

      {/* ráquila: raminho claro, cor de palha, com pintinhas marrons, atravessando atrás do fruto */}
      <path data-part="raquila" d="M2 30 C30 18 66 12 98 4" stroke={`url(#${id}-pintas)`} strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* fruto: preso direto na ráquila, sem cabinho */}
      <g data-part="fruto">
        <circle cx="54" cy="58" r="36" fill={`url(#${id}-fruto)`} />
        <circle cx="54" cy="58" r="36" fill={`url(#${id}-po)`} />
        <ellipse cx="51" cy="23.5" rx="7" ry="3" fill="#2a1d45" opacity=".9" />
      </g>
      <path data-part="play" d="M46 44 L70 58 L46 72 Z" fill={`url(#${id}-neon)`} />
    </svg>
  );
}

export function BrandLogo({ className = '', showName = true }) {
  return (
    <span role="img" aria-label={APP_NAME} className={`inline-flex items-center gap-2 ${className}`}>
      <AcaiSymbol className="h-9 w-9 shrink-0 drop-shadow-[0_0_6px_rgba(236,72,153,.45)]" />
      {showName && (
        <span aria-hidden="true" className="neon-gradient bg-clip-text text-xl font-black tracking-tight text-transparent">
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
