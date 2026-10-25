'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Lock, Sparkles } from 'lucide-react';
import { PinDialog } from '@/components/kids/PinDialog';
import { useMarkAction } from '@/components/lists/useMarkAction';
import { FinishAsk, btn, useAdvanceEpisode } from '@/components/lists/AdvanceEpisode';
import { titleHref } from '@/lib/tmdb/normalize';
import { imageSet } from '@/lib/images';

const wrap = 'w-72 shrink-0 overflow-hidden rounded-xl border border-line bg-surface sm:w-80';
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2';

function Locked({ item }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <li className={wrap}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${item.title} — bloqueado para este perfil`}
        className={`relative block aspect-video w-full bg-surface-2 text-left ${focus}`}
      >
        <span aria-hidden="true" className="neon-gradient block h-full opacity-40" />
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/70 p-3 text-white"><Lock className="h-7 w-7" /></span>
        </span>
      </button>
      <PinDialog
        open={open}
        title="Este título precisa de um adulto"
        purpose="titulo"
        titleKey={`${item.type}-${item.id}`}
        onClose={() => setOpen(false)}
        onSuccess={() => { setOpen(false); router.push(titleHref(item)); }}
      />
    </li>
  );
}

function Open({ item }) {
  const { mark, pending, run, exclusive, pinDialog } = useMarkAction(item);
  const { advance, finishAsk, dismissAsk } = useAdvanceEpisode(item, exclusive);
  const img = imageSet(item.backdropPath, 'backdrop');
  const isTv = item.type === 'tv';
  const season = Math.min(mark.season ?? item.season ?? 1, item.lastSeason ?? Infinity);
  const episode = mark.episode ?? item.episode ?? 1;
  const link = `inline-flex items-center gap-2 rounded-full border border-accent bg-accent/15 px-4 py-2 text-sm font-semibold ${focus}`;

  return (
    <li className={wrap}>
      <Link href={titleHref(item)} className={`relative block aspect-video bg-surface-2 ${focus}`} aria-label={`Abrir ${item.title}`}>
        {img ? (
          <img src={img.src} srcSet={img.srcSet} sizes="320px" alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true" className="neon-gradient flex h-full items-center justify-center p-4 text-center text-lg font-bold text-white">{item.title}</span>
        )}
        {item.newEpisodes ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Novos episódios
          </span>
        ) : null}
      </Link>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-bold">{item.title}</p>
        {isTv ? <p className="mt-0.5 text-sm text-muted">{`Parei no T${season} E${episode}`}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {item.provider ? (
            <a href={item.provider.href} target="_blank" rel="noopener noreferrer" className={link}>
              <span>Assistir {item.title} na {item.provider.name}</span>
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : (
            <Link href={titleHref(item)} className={link}>Ver onde assistir</Link>
          )}
          {isTv ? (
            <button type="button" disabled={pending} onClick={advance} className={`${btn} border-line bg-surface hover:bg-surface-2 disabled:opacity-60`}>
              +1 episódio
            </button>
          ) : null}
        </div>
        {finishAsk ? <FinishAsk title={item} run={run} onDone={dismissAsk} /> : null}
      </div>
      {pinDialog}
    </li>
  );
}

// Cartão da fileira "Continuar assistindo". Some quando a marcação compartilhada deixa de ser "Assistindo".
export function ContinueCard({ item }) {
  const { mark } = useMarkAction(item);
  if (mark.status !== 'assistindo') return null;
  return item.locked ? <Locked item={item} /> : <Open item={item} />;
}
