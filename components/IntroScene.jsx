'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/components/settings/SettingsProvider';
import { APP_NAME } from '@/lib/brand';

export const INTRO_SESSION_KEY = 'paidegua:abertura';
// Duração da cena completa e, no Modo sensorial calmo, da imagem final parada.
export const INTRO_MS = 5200;
export const INTRO_CALM_MS = 1500;

const subscribeNever = () => () => {};

function alreadySeen() {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, '1');
  } catch {
    // aba anônima com armazenamento bloqueado: a abertura volta na próxima página
  }
}

// Abertura: pôr do sol na Baía do Guajará, o Mercado de Ferro do Ver-o-Peso acendendo em neon,
// uma garça e um popopô levando a imagem de Nossa Senhora de Nazaré (Círio fluvial).
export function IntroScene() {
  const pathname = usePathname();
  const { prefs, loaded } = useSettings();
  const seen = useSyncExternalStore(subscribeNever, alreadySeen, () => true);
  const [dismissed, setDismissed] = useState(false);
  const visible = loaded && pathname === '/' && !seen && !dismissed;

  const close = useCallback(() => {
    markSeen();
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(close, prefs.calm ? INTRO_CALM_MS : INTRO_MS);
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [visible, prefs.calm, close]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Abertura do ${APP_NAME}`}
      className="intro fixed inset-0 z-[95] cursor-pointer bg-[#12031c]"
      onClick={close}
    >
      <svg
        className="intro-run h-full w-full"
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Pôr do sol na Baía do Guajará, com o Mercado de Ferro do Ver-o-Peso, uma garça voando e um popopô levando a imagem de Nossa Senhora de Nazaré"
      >
        <defs>
          <linearGradient id="intro-ceu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#140726" />
            <stop offset=".45" stopColor="#5b21b6" />
            <stop offset=".72" stopColor="#db2777" />
            <stop offset="1" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="intro-agua" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b0a4f" />
            <stop offset="1" stopColor="#0d0820" />
          </linearGradient>
          <radialGradient id="intro-sol">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#fb923c" />
          </radialGradient>
          <linearGradient id="intro-neon" x1="0" x2="1">
            <stop offset="0" stopColor="#c4b5fd" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
          <filter id="intro-brilho">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect className="intro-ceu" width="800" height="330" fill="url(#intro-ceu)" />
        <circle className="intro-sol" cx="610" cy="318" r="46" fill="url(#intro-sol)" opacity=".95" />

        {/* Mercado de Ferro: corpo com arcos, torres pontudas nas pontas e no centro */}
        <g transform="translate(220 150)">
          <g className="intro-mercado-silhueta" fill="#12031c">
            <rect x="20" y="70" width="320" height="110" />
            <rect x="0" y="40" width="44" height="140" />
            <path d="M-6 40 L22 -12 L50 40 Z" />
            <rect x="316" y="40" width="44" height="140" />
            <path d="M310 40 L338 -12 L366 40 Z" />
            <rect x="150" y="48" width="60" height="32" />
            <path d="M144 50 L180 14 L216 50 Z" />
          </g>
          <g className="intro-mercado-traco" fill="none" stroke="url(#intro-neon)" strokeWidth="2.4" filter="url(#intro-brilho)">
            <path d="M0 180 V40 L22 -12 L44 40 V70 H150 V50 L180 14 L210 50 V70 H316 V40 L338 -12 L360 40 V180 Z" />
            <path d="M64 180 v-55 a18 18 0 0 1 36 0 v55 M116 180 v-55 a18 18 0 0 1 36 0 v55 M208 180 v-55 a18 18 0 0 1 36 0 v55 M260 180 v-55 a18 18 0 0 1 36 0 v55" />
            <path d="M22 -12 v-12 M338 -12 v-12 M180 14 v-12" />
          </g>
        </g>

        {/* Baía do Guajará */}
        <rect y="330" width="800" height="120" fill="url(#intro-agua)" />
        <g className="intro-reflexo" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round">
          <path d="M570 350 h80 M585 368 h50 M600 384 h24 M80 360 h40 M200 395 h60 M420 372 h36" />
        </g>

        {/* Garça branca */}
        <g className="intro-garca">
          <g transform="translate(0 120)">
            <path d="M0 0 q14 -4 26 2 l10 -2 l-8 6 q-14 4 -28 -6 z" fill="#f8fafc" />
            <path d="M26 2 q8 -10 10 -18" stroke="#f8fafc" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M36 -16 l9 2 l-9 2 z" fill="#fb923c" />
            <g className="intro-asa">
              <path d="M8 0 q14 -30 34 -34 q-10 18 -18 34 z" fill="#ffffff" opacity=".95" />
            </g>
          </g>
        </g>

        {/* Popopô: barco de madeira a motor, com a imagem de Nossa Senhora de Nazaré na proa */}
        <g className="intro-barco">
          <g transform="translate(0 340)">
            <g className="intro-balanco">
              <path d="M0 30 L170 30 L156 58 L18 58 Z" fill="#8b5a2b" />
              <path d="M4 36 H166 M8 44 H162 M13 51 H158" stroke="#6b4320" strokeWidth="1.2" />
              <rect x="2" y="27" width="166" height="5" fill="#1d4ed8" />
              <rect x="6" y="32" width="158" height="3" fill="#f8fafc" />
              <path d="M18 58 L156 58 L152 62 L22 62 Z" fill="#dc2626" />
              <rect x="70" y="-2" width="92" height="5" rx="1" fill="#a16207" />
              <path d="M74 3 V27 M100 3 V27 M126 3 V27 M156 3 V27" stroke="#78350f" strokeWidth="2.5" />
              <rect x="72" y="3" width="88" height="4" fill="#0ea5e9" opacity=".9" />
              <rect x="160" y="16" width="10" height="12" fill="#334155" />
              <rect x="166" y="6" width="3" height="11" fill="#1f2937" />
              <circle className="intro-fumaca" cx="168" cy="2" r="4" fill="#cbd5e1" />
              <circle className="intro-fumaca intro-fumaca-2" cx="168" cy="2" r="4" fill="#cbd5e1" />
              <circle className="intro-fumaca intro-fumaca-3" cx="168" cy="2" r="4" fill="#cbd5e1" />
              <rect x="18" y="18" width="34" height="10" rx="2" fill="#fde68a" />
              <circle cx="22" cy="18" r="3" fill="#f472b6" />
              <circle cx="48" cy="18" r="3" fill="#f472b6" />
              <circle cx="35" cy="16" r="2.5" fill="#f8fafc" />
              <circle cx="35" cy="-16" r="11" fill="none" stroke="#fde68a" strokeWidth="1.5" opacity=".9" />
              <path d="M35 -20 L24 18 H46 Z" fill="#f8fafc" />
              <path d="M35 -14 L28 16 H42 Z" fill="#fbbf24" opacity=".85" />
              <circle cx="35" cy="-16" r="4.5" fill="#fcd9b6" />
              <path d="M30 -22 l2 -5 l3 3 l3 -3 l2 5 z" fill="#fbbf24" />
            </g>
          </g>
        </g>

        <text
          className="intro-titulo"
          x="400"
          y="88"
          textAnchor="middle"
          fontFamily="Trebuchet MS, system-ui, sans-serif"
          fontWeight="900"
          fontSize="58"
          fill="url(#intro-neon)"
          filter="url(#intro-brilho)"
        >
          {APP_NAME}
        </text>
      </svg>

      <button
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        className="absolute bottom-6 right-6 rounded-full border border-white/40 bg-black/40 px-5 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
      >
        Pular abertura
      </button>
    </div>
  );
}
