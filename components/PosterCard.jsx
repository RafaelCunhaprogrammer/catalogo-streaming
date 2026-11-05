import { LockedPosterCard } from '@/components/kids/LockedPosterCard';
import { WIDE_CARD_WIDTH } from '@/components/PosterSkeleton';
import Link from 'next/link';
import { FavoriteButton } from '@/components/lists/FavoriteButton';
import { Star } from 'lucide-react';
import { imageSet } from '@/lib/images';
import { titleHref } from '@/lib/tmdb/normalize';

function Rating({ rating }) {
  if (!rating) return null;
  return (
    <span
      aria-label={`Nota ${rating.toFixed(1)} de 10`}
      className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white"
    >
      <Star aria-hidden="true" className="h-3 w-3 fill-amber-400 text-amber-400" />
      {rating.toFixed(1)}
    </span>
  );
}

// wide: cartão horizontal das fileiras, com a imagem de cena e o nome por cima dela.
function WidePosterCard({ title, label }) {
  const img = imageSet(title.backdropPath, 'backdrop') ?? imageSet(title.posterPath, 'poster');
  return (
    <div className={`group/card relative ${WIDE_CARD_WIDTH}`}>
      <Link href={titleHref(title)} className="group block w-full focus-visible:outline-none">
        <div className="relative aspect-video overflow-hidden rounded-md bg-surface-2 outline-[3px] -outline-offset-[3px] outline-transparent transition-[outline-color] duration-150 group-hover:outline-white group-focus-visible:outline-white">
          {img ? (
            <>
              <img src={img.src} srcSet={img.srcSet} sizes="(min-width: 640px) 23vw, 70vw" alt={label} loading="lazy" className="h-full w-full object-cover" />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 to-transparent" />
            </>
          ) : (
            <span aria-hidden="true" data-testid="poster-fallback" className="neon-gradient absolute inset-0" />
          )}
          <p aria-hidden={img ? 'true' : undefined} className="condensado absolute inset-x-3 bottom-2 line-clamp-2 text-lg font-extrabold leading-tight text-white sm:text-xl">{title.title}</p>
          <Rating rating={title.rating} />
        </div>
      </Link>
      <FavoriteButton title={title} variant="card" />
    </div>
  );
}

export function PosterCard({ title, fluid = false, priority = false, wide = false }) {
  if (title.locked) return <LockedPosterCard title={title} fluid={fluid} wide={wide} />;
  const label = title.year ? `${title.title} (${title.year})` : title.title;
  if (wide) return <WidePosterCard title={title} label={label} />;
  const img = imageSet(title.posterPath, 'poster');
  return (
    <div className={`group/card relative ${fluid ? 'w-full' : 'w-36 shrink-0 sm:w-44'}`}>
    <Link href={titleHref(title)} className="group block w-full focus-visible:outline-none">
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
        <Rating rating={title.rating} />
      </div>
      <p aria-hidden="true" className="mt-2 line-clamp-1 text-sm text-fg">{title.title}</p>
    </Link>
    <FavoriteButton title={title} variant="card" />
    </div>
  );
}
