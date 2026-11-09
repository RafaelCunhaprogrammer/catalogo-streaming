'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, Search } from 'lucide-react';
import { imageUrl } from '@/lib/images';
import { titleHref } from '@/lib/tmdb/normalize';

const MIN_CHARS = 2;
const MIN_GENRE_CHARS = 3;
const DEBOUNCE_MS = 300;

// Em Filmes a busca é só de filmes; em Séries, só de séries; no resto, dos dois.
function scopeOf(pathname) {
  if (pathname?.startsWith('/filmes')) return { tipo: 'filme', label: 'Buscar filmes' };
  if (pathname?.startsWith('/series')) return { tipo: 'serie', label: 'Buscar séries' };
  return { tipo: null, label: 'Buscar filmes e séries' };
}

const fold = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

// "guerra" → "Ver filmes de Guerra": buscar pelo tema, e não só por títulos com a palavra no nome.
export function genreSuggestions(query, genres, tipo) {
  const q = fold(query);
  if (q.length < MIN_GENRE_CHARS || !genres) return [];
  const matches = (g) => fold(g.name).startsWith(q);
  const filmes = tipo === 'serie' ? [] : (genres.filme ?? []).filter(matches)
    .map((g) => ({ key: `f${g.id}`, label: `Ver filmes de ${g.name}`, href: `/explorar?genero=${g.id}` }));
  const series = tipo === 'filme' ? [] : (genres.serie ?? []).filter(matches)
    .map((g) => ({ key: `s${g.id}`, label: `Ver séries de ${g.name}`, href: `/explorar?tipo=serie&genero=${g.id}` }));
  return [...filmes, ...series];
}

export function SearchBox({ genres, signedIn = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const scope = scopeOf(pathname);
  const id = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // sugestão escolhida com as setas; -1 = nenhuma
  const trimmed = query.trim();
  const queryString = `q=${encodeURIComponent(trimmed)}${scope.tipo ? `&tipo=${scope.tipo}` : ''}`;

  useEffect(() => {
    if (trimmed.length < MIN_CHARS) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/buscar?${queryString}`, { signal: controller.signal });
        if (response.status === 403) {
          router.push('/assinar?motivo=expirou');
          return;
        }
        if (!response.ok) return;
        const data = await response.json();
        setResults(data.results ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        // busca cancelada ou rede fora: mantém as sugestões anteriores
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, queryString, router]);

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function submit(e) {
    e.preventDefault();
    if (trimmed.length < MIN_CHARS) return;
    close();
    router.push(`/busca?${queryString}`);
  }

  const listId = `${id}-sugestoes`;
  const suggestions = trimmed.length >= MIN_CHARS ? results : [];
  const genreLinks = genreSuggestions(trimmed, genres, scope.tipo);
  const hasAnything = suggestions.length > 0 || genreLinks.length > 0;
  const showList = open && trimmed.length >= MIN_CHARS && hasAnything;
  const allResultsHref = `/busca?${queryString}`;
  const hrefs = [...genreLinks.map((g) => g.href), ...suggestions.map(titleHref), allResultsHref];
  const optionId = (i) => `${id}-opcao-${i}`;
  const activeId = showList && active >= 0 ? optionId(active) : undefined;

  // O foco fica no campo: a lista rola sozinha até a sugestão escolhida.
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showList) {
        setOpen(true);
      } else if (e.key === 'ArrowDown') {
        setActive((a) => (a + 1) % hrefs.length);
      } else {
        setActive((a) => (a <= 0 ? hrefs.length - 1 : a - 1));
      }
    } else if (e.key === 'Enter' && activeId) {
      e.preventDefault();
      close();
      router.push(hrefs[active]);
    }
  }

  const optionClass = 'aria-selected:bg-surface-2 aria-selected:ring-2 aria-selected:ring-inset aria-selected:ring-accent-2';

  if (!signedIn) {
    return (
      <Link
        href="/entrar?voltar=%2Fbusca"
        className="order-last flex w-full items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted hover:text-fg sm:order-none sm:w-72"
      >
        <Search aria-hidden="true" className="h-4 w-4" />
        Entre para buscar
      </Link>
    );
  }

  return (
    <form role="search" onSubmit={submit} className="relative order-last w-full sm:order-none sm:w-72">
      <label htmlFor={`${id}-campo`} className="sr-only">{scope.label}</label>
      <input
        id={`${id}-campo`}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showList}
        aria-activedescendant={activeId}
        autoComplete="off"
        placeholder={`${scope.label}…`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onKeyDown={onKeyDown}
        className="w-full rounded-full border border-line bg-surface py-2 pl-4 pr-11 text-sm text-fg placeholder:text-muted"
      />
      <button type="submit" aria-label="Buscar" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
        <Search aria-hidden="true" className="h-4 w-4" />
      </button>
      {showList && (
        // onMouseDown impede que o campo perca o foco antes do clique: assim o clique sempre funciona.
        <ul
          id={listId}
          role="listbox"
          aria-label="Sugestões"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-0 top-full z-50 mt-2 max-h-[60vh] w-full overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface shadow-glow sm:w-96"
        >
          {genreLinks.map((g, i) => (
            <li key={g.key} id={optionId(i)} role="option" aria-selected={active === i} className={`scroll-mb-12 ${optionClass}`}>
              <Link href={g.href} tabIndex={-1} onClick={close} className="flex items-center gap-3 border-b border-line p-3 text-sm font-semibold text-accent-2 hover:bg-surface-2">
                <LayoutGrid aria-hidden="true" className="h-4 w-4" />
                {g.label}
              </Link>
            </li>
          ))}
          {suggestions.map((t, i) => (
            <li
              key={`${t.type}-${t.id}`}
              id={optionId(genreLinks.length + i)}
              role="option"
              aria-selected={active === genreLinks.length + i}
              className={`scroll-mb-12 ${optionClass}`}
            >
              <Link href={titleHref(t)} tabIndex={-1} onClick={close} className="flex items-center gap-3 p-2 hover:bg-surface-2">
                {t.posterPath ? (
                  <img src={imageUrl(t.posterPath, 'w92')} alt="" className="h-12 w-8 rounded object-cover" />
                ) : (
                  <span aria-hidden="true" className="neon-gradient h-12 w-8 rounded" />
                )}
                <span className="text-sm">{t.year ? `${t.title} (${t.year})` : t.title}</span>
              </Link>
            </li>
          ))}
          <li
            id={optionId(hrefs.length - 1)}
            role="option"
            aria-selected={active === hrefs.length - 1}
            className={`sticky bottom-0 bg-surface ${optionClass}`}
          >
            <Link
              href={allResultsHref}
              tabIndex={-1}
              onClick={close}
              className="block border-t border-line p-3 text-center text-sm font-semibold text-accent-text hover:bg-surface-2"
            >
              Ver todos os resultados
            </Link>
          </li>
        </ul>
      )}
    </form>
  );
}
