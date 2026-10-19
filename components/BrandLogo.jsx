import { APP_NAME, LOGO_SRC } from '@/lib/brand';

// Símbolo do Pai d'Égua: o caroço de açaí com o play neon no centro.
export function BrandSymbol({ className = '' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={LOGO_SRC} alt="" className={`object-contain ${className}`} />;
}

export function BrandLogo({ className = '', showName = true }) {
  return (
    <span role="img" aria-label={APP_NAME} className={`inline-flex items-center gap-2 ${className}`}>
      <BrandSymbol className="h-9 w-9 shrink-0 drop-shadow-[0_0_6px_rgba(167,139,250,.45)]" />
      {showName && (
        <span aria-hidden="true" className="neon-gradient bg-clip-text text-xl font-black tracking-tight text-transparent">
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
