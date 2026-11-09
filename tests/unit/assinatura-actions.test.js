// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { user } from '@/lib/db/schema';
import { listPayments, getSubscription } from '@/lib/subscription/store';

const viewer = vi.fn();
const revalidate = vi.fn();
let db;
vi.mock('@/lib/auth/viewer', () => ({ getViewer: () => viewer() }));
vi.mock('@/lib/db', () => ({ getDb: () => db }));
vi.mock('next/cache', () => ({ revalidatePath: (...a) => revalidate(...a) }));

const { payAction, cancelAction } = await import('@/lib/actions/assinatura');

const adult = { user: { id: 'u1' }, kids: false, kidsLock: false, parentMode: false, isDemo: false };
const card = (o = {}) => ({ plan: 'mensal', method: 'cartao', testCard: 'aprovado', brand: 'Visa', last4: '4242', ...o });

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.com', emailVerified: true });
  viewer.mockReset();
  revalidate.mockReset();
  viewer.mockResolvedValue(adult);
});

describe('payAction', () => {
  it('visitante recebe "login"', async () => {
    viewer.mockResolvedValue({ user: null });
    expect(await payAction(card())).toEqual({ ok: false, error: 'login' });
  });

  it('Kids sem PIN recebe "adulto" e nada é gravado', async () => {
    viewer.mockResolvedValue({ ...adult, kids: true });
    expect(await payAction(card())).toEqual({ ok: false, error: 'adulto' });
    expect(await listPayments(db, 'u1')).toHaveLength(0);
  });

  it('Kids com modo adulto pode pagar', async () => {
    viewer.mockResolvedValue({ ...adult, kids: true, parentMode: true });
    expect((await payAction(card())).ok).toBe(true);
  });

  it('cartão aprovado grava o preço do servidor e revalida', async () => {
    const r = await payAction({ ...card({ plan: 'anual' }), priceCents: 1 });
    expect(r.ok).toBe(true);
    expect(r.periodEnd).toBeInstanceOf(Date);
    const [p] = await listPayments(db, 'u1');
    expect(p).toMatchObject({ plan: 'anual', amountCents: 16680, method: 'cartao', cardLast4: '4242', status: 'aprovado' });
    expect((await getSubscription(db, 'u1')).status).toBe('ativa');
    expect(revalidate).toHaveBeenCalledWith('/', 'layout');
  });

  it('Pix é aprovado e não guarda últimos dígitos', async () => {
    const r = await payAction({ plan: 'mensal', method: 'pix' });
    expect(r.ok).toBe(true);
    const [p] = await listPayments(db, 'u1');
    expect(p).toMatchObject({ method: 'pix', cardLast4: null, status: 'aprovado' });
  });

  it('cartão recusado é gravado e devolve "recusado"', async () => {
    expect(await payAction(card({ testCard: 'recusado', last4: '0002' }))).toEqual({ ok: false, error: 'recusado' });
    const [p] = await listPayments(db, 'u1');
    expect(p.status).toBe('recusado');
    expect((await getSubscription(db, 'u1'))?.status).not.toBe('ativa');
  });

  it.each([
    ['plano desconhecido', card({ plan: 'vip' })],
    ['método desconhecido', card({ method: 'boleto' })],
    ['testCard inválido', card({ testCard: 'talvez' })],
    ['cartão sem testCard', card({ testCard: undefined })],
    ['Pix com testCard', { plan: 'mensal', method: 'pix', testCard: 'recusado' }],
    ['last4 inválido', card({ last4: '42x2' })],
    ['last4 longo', card({ last4: '4242424242424242' })],
    ['entrada vazia', undefined],
  ])('recusa %s como "invalido"', async (_n, input) => {
    expect(await payAction(input)).toEqual({ ok: false, error: 'invalido' });
    expect(await listPayments(db, 'u1')).toHaveLength(0);
  });

  it('demonstração não grava nada', async () => {
    viewer.mockResolvedValue({ ...adult, isDemo: true });
    expect(await payAction(card())).toEqual({ ok: true, demo: true });
    expect(await listPayments(db, 'u1')).toHaveLength(0);
    expect(await getSubscription(db, 'u1')).toBeFalsy();
    expect(revalidate).not.toHaveBeenCalled();
  });
});

describe('cancelAction', () => {
  it('visitante recebe "login"; Kids sem PIN recebe "adulto"', async () => {
    viewer.mockResolvedValue({ user: null });
    expect(await cancelAction()).toEqual({ ok: false, error: 'login' });
    viewer.mockResolvedValue({ ...adult, kids: true });
    expect(await cancelAction()).toEqual({ ok: false, error: 'adulto' });
  });

  it('demonstração recebe "demo"', async () => {
    viewer.mockResolvedValue({ ...adult, isDemo: true });
    expect(await cancelAction()).toEqual({ ok: false, error: 'demo' });
  });

  it('cancela e devolve até quando vale', async () => {
    await payAction(card());
    const r = await cancelAction();
    expect(r.ok).toBe(true);
    expect(r.periodEnd).toBeInstanceOf(Date);
    expect((await getSubscription(db, 'u1')).status).toBe('cancelada');
    expect(revalidate).toHaveBeenCalledWith('/', 'layout');
  });
});
