import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guards';
import { adultAreaAllowed } from '@/lib/account-rules';
import { getPlan } from '@/lib/plans';
import { CheckoutForm } from '@/components/subscription/CheckoutForm';
import { PinGate } from '@/components/kids/PinGate';

export const metadata = { title: 'Pagamento' };

export default async function CheckoutPage({ searchParams }) {
  const { plano } = await searchParams;
  const id = Array.isArray(plano) ? plano[0] : plano;
  const plan = getPlan(id);
  const viewer = await requireUser(plan ? `/assinar/pagamento?plano=${plan.id}` : '/assinar');
  if (!plan) redirect('/assinar');
  if (!adultAreaAllowed(viewer)) {
    return <PinGate title="Área de adultos" description="Para assinar, peça para um adulto digitar o PIN." purpose="adulto" />;
  }
  return (
    <div className="px-margem py-8">
      <CheckoutForm plan={plan} />
    </div>
  );
}
