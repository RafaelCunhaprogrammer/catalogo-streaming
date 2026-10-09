'use client';

import { useEffect, useRef } from 'react';
import { trailerEmbedUrl } from '@/lib/trailer';

export function TrailerModal({ trailerKey, title, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer de ${title}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} onClick={onClose} aria-label="Fechar trailer" className="absolute -top-11 right-0 rounded p-2 text-2xl text-white">
          ✕
        </button>
        <div className="aspect-video w-full">
          <iframe
            title={`Trailer de ${title}`}
            src={trailerEmbedUrl(trailerKey, { autoplay: true })}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="h-full w-full rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
