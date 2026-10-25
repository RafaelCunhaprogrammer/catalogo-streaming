'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Aviso com "Desfazer" que some sozinho depois de alguns segundos.
export function UndoToast({ message, onUndo, onClose, seconds = 6 }) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const timer = setTimeout(() => close.current?.(), seconds * 1000);
    return () => clearTimeout(timer);
  }, [message, seconds]);

  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[90] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-fg shadow-glow">
      <span>{message}</span>
      <span aria-hidden="true">·</span>
      <button type="button" onClick={onUndo} className="rounded px-1 font-bold underline underline-offset-4 hover:text-accent-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2">
        Desfazer
      </button>
      <button type="button" onClick={onClose} aria-label="Fechar aviso" className="rounded-full p-1 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
