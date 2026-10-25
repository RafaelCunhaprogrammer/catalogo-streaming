'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  defaultPrefs, loadPrefs, parsePrefs, savePrefs, resolveTheme, rootAttributes, writeProvidersCookie,
} from '@/lib/preferences';

const SettingsContext = createContext(null);
// Com perfil, mudanças seguidas (ex.: arrastar o brilho) viram uma única gravação no servidor.
export const PREFS_SAVE_DEBOUNCE_MS = 500;

// Preferências ajustadas arrastando (várias mudanças por segundo): essas esperam o debounce.
const CONTINUOUS_PREFS = new Set(['brightness']);

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function SettingsProvider({ children, initialPrefs, onSave }) {
  // Com perfil, as preferências vêm do servidor; sem perfil (visitante), do navegador.
  const [prefs, setPrefs] = useState(() => (initialPrefs ? parsePrefs(initialPrefs) : defaultPrefs()));
  const [loaded, setLoaded] = useState(false);

  // Lê o navegador só depois da hidratação, para o HTML do servidor e o do cliente baterem.
  /* eslint-disable react-hooks/set-state-in-effect -- carga única de armazenamento externo após hidratar */
  useEffect(() => {
    if (!initialPrefs) setPrefs(loadPrefs(safeLocalStorage()));
    setLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- carga única
  /* eslint-enable react-hooks/set-state-in-effect */

  const resolvedTheme = resolveTheme(prefs);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(rootAttributes(prefs, resolvedTheme))) root.setAttribute(name, value);
    savePrefs(safeLocalStorage(), prefs);
    writeProvidersCookie(prefs.myProviders);
  }, [prefs, resolvedTheme, loaded]);

  // Com perfil: grava as mudanças no servidor (o localStorage acima vira só espelho, para o script do <head>).
  // Mudanças discretas (tema, texto, interruptores, streamings) gravam na hora; só as contínuas (brilho) esperam o
  // debounce. Qualquer gravação pendente é despachada ao sair da página, para recarregar não perder a mudança.
  const firstSave = useRef(true);
  const lastPatchContinuous = useRef(false);
  const pendingSave = useRef(null);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  useEffect(() => {
    if (!loaded || !onSave) return undefined;
    if (firstSave.current) {
      firstSave.current = false;
      return undefined;
    }
    if (!lastPatchContinuous.current) {
      pendingSave.current = null;
      onSave(prefs);
      return undefined;
    }
    pendingSave.current = prefs;
    const timer = setTimeout(() => {
      if (!pendingSave.current) return; // já despachada ao sair da página
      pendingSave.current = null;
      onSave(prefs);
    }, PREFS_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [prefs, loaded, onSave]);

  useEffect(() => {
    function flushPending() {
      const pending = pendingSave.current;
      if (!pending || !onSaveRef.current) return;
      pendingSave.current = null;
      onSaveRef.current(pending);
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flushPending();
    }
    window.addEventListener('pagehide', flushPending);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushPending);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const updatePrefs = useCallback((patch) => {
    lastPatchContinuous.current = Object.keys(patch).every((key) => CONTINUOUS_PREFS.has(key));
    setPrefs((current) => ({ ...current, ...patch }));
  }, []);
  const value = useMemo(() => ({ prefs, resolvedTheme, updatePrefs, loaded }), [prefs, resolvedTheme, updatePrefs, loaded]);

  return (
    <SettingsContext.Provider value={value}>
      <MotionConfig reducedMotion={prefs.calm ? 'always' : 'user'}>{children}</MotionConfig>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings precisa estar dentro de <SettingsProvider>');
  return context;
}
