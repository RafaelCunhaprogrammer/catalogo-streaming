'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';

export const NAV = [
  { href: '/', label: 'Início' },
  { href: '/filmes', label: 'Filmes' },
  { href: '/series', label: 'Séries' },
  { href: '/explorar', label: 'Explorar' },
];

export const isActive = (pathname, href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

const linkClass =
  'text-sm font-semibold uppercase tracking-wide text-muted hover:text-fg aria-[current=page]:text-fg aria-[current=page]:underline aria-[current=page]:decoration-accent-2 aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8';

function GenreColumns({ genres, onPick }) {
  const columns = [
    { title: 'Filmes', items: genres?.filme ?? [], href: (g) => `/explorar?genero=${g.id}` },
    { title: 'Séries', items: genres?.serie ?? [], href: (g) => `/explorar?tipo=serie&genero=${g.id}` },
  ];
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {columns.map((col) => (
        <div key={col.title}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{col.title}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {col.items.map((g) => (
              <li key={g.id}>
                <Link href={col.href(g)} onClick={onPick} className="block rounded px-2 py-1 text-sm hover:bg-surface-2 hover:text-accent-2">
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Botão "Categorias" com o painel de gêneros (filmes e séries). Fecha com Esc, clique fora ou ao escolher.
export function CategoriesMenu({ genres }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="menu-categorias"
        className={`${linkClass} inline-flex items-center gap-1`}
      >
        Categorias
        <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          id="menu-categorias"
          role="region"
          aria-label="Categorias"
          className="absolute left-0 top-full z-40 mt-3 w-[min(36rem,90vw)] rounded-2xl border border-line bg-surface p-5 shadow-glow"
        >
          <GenreColumns genres={genres} onPick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

// Menu ☰ para telas pequenas, com os mesmos itens e as categorias.
export function MobileMenu({ pathname, genres }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        className="rounded-full p-2 text-fg hover:bg-surface-2"
      >
        {open ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
      </button>
      {open && (
        <nav aria-label="Menu" className="absolute inset-x-0 top-full z-40 max-h-[80vh] overflow-y-auto border-b border-line bg-surface px-4 py-4 shadow-glow">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className={`block py-2 ${linkClass}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">Categorias</p>
          <div className="mt-2">
            <GenreColumns genres={genres} onPick={() => setOpen(false)} />
          </div>
        </nav>
      )}
    </div>
  );
}

export function DesktopNav({ pathname, genres }) {
  const link = (item) => (
    <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined} className={linkClass}>
      {item.label}
    </Link>
  );
  return (
    <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
      {NAV.slice(0, 3).map(link)}
      <CategoriesMenu genres={genres} />
      {link(NAV[3])}
    </nav>
  );
}
