import { describe, expect, it, vi, beforeEach } from 'vitest';

const tmdbFetch = vi.fn();
const filterAvailable = vi.fn(async (titles) => titles);
const filterByRating = vi.fn(async (titles) => titles);
const recentSeeds = vi.fn(async () => []);
const listMarks = vi.fn(async () => []);

vi.mock('@/lib/db', () => ({ getDb: () => ({}) }));
vi.mock('@/lib/lists/store', () => ({ recentSeeds: (...a) => recentSeeds(...a), listMarks: (...a) => listMarks(...a) }));
vi.mock('@/lib/tmdb/client', () => ({ tmdbFetch: (...a) => tmdbFetch(...a) }));
vi.mock('@/lib/tmdb/catalog', () => ({ CACHE: { rows: 21600 }, filterAvailable: (...a) => filterAvailable(...a) }));
vi.mock('@/lib/tmdb/ratings', () => ({
  filterByRating: (...a) => filterByRating(...a),
  certificationParams: (m) => (m ? { certification_country: 'BR', 'certification.lte': m } : {}),
}));

const { pickDailyGenres, interleave, getRecommendations } = await import('@/lib/recommendations');

const raw = (id, genres = [18]) => ({ id, title: `T${id}`, name: `T${id}`, genre_ids: genres, vote_average: 8 });
const SIX = ['acao', 'terror', 'romance', 'comedia', 'infantil', 'drama'];
const now = new Date('2026-10-25T15:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  recentSeeds.mockResolvedValue([]);
  listMarks.mockResolvedValue([]);
  filterAvailable.mockImplementation(async (t) => t);
  filterByRating.mockImplementation(async (t) => t);
  tmdbFetch.mockResolvedValue({ results: [] });
});

describe('pickDailyGenres', () => {
  it('é igual para o mesmo perfil e dia, e no máximo 3', () => {
    const a = pickDailyGenres(SIX, 'p1', '2026-10-25');
    expect(pickDailyGenres(SIX, 'p1', '2026-10-25')).toEqual(a);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    a.forEach((s) => expect(SIX).toContain(s));
  });
  it('muda entre dias', () => {
    const days = Array.from({ length: 10 }, (_, i) => pickDailyGenres(SIX, 'p1', `2026-10-${10 + i}`).join());
    expect(new Set(days).size).toBeGreaterThan(1);
  });
  it('com poucos gêneros devolve todos', () => {
    expect(pickDailyGenres(['acao'], 'p1', '2026-10-25')).toEqual(['acao']);
    expect(pickDailyGenres([], 'p1', '2026-10-25')).toEqual([]);
  });
});

describe('interleave', () => {
  it('alterna e não repete', () => {
    const a = { type: 'movie', id: 1 };
    const b = { type: 'movie', id: 2 };
    const c = { type: 'movie', id: 3 };
    expect(interleave([a, b], [c, a])).toEqual([a, c, b]);
  });
});

describe('getRecommendations', () => {
  const profile = { id: 'p1', favoriteGenres: [] };

  it('sem sementes e sem gêneros devolve [] sem chamar o TMDB', async () => {
    expect(await getRecommendations({ profile, myProviders: [], viewer: {}, now })).toEqual([]);
    expect(tmdbFetch).not.toHaveBeenCalled();
  });

  it('usa as recomendações das sementes e tira o que já foi marcado', async () => {
    recentSeeds.mockResolvedValue([{ type: 'movie', id: 10 }]);
    listMarks.mockResolvedValue([{ mediaType: 'movie', tmdbId: 10 }, { mediaType: 'movie', tmdbId: 2 }]);
    tmdbFetch.mockResolvedValue({ results: [raw(1), raw(2), raw(10)] });
    const out = await getRecommendations({ profile, myProviders: [], viewer: {}, now });
    expect(tmdbFetch.mock.calls[0][0]).toBe('/movie/10/recommendations');
    expect(out.map((t) => t.id)).toEqual([1]);
  });

  it('busca por gênero com nota e votos mínimos', async () => {
    tmdbFetch.mockResolvedValue({ results: [raw(5)] });
    const out = await getRecommendations({ profile: { id: 'p1', favoriteGenres: ['acao'] }, myProviders: [8, 337], viewer: {}, now });
    const call = tmdbFetch.mock.calls.find((c) => c[0] === '/discover/movie');
    expect(call[1]).toMatchObject({
      sort_by: 'vote_average.desc', 'vote_average.gte': 7, 'vote_count.gte': 200, with_genres: 28, with_watch_providers: '8|337',
    });
    expect(tmdbFetch.mock.calls.some((c) => c[0] === '/discover/tv')).toBe(true);
    expect(out.length).toBeGreaterThan(0);
    expect(filterAvailable).toHaveBeenCalledWith(expect.any(Array), [8, 337]);
  });

  it('gênero sem equivalente em séries não busca séries', async () => {
    await getRecommendations({ profile: { id: 'p1', favoriteGenres: ['suspense'] }, myProviders: [], viewer: {}, now });
    expect(tmdbFetch.mock.calls.map((c) => c[0])).toEqual(['/discover/movie']);
    expect(filterAvailable.mock.calls.length).toBe(0);
  });

  it('sem Meus streamings confere a disponibilidade sem filtro de plataforma', async () => {
    tmdbFetch.mockResolvedValue({ results: [raw(5)] });
    await getRecommendations({ profile: { id: 'p1', favoriteGenres: ['acao'] }, myProviders: [], viewer: {}, now });
    expect(filterAvailable).toHaveBeenCalledWith(expect.any(Array), null);
  });

  it('Kids só devolve títulos infantis dentro da faixa', async () => {
    recentSeeds.mockResolvedValue([{ type: 'movie', id: 10 }]);
    tmdbFetch.mockResolvedValue({ results: [raw(1, [16]), raw(2, [27]), raw(3, [10751])] });
    filterByRating.mockImplementation(async (t) => t.filter((x) => x.id !== 3));
    const out = await getRecommendations({ profile, myProviders: [], viewer: { kids: true, maxRating: '10' }, now });
    expect(filterByRating).toHaveBeenCalledWith(expect.any(Array), '10');
    expect(out.map((t) => t.id)).toEqual([1]);
  });

  it('devolve no máximo 20', async () => {
    recentSeeds.mockResolvedValue([{ type: 'movie', id: 10 }]);
    tmdbFetch.mockResolvedValue({ results: Array.from({ length: 40 }, (_, i) => raw(100 + i)) });
    const out = await getRecommendations({ profile, myProviders: [], viewer: {}, now });
    expect(out).toHaveLength(20);
  });
});
