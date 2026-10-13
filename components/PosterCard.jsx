import Link from 'next/link';
import { Star } from 'lucide-react';
import { imageSet } from '@/lib/images';
import { titleHref } from '@/lib/tmdb/normalize';

export function PosterCard({ title, fluid = false, priority = false }) {
  const img = imageSet(title.posterPath, 'poster');
  const label = title.year ? `${title.title} (${title.year})` : title.title;
  return (
    <Link href={titleHref(title)} className={`group block focus-visible:outline-none ${fluid ? 'w-full' : 'w-36 shrink-0 sm:w-44'}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 transition duration-300 group-hover:scale-105 group-hover:shadow-glow group-focus-visible:scale-105 group-focus-visible:shadow-glow group-focus-visible:ring-2 group-focus-visible:ring-accent-2 calm:group-hover:scale-100 calm:group-focus-visible:scale-100">
        {img ? (
          <img
            src={img.src}
            srcSet={img.srcSet}
            sizes={fluid ? '(min-width: 640px) 220px, 45vw' : '(min-width: 640px) 176px, 144px'}
            alt={label} loading={priority ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
        ) : (
          <div role="img" aria-label={label} data-testid="poster-fallback" className="neon-gradient flex h-full items-center justify-center p-3 text-center font-bold text-white">
            {title.title}
          </div>
        )}
        {title.rating ? (
          <span
            aria-label={`Nota ${title.rating.toFixed(1)} de 10`}
            className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white"
          >
            <Star aria-hidden="true" className="h-3 w-3 fill-amber-400 text-amber-400" />
            {title.rating.toFixed(1)}
          </span>
        ) : null}
      </div>
      <p aria-hidden="true" className="mt-2 line-clamp-1 text-sm text-fg">{title.title}</p>
    </Link>
  );
}
