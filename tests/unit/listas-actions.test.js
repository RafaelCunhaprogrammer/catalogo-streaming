// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { user, profiles } from '@/lib/db/schema';

const viewer = vi.fn();
const details = vi.fn();
const revalidate = vi.fn();
const tmdb = vi.fn();
let db;
vi.mock('@/lib/auth/viewer', () => ({ getViewer: () => viewer() }));
vi.mock('@/lib/db', () => ({ getDb: () => db }));
vi.mock('next/cache', () => ({ revalidatePath: (...a) => revalidate(...a) }));
vi.mock('@/lib/tmdb/catalog', () => ({
  getTitleDetails: (...a) => details(...a),
  CACHE: { details: 86400 },
}));
vi.mock('@/lib/tmdb/client', () => ({ tmdbFetch: (...a) => tmdb(...a) }));

const actions = await import('@/lib/actions/listas');
const { getMark } = await import('@/lib/lists/store');

const movie = { title: 'Filme', posterPath: null, backdropPath: null, year: 2020, genreIds: [], certification: '14', seasonList: [] };
const serie = { ...movie, title: 'Série', certification: 'L', seasonList: [{ number: 1, episodes: 2 }] };

async function seed(kind = 'adulto') {
  await db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.com', emailVerified: true });
  const [p] = await db.insert(profiles).values({ id: 'p1', userId: 'u1', name: 'P', color: '#000', kind }).returning();
  return p;
}
const adultViewer = (p) => ({ user: { id: 'u1' }, profile: p, needsProfile: false, kids: false, maxRating: null, unlocked: new Set() });

beforeEach(async () => {
  db = await createTestDb();
  [viewer, details, revalidate, tmdb].forEach((m) => m.mockReset());
});

describe('ações das listas', () => {
  it('visitante ou sem perfil ativo recebe "perfil"', async () => {
    viewer.mockResolvedValue({ user: null });
    expect(await actions.markTitleAction('movie', 101, { favorite: true })).toEqual({ ok: false, error: 'perfil' });
    viewer.mockResolvedValue({ user: { id: 'u1' }, needsProfile: true, profile: null });
    expect(await actions.markTitleAction('movie', 101, { favorite: true })).toEqual({ ok: false, error: 'perfil' });
  });

  it('favorita um filme, grava e revalida', async () => {
    const p = await seed();
    viewer.mockResolvedValue(adultViewer(p));
    details.mockResolvedValue(movie);
    const res = await actions.markTitleAction('movie', 101, { favorite: true });
    expect(res.ok).toBe(true);
    expect(res.mark.favorite).toBe(true);
    expect((await getMark(db, p.id, 'movie', 101)).snapshot.title).toBe('Filme');
    expect(revalidate).toHaveBeenCalledWith('/minha-lista');
    expect(revalidate).toHaveBeenCalledWith('/');
  });

  it('rejeita mudança com chaves estranhas ou valores inválidos', async () => {
    const p = await seed();
    viewer.mockResolvedValue(adultViewer(p));
    details.mockResolvedValue(movie);
    for (const change of [{ profileId: 'x' }, { status: 'visto' }, { favorite: 'sim' }, { season: 0 }, { episode: 1.5 }, null]) {
      expect(await actions.markTitleAction('movie', 101, change)).toEqual({ ok: false, error: 'invalido' });
    }
    expect(await actions.markTitleAction('book', 101, { favorite: true })).toEqual({ ok: false, error: 'invalido' });
    expect(await actions.markTitleAction('movie', '1x', { favorite: true })).toEqual({ ok: false, error: 'invalido' });
  });

  it('Kids: título acima da faixa pede PIN, e liberado passa', async () => {
    const p = await seed('kids');
    const kids = { ...adultViewer(p), kids: true, maxRating: '10' };
    viewer.mockResolvedValue(kids);
    details.mockResolvedValue(movie);
    expect(await actions.markTitleAction('movie', 101, { favorite: true })).toEqual({ ok: false, error: 'pin' });
    viewer.mockResolvedValue({ ...kids, unlocked: new Set(['movie-101']) });
    expect((await actions.markTitleAction('movie', 101, { favorite: true })).ok).toBe(true);
  });

  it('detalhes ausentes em linha nova devolvem "erro"', async () => {
    const p = await seed();
    viewer.mockResolvedValue(adultViewer(p));
    details.mockResolvedValue(null);
    expect(await actions.markTitleAction('movie', 101, { favorite: true })).toEqual({ ok: false, error: 'erro' });
    details.mockRejectedValue(new Error('rede'));
    expect(await actions.markTitleAction('movie', 101, { favorite: true })).toEqual({ ok: false, error: 'erro' });
  });

  it('remove favorito de título já marcado sem consultar o TMDB', async () => {
    const p = await seed();
    viewer.mockResolvedValue(adultViewer(p));
    details.mockResolvedValueOnce(movie);
    await actions.markTitleAction('movie', 101, { favorite: true });
    details.mockReset();
    details.mockResolvedValue(null);
    const res = await actions.markTitleAction('movie', 101, { favorite: false });
    expect(res.ok).toBe(true);
    expect(details).not.toHaveBeenCalled();
    expect(await getMark(db, p.id, 'movie', 101)).toBeNull();
  });

  it('+1 episódio avança e, no último, devolve finished', async () => {
    const p = await seed();
    viewer.mockResolvedValue(adultViewer(p));
    details.mockResolvedValue(serie);
    await actions.markTitleAction('tv', 7, { status: 'assistindo' });
    let res = await actions.nextEpisodeAction(7);
    expect(res).toMatchObject({ ok: true, finished: false, mark: { season: 1, episode: 2 } });
    res = await actions.nextEpisodeAction(7);
    expect(res).toMatchObject({ ok: true, finished: true, mark: { season: 1, episode: 2, status: 'assistindo' } });
  });

  it('+1 episódio fora de "assistindo" é inválido', async () => {
    const p = await seed();
    viewer.mockResolvedValue(adultViewer(p));
    details.mockResolvedValue(serie);
    await actions.markTitleAction('tv', 7, { favorite: true });
    expect(await actions.nextEpisodeAction(7)).toEqual({ ok: false, error: 'invalido' });
    expect(await actions.nextEpisodeAction(999)).toEqual({ ok: false, error: 'invalido' });
  });

  it('lista os episódios de uma temporada', async () => {
    const p = await seed();
    viewer.mockResolvedValue(adultViewer(p));
    tmdb.mockResolvedValue({ episodes: [{ episode_number: 1, name: 'Piloto', x: 1 }, { episode_number: 2, name: 'Dois' }] });
    expect(await actions.seasonEpisodesAction(7, 1)).toEqual({
      ok: true, episodes: [{ number: 1, name: 'Piloto' }, { number: 2, name: 'Dois' }],
    });
    expect(tmdb.mock.calls[0][0]).toBe('/tv/7/season/1');
    expect(await actions.seasonEpisodesAction(7, 0)).toEqual({ ok: false, error: 'invalido' });
    tmdb.mockRejectedValue(new Error('x'));
    expect(await actions.seasonEpisodesAction(7, 2)).toEqual({ ok: false, error: 'erro' });
  });

  it('Kids: episódios de série acima da faixa pedem PIN e não chamam o TMDB', async () => {
    const p = await seed('kids');
    const kids = { ...adultViewer(p), kids: true, maxRating: '10' };
    viewer.mockResolvedValue(kids);
    details.mockResolvedValue({ ...serie, certification: '14' });
    tmdb.mockResolvedValue({ episodes: [{ episode_number: 1, name: 'Piloto' }] });
    expect(await actions.seasonEpisodesAction(7, 1)).toEqual({ ok: false, error: 'pin' });
    expect(tmdb).not.toHaveBeenCalled();
    details.mockResolvedValue(null);
    expect(await actions.seasonEpisodesAction(7, 1)).toEqual({ ok: false, error: 'pin' });
    viewer.mockResolvedValue({ ...kids, unlocked: new Set(['tv-7']) });
    expect((await actions.seasonEpisodesAction(7, 1)).ok).toBe(true);
  });

  it('no Kids, gêneros fora da lista liberada são descartados', async () => {
    const p = await seed('kids');
    viewer.mockResolvedValue({ ...adultViewer(p), kids: true, maxRating: '10' });
    expect(await actions.saveGenresAction(['acao', 'animacao'])).toEqual({ ok: true, genres: ['animacao'] });
    expect(await actions.dismissGenresPromptAction()).toEqual({ ok: true });
  });
});
