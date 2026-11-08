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
const accent = { dark: '#aabbcc', light: '#112233' };
vi.mock('@/lib/cover-accent', () => ({ extractAccent: vi.fn(async () => accent) }));

const { saveCoverAction } = await import('@/lib/actions/conta');
const { saveMark } = await import('@/lib/lists/store');

const snap = (title, extra = {}) => ({ title, posterPath: null, backdropPath: `/${title}.jpg`, year: 2020, genreIds: [], certification: '12', seasons: [], ...extra });
const cover = async (id) => (await state.db.select().from(profiles).where(eq(profiles.id, id)))[0].cover;
const viewerOf = (profile, extra = {}) => ({ user: { id: 'u1' }, needsProfile: false, profile, kids: profile.kind === 'kids', maxRating: profile.maxRating, unlocked: new Set(), ...extra });

let adulto;
let kids;
beforeEach(async () => {
  state.db = await createTestDb();
  await state.db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.com', emailVerified: true });
  [adulto, kids] = await state.db.insert(profiles).values([
    { id: 'pa', userId: 'u1', name: 'Pai', color: '#000', kind: 'adulto' },
    { id: 'pk', userId: 'u1', name: 'Pequeno', color: '#000', kind: 'kids', maxRating: '10' },
  ]).returning();
  await saveMark(state.db, 'pa', 'movie', 1, { favorite: true }, snap('duna'));
  await saveMark(state.db, 'pa', 'movie', 2, { status: 'assistido' }, snap('visto'));
  await saveMark(state.db, 'pa', 'movie', 3, { favorite: true }, snap('sem-imagem', { backdropPath: null }));
  await saveMark(state.db, 'pk', 'movie', 4, { favorite: true }, snap('livre', { certification: 'L' }));
  await saveMark(state.db, 'pk', 'movie', 5, { favorite: true }, snap('quatorze', { certification: '14' }));
  state.viewer = viewerOf(adulto);
});

describe('saveCoverAction', () => {
  it('favorito com imagem vira a capa do perfil ativo, com a cor tirada da imagem', async () => {
    expect(await saveCoverAction({ type: 'movie', id: 1 })).toEqual({ ok: true });
    expect(await cover('pa')).toEqual({ type: 'movie', id: 1, title: 'duna', backdropPath: '/duna.jpg', certification: '12', accent });
  });

  it('"Usar página padrão" apaga a capa', async () => {
    await saveCoverAction({ type: 'movie', id: 1 });
    expect(await saveCoverAction(null)).toEqual({ ok: true });
    expect(await cover('pa')).toBeNull();
  });

  it('recusa o que não é favorito com imagem do próprio perfil, e nada muda', async () => {
    for (const target of [{ type: 'movie', id: 2 }, { type: 'movie', id: 3 }, { type: 'movie', id: 4 }, { type: 'movie', id: 999 }, { type: 'pessoa', id: 1 }, { type: 'movie', id: 'x' }, 'qualquer']) {
      expect(await saveCoverAction(target), JSON.stringify(target)).toEqual({ ok: false, error: 'capa' });
    }
    expect(await cover('pa')).toBeNull();
  });

  it('Kids escolhe sem PIN, mas só dentro da faixa', async () => {
    state.viewer = viewerOf(kids, { unlocked: new Set(['movie-5']) });
    expect(await saveCoverAction({ type: 'movie', id: 5 })).toEqual({ ok: false, error: 'capa' });
    expect(await saveCoverAction({ type: 'movie', id: 4 })).toEqual({ ok: true });
    expect((await cover('pk')).id).toBe(4);
  });

  it('sem perfil ativo (trocado em outra aba): erro "perfil"', async () => {
    state.viewer = { user: { id: 'u1' }, needsProfile: true, profile: null };
    expect(await saveCoverAction(null)).toEqual({ ok: false, error: 'perfil' });
    state.viewer = { user: null, profile: null };
    expect(await saveCoverAction(null)).toEqual({ ok: false, error: 'perfil' });
  });
});
