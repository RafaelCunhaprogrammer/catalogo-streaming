'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, Star, Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '@/components/settings/SettingsProvider';
import { CertificationBadge } from '@/components/CertificationBadge';
import { TrailerModal } from '@/components/TrailerModal';
import { shouldAutoplayTrailer, shouldRotateHero } from '@/lib/preferences';
import { trailerEmbedUrl } from '@/lib/trailer';
import { imageSet, imageUrl } from '@/lib/images';
import { formatRuntime, formatSeasons } from '@/lib/format';
import { titleHref } from '@/lib/tmdb/normalize';
import { INTRO_DONE_EVENT, REPLAY_EVENT } from '@/lib/intro-events';

// Título sem trailer fica este tempo na tela antes do próximo.
export const HERO_BACKDROP_MS = 10000;
// Rede de segurança: se o player nunca avisar que terminou, passa adiante depois disto.
const VIDEO_MAX_MS = 4 * 60 * 1000;
// A imagem continua por cima do vídeo até ele tocar há este tempo: esconde a tela preta de
// carregamento e a barra de título que o YouTube mostra nos primeiros segundos.
export const HERO_REVEAL_MS = 2500;
const YOUTUBE_ORIGIN = /^https:\/\/www\.youtube(-nocookie)?\.com$/;
const ENDED = 0;
const PLAYING = 1;

// Estado do player (protocolo de postMessage da IFrame API do YouTube), ou null.
function playerState(event) {
  if (!YOUTUBE_ORIGIN.test(event.origin) || typeof event.data !== 'string') return null;
  try {
    const data = JSON.parse(event.data);
    if (data.event === 'onStateChange') return data.info;
    if (data.event === 'infoDelivery') return data.info?.playerState ?? null;
  } catch {
    // mensagem que não é do protocolo do player
  }
  return null;
}

// Setas discretas: invisíveis até o mouse passar pelo destaque ou o teclado chegar nelas; em telas de toque ficam sempre visíveis.
const arrowVisibility = 'opacity-0 transition-opacity group-hover/hero:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-80';
const roundButton = 'inline-flex items-center justify-center rounded-full border border-white/40 bg-black/30 backdrop-blur hover:bg-white/20';

// Nota, ano, duração e classificação, na linha logo abaixo do nome.
function HeroMeta({ item }) {
  const duration = item.type === 'movie' ? formatRuntime(item.runtime) : formatSeasons(item.seasons);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.95rem] font-medium text-white/85">
      {item.rating ? (
        <span aria-label={`Nota ${item.rating.toFixed(1)} de 10`} className="inline-flex items-center gap-1 font-bold text-white">
          <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />
          {item.rating.toFixed(1)}
        </span>
      ) : null}
      {item.year ? <span>{item.year}</span> : null}
      {duration ? <span>{duration}</span> : null}
      <CertificationBadge value={item.certification} />
    </div>
  );
}

export function Hero({ items }) {
  const { prefs, loaded } = useSettings();
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  // Enquanto a abertura passa de novo, o trailer sai de cena (e o som dele não cobre a música da abertura).
  const [introPlaying, setIntroPlaying] = useState(false);
  const iframeRef = useRef(null);
  const closeTrailer = useCallback(() => setTrailerOpen(false), []);

  const count = items.length;
  const current = items[index];
  const autoplay = loaded && !paused && !introPlaying && shouldAutoplayTrailer(prefs) && Boolean(current?.trailerKey);
  // WCAG 2.2.2: nada troca sozinho em pausa, no Modo calmo ou com o foco do teclado aqui dentro.
  const canAdvance = loaded && !paused && shouldRotateHero(prefs) && count > 1 && !focused && !trailerOpen;

  const goTo = useCallback((next) => {
    setIndex(((next % count) + count) % count);
    setEnded(false);
    setPlaying(false);
    setRevealed(false);
    setSoundOn(false);
  }, [count]);

  useEffect(() => {
    const onReplay = () => {
      setIntroPlaying(true);
      setSoundOn(false);
      setPlaying(false);
      setRevealed(false);
    };
    const onDone = () => setIntroPlaying(false);
    window.addEventListener(REPLAY_EVENT, onReplay);
    window.addEventListener(INTRO_DONE_EVENT, onDone);
    return () => {
      window.removeEventListener(REPLAY_EVENT, onReplay);
      window.removeEventListener(INTRO_DONE_EVENT, onDone);
    };
  }, []);

  // O player avisa por postMessage quando o vídeo termina.
  useEffect(() => {
    if (!autoplay) return undefined;
    const onMessage = (event) => {
      const state = playerState(event);
      if (state === ENDED) setEnded(true);
      if (state === PLAYING) setPlaying(true);
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

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => setRevealed(true), HERO_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [playing]);

  // Deixa a próxima imagem pronta: a troca funde uma foto na outra, sem passar por um quadro vazio.
  useEffect(() => {
    if (count < 2) return;
    const next = imageSet(items[(index + 1) % count]?.backdropPath, 'backdrop');
    if (next) preload(next.src, { as: 'image', imageSrcSet: next.srcSet, imageSizes: '100vw' });
  }, [items, index, count]);

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
  const backdrop = imageSet(current.backdropPath, 'backdrop');
  const titleArt = imageSet(current.titleArtPath, 'art');
  const currentKey = `${current.type}-${current.id}`;
  const videoVisible = autoplay && revealed;

  return (
    <section
      aria-roledescription="destaque"
      aria-label={`Destaque: ${current.title}`}
      data-hero-sound={soundOn ? 'on' : 'off'}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      className="group/hero relative w-full text-white"
    >
      {/* A luz do filme: a mesma imagem, bem pequena e desfocada, vaza por trás das fileiras. */}
      <div aria-hidden="true" className="luz-do-filme pointer-events-none absolute inset-x-0 top-0 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div key={currentKey} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
            {current.backdropPath && <img src={imageUrl(current.backdropPath, 'w300')} alt="" className="h-full w-full object-cover" />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative flex min-h-[clamp(32rem,80svh,54rem)] flex-col justify-end overflow-hidden">
        <div className="hero-midia absolute inset-y-0 right-0 w-full [container-type:size] md:w-[82%]">
          <AnimatePresence initial={false}>
            <motion.div
              key={currentKey}
              className="absolute inset-0 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
            >
              {autoplay && (
                // O vídeo em 16:9 cobre toda a área, como a imagem: a sobra sai pelas bordas.
                <iframe
                  ref={iframeRef}
                  data-testid="hero-video"
                  title={`Trailer de ${current.title} (sem som)`}
                  src={trailerEmbedUrl(current.trailerKey, { autoplay: true, muted: true, background: true, subtitles: current.trailerSubtitles })}
                  allow="autoplay; encrypted-media"
                  tabIndex={-1}
                  onLoad={listenToPlayer}
                  className="pointer-events-none absolute left-1/2 top-1/2 aspect-video w-[max(100cqw,177.78cqh)] -translate-x-1/2 -translate-y-1/2"
                />
              )}
              {backdrop && (
                <img
                  data-testid="hero-cover"
                  data-revealed={String(videoVisible)}
                  src={backdrop.src}
                  srcSet={backdrop.srcSet}
                  sizes="(min-width: 768px) 82vw, 100vw"
                  alt=""
                  className={`hero-aproxima absolute inset-0 h-full w-full object-cover object-[50%_25%] transition-opacity duration-700 ${videoVisible ? 'opacity-0' : 'opacity-100'}`}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div aria-hidden="true" className={`hero-veu pointer-events-none absolute inset-0 transition-opacity duration-700 ${videoVisible ? 'opacity-70' : ''}`} />
        {/* Trailers de cinema (2,39:1) vêm com faixas pretas embutidas no vídeo; o degradê funde a de cima com o fundo. */}
        <div data-testid="hero-top-fade" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--hero-bg)] to-transparent" />
        <div aria-hidden="true" className="hero-fundo-claro pointer-events-none absolute inset-0" />

        {count > 1 && (
          <>
            <button onClick={() => goTo(index - 1)} aria-label="Destaque anterior" className={`${roundButton} ${arrowVisibility} absolute left-3 top-1/2 z-20 h-12 w-12 -translate-y-1/2`}>
              <ChevronLeft aria-hidden="true" className="h-7 w-7" />
            </button>
            <button onClick={() => goTo(index + 1)} aria-label="Próximo destaque" className={`${roundButton} ${arrowVisibility} absolute right-3 top-1/2 z-20 h-12 w-12 -translate-y-1/2`}>
              <ChevronRight aria-hidden="true" className="h-7 w-7" />
            </button>
          </>
        )}

        <div className="relative z-10 px-margem pb-32 pt-28">
          <div key={currentKey} className="hero-texto max-w-xl">
            <h2 className="condensado text-balance text-[clamp(2.75rem,6.5vw,5.25rem)] font-extrabold leading-[0.95] drop-shadow-lg">
              {titleArt ? (
                <img
                  src={titleArt.src}
                  srcSet={titleArt.srcSet}
                  sizes="(min-width: 768px) 30rem, 80vw"
                  alt={current.title}
                  className="max-h-[clamp(5rem,24svh,11rem)] w-auto max-w-[min(30rem,85%)] object-contain object-left drop-shadow-[0_2px_18px_rgb(0_0_0/.55)]"
                />
              ) : current.title}
            </h2>
            <HeroMeta item={current} />
            {/* Com o trailer na tela, a sinopse sai da frente; volta com o mouse ou o teclado aqui dentro. */}
            <div className={`transition-opacity duration-700 ${videoVisible ? 'opacity-0 group-focus-within/hero:opacity-100 group-hover/hero:opacity-100 [@media(hover:none)]:opacity-100' : ''}`}>
              {current.overview && <p className="mt-4 line-clamp-3 text-justify text-base leading-relaxed text-white/85 hyphens-auto sm:text-[1.075rem]">{current.overview}</p>}
              {current.genres?.length > 0 && <p className="mt-2 text-sm italic text-white/70">{current.genres.join(', ')}</p>}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={titleHref(current)} className="rounded-md bg-[#f4f1fb] px-7 py-3 font-bold text-[#0d0820] hover:bg-white">
              Ver detalhes
            </Link>
            {current.trailerKey && (
              <button onClick={() => setTrailerOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-white/15 px-6 py-3 font-bold backdrop-blur hover:bg-white/25">
                <Play aria-hidden="true" className="h-5 w-5 fill-current" />
                Ver trailer
              </button>
            )}
            <div className="flex items-center gap-3 sm:ml-auto">
              {count > 1 && (
                <div className="flex gap-1.5">
                  {items.map((item, i) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => goTo(i)}
                      aria-label={`Destaque ${i + 1} de ${count}: ${item.title}`}
                      aria-current={i === index ? 'true' : undefined}
                      className="flex h-6 w-6 items-center"
                    >
                      <span aria-hidden="true" className={`block h-[3px] w-full rounded-full ${i === index ? 'neon-gradient' : 'bg-white/45 hover:bg-white/80'}`} />
                    </button>
                  ))}
                </div>
              )}
              {loaded && (current.trailerKey || count > 1) && (
                <button
                  onClick={() => setPaused((p) => !p)}
                  aria-pressed={paused}
                  aria-label={paused ? 'Retomar destaque' : 'Pausar destaque'}
                  className={`${roundButton} h-10 w-10`}
                >
                  {paused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
                </button>
              )}
              {autoplay && (
                <button
                  onClick={toggleSound}
                  aria-pressed={soundOn}
                  aria-label={soundOn ? 'Desativar som do trailer' : 'Ativar som do trailer'}
                  className={`${roundButton} h-10 w-10`}
                >
                  {soundOn ? <Volume2 aria-hidden="true" className="h-4 w-4" /> : <VolumeX aria-hidden="true" className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {trailerOpen && (
        <TrailerModal trailerKey={current.trailerKey} subtitles={current.trailerSubtitles} title={current.title} onClose={closeTrailer} />
      )}
    </section>
  );
}
