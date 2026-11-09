import { getViewerOrVisitor } from '@/lib/auth/viewer';
import { adultAreaAllowed } from '@/lib/account-rules';
import { PlanCards } from '@/components/subscription/PlanCards';
import { PinGate } from '@/components/kids/PinGate';

export const metadata = { title: 'Planos' };

export default async function PlansPage({ searchParams }) {
  const { motivo } = await searchParams;
  const viewer = await getViewerOrVisitor();
  const loggedIn = Boolean(viewer.user);
  const blocked = loggedIn && !adultAreaAllowed(viewer);
  return (
    <div className="px-margem py-8">
      <h1 className="condensado text-4xl font-black">Planos</h1>
      {motivo === 'expirou' && (
        <p role="status" className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3 font-semibold">
          Seu teste grátis acabou. Escolha um plano para continuar assistindo.
        </p>
      )}
      <p className="mt-2 text-muted">Pagamento simulado: nenhum valor é cobrado.</p>
      <div className="mt-6">
        <PlanCards loggedIn={loggedIn} blocked={blocked} />
      </div>
      {blocked && (
        <div className="mt-6">
          <PinGate title="Área de adultos" description="Para assinar, peça para um adulto digitar o PIN." purpose="adulto" />
        </div>
      )}
    </div>
  );
}
