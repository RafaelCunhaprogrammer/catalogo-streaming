'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  defaultPrefs, loadPrefs, parsePrefs, savePrefs, resolveTheme, rootAttributes, writeProvidersCookie,
} from '@/lib/preferences';

const SettingsContext = createContext(null);
// Com perfil, mudanças seguidas (ex.: arrastar o brilho) viram uma única gravação no servidor.
export const PREFS_SAVE_DEBOUNCE_MS = 500;

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
  const firstSave = useRef(true);
  useEffect(() => {
    if (!loaded || !onSave) return undefined;
    if (firstSave.current) {
      firstSave.current = false;
      return undefined;
    }
    const timer = setTimeout(() => onSave(prefs), PREFS_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [prefs, loaded, onSave]);

  const updatePrefs = useCallback((patch) => setPrefs((current) => ({ ...current, ...patch })), []);
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
