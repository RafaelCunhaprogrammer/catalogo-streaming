import Link from 'next/link';
import { PLANS, formatBRL } from '@/lib/plans';

const button = 'neon-gradient mt-4 block w-full rounded-full px-6 py-3 text-center font-bold text-white shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2';

// Os quatro planos. `blocked`: perfil Kids sem a área de adultos aberta.
export function PlanCards({ loggedIn, blocked }) {
  return (
    <ul aria-label="Planos" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((plan) => (
        <li
          key={plan.id}
          className={`flex flex-col rounded-2xl border bg-surface p-6 ${plan.featured ? 'border-accent-2 shadow-glow' : 'border-line'}`}
        >
          {plan.featured && (
            <span className="mb-2 w-fit rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-accent-2">Mais vantajoso</span>
          )}
          <h2 className="condensado text-2xl font-black">{plan.label}</h2>
          <p className="mt-2 text-3xl font-black">{formatBRL(plan.priceCents)}</p>
          <p className="text-sm text-muted">
            {plan.months === 1 ? 'por mês' : `${formatBRL(plan.perMonthCents)} por mês · ${plan.months} meses`}
          </p>
          <div className="mt-auto pt-2">
            {blocked ? (
              <p className="mt-4 text-sm font-semibold">Peça para um adulto assinar.</p>
            ) : loggedIn ? (
              <Link href={`/assinar/pagamento?plano=${plan.id}`} aria-label={`Assinar ${plan.label}`} className={button}>Assinar</Link>
            ) : (
              <>
                <p className="mt-4 text-sm text-muted">Teste grátis de 6 horas ao criar a conta</p>
                <Link href="/criar-conta" aria-label={`Criar conta para o plano ${plan.label}`} className={button}>Criar conta</Link>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
