'use client';

import { Heart } from 'lucide-react';
import { useLists } from '@/components/lists/ListsProvider';
import { useMarkAction } from '@/components/lists/useMarkAction';

function Button({ title, variant }) {
  const { mark, run, pinDialog } = useMarkAction(title);
  const on = mark.favorite;
  const label = on ? `Remover ${title.title} dos favoritos` : `Favoritar ${title.title}`;
  const message = `${title.title} ${on ? 'removido dos' : 'adicionado aos'} favoritos`;
  const base = 'inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2';
  const cls = variant === 'page'
    ? `${base} gap-2 border px-4 py-2 text-sm font-semibold text-fg ${on ? 'border-accent bg-accent/15' : 'border-line bg-surface hover:bg-surface-2'}`
    : `${base} absolute left-1.5 top-1.5 z-10 h-8 w-8 bg-black/75 text-white transition-opacity duration-200 calm:transition-none hover:bg-black/90 ${
      on ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100'
    }`;
  return (
    <>
      <button type="button" aria-pressed={on} aria-label={label} onClick={() => run({ favorite: !on }, { message })} className={cls}>
        <Heart aria-hidden="true" className={`h-4 w-4 ${on ? 'fill-current' : ''}`} />
        {variant === 'page' ? <span aria-hidden="true">{on ? 'Favorito' : 'Favoritar'}</span> : null}
      </button>
      {pinDialog}
    </>
  );
}

// Coração de favoritar. Sem perfil ativo (fora do provedor), não aparece.
export function FavoriteButton({ title, variant = 'card' }) {
  const { enabled } = useLists();
  return enabled ? <Button title={title} variant={variant} /> : null;
}
