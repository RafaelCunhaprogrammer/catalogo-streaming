'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { imageSet } from '@/lib/images';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { CoverEditor } from '@/components/lists/CoverEditor';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Faixa no alto da Minha lista (Etapa D): a imagem do favorito escolhido, ou a cor do tema.
// As cores da capa ficam em variáveis próprias (--cover-accent-*), usadas só em enfeites.
export function CoverHeader({ profile, cover, counts, options }) {
  const [editing, setEditing] = useState(false);
  const image = cover ? imageSet(cover.backdropPath, 'backdrop') : null;
  const accentStyle = cover?.accent ? { '--cover-accent-dark': cover.accent.dark, '--cover-accent-light': cover.accent.light } : undefined;
  const summary = [
    plural(counts.favoritos, 'favorito', 'favoritos'),
    `${counts.assistindo} assistindo`,
    plural(counts.assistidos, 'já assistido', 'já assistidos'),
  ].join(' · ');

  return (
    <section
      aria-label="Capa do perfil"
      data-cover={image ? 'imagem' : 'padrao'}
      style={accentStyle}
      // Com imagem, a faixa é escura em todos os temas (como o destaque do Início), para o texto branco.
      className={`relative h-60 overflow-hidden sm:h-[22.5rem] ${image ? 'bg-[var(--hero-bg)]' : 'bg-surface'}`}
    >
      {image && (
        <>
          {/* O TMDB já serve cada tamanho (srcSet), como no destaque do Início. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.src} srcSet={image.srcSet} sizes="100vw" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div
            data-testid="capa-sombra"
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[var(--hero-bg)] via-black/55 to-black/10 calm:via-black/75 calm:to-black/55"
          />
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-4 px-margem pb-6 sm:gap-6">
        <ProfileAvatar profile={profile} size="md" />
        <div className={`min-w-0 flex-1 ${image ? 'text-white' : 'text-fg'}`}>
          <p className="condensado truncate text-4xl font-black sm:text-5xl">{profile.name}</p>
          <p className={`mt-1 text-sm sm:text-base ${image ? 'text-white/90' : 'text-muted'}`}>{summary}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 ${
            image ? 'border-white/50 bg-black/40 text-white hover:bg-black/60' : 'border-line hover:bg-surface-2'
          }`}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          Editar capa
        </button>
      </div>
      {editing && <CoverEditor cover={cover} options={options} onClose={() => setEditing(false)} />}
    </section>
  );
}
