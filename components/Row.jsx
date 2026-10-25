'use client';

import { useId, useRef } from 'react';
import Link from 'next/link';
import { PosterCard } from '@/components/PosterCard';
import { imageSet } from '@/lib/images';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Row({ title, href, items, logoPath }) {
  const listRef = useRef(null);
  const headingId = useId();

  function scrollByPage(direction) {
    const el = listRef.current;
    el?.scrollBy?.({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  function onKeyDown(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const links = [...listRef.current.querySelectorAll('a')];
    const index = links.indexOf(document.activeElement);
    if (index === -1) return;
    e.preventDefault();
    const next = Math.min(links.length - 1, Math.max(0, index + (e.key === 'ArrowRight' ? 1 : -1)));
    links[next].focus();
  }

  return (
    <section aria-labelledby={headingId} className="mt-10">
      <div className="flex items-baseline justify-between px-4 sm:px-8">
        <h2 id={headingId} className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          {logoPath && <img {...imageSet(logoPath, 'logo')} sizes="28px" alt="" className="h-7 w-7 rounded-md" />}
          {title}
        </h2>
        {href && (
          <Link href={href} aria-label={`Ver tudo: ${title}`} className="text-sm font-semibold text-accent-text hover:underline">
            Ver tudo
          </Link>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => scrollByPage(-1)}
          aria-label={`Rolar ${title} para a esquerda`}
          tabIndex={-1}
          className="absolute left-0 top-0 z-10 hidden h-full w-10 bg-gradient-to-r from-bg to-transparent sm:flex sm:items-center sm:justify-center"
        >
          <ChevronLeft aria-hidden="true" className="h-8 w-8" />
        </button>
        <ul ref={listRef} onKeyDown={onKeyDown} className="flex gap-3 overflow-x-auto scroll-smooth px-4 pb-3 pt-3 [scrollbar-width:none] sm:px-8">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <PosterCard title={item} />
            </li>
          ))}
        </ul>
        <button
          onClick={() => scrollByPage(1)}
          aria-label={`Rolar ${title} para a direita`}
          tabIndex={-1}
          className="absolute right-0 top-0 z-10 hidden h-full w-10 bg-gradient-to-l from-bg to-transparent sm:flex sm:items-center sm:justify-center"
        >
          <ChevronRight aria-hidden="true" className="h-8 w-8" />
        </button>
      </div>
    </section>
  );
}
