'use client';

import { favoriteGenreOptions } from '@/lib/genres';

// Escolha dos gêneros favoritos. Cada botão marca com aria-pressed e com "✓" (nunca só pela cor).
// Com `name`, também gera um campo oculto por gênero escolhido, para uso dentro de formulários.
export function GenrePicker({ kids = false, value = [], onChange, name }) {
  const options = favoriteGenreOptions(kids);
  const toggle = (slug) => onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((g) => {
        const on = value.includes(g.slug);
        return (
          <button
            key={g.slug}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(g.slug)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${on ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted'}`}
          >
            {on && <span aria-hidden="true">✓ </span>}
            {g.label}
          </button>
        );
      })}
      {name && options.filter((g) => value.includes(g.slug)).map((g) => <input key={g.slug} type="hidden" name={name} value={g.slug} />)}
    </div>
  );
}
