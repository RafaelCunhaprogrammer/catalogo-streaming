// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { user, profileTitles } from '@/lib/db/schema';
import { createProfile, saveFavoriteGenres, dismissGenresPrompt, getOwnedProfile, PROFILE_COLORS } from '@/lib/profiles';
import { getMark, saveMark, refreshSnapshot, listMarks, continueWatching, recentSeeds, markIndex, listMarkIndex } from '@/lib/lists/store';
import { buildSnapshot } from '@/lib/lists/snapshot';
import { MAX_MARKS } from '@/lib/lists/rules';

let db;
let p1;
let p2;
const snap = (extra = {}) => ({
  title: 'Aventura', posterPath: '/a.jpg', backdropPath: null, year: 2024, genreIds: [28], certification: '12',
  seasons: [{ number: 1, episodes: 10 }, { number: 2, episodes: 8 }], ...extra,
});
const wait = () => new Promise((r) => setTimeout(r, 15));

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values([
    { id: 'u1', name: 'Ana', email: 'ana@ex.com' },
    { id: 'u2', name: 'Bia', email: 'bia@ex.com' },
  ]);
  const mk = async (uid) => (await createProfile(db, uid, { name: 'P', color: PROFILE_COLORS[0], kind: 'adulto' })).profile;
  p1 = await mk('u1');
  p2 = await mk('u2');
});

describe('buildSnapshot', () => {
  it('copia só os campos leves', () => {
    const d = { id: 1, title: 'X', posterPath: '/p', backdropPath: '/b', year: 2020, genreIds: [1], certification: 'L', seasonList: [{ number: 1, episodes: 3 }], overview: 'longo' };
    expect(buildSnapshot(d)).toEqual({ title: 'X', posterPath: '/p', backdropPath: '/b', year: 2020, genreIds: [1], certification: 'L', seasons: [{ number: 1, episodes: 3 }] });
  });
});

describe('saveMark', () => {
  it('favoritar cria a linha com a cópia; desfavoritar sem situação apaga', async () => {
    const r = await saveMark(db, p1.id, 'movie', 10, { favorite: true }, snap());
    expect(r).toMatchObject({ ok: true, mark: { favorite: true, status: 'nenhum' } });
    expect(await getMark(db, p1.id, 'movie', 10)).toMatchObject({ favorite: true, snapshot: { title: 'Aventura' } });
    await saveMark(db, p1.id, 'movie', 10, { favorite: false });
    expect(await getMark(db, p1.id, 'movie', 10)).toBeNull();
  });

  it('não troca a cópia sem snapshot; refreshSnapshot troca o cartaz', async () => {
    await saveMark(db, p1.id, 'movie', 10, { favorite: true }, snap());
    await saveMark(db, p1.id, 'movie', 10, { status: 'assistido' });
    expect((await getMark(db, p1.id, 'movie', 10)).snapshot.posterPath).toBe('/a.jpg');
    await refreshSnapshot(db, p1.id, 'movie', 10, snap({ posterPath: '/novo.jpg' }));
    expect((await getMark(db, p1.id, 'movie', 10)).snapshot.posterPath).toBe('/novo.jpg');
    await refreshSnapshot(db, p1.id, 'movie', 99, snap());
    expect(await getMark(db, p1.id, 'movie', 99)).toBeNull();
  });

  it('remove sem snapshot em título já marcado; criar sem snapshot dá sem-dados', async () => {
    expect(await saveMark(db, p1.id, 'movie', 10, { favorite: true })).toEqual({ ok: false, error: 'sem-dados' });
    await saveMark(db, p1.id, 'movie', 10, { favorite: true }, snap());
    expect(await saveMark(db, p1.id, 'movie', 10, { favorite: false })).toMatchObject({ ok: true });
  });

  it('série assistindo guarda a posição usando as temporadas da cópia', async () => {
    const r = await saveMark(db, p1.id, 'tv', 5, { status: 'assistindo' }, snap());
    expect(r.mark).toMatchObject({ status: 'assistindo', season: 1, episode: 1 });
    const r2 = await saveMark(db, p1.id, 'tv', 5, { season: 2, episode: 99 });
    expect(r2.mark).toMatchObject({ season: 2, episode: 8 });
  });

  it('favoriteAt e statusAt só mudam quando o campo muda', async () => {
    await saveMark(db, p1.id, 'movie', 10, { favorite: true }, snap());
    const [a] = await db.select().from(profileTitles);
    expect(a.favoriteAt).toBeTruthy();
    expect(a.statusAt).toBeNull();
    await wait();
    await saveMark(db, p1.id, 'movie', 10, { status: 'assistido' });
    const [b] = await db.select().from(profileTitles);
    expect(b.favoriteAt.getTime()).toBe(a.favoriteAt.getTime());
    expect(b.statusAt).toBeTruthy();
    await wait();
    await saveMark(db, p1.id, 'movie', 10, { favorite: true });
    const [c] = await db.select().from(profileTitles);
    expect(c.favoriteAt.getTime()).toBe(a.favoriteAt.getTime());
    expect(c.updatedAt.getTime()).toBeGreaterThan(b.updatedAt.getTime());
  });

  it('limite de 500: a 501ª falha, mudar uma existente funciona', async () => {
    await db.insert(profileTitles).values(Array.from({ length: MAX_MARKS }, (_, i) => ({
      profileId: p1.id, mediaType: 'movie', tmdbId: i + 1, favorite: true, snapshot: snap(),
    })));
    expect(await saveMark(db, p1.id, 'movie', 9999, { favorite: true }, snap())).toEqual({ ok: false, error: 'limite' });
    expect(await saveMark(db, p1.id, 'movie', 1, { status: 'assistido' })).toMatchObject({ ok: true });
  });
});

describe('consultas', () => {
  it('continueWatching ordena pelo mais recente e isola perfis', async () => {
    await saveMark(db, p1.id, 'tv', 1, { status: 'assistindo' }, snap({ title: 'Velha' }));
    await wait();
    await saveMark(db, p1.id, 'tv', 2, { status: 'assistindo' }, snap({ title: 'Nova' }));
    await saveMark(db, p1.id, 'movie', 3, { status: 'assistido' }, snap());
    await saveMark(db, p2.id, 'tv', 7, { status: 'assistindo' }, snap());
    const rows = await continueWatching(db, p1.id);
    expect(rows.map((r) => r.tmdbId)).toEqual([2, 1]);
    expect(await listMarks(db, p1.id)).toHaveLength(3);
  });

  it('continueWatching traz primeiro a série cujo episódio acabou de mudar', async () => {
    await saveMark(db, p1.id, 'tv', 1, { status: 'assistindo' }, snap({ title: 'Velha' }));
    await wait();
    await saveMark(db, p1.id, 'tv', 2, { status: 'assistindo' }, snap({ title: 'Nova' }));
    await wait();
    await saveMark(db, p1.id, 'tv', 1, { episode: 2 });
    const rows = await continueWatching(db, p1.id);
    expect(rows.map((r) => r.tmdbId)).toEqual([1, 2]);
  });

  it('recentSeeds devolve no máximo 5, do mais recente', async () => {
    for (let i = 1; i <= 7; i++) {
      await saveMark(db, p1.id, 'movie', i, { favorite: true }, snap());
      await new Promise((r) => setTimeout(r, 5));
    }
    await saveMark(db, p1.id, 'movie', 50, { status: 'assistindo' }, snap());
    const seeds = await recentSeeds(db, p1.id);
    expect(seeds).toHaveLength(5);
    expect(seeds[0]).toEqual({ type: 'movie', id: 7 });
    expect(seeds).not.toContainEqual({ type: 'movie', id: 50 });
  });

  it('markIndex indexa por tipo-id', async () => {
    await saveMark(db, p1.id, 'tv', 5, { favorite: true, status: 'assistindo' }, snap());
    const idx = markIndex(await listMarks(db, p1.id));
    expect(idx['tv-5']).toEqual({ favorite: true, status: 'assistindo', season: 1, episode: 1 });
  });
});

describe('listMarkIndex', () => {
  it('traz só as colunas do índice, do perfil pedido', async () => {
    await saveMark(db, p1.id, 'tv', 5, { favorite: true, status: 'assistindo' }, snap());
    await saveMark(db, p2.id, 'movie', 9, { favorite: true }, snap());
    const rows = await listMarkIndex(db, p1.id);
    expect(rows).toEqual([{ mediaType: 'tv', tmdbId: 5, favorite: true, status: 'assistindo', season: 1, episode: 1 }]);
    expect(markIndex(rows)).toEqual({ 'tv-5': { favorite: true, status: 'assistindo', season: 1, episode: 1 } });
  });
});

describe('gêneros favoritos do perfil', () => {
  it('salva limpando os slugs e marca o convite como feito', async () => {
    const r = await saveFavoriteGenres(db, 'u1', p1.id, ['acao', 'inventado', 'acao']);
    expect(r).toEqual(['acao']);
    expect(await getOwnedProfile(db, 'u1', p1.id)).toMatchObject({ favoriteGenres: ['acao'], genresPromptDone: true });
  });

  it('recusa perfil de outra conta', async () => {
    expect(await saveFavoriteGenres(db, 'u1', p2.id, ['acao'])).toBeNull();
    expect(await dismissGenresPrompt(db, 'u1', p2.id)).toBe(false);
    expect(await dismissGenresPrompt(db, 'u1', p1.id)).toBe(true);
    expect((await getOwnedProfile(db, 'u1', p1.id)).genresPromptDone).toBe(true);
  });
});
