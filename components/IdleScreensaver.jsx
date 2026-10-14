'use client';

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/components/settings/SettingsProvider';
import { INTRO_VIDEO_SRC } from '@/components/IntroScene';

// Protetor de tela: depois de um tempo sem mexer, a abertura aparece aos poucos, muda e em loop.
// Qualquer movimento faz sumir suavemente, e a pessoa volta exatamente para onde estava.
export const IDLE_MS = 3 * 60 * 1000;
export const IDLE_FADE_MS = 1200;
const ACTIVITY = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'];

// Não atrapalha quem está assistindo (trailer aberto ou som do destaque ligado) nem janelas abertas.
function somethingImportantOpen() {
  return Boolean(
    document.querySelector('[role="dialog"][aria-modal="true"]') || document.querySelector('[data-hero-sound="on"]'),
  );
}

export function IdleScreensaver() {
  const { prefs, loaded } = useSettings();
  const [state, setStateValue] = useState('oculto'); // oculto | entrando | visivel | saindo
  const stateRef = useRef('oculto');
  const idleTimer = useRef(null);
  const fadeTimer = useRef(null);
  const enabled = loaded && !prefs.calm;

  useEffect(() => {
    if (!enabled) return undefined;
    const setState = (value) => {
      stateRef.current = value;
      setStateValue(value);
    };

    const schedule = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (document.visibilityState === 'hidden' || somethingImportantOpen()) {
          schedule();
          return;
        }
        setState('entrando');
        clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => setState('visivel'), 50);
      }, IDLE_MS);
    };

    const onActivity = () => {
      if (stateRef.current === 'entrando' || stateRef.current === 'visivel') {
        clearTimeout(fadeTimer.current);
        setState('saindo');
        fadeTimer.current = setTimeout(() => setState('oculto'), IDLE_FADE_MS);
      }
      schedule();
    };

    ACTIVITY.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    schedule();
    return () => {
      ACTIVITY.forEach((name) => window.removeEventListener(name, onActivity));
      clearTimeout(idleTimer.current);
      clearTimeout(fadeTimer.current);
    };
  }, [enabled]);

  if (!enabled || state === 'oculto') return null;

  return (
    <div
      data-testid="idle-screensaver"
      data-state={state}
      aria-hidden="true"
      className={`fixed inset-0 z-[93] bg-black transition-opacity ease-in-out ${state === 'visivel' ? 'opacity-100' : 'opacity-0'}`}
      style={{ transitionDuration: `${IDLE_FADE_MS}ms` }}
    >
      <video src={INTRO_VIDEO_SRC} autoPlay muted loop playsInline className="h-full w-full object-contain landscape:object-cover" />
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-5 py-2 text-sm text-white/90 backdrop-blur">
        Mexa o mouse ou toque para voltar
      </p>
    </div>
  );
}
