import { LoadingStatus, PosterSkeletonRow } from '@/components/PosterSkeleton';

// Enquanto o Início, Filmes ou Séries carregam: destaque e fileiras "fantasma".
export default function HomeLoading() {
  return (
    <div>
      <LoadingStatus label="Carregando…" />
      <div aria-hidden="true" className="aspect-video max-h-[85vh] w-full animate-pulse bg-surface-2" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="mt-10">
          <div aria-hidden="true" className="mx-4 h-6 w-56 animate-pulse rounded bg-surface-2 sm:mx-8" />
          <PosterSkeletonRow />
        </div>
      ))}
    </div>
  );
}
