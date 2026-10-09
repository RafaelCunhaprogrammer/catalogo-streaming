'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useSettings } from '@/components/settings/SettingsProvider';
import { shouldPlayOpeningSound } from '@/lib/preferences';
import { playOpeningSound } from '@/lib/opening-sound';
import { APP_NAME } from '@/lib/brand';

export const ENTRY_SESSION_KEY = 'catalogo:entrou';

function alreadyEntered() {
  try {
    return sessionStorage.getItem(ENTRY_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function EntryScreen() {
  const pathname = usePathname();
  const { prefs, resolvedTheme, loaded } = useSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname === '/' && !alreadyEntered()) setVisible(true);
  }, [pathname]);

  function enter() {
    // O navegador só deixa tocar som depois de um clique; por isso o som fica aqui.
    if (shouldPlayOpeningSound(prefs, resolvedTheme)) playOpeningSound();
    try {
      sessionStorage.setItem(ENTRY_SESSION_KEY, '1');
    } catch {
      // aba anônima com armazenamento bloqueado: a tela volta na próxima visita
    }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && loaded && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Boas-vindas"
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-10 bg-bg"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.p
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="neon-gradient bg-clip-text text-6xl font-black text-transparent sm:text-8xl"
          >
            {APP_NAME}
          </motion.p>
          <button
            autoFocus
            onClick={enter}
            className="neon-gradient rounded-full px-12 py-4 text-lg font-bold text-white shadow-glow transition hover:scale-105 calm:hover:scale-100"
          >
            Entrar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
