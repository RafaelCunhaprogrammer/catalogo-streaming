'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/components/settings/SettingsProvider';
import { APP_NAME } from '@/lib/brand';
import { Volume2 } from 'lucide-react';

export const INTRO_SESSION_KEY = 'paidegua:abertura';
// Evento disparado pelo clique na logo, no Início, para rever a abertura.
export const REPLAY_EVENT = 'paidegua:rever-abertura';
// Duração da cena completa e, no Modo sensorial calmo, da imagem final parada.
export const INTRO_MS = 5200;
export const INTRO_CALM_MS = 1500;
// Vídeo de abertura (public/abertura.mp4) e o tempo máximo de espera, caso ele trave.
export const INTRO_VIDEO_SRC = '/abertura.mp4';
export const INTRO_MAX_MS = 15000;
// Transição para o Início: começa no último segundo do vídeo (sem pausa no fim) e vai aos poucos:
// a logo se afasta, desfoca e some, e o som diminui junto.
export const INTRO_LEAD_MS = 1000;
export const INTRO_FADE_MS = 2500;

const subscribeNever = () => () => {};

function alreadySeen() {
  try {
    // ?abertura=1 mostra de novo, para revisar a cena
    if (new URLSearchParams(window.location.search).has('abertura')) return false;
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

// Quatro torres finas e pontudas do Mercado de Ferro: as externas mais altas.
const TORRES = [
  { cx: 228, w: 30, corpo: 150, ponta: 52 },
  { cx: 272, w: 24, corpo: 172, ponta: 96 },
  { cx: 528, w: 24, corpo: 172, ponta: 96 },
  { cx: 572, w: 30, corpo: 150, ponta: 52 },
];

function Torre({ cx, w, corpo, ponta }) {
  const l = cx - w / 2;
  const r = cx + w / 2;
  return (
    <g data-part="torre">
      <rect x={l} y={corpo} width={w} height={236 - corpo} fill="#566a7a" />
      <rect x={l - 3} y={corpo - 6} width={w + 6} height="6" fill="#42536a" />
      <path d={`M${l - 3} ${corpo - 6} L${cx} ${ponta} L${r + 3} ${corpo - 6} Z`} fill="#5f6e7d" />
      <path d={`M${cx} ${ponta} L${r + 3} ${corpo - 6} L${cx} ${corpo - 6} Z`} fill="#4a5868" />
      <path d={`M${cx} ${ponta} v-10`} stroke="#9aa5b1" strokeWidth="1.5" />
      <path
        className="intro-janela"
        d={`M${cx - 5} ${corpo + 34} v-12 a5 5 0 0 1 10 0 v12 Z M${cx - 5} ${corpo + 62} v-12 a5 5 0 0 1 10 0 v12 Z`}
        fill="#1e2430"
      />
    </g>
  );
}

const arcos = (xs, base, altura, largura) =>
  xs.map((x) => `M${x} ${base} v-${altura} a${largura / 2} ${largura / 2} 0 0 1 ${largura} 0 v${altura} Z`).join(' ');

// Cena desenhada do Ver-o-Peso: reserva para quando o vídeo não carrega.
function VerOPesoScene() {
  return (
    <svg
      className="intro-run h-full w-full"
      viewBox="0 0 800 450"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Pôr do sol atrás do Mercado de Ferro do Ver-o-Peso, na Baía do Guajará, com uma garça e um popopô passando"
    >
      <defs>
        <linearGradient id="intro-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1230" />
          <stop offset=".5" stopColor="#3d2a55" />
          <stop offset=".8" stopColor="#8a5a6e" />
          <stop offset="1" stopColor="#c68a6a" />
        </linearGradient>
        <linearGradient id="intro-agua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1d3b" />
          <stop offset="1" stopColor="#120c1f" />
        </linearGradient>
        <radialGradient id="intro-sol">
          <stop offset="0" stopColor="#f8d9a0" />
          <stop offset="1" stopColor="#e39a6a" />
        </radialGradient>
        <linearGradient id="intro-titulo" x1="0" x2="1">
          <stop offset="0" stopColor="#e9d5ff" />
          <stop offset="1" stopColor="#f9a8d4" />
        </linearGradient>
        <filter id="intro-brilho" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <rect className="intro-ceu" width="800" height="330" fill="url(#intro-ceu)" />

      {/* sol se pondo por trás do mercado */}
      <g data-part="sol" className="intro-sol">
        <circle cx="400" cy="168" r="78" fill="#f2b37a" opacity=".35" filter="url(#intro-brilho)" />
        <circle cx="400" cy="168" r="52" fill="url(#intro-sol)" />
      </g>

      {/* Mercado de Ferro do Ver-o-Peso */}
      <g data-part="mercado" className="intro-mercado">
        {TORRES.map((t) => <Torre key={t.cx} {...t} />)}
        {/* telhados de telha */}
        <path d="M212 214 L588 214 L566 200 L234 200 Z" fill="#8a4a3c" />
        <path d="M300 202 L500 202 L468 172 L332 172 Z" fill="#9c5444" />
        <path d="M386 176 L400 160 L414 176 Z" fill="#7d4236" />
        <path d="M300 202 L332 172 M500 202 L468 172" stroke="#6e3a30" strokeWidth="1.5" />
        {/* faixa de ferro com arquinhos */}
        <rect x="210" y="214" width="380" height="24" fill="#5f7686" />
        <path className="intro-janela" d={arcos([226, 258, 290, 322, 354, 386, 418, 450, 482, 514, 546], 236, 10, 16)} fill="#1e2430" />
        {/* corpo com janelas em arco e a galeria escura embaixo */}
        <rect x="204" y="238" width="392" height="40" fill="#4c6070" />
        <path className="intro-janela" d={arcos([218, 252, 286, 320, 354, 426, 460, 494, 528, 562], 274, 18, 20)} fill="#1e2430" />
        <path d="M384 278 v-24 a16 16 0 0 1 32 0 v24 Z" fill="#1e2430" />
        <rect x="196" y="278" width="408" height="6" fill="#3b4b5a" />
        <rect x="200" y="284" width="400" height="34" fill="#1b2029" />
        <path d="M232 284 V318 M268 284 V318 M304 284 V318 M340 284 V318 M376 284 V318 M424 284 V318 M460 284 V318 M496 284 V318 M532 284 V318 M568 284 V318" stroke="#3a4656" strokeWidth="3" />
        {/* cais sobre a água */}
        <rect x="176" y="318" width="448" height="10" fill="#2b2238" />
        <path d="M190 328 v10 M240 328 v10 M290 328 v10 M340 328 v10 M460 328 v10 M510 328 v10 M560 328 v10 M610 328 v10" stroke="#2b2238" strokeWidth="4" />
      </g>

      {/* Baía do Guajará */}
      <rect y="330" width="800" height="120" fill="url(#intro-agua)" />
      <g className="intro-ondas" stroke="#8b7aa8" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".55">
        <path d="M40 360 q10 -6 20 0 t20 0 M150 392 q10 -6 20 0 t20 0 t20 0 M330 368 q10 -6 20 0 t20 0 M520 384 q10 -6 20 0 t20 0 t20 0 M680 358 q10 -6 20 0 t20 0" />
      </g>
      <path className="intro-reflexo" d="M330 344 h140 M352 356 h96" stroke="#e7b48a" strokeWidth="2" opacity=".35" strokeLinecap="round" />

      {/* pássaros ao longe, perto das torres */}
      <g className="intro-ao-longe" fill="#1a1230" opacity=".8">
        <path d="M610 120 q6 -5 12 0 q6 -5 12 0 q-6 -2 -12 2 q-6 -4 -12 -2 Z" />
        <path d="M176 140 q5 -4 10 0 q5 -4 10 0 q-5 -2 -10 2 q-5 -4 -10 -2 Z" />
      </g>

      {/* garça branca atravessando a tela */}
      <g data-part="garca" className="intro-garca">
        <g transform="translate(0 150)">
          <path d="M0 0 q14 -4 26 2 l10 -2 l-8 6 q-14 4 -28 -6 z" fill="#f4f1ea" />
          <path d="M26 2 q8 -10 10 -18" stroke="#f4f1ea" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M36 -16 l9 2 l-9 2 z" fill="#d9a441" />
          <g className="intro-asa">
            <path d="M8 0 q14 -30 34 -34 q-10 18 -18 34 z" fill="#ffffff" opacity=".95" />
          </g>
        </g>
      </g>

      {/* popopô atravessando a baía, com a fumacinha do motor */}
      <g data-part="barco" className="intro-barco">
        <g transform="translate(0 298)">
          <g className="intro-balanco">
            <path d="M0 22 L204 22 L194 46 L16 46 Q4 40 0 22 Z" fill="#7a3434" />
            <rect x="2" y="12" width="200" height="11" fill="#e7e2da" />
            <rect x="2" y="22" width="200" height="2.5" fill="#2b2238" />
            <rect x="40" y="-14" width="144" height="27" fill="#ece7df" />
            <path d="M48 -9 h15 v11 h-15 Z M70 -9 h15 v11 h-15 Z M92 -9 h15 v11 h-15 Z M114 -9 h15 v11 h-15 Z M136 -9 h15 v11 h-15 Z M158 -9 h15 v11 h-15 Z" fill="#2a3140" />
            <rect x="34" y="-20" width="156" height="6" fill="#4b3f45" />
            <path d="M40 -20 v-6 M184 -20 v-6 M40 -26 H184" stroke="#4b3f45" strokeWidth="1.5" />
            <circle cx="30" cy="18" r="6" fill="#16141c" stroke="#3a3744" strokeWidth="2" />
            <circle cx="112" cy="18" r="6" fill="#16141c" stroke="#3a3744" strokeWidth="2" />
            <circle cx="176" cy="18" r="6" fill="#16141c" stroke="#3a3744" strokeWidth="2" />
            {/* na proa, a imagem de Nossa Senhora de Nazaré, simples e respeitosa */}
            <circle cx="18" cy="-14" r="8" fill="none" stroke="#e8cf8f" strokeWidth="1.2" opacity=".9" />
            <path d="M18 -17 L10 12 H26 Z" fill="#f4f1ea" />
            <circle cx="18" cy="-14" r="3.5" fill="#e9c9a8" />
            <rect x="186" y="-34" width="5" height="16" fill="#2a2730" />
            <g data-part="fumaca">
              <circle className="intro-fumaca" cx="188" cy="-36" r="4" fill="#b8b4c4" />
              <circle className="intro-fumaca intro-fumaca-2" cx="188" cy="-36" r="4" fill="#b8b4c4" />
              <circle className="intro-fumaca intro-fumaca-3" cx="188" cy="-36" r="4" fill="#b8b4c4" />
            </g>
          </g>
        </g>
      </g>

      <text
        className="intro-titulo"
        x="400"
        y="40"
        textAnchor="middle"
        fontFamily="Trebuchet MS, system-ui, sans-serif"
        fontWeight="900"
        fontSize="44"
        fill="url(#intro-titulo)"
      >
        {APP_NAME}
      </text>
    </svg>
  );
}

// Abertura do site: o vídeo public/abertura.mp4, uma vez por visita, mudo, com "Pular abertura".
// Se o vídeo falhar, entra a cena desenhada: o sol se põe por trás do Mercado de Ferro do Ver-o-Peso,
// as janelas acendem, e uma garça e um popopô atravessam a Baía do Guajará e somem.
export function IntroScene() {
  const pathname = usePathname();
  const { prefs, loaded } = useSettings();
  const seen = useSyncExternalStore(subscribeNever, alreadySeen, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [replay, setReplay] = useState(false);
  const timers = useRef([]);
  const videoRef = useRef(null);
  const visible = loaded && pathname === '/' && (replay || !seen) && !dismissed;

  // Rever a abertura (clique na logo no Início): começa tudo de novo.
  useEffect(() => {
    const onReplay = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setVideoFailed(false);
      setSoundBlocked(false);
      setLeaving(false);
      setDismissed(false);
      setReplay(true);
    };
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, []);
  const calm = prefs.calm;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Tira a cobertura do Início (posta pelo script do <head>) quando a transição começa
  // ou quando a abertura não vai aparecer.
  useEffect(() => {
    if (leaving || (loaded && !visible)) document.documentElement.removeAttribute('data-intro');
  }, [leaving, loaded, visible]);

  // Sai com transição (ou na hora, no Modo calmo).
  // Só marca como vista no fim: marcar antes faria a abertura sumir na hora, sem a transição.
  const close = useCallback(() => {
    const finish = () => {
      markSeen();
      setDismissed(true);
    };
    if (calm) {
      finish();
      return;
    }
    setLeaving(true);
    timers.current.push(setTimeout(finish, INTRO_FADE_MS));
  }, [calm]);

  // Tenta tocar com som. O navegador pode bloquear som automático antes do primeiro clique:
  // nesse caso toca mudo e mostra o botão "Ativar som". No Modo calmo, nada toca.
  useEffect(() => {
    const video = videoRef.current;
    if (!visible || !video || calm || videoFailed) return;
    video.muted = false;
    video.volume = 1;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        video.muted = true;
        setSoundBlocked(true);
        const muted = video.play();
        if (muted && typeof muted.catch === 'function') muted.catch(() => {});
      });
    }
  }, [visible, calm, videoFailed]);

  // Na transição, o som diminui junto com a imagem.
  useEffect(() => {
    const video = videoRef.current;
    if (!leaving || !video || video.muted) return undefined;
    const step = 50;
    const decrement = video.volume / (INTRO_FADE_MS / step);
    const timer = setInterval(() => {
      video.volume = Math.max(0, video.volume - decrement);
    }, step);
    return () => clearInterval(timer);
  }, [leaving]);

  function enableSound(e) {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setSoundBlocked(false);
  }

  useEffect(() => {
    if (!visible) return undefined;
    // Modo calmo: imagem parada por pouco tempo. Vídeo: some quando termina (com tempo máximo).
    // Cena desenhada: some quando a animação acaba.
    const wait = prefs.calm ? INTRO_CALM_MS : videoFailed ? INTRO_MS : INTRO_MAX_MS;
    const timer = setTimeout(() => close(), wait);
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [visible, prefs.calm, videoFailed, close]);
  // durante a transição, nada de novos fechamentos
  const closeOnce = leaving ? () => {} : close;

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Abertura do ${APP_NAME}`}
      data-leaving={String(leaving)}
      className={`intro fixed inset-0 z-[95] cursor-pointer bg-[#1b1220] transition-[opacity,transform,filter] ease-in-out ${
        leaving ? 'pointer-events-none scale-[1.08] opacity-0 blur-md' : 'scale-100 opacity-100 blur-0'
      }`}
      style={{ transitionDuration: `${INTRO_FADE_MS}ms` }}
      onClick={() => closeOnce()}
    >
      {videoFailed ? (
        <VerOPesoScene />
      ) : (
        <video
          ref={videoRef}
          data-testid="intro-video"
          src={INTRO_VIDEO_SRC}
          muted={calm}
          playsInline
          preload="auto"
          onTimeUpdate={(e) => {
            const { currentTime, duration } = e.currentTarget;
            if (duration && currentTime >= duration - INTRO_LEAD_MS / 1000) closeOnce();
          }}
          onEnded={() => closeOnce()}
          onError={() => setVideoFailed(true)}
          aria-label={`Vídeo de abertura do ${APP_NAME}`}
          className="h-full w-full object-contain landscape:object-cover"
        />
      )}

      {soundBlocked && !videoFailed && (
        <button
          onClick={enableSound}
          className="absolute bottom-6 left-6 inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/40 px-5 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
        >
          <Volume2 aria-hidden="true" className="h-4 w-4" />
          Ativar som
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          closeOnce();
        }}
        className="absolute bottom-6 right-6 rounded-full border border-white/40 bg-black/40 px-5 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
      >
        Pular abertura
      </button>
    </div>
  );
}
