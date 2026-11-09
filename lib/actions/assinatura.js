'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { getViewer } from '@/lib/auth/viewer';
import { adultAreaAllowed } from '@/lib/account-rules';
import { getPlan } from '@/lib/plans';
import { cancelSubscription, recordPayment } from '@/lib/subscription/store';

const METHODS = ['pix', 'cartao'];
const TEST_CARDS = ['aprovado', 'recusado'];

// Cobra de mentira. O servidor só recebe o resultado do cartão de teste, a bandeira e os 4 últimos dígitos;
// o preço vem sempre de lib/plans.js.
export async function payAction(input) {
  const viewer = await getViewer();
  if (!viewer?.user) return { ok: false, error: 'login' };
  if (!adultAreaAllowed(viewer)) return { ok: false, error: 'adulto' };

  const { plan, method, testCard, last4 } = input && typeof input === 'object' ? input : {};
  const found = typeof plan === 'string' ? getPlan(plan) : null;
  if (!found || !METHODS.includes(method)) return { ok: false, error: 'invalido' };
  if (method === 'cartao') {
    if (!TEST_CARDS.includes(testCard) || typeof last4 !== 'string' || !/^\d{4}$/.test(last4)) return { ok: false, error: 'invalido' };
  } else if (testCard !== undefined) {
    return { ok: false, error: 'invalido' };
  }

  // testCard e last4 vêm do navegador e são aceitos como estão: o pagamento é simulado, não há cobrança real.
  const approved = method === 'pix' || testCard === 'aprovado';
  // A demonstração pode testar o fluxo, mas nada muda no banco.
  if (viewer.isDemo) return approved ? { ok: true, demo: true } : { ok: false, error: 'recusado' };

  const result = await recordPayment(getDb(), viewer.user.id, {
    plan: found.id,
    method,
    cardLast4: method === 'cartao' ? last4 : null,
    approved,
  });
  revalidatePath('/', 'layout');
  if (!result.ok) return { ok: false, error: approved ? 'invalido' : 'recusado' };
  return { ok: true, periodEnd: result.periodEnd };
}

export async function cancelAction() {
  const viewer = await getViewer();
  if (!viewer?.user) return { ok: false, error: 'login' };
  if (!adultAreaAllowed(viewer)) return { ok: false, error: 'adulto' };
  if (viewer.isDemo) return { ok: false, error: 'demo' };
  const sub = await cancelSubscription(getDb(), viewer.user.id);
  revalidatePath('/', 'layout');
  return { ok: true, periodEnd: sub?.periodEnd ?? null };
}
