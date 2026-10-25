// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../helpers/test-db';
import { user, profiles } from '@/lib/db/schema';

const state = { db: null, viewer: null };
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({ redirect: (to) => { throw new Error(`redirect ${to}`); } }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/db', () => ({ getDb: () => state.db }));
vi.mock('@/lib/auth/viewer', () => ({ getViewer: async () => state.viewer }));

const { saveProfileGenresAction, dismissProfileGenresAction, updateProfileAction } = await import('@/lib/actions/conta');
const { setPin } = await import('@/lib/pin');

const row = async (id) => (await state.db.select().from(profiles).where(eq(profiles.id, id)))[0];
const adult = { user: { id: 'u1' }, kids: false, kidsLock: false, parentMode: false };
const kidsLocked = { user: { id: 'u1' }, kids: true, kidsLock: true, parentMode: false };
const form = (obj, genres) => {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => fd.set(k, v));
  genres.forEach((g) => fd.append('genres', g));
  return fd;
};

beforeEach(async () => {
  state.db = await createTestDb();
  await state.db.insert(user).values([
    { id: 'u1', name: 'U', email: 'u@x.com', emailVerified: true },
    { id: 'u2', name: 'V', email: 'v@x.com', emailVerified: true },
  ]);
  await state.db.insert(profiles).values([
    { id: 'pa', userId: 'u1', name: 'Adulto', color: '#000', kind: 'adulto' },
    { id: 'pk', userId: 'u1', name: 'Kids', color: '#000', kind: 'kids', maxRating: '10' },
    { id: 'po', userId: 'u2', name: 'Outro', color: '#000', kind: 'adulto', favoriteGenres: ['drama'] },
  ]);
  state.viewer = adult;
});

describe('gêneros do perfil: ações de Gerenciar perfis', () => {
  it('perfil de outra conta é rejeitado e nada muda', async () => {
    expect((await saveProfileGenresAction('po', ['acao'])).ok).toBe(false);
    expect((await dismissProfileGenresAction('po')).ok).toBe(false);
    const other = await row('po');
    expect(other.favoriteGenres).toEqual(['drama']);
    expect(other.genresPromptDone).toBe(false);
  });

  it('Kids sem modo adulto é rejeitado nas duas ações e na edição', async () => {
    state.viewer = kidsLocked;
    expect((await saveProfileGenresAction('pa', ['acao'])).ok).toBe(false);
    expect((await dismissProfileGenresAction('pa')).ok).toBe(false);
    const res = await updateProfileAction(null, form({ id: 'pa', name: 'Novo', color: '#8b5cf6', kind: 'adulto' }, ['acao']));
    expect(res.ok).toBe(false);
    const p = await row('pa');
    expect(p.favoriteGenres).toEqual([]);
    expect(p.genresPromptDone).toBe(false);
    expect(p.name).toBe('Adulto');
  });

  it('perfil Kids guarda só gêneros infantis e descarta desconhecidos', async () => {
    const res = await saveProfileGenresAction('pk', ['acao', 'animacao', 'xyz']);
    expect(res).toEqual({ ok: true, genres: ['animacao'] });
    expect((await row('pk')).favoriteGenres).toEqual(['animacao']);
  });

  it('adulto: descarta desconhecidos e repetidos e encerra o convite', async () => {
    const res = await saveProfileGenresAction('pa', ['drama', 'xyz', 'acao', 'drama']);
    expect(res.ok).toBe(true);
    const p = await row('pa');
    expect(p.favoriteGenres).toEqual(['acao', 'drama']);
    expect(p.genresPromptDone).toBe(true);
  });

  it('dispensar encerra o convite sem mexer nos gêneros', async () => {
    await state.db.update(profiles).set({ favoriteGenres: ['crime'] }).where(eq(profiles.id, 'pa'));
    expect(await dismissProfileGenresAction('pa')).toEqual({ ok: true });
    const p = await row('pa');
    expect(p.genresPromptDone).toBe(true);
    expect(p.favoriteGenres).toEqual(['crime']);
  });

  it('editar salva os gêneros do formulário (adulto limpo, Kids filtrado)', async () => {
    await setPin(state.db, 'u1', '1234');
    expect((await updateProfileAction(null, form({ id: 'pa', name: 'Adulto', color: '#8b5cf6', kind: 'adulto' }, ['acao', 'xyz']))).ok).toBe(true);
    expect((await row('pa')).favoriteGenres).toEqual(['acao']);
    const res = await updateProfileAction(null, form({ id: 'pk', name: 'Kids', color: '#8b5cf6', kind: 'kids', maxRating: '10' }, ['acao', 'fantasia']));
    expect(res.ok).toBe(true);
    expect((await row('pk')).favoriteGenres).toEqual(['fantasia']);
  });
});
