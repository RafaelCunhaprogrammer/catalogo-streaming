'use client';

import { useCallback, useState } from 'react';
import { TrailerModal } from '@/components/TrailerModal';

export function TrailerButton({ trailerKey, subtitles = false, title, className = '' }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded-full border border-white/40 bg-white/10 px-6 py-2.5 font-bold text-white backdrop-blur hover:bg-white/20 ${className}`}
      >
        ▶ Ver trailer
      </button>
      {open && <TrailerModal trailerKey={trailerKey} subtitles={subtitles} title={title} onClose={close} />}
    </>
  );
}
