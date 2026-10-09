'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useSettings } from '@/components/settings/SettingsProvider';
import { TrailerModal } from '@/components/TrailerModal';
import { shouldAutoplayTrailer, shouldRotateHero } from '@/lib/preferences';
import { trailerEmbedUrl } from '@/lib/trailer';
import { imageUrl } from '@/lib/images';
import { titleHref } from '@/lib/tmdb/normalize';

export const HERO_ROTATE_MS = 15000;

export function Hero({ items }) {
  const { prefs, loaded } = useSettings();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const iframeRef = useRef(null);
  const closeTrailer = useCallback(() => setTrailerOpen(false), []);

  const current = items[index];
  const autoplay = loaded && shouldAutoplayTrailer(prefs) && Boolean(current?.trailerKey);
  const rotate = loaded && shouldRotateHero(prefs) && items.length > 1 && !hovered && !soundOn && !trailerOpen;

  useEffect(() => {
    if (!rotate) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % items.length), HERO_ROTATE_MS);
    return () => clearTimeout(timer);
  }, [rotate, index, items.length]);

  function toggleSound() {
    const next = !soundOn;
    // API de mensagens do player do YouTube (o vídeo é carregado com enablejsapi=1).
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-[70vh] min-h-[420px] w-full overflow-hidden bg-[#0d0820] text-white"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.type}-${current.id}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {backdrop && <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {autoplay && (
            <iframe
              ref={iframeRef}
              data-testid="hero-video"
              title={`Trailer de ${current.title} (sem som)`}
              src={trailerEmbedUrl(current.trailerKey, { autoplay: true, muted: true, loop: true })}
              allow="autoplay; encrypted-media"
              tabIndex={-1}
              className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0820] via-[#0d0820]/50 to-transparent" />

      <div className="absolute bottom-0 left-0 max-w-2xl p-4 pb-10 sm:p-8 sm:pb-14">
        <h2 className="text-3xl font-black drop-shadow-lg sm:text-5xl">{current.title}</h2>
        {current.overview && <p className="mt-3 line-clamp-3 text-sm text-white/90 sm:text-base">{current.overview}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={titleHref(current)} className="neon-gradient rounded-full px-6 py-2.5 font-bold text-white shadow-glow">
            Ver detalhes
          </Link>
          {current.trailerKey && (
            <button
              onClick={() => setTrailerOpen(true)}
              className="rounded-full border border-white/40 bg-white/10 px-6 py-2.5 font-bold backdrop-blur hover:bg-white/20"
            >
              ▶ Ver trailer
            </button>
          )}
          {autoplay && (
            <button
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Desativar som do trailer' : 'Ativar som do trailer'}
              className="rounded-full border border-white/40 bg-white/10 px-4 py-2.5 backdrop-blur hover:bg-white/20"
            >
              <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
            </button>
          )}
        </div>
      </div>

      {trailerOpen && <TrailerModal trailerKey={current.trailerKey} title={current.title} onClose={closeTrailer} />}
    </section>
  );
}
