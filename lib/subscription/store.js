import { desc, eq } from 'drizzle-orm';
import { payments, subscriptions } from '../db/schema.js';
import { getPlan } from '../plans.js';
import { nextPeriodEnd, trialEnd } from './rules.js';

export async function getSubscription(db, userId) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return row ?? null;
}

// Devolve a linha; contas antigas (sem linha) ganham o teste de 6 h. Seguro com chamadas simultâneas.
export async function ensureSubscription(db, userId, now = new Date()) {
  const existing = await getSubscription(db, userId);
  if (existing) return existing;
  await db.insert(subscriptions)
    .values({ userId, status: 'teste', trialEndsAt: trialEnd(now), updatedAt: now })
    .onConflictDoNothing({ target: subscriptions.userId });
  return getSubscription(db, userId);
}

export async function startTrial(db, userId, now = new Date()) {
  return ensureSubscription(db, userId, now);
}

export async function recordPayment(db, userId, { plan, method, cardLast4 = null, approved }, now = new Date()) {
  const found = getPlan(plan);
  if (!found) return { ok: false, error: 'plano' };
  await db.insert(payments).values({
    id: crypto.randomUUID(),
    userId,
    plan: found.id,
    amountCents: found.priceCents,
    method,
    cardLast4: method === 'cartao' ? cardLast4 : null,
    status: approved ? 'aprovado' : 'recusado',
    createdAt: now,
  });
  const current = await ensureSubscription(db, userId, now);
  if (!approved) return { ok: false, periodEnd: current.periodEnd };
  const periodEnd = nextPeriodEnd(current.periodEnd, now, found.months);
  await db.update(subscriptions)
    .set({ status: 'ativa', plan: found.id, periodEnd, updatedAt: now })
    .where(eq(subscriptions.userId, userId));
  return { ok: true, periodEnd };
}

// Só uma assinatura ativa pode ser cancelada; o acesso vale até o fim do período já pago.
export async function cancelSubscription(db, userId, now = new Date()) {
  const current = await getSubscription(db, userId);
  if (current?.status === 'ativa') {
    await db.update(subscriptions).set({ status: 'cancelada', updatedAt: now }).where(eq(subscriptions.userId, userId));
    return getSubscription(db, userId);
  }
  return current;
}

export async function listPayments(db, userId) {
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
}
