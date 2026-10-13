'use client';

import { useCallback, useState } from 'react';
import { TrailerModal } from '@/components/TrailerModal';
import { Play } from 'lucide-react';

export function TrailerButton({ trailerKey, subtitles = false, title, className = '' }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-2.5 font-bold text-white backdrop-blur hover:bg-white/20 ${className}`}
      >
        <Play aria-hidden="true" className="h-5 w-5 fill-current" />
        Ver trailer
      </button>
      {open && <TrailerModal trailerKey={trailerKey} subtitles={subtitles} title={title} onClose={close} />}
    </>
  );
}
