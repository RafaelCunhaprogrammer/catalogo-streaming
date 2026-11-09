// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestAuth, signUp } from '../helpers/test-auth';
import { user, subscriptions } from '@/lib/db/schema';
import {
  getSubscription, ensureSubscription, startTrial, recordPayment, cancelSubscription, listPayments,
} from '@/lib/subscription/store';

const H = 3600 * 1000;
const NOW = new Date('2026-11-09T12:00:00Z');

async function newUser(db, id = 'u1') {
  await db.insert(user).values({ id, name: 'Ana', email: `${id}@ex.com`, emailVerified: false });
  return id;
}

describe('assinatura no banco', () => {
  it('o cadastro cria o teste de 6 h', async () => {
    const { auth, db } = await createTestAuth();
    const before = Date.now();
    const { user: u } = await signUp(auth);
    const sub = await getSubscription(db, u.id);
    expect(sub.status).toBe('teste');
    expect(sub.plan).toBeNull();
    expect(sub.periodEnd).toBeNull();
    const t = sub.trialEndsAt.getTime();
    expect(t).toBeGreaterThanOrEqual(before + 6 * H - 1000);
    expect(t).toBeLessThanOrEqual(Date.now() + 6 * H + 1000);
  });

  it('getSubscription devolve null sem linha', async () => {
    const { db } = await createTestAuth();
    const id = await newUser(db);
    expect(await getSubscription(db, id)).toBeNull();
  });

  it('conta sem linha ganha teste no ensureSubscription, sem duplicar', async () => {
    const { db } = await createTestAuth();
    const id = await newUser(db);
    const a = await ensureSubscription(db, id, NOW);
    expect(a.status).toBe('teste');
    expect(a.trialEndsAt.getTime()).toBe(NOW.getTime() + 6 * H);
    const b = await ensureSubscription(db, id, new Date(NOW.getTime() + H));
    expect(b.trialEndsAt.getTime()).toBe(NOW.getTime() + 6 * H);
    expect(await db.select().from(subscriptions).where(eq(subscriptions.userId, id))).toHaveLength(1);
  });

  it('startTrial grava o teste; chamadas concorrentes de ensureSubscription são seguras', async () => {
    const { db } = await createTestAuth();
    const id = await newUser(db);
    await startTrial(db, id, NOW);
    expect((await getSubscription(db, id)).trialEndsAt.getTime()).toBe(NOW.getTime() + 6 * H);
    const id2 = await newUser(db, 'u2');
    const rows = await Promise.all([ensureSubscription(db, id2, NOW), ensureSubscription(db, id2, NOW)]);
    expect(rows[0].userId).toBe(id2);
    expect(rows[1].userId).toBe(id2);
  });

  it('pagamento aprovado ativa o plano e soma ao período', async () => {
    const { db } = await createTestAuth();
    const id = await newUser(db);
    await ensureSubscription(db, id, NOW);
    const first = await recordPayment(db, id, { plan: 'mensal', method: 'pix', approved: true }, NOW);
    expect(first.ok).toBe(true);
    expect(first.periodEnd.toISOString()).toBe('2026-12-09T12:00:00.000Z');
    const second = await recordPayment(db, id, { plan: 'trimestral', method: 'cartao', cardLast4: '4242', approved: true }, new Date(NOW.getTime() + 60000));
    expect(second.periodEnd.toISOString()).toBe('2027-03-09T12:00:00.000Z');
    const sub = await getSubscription(db, id);
    expect([sub.status, sub.plan]).toEqual(['ativa', 'trimestral']);
    expect(sub.periodEnd.toISOString()).toBe('2027-03-09T12:00:00.000Z');
    const list = await listPayments(db, id);
    expect(list.map((p) => [p.plan, p.amountCents, p.method, p.cardLast4, p.status])).toEqual([
      ['trimestral', 5370, 'cartao', '4242', 'aprovado'],
      ['mensal', 1990, 'pix', null, 'aprovado'],
    ]);
  });

  it('pagamento recusado só registra', async () => {
    const { db } = await createTestAuth();
    const id = await newUser(db);
    const before = await ensureSubscription(db, id, NOW);
    const r = await recordPayment(db, id, { plan: 'anual', method: 'cartao', cardLast4: '0002', approved: false }, NOW);
    expect(r.ok).toBe(false);
    const after = await getSubscription(db, id);
    expect([after.status, after.plan, after.periodEnd]).toEqual(['teste', null, null]);
    expect(after.trialEndsAt.getTime()).toBe(before.trialEndsAt.getTime());
    const [p] = await listPayments(db, id);
    expect([p.status, p.amountCents]).toEqual(['recusado', 16680]);
  });

  it('plano desconhecido: erro e nada gravado', async () => {
    const { db } = await createTestAuth();
    const id = await newUser(db);
    await ensureSubscription(db, id, NOW);
    expect(await recordPayment(db, id, { plan: 'vitalicio', method: 'pix', approved: true }, NOW)).toEqual({ ok: false, error: 'plano' });
    expect(await listPayments(db, id)).toHaveLength(0);
    expect((await getSubscription(db, id)).status).toBe('teste');
  });

  it('cancelar mantém plano e período; cancelada volta a ativa ao pagar', async () => {
    const { db } = await createTestAuth();
    const id = await newUser(db);
    await ensureSubscription(db, id, NOW);
    const paid = await recordPayment(db, id, { plan: 'mensal', method: 'pix', approved: true }, NOW);
    const c = await cancelSubscription(db, id, NOW);
    expect([c.status, c.plan]).toEqual(['cancelada', 'mensal']);
    expect(c.periodEnd.getTime()).toBe(paid.periodEnd.getTime());
    await cancelSubscription(db, id, NOW);
    expect((await getSubscription(db, id)).status).toBe('cancelada');
    await recordPayment(db, id, { plan: 'mensal', method: 'pix', approved: true }, NOW);
    expect((await getSubscription(db, id)).status).toBe('ativa');
  });

  it('cancelar em teste não muda nada', async () => {
    const { db } = await createTestAuth();
    const id = await newUser(db);
    await ensureSubscription(db, id, NOW);
    const c = await cancelSubscription(db, id, NOW);
    expect(c.status).toBe('teste');
  });
});
