'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { imageUrl } from '@/lib/images';
import { titleHref } from '@/lib/tmdb/normalize';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export function SearchBox() {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/buscar?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // busca cancelada ou rede fora: mantém as sugestões anteriores
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  function submit(e) {
    e.preventDefault();
    if (trimmed.length < MIN_CHARS) return;
    setOpen(false);
    router.push(`/busca?q=${encodeURIComponent(trimmed)}`);
  }

  const listId = `${id}-sugestoes`;
  return (
    <form role="search" onSubmit={submit} className="relative order-last w-full sm:order-none sm:w-64">
      <label htmlFor={`${id}-campo`} className="sr-only">Buscar filmes e séries</label>
      <input
        id={`${id}-campo`}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && results.length > 0}
        autoComplete="off"
        placeholder="🔍 Buscar filmes e séries"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className="w-full rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-fg placeholder:text-muted"
      />
      {open && results.length > 0 && (
        <ul id={listId} className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-glow sm:w-80">
          {results.map((t) => (
            <li key={`${t.type}-${t.id}`}>
              <Link href={titleHref(t)} onClick={() => setOpen(false)} className="flex items-center gap-3 p-2 hover:bg-surface-2">
                {t.posterPath ? (
                  <img src={imageUrl(t.posterPath, 'w92')} alt="" className="h-12 w-8 rounded object-cover" />
                ) : (
                  <span aria-hidden="true" className="neon-gradient h-12 w-8 rounded" />
                )}
                <span className="text-sm">{t.year ? `${t.title} (${t.year})` : t.title}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/busca?q=${encodeURIComponent(trimmed)}`} onClick={() => setOpen(false)} className="block p-2 text-center text-sm font-semibold text-accent hover:bg-surface-2">
              Ver todos os resultados
            </Link>
          </li>
        </ul>
      )}
    </form>
  );
}
