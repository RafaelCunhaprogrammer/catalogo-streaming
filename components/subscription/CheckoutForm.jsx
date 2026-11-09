'use client';

import { useId, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { payAction } from '@/lib/actions/assinatura';
import { cardTestResult } from '@/lib/subscription/rules';
import { formatBRL } from '@/lib/plans';
import { inputClass, buttonClass } from '@/components/auth/AuthShell';

const TABS = [
  { id: 'pix', label: 'Pix' },
  { id: 'cartao', label: 'Cartão' },
];
const MESSAGES = {
  recusado: 'Pagamento recusado pelo banco (simulação). Tente outro cartão.',
  adulto: 'Peça para um adulto assinar.',
  login: 'Entre na sua conta para assinar.',
  invalido: 'Não foi possível concluir o pagamento. Tente de novo.',
};

const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

// QR de mentira: só um desenho, marcado como simulação.
function FakeQr() {
  const cells = [];
  for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) if ((x * 7 + y * 13 + x * y) % 3 === 0) cells.push([x, y]);
  const finder = (x, y) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="3" height="3" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <rect x={x + 1} y={y + 1} width="1" height="1" fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox="-1 -1 13 13" role="img" aria-label="QR Code de mentira (simulação)" className="h-40 w-40 rounded-xl bg-white p-2 text-black">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />)}
      {finder(0, 0)}{finder(8, 0)}{finder(0, 8)}
    </svg>
  );
}

export function CheckoutForm({ plan }) {
  const uid = useId();
  const [tab, setTab] = useState('pix');
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');
  const [numberError, setNumberError] = useState('');
  const [number, setNumber] = useState('');
  const tabRefs = useRef({});
  const numberErrorId = `${uid}-numero-erro`;
  const testId = `${uid}-testes`;

  const select = (id, focus = false) => {
    setTab(id);
    setError('');
    if (focus) tabRefs.current[id]?.focus();
  };
  const onTabKey = (e, index) => {
    const last = TABS.length - 1;
    const target = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    select(TABS[target].id, true);
  };

  const send = (payload) => {
    setError('');
    startTransition(async () => {
      const result = await payAction(payload);
      if (result.ok) setDone(result);
      else setError(MESSAGES[result.error] ?? MESSAGES.invalido);
    });
  };

  const payCard = (e) => {
    e.preventDefault();
    const digits = number.replace(/\D/g, '');
    const testCard = cardTestResult(digits);
    if (testCard === 'invalido') {
      setNumberError('Use um dos cartões de teste mostrados abaixo.');
      return;
    }
    setNumberError('');
    send({ plan: plan.id, method: 'cartao', testCard, brand: digits.startsWith('4') ? 'Visa' : 'Outra', last4: digits.slice(-4) });
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-8 text-center">
        {done.demo ? (
          <>
            <h1 className="text-2xl font-black" role="status">Pagamento aprovado (simulação)</h1>
            <p className="mt-2 text-muted">Como a conta de demonstração não foi alterada, nada muda na assinatura.</p>
          </>
        ) : (
          <h1 className="text-2xl font-black" role="status">Assinatura ativa até {formatDate(done.periodEnd)}</h1>
        )}
        <Link href="/" className={`${buttonClass} mt-6 inline-block`}>Começar a assistir</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm font-semibold">Ambiente de demonstração: nenhum valor é cobrado.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby={`${uid}-resumo`} className="rounded-2xl border border-line bg-surface p-6">
          <h1 id={`${uid}-resumo`} className="condensado text-2xl font-black">Plano {plan.label}</h1>
          <p className="mt-2 text-3xl font-black">{formatBRL(plan.priceCents)}</p>
          <p className="text-sm text-muted">{plan.months === 1 ? 'por 1 mês' : `${formatBRL(plan.perMonthCents)} por mês · ${plan.months} meses`}</p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <div role="tablist" aria-label="Forma de pagamento" className="flex gap-2 border-b border-line pb-2">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => { tabRefs.current[t.id] = el; }}
                id={`${uid}-aba-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`${uid}-painel`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => select(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 ${
                  tab === t.id ? 'border-accent-2 bg-surface-2 text-fg underline decoration-2 underline-offset-4' : 'border-line text-muted hover:text-fg'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`${uid}-painel`} aria-labelledby={`${uid}-aba-${tab}`} className="mt-4">
            {tab === 'pix' ? (
              <div className="flex flex-col items-center gap-4">
                <FakeQr />
                <p className="text-sm text-muted">QR Code de mentira, apenas uma simulação.</p>
                <button type="button" disabled={pending} onClick={() => send({ plan: plan.id, method: 'pix' })} className={buttonClass}>
                  Já paguei (simulação)
                </button>
              </div>
            ) : (
              <form onSubmit={payCard} noValidate aria-label="Pagar com cartão" className="space-y-4">
                <label htmlFor={`${uid}-numero`} className="block text-sm font-semibold">
                  Número do cartão
                  <input
                    id={`${uid}-numero`}
                    className={inputClass}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})(?=.)/g, '$1 '))}
                    aria-invalid={numberError ? 'true' : undefined}
                    aria-describedby={numberError ? `${numberErrorId} ${testId}` : testId}
                  />
                </label>
                {numberError && <p id={numberErrorId} className="-mt-2 text-sm font-semibold text-accent-2">{numberError}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <label htmlFor={`${uid}-validade`} className="block text-sm font-semibold">
                    Validade
                    <input id={`${uid}-validade`} className={inputClass} autoComplete="cc-exp" placeholder="MM/AA" required />
                  </label>
                  <label htmlFor={`${uid}-cvv`} className="block text-sm font-semibold">
                    CVV
                    <input id={`${uid}-cvv`} className={inputClass} inputMode="numeric" autoComplete="cc-csc" maxLength={4} required />
                  </label>
                </div>
                <label htmlFor={`${uid}-nome`} className="block text-sm font-semibold">
                  Nome no cartão
                  <input id={`${uid}-nome`} className={inputClass} autoComplete="cc-name" required />
                </label>
                <div id={testId} className="rounded-xl border border-line p-3 text-sm text-muted">
                  <p className="font-semibold text-fg">Cartões de teste</p>
                  <p>4242 4242 4242 4242: aprovado</p>
                  <p>4000 0000 0000 0002: recusado</p>
                </div>
                <button type="submit" disabled={pending} className={buttonClass}>Pagar {formatBRL(plan.priceCents)} (simulação)</button>
              </form>
            )}
            {error && <p role="alert" className="mt-4 text-sm font-semibold text-accent-2">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
