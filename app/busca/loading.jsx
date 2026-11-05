import { LoadingStatus, PosterSkeletonRow } from '@/components/PosterSkeleton';

export default function SearchLoading() {
  return (
    <div className="px-margem py-8">
      <LoadingStatus label="Buscando…" />
      <div className="h-8 w-72 animate-pulse rounded bg-surface-2" />
      <PosterSkeletonRow count={12} fluid />
    </div>
  );
}
