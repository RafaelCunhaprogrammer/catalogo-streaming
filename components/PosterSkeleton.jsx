// Cartazes "fantasma" pulsando enquanto o conteúdo carrega (no Modo calmo, sem pulsar).
export const WIDE_CARD_WIDTH = 'w-[70vw] shrink-0 sm:w-[clamp(15rem,23vw,23rem)]';

export function PosterSkeletonRow({ count = 8, fluid = false, wide = false }) {
  return (
    <div aria-hidden="true" className={fluid ? 'mt-8 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]' : 'flex gap-2.5 overflow-hidden px-margem pt-3'}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={wide ? WIDE_CARD_WIDTH : fluid ? 'w-full' : 'w-36 shrink-0 sm:w-44'}>
          <div className={`animate-pulse rounded-md bg-surface-2 ${wide ? 'aspect-video' : 'aspect-[2/3]'}`} />
          {!wide && <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-surface-2" />}
        </div>
      ))}
    </div>
  );
}

export function LoadingStatus({ label }) {
  return <p role="status" className="sr-only">{label}</p>;
}
