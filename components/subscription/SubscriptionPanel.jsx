'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getPlan, formatBRL } from '@/lib/plans';
import { cancelAction } from '@/lib/actions/assinatura';

const TZ = 'America/Belem';
const fmt = (d, opts) => new Date(d).toLocaleString('pt-BR', { timeZone: TZ, ...opts });
const dayMonth = (d) => fmt(d, { day: '2-digit', month: '2-digit' });
const fullDate = (d) => fmt(d, { day: '2-digit', month: '2-digit', year: 'numeric' });
const dayMonthTime = (d) => `${dayMonth(d)} ${fmt(d, { hour: '2-digit', minute: '2-digit', hour12: false })}`;

function situation(access, endedAt) {
  if (access.kind === 'teste') return `Teste grátis até ${dayMonthTime(access.until)}`;
  if (access.kind === 'ativa') {
    const until = endedAt ?? access.until;
    return access.canceled && until ? `Cancelada — sua assinatura termina em ${dayMonth(until)}.` : 'Ativa';
  }
  return 'Sem assinatura';
}

// Bloco "Assinatura" da Minha conta. `plan` é o id do plano atual (ou null).
export function SubscriptionPanel({ access, plan, payments = [], isDemo }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [canceledUntil, setCanceledUntil] = useState(null);
  const [error, setError] = useState(false);
  const planLabel = plan ? getPlan(plan)?.label : null;
  const canceled = access.canceled || Boolean(canceledUntil);
  const canCancel = !isDemo && access.kind === 'ativa' && !canceled;
  const showPlans = !isDemo && (access.kind !== 'ativa' || canceled);

  async function confirm() {
    setPending(true);
    setError(false);
    const result = await cancelAction();
    setPending(false);
    if (result.ok) {
      setCanceledUntil(result.periodEnd ?? access.until);
      setConfirming(false);
    } else {
      setError(true);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-lg font-bold">Assinatura</h2>
      <div className="mt-4 space-y-2 text-sm">
        {isDemo ? (
          <p>A demonstração tem assinatura sempre ativa.</p>
        ) : (
          <>
            <p className="font-semibold">{situation({ ...access, canceled }, canceledUntil)}</p>
            {planLabel && <p>Plano {planLabel}</p>}
            {access.kind === 'ativa' && access.until && <p className="text-muted">Válida até {fullDate(access.until)}</p>}
          </>
        )}
      </div>

      {canceledUntil && (
        <p role="status" className="mt-3 text-sm font-semibold">Sua assinatura termina em {dayMonth(canceledUntil)}.</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-accent-2">Não foi possível cancelar agora. Tente de novo.</p>}

      {payments.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-muted">Pagamentos simulados</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {payments.map((p) => (
              <li key={p.id}>
                {fullDate(p.createdAt)} · {getPlan(p.plan)?.label ?? p.plan} · {formatBRL(p.amountCents)} ·{' '}
                {p.method === 'pix' ? 'Pix' : `Cartão final ${p.cardLast4}`} · {p.status === 'aprovado' ? 'Aprovado' : 'Recusado'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {showPlans && (
          <Link href="/assinar" className="rounded-full border border-line px-5 py-2 text-sm font-bold hover:bg-surface-2">Ver planos</Link>
        )}
        {canCancel && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} className="rounded-full border border-line px-5 py-2 text-sm font-bold hover:bg-surface-2">
            Cancelar assinatura
          </button>
        )}
      </div>

      {canCancel && confirming && (
        <div role="group" aria-labelledby="cancelar-titulo" className="mt-4 rounded-xl border border-line p-4">
          <p id="cancelar-titulo" className="font-bold">Cancelar assinatura?</p>
          <p className="mt-1 text-sm text-muted">Você continua com acesso até o fim do período já pago.</p>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={confirm} disabled={pending} className="rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">Sim, cancelar</button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-full border border-line px-5 py-2 text-sm font-bold hover:bg-surface-2">Voltar</button>
          </div>
        </div>
      )}
    </section>
  );
}
