// Cartazes "fantasma" pulsando enquanto o conteúdo carrega (no Modo calmo, sem pulsar).
export function PosterSkeletonRow({ count = 8, fluid = false }) {
  return (
    <div aria-hidden="true" className={fluid ? 'mt-8 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]' : 'flex gap-3 overflow-hidden px-4 pt-3 sm:px-8'}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${fluid ? 'w-full' : 'w-36 shrink-0 sm:w-44'}`}>
          <div className="aspect-[2/3] animate-pulse rounded-lg bg-surface-2" />
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export function LoadingStatus({ label }) {
  return <p role="status" className="sr-only">{label}</p>;
}
