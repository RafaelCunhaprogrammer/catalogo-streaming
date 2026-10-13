'use client';

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/components/useDialogFocus';
import { X } from 'lucide-react';
import { trailerEmbedUrl } from '@/lib/trailer';

export function TrailerModal({ trailerKey, subtitles = false, title, onClose }) {
  const dialogRef = useRef(null);
  const guards = useDialogFocus(dialogRef, true, onClose);

  // Portal no <body>, para a janela cobrir a tela inteira mesmo dentro de áreas com transform/blur.
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer de ${title}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {guards.start}
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Fechar trailer" className="absolute -top-11 right-0 rounded p-2 text-2xl text-white">
          <X aria-hidden="true" className="h-7 w-7" />
        </button>
        <div className="aspect-video w-full">
          <iframe
            title={`Trailer de ${title}`}
            src={trailerEmbedUrl(trailerKey, { autoplay: true, subtitles })}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="h-full w-full rounded-lg"
          />
        </div>
      </div>
      {guards.end}
    </div>,
    document.body,
  );
}
