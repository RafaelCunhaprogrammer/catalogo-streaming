'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '@/components/settings/SettingsProvider';
import { TrailerModal } from '@/components/TrailerModal';
import { shouldAutoplayTrailer, shouldRotateHero } from '@/lib/preferences';
import { trailerEmbedUrl } from '@/lib/trailer';
import { imageUrl } from '@/lib/images';
import { titleHref } from '@/lib/tmdb/normalize';

// Título sem trailer fica este tempo na tela antes do próximo.
export const HERO_BACKDROP_MS = 10000;
// Rede de segurança: se o player nunca avisar que terminou, passa adiante depois disto.
const VIDEO_MAX_MS = 4 * 60 * 1000;
const YOUTUBE_ORIGIN = /^https:\/\/www\.youtube(-nocookie)?\.com$/;
const ENDED = 0;

function playerEnded(event) {
  if (!YOUTUBE_ORIGIN.test(event.origin) || typeof event.data !== 'string') return false;
  try {
    const data = JSON.parse(event.data);
    if (data.event === 'onStateChange') return data.info === ENDED;
    if (data.event === 'infoDelivery') return data.info?.playerState === ENDED;
  } catch {
    // mensagem que não é do protocolo do player
  }
  return false;
}

const roundButton = 'inline-flex items-center justify-center rounded-full border border-white/40 bg-black/30 backdrop-blur hover:bg-white/20';

export function Hero({ items }) {
  const { prefs, loaded } = useSettings();
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [ended, setEnded] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const iframeRef = useRef(null);
  const closeTrailer = useCallback(() => setTrailerOpen(false), []);

  const count = items.length;
  const current = items[index];
  const autoplay = loaded && !paused && shouldAutoplayTrailer(prefs) && Boolean(current?.trailerKey);
  // WCAG 2.2.2: nada troca sozinho em pausa, no Modo calmo ou com o foco do teclado aqui dentro.
  const canAdvance = loaded && !paused && shouldRotateHero(prefs) && count > 1 && !focused && !trailerOpen;

  const goTo = useCallback((next) => {
    setIndex(((next % count) + count) % count);
    setEnded(false);
    setSoundOn(false);
  }, [count]);

  // O player avisa por postMessage quando o vídeo termina.
  useEffect(() => {
    if (!autoplay) return undefined;
    const onMessage = (event) => {
      if (playerEnded(event)) setEnded(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [autoplay]);

  useEffect(() => {
    if (!canAdvance) return undefined;
    if (ended) {
      // Avança logo depois deste render (microtarefa), sem esperar um ciclo de timer.
      let cancelled = false;
      Promise.resolve().then(() => {
        if (!cancelled) goTo(index + 1);
      });
      return () => {
        cancelled = true;
      };
    }
    const timer = setTimeout(() => goTo(index + 1), autoplay ? VIDEO_MAX_MS : HERO_BACKDROP_MS);
    return () => clearTimeout(timer);
  }, [canAdvance, ended, autoplay, index, goTo]);

  function listenToPlayer() {
    // Pede ao player que mande os eventos de estado (o mesmo protocolo da IFrame API do YouTube).
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'destaque', channel: 'widget' }), '*');
  }

  function toggleSound() {
    const next = !soundOn;
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: next ? 'unMute' : 'mute', args: [] }),
      '*',
    );
    setSoundOn(next);
  }

  if (!current) return null;
  const backdrop = imageUrl(current.backdropPath, 'w1280');

  return (
    <section
      aria-roledescription="destaque"
      aria-label={`Destaque: ${current.title}`}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      className="relative w-full overflow-hidden bg-[#0d0820] text-white"
    >
      {/* Área do vídeo em 16:9: o trailer aparece inteiro, sem cortar as bordas. */}
      <div className="relative aspect-video max-h-[85vh] w-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${current.type}-${current.id}`}
            className="absolute inset-y-0 left-1/2 aspect-video h-full max-w-full -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {backdrop && <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            {autoplay && (
              <iframe
                ref={iframeRef}
                data-testid="hero-video"
                title={`Trailer de ${current.title} (sem som)`}
                src={trailerEmbedUrl(current.trailerKey, { autoplay: true, muted: true, subtitles: current.trailerSubtitles })}
                allow="autoplay; encrypted-media"
                tabIndex={-1}
                onLoad={listenToPlayer}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            )}
          </motion.div>
        </AnimatePresence>
        {/* Laterais escurecidas quando a tela é mais larga que o vídeo, e base escura para o texto. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0d0820] via-transparent to-[#0d0820] opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0d0820] to-transparent" />

        {count > 1 && (
          <>
            <button onClick={() => goTo(index - 1)} aria-label="Destaque anterior" className={`${roundButton} absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 sm:left-6`}>
              <ChevronLeft aria-hidden="true" className="h-7 w-7" />
            </button>
            <button onClick={() => goTo(index + 1)} aria-label="Próximo destaque" className={`${roundButton} absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 sm:right-6`}>
              <ChevronRight aria-hidden="true" className="h-7 w-7" />
            </button>
          </>
        )}
      </div>

      <div className="relative px-4 pb-6 sm:absolute sm:bottom-0 sm:left-0 sm:max-w-2xl sm:p-8 sm:pb-16">
        <h2 className="text-2xl font-black drop-shadow-lg sm:text-5xl">{current.title}</h2>
        {current.overview && <p className="mt-3 line-clamp-3 text-sm text-white/90 sm:text-base">{current.overview}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={titleHref(current)} className="neon-gradient rounded-full px-6 py-2.5 font-bold text-white shadow-glow">
            Ver detalhes
          </Link>
          {current.trailerKey && (
            <button onClick={() => setTrailerOpen(true)} className={`${roundButton} gap-2 px-6 py-2.5 font-bold`}>
              <Play aria-hidden="true" className="h-5 w-5 fill-current" />
              Ver trailer
            </button>
          )}
          {loaded && (current.trailerKey || count > 1) && (
            <button
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={paused ? 'Retomar destaque' : 'Pausar destaque'}
              className={`${roundButton} h-11 w-11`}
            >
              {paused ? <Play aria-hidden="true" className="h-5 w-5" /> : <Pause aria-hidden="true" className="h-5 w-5" />}
            </button>
          )}
          {autoplay && (
            <button
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Desativar som do trailer' : 'Ativar som do trailer'}
              className={`${roundButton} h-11 w-11`}
            >
              {soundOn ? <Volume2 aria-hidden="true" className="h-5 w-5" /> : <VolumeX aria-hidden="true" className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-2 pb-5 sm:absolute sm:bottom-5 sm:left-1/2 sm:-translate-x-1/2 sm:pb-0">
          {items.map((item, i) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => goTo(i)}
              aria-label={`Destaque ${i + 1} de ${count}: ${item.title}`}
              aria-current={i === index ? 'true' : undefined}
              className="flex h-6 items-center"
            >
              <span aria-hidden="true" className={`block h-2 rounded-full transition-all ${i === index ? 'neon-gradient w-8' : 'w-2 bg-white/50 hover:bg-white/80'}`} />
            </button>
          ))}
        </div>
      )}

      {trailerOpen && (
        <TrailerModal trailerKey={current.trailerKey} subtitles={current.trailerSubtitles} title={current.title} onClose={closeTrailer} />
      )}
    </section>
  );
}
