'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { PinDialog } from '@/components/kids/PinDialog';
import { titleHref } from '@/lib/tmdb/normalize';
import { imageSet } from '@/lib/images';

// Cartaz de um título acima da faixa do perfil Kids: o clique pede o PIN em vez de abrir.
export function LockedPosterCard({ title, fluid = false }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const img = imageSet(title.posterPath, 'poster');
  const label = title.year ? `${title.title} (${title.year})` : title.title;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label} — bloqueado para este perfil`}
        className={`group block text-left ${fluid ? 'w-full' : 'w-36 shrink-0 sm:w-44'}`}
      >
        <span className="relative block aspect-[2/3] overflow-hidden rounded-lg bg-surface-2">
          {img ? (
            <img src={img.src} srcSet={img.srcSet} sizes="176px" alt="" className="h-full w-full object-cover opacity-40 blur-[2px]" />
          ) : (
            <span aria-hidden="true" className="neon-gradient block h-full opacity-40" />
          )}
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/70 p-3 text-white"><Lock className="h-7 w-7" /></span>
          </span>
        </span>
        <span aria-hidden="true" className="mt-2 line-clamp-1 block text-sm text-muted">{title.title}</span>
      </button>
      <PinDialog
        open={open}
        title="Este título precisa de um adulto"
        purpose="titulo"
        titleKey={`${title.type}-${title.id}`}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.push(titleHref(title));
        }}
      />
    </>
  );
}
