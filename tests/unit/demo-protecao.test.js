// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../helpers/test-db';
import { user, profiles } from '@/lib/db/schema';

// A conta de demonstração é uma só para todos os visitantes: o que um muda, todos veem.
const state = { db: null, viewer: null };
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({ redirect: (to) => { throw new Error(`redirect ${to}`); } }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/photos/storage', async (orig) => ({ ...(await orig()), getPhotoStorage: () => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }) }));
vi.mock('@/lib/db', () => ({ getDb: () => state.db }));
vi.mock('@/lib/auth/viewer', () => ({ getViewer: async () => state.viewer }));

const { createProfileAction, updateProfileAction, deleteProfileAction } = await import('@/lib/actions/conta');
const { demoProfileEditError } = await import('@/lib/account-rules');

const demo = { user: { id: 'u1' }, isDemo: true, kids: false, kidsLock: false, parentMode: true };
const pai = { id: 'pa', userId: 'u1', name: 'Pai', color: '#0ea5e9', kind: 'adulto', maxRating: null, avatar: 'acai' };
const row = async (id) => (await state.db.select().from(profiles).where(eq(profiles.id, id)))[0];
const form = (obj) => {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => fd.set(k, v));
  return fd;
};
const edicaoDoPai = (extra = {}) => form({ id: 'pa', name: 'Pai', color: '#0ea5e9', kind: 'adulto', avatar: 'acai', ...extra });

beforeEach(async () => {
  state.db = await createTestDb();
  await state.db.insert(user).values({ id: 'u1', name: 'Família Demonstração', email: 'demo@paidegua.app', emailVerified: true });
  await state.db.insert(profiles).values([
    pai,
    { id: 'pm', userId: 'u1', name: 'Mãe', color: '#ec4899', kind: 'adulto', avatar: 'ver-o-peso' },
  ]);
  state.viewer = demo;
});

describe('demoProfileEditError', () => {
  it('aceita trocar só o avatar e a cor', () => {
    expect(demoProfileEditError(pai, { name: 'Pai', kind: 'adulto', maxRating: null, avatar: 'jambu', color: '#ef4444' }, { photo: false })).toBeNull();
  });

  it('recusa nome novo, foto própria e mudança de tipo ou de faixa', () => {
    expect(demoProfileEditError(pai, { name: 'Outro nome', kind: 'adulto', maxRating: null }, { photo: false })).toMatch(/demonstração/);
    expect(demoProfileEditError(pai, { name: 'Pai', kind: 'adulto', maxRating: null }, { photo: true })).toMatch(/demonstração/);
    expect(demoProfileEditError(pai, { name: 'Pai', kind: 'kids', maxRating: '10' }, { photo: false })).toMatch(/demonstração/);
    const kids = { ...pai, kind: 'kids', maxRating: '10' };
    expect(demoProfileEditError(kids, { name: 'Pai', kind: 'kids', maxRating: '14' }, { photo: false })).toMatch(/demonstração/);
  });

  it('nome com espaços nas pontas conta como o mesmo nome', () => {
    expect(demoProfileEditError(pai, { name: '  Pai ', kind: 'adulto', maxRating: null }, { photo: false })).toBeNull();
  });
});

describe('ações de perfil na conta de demonstração', () => {
  it('não cria perfil novo', async () => {
    const result = await createProfileAction(null, form({ name: 'Visitante', color: '#0ea5e9', kind: 'adulto' }));
    expect(result.ok).toBe(false);
    expect(result.errors.form).toMatch(/demonstração/);
    expect(await state.db.select().from(profiles)).toHaveLength(2);
  });

  it('não exclui perfil', async () => {
    const result = await deleteProfileAction('pm');
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/demonstração/) });
    expect(await row('pm')).toBeDefined();
  });

  it('troca o avatar do Pai', async () => {
    const result = await updateProfileAction(null, edicaoDoPai({ avatar: 'jambu' }));
    expect(result).toEqual({ ok: true });
    expect((await row('pa')).avatar).toBe('jambu');
  });

  it('não renomeia o perfil', async () => {
    const result = await updateProfileAction(null, edicaoDoPai({ name: 'Nome qualquer' }));
    expect(result.ok).toBe(false);
    expect(result.errors.form).toMatch(/demonstração/);
    expect((await row('pa')).name).toBe('Pai');
  });

  it('não aceita foto própria', async () => {
    const fd = edicaoDoPai({ avatar: 'foto' });
    fd.set('photo', new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' }));
    const result = await updateProfileAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.errors.form).toMatch(/demonstração/);
    expect((await row('pa')).photoKey ?? null).toBeNull();
  });

  it('numa conta comum, criar e excluir seguem funcionando', async () => {
    state.viewer = { ...demo, isDemo: false };
    const created = await createProfileAction(null, form({ name: 'Ana', color: '#0ea5e9', kind: 'adulto' }));
    expect(created.ok).toBe(true);
    expect(await deleteProfileAction('pm')).toEqual({ ok: true });
  });
});
