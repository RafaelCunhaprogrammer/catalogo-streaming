'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PosterCard } from '@/components/PosterCard';
import { LoadError } from '@/components/LoadError';
import { toExploreQuery } from '@/lib/explore-params';

const keyOf = (t) => `${t.type}-${t.id}`;

function mergeUnique(current, incoming) {
  const seen = new Set(current.map(keyOf));
  return [...current, ...incoming.filter((t) => !seen.has(keyOf(t)))];
}

export function ExploreGrid({ filters, initial }) {
  const [items, setItems] = useState(initial.results);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const sentinelRef = useRef(null);
  const hasMore = page < initial.totalPages;

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    setStatus('loading');
    try {
      const response = await fetch(`/api/explorar?${toExploreQuery({ ...filters, pagina: page + 1 })}`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = await response.json();
      setItems((current) => mergeUnique(current, data.results));
      setPage((p) => p + 1);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [filters, page, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || status !== 'idle') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: '600px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, status]);

  if (!items.length) {
    return (
      <div className="mt-16 text-center">
        <p className="text-lg font-semibold">Nenhum título encontrado</p>
        <Link
          href={filters.tipo === 'serie' ? '/explorar?tipo=serie' : '/explorar'}
          className="neon-gradient mt-4 inline-block rounded-full px-6 py-2 font-bold text-white shadow-glow"
        >
          Limpar filtros
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
        {items.map((item) => (
          <li key={keyOf(item)}>
            <PosterCard title={item} fluid />
          </li>
        ))}
      </ul>
      {status === 'loading' && <p role="status" className="py-8 text-center text-muted">Carregando mais títulos…</p>}
      {status === 'error' && <LoadError onRetry={loadMore} />}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-10" />}
    </>
  );
}
