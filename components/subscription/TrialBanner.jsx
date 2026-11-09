import Link from 'next/link';
import { remainingText } from '@/lib/subscription/rules';

// Faixa fina sob o topo durante o teste grátis. Texto simples: sem contagem ao vivo e sem animação.
export function TrialBanner({ access, now = new Date() }) {
  if (access?.kind !== 'teste') return null;
  return (
    <div role="status" className="border-b border-line bg-surface-2 px-margem py-1.5 text-center text-sm">
      Teste grátis: {remainingText(access.until, now)} ·{' '}
      <Link href="/assinar" className="font-bold text-accent-2 underline underline-offset-2">Assinar</Link>
    </div>
  );
}
