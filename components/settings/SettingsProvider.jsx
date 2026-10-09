'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  defaultPrefs, loadPrefs, savePrefs, resolveTheme, rootAttributes, writeProvidersCookie,
} from '@/lib/preferences';

const SettingsContext = createContext(null);

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function systemPrefersDark() {
  return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
}

export function SettingsProvider({ children }) {
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [systemDark, setSystemDark] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs(safeLocalStorage()));
    setSystemDark(systemPrefersDark());
    setLoaded(true);
  }, []);

  const resolvedTheme = resolveTheme(prefs, systemDark);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(rootAttributes(prefs, resolvedTheme))) root.setAttribute(name, value);
    savePrefs(safeLocalStorage(), prefs);
    writeProvidersCookie(prefs.myProviders);
  }, [prefs, resolvedTheme, loaded]);

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
