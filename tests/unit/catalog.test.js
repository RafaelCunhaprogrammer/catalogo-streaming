import { describe, it, expect, vi } from 'vitest';
import { mockTmdb, calledPaths } from '../helpers/mock-tmdb';
import {
  discoverMixed, getHomeData, searchAvailable, discoverPage, getTitleDetails, getTitleBasics, resolveKeywordIds, filterAvailable, getMoodCards,
  getHomeRowDefs, loadHomeRow, getHomeHero,
} from '@/lib/tmdb/catalog';
import { parseExploreParams } from '@/lib/explore-params';
import { PROVIDERS } from '@/lib/providers';

const movie = (id, popularity, extra = {}) => ({ id, title: `Filme ${id}`, popularity, backdrop_path: `/b${id}.jpg`, ...extra });
const tv = (id, popularity) => ({ id, name: `Série ${id}`, popularity, backdrop_path: `/b${id}.jpg` });
const available = { results: { BR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }] } } };
const unavailable = { results: { BR: { rent: [{ provider_id: 2 }] } } };

describe('discoverMixed', () => {
  it('junta filmes e séries por popularidade, até 20', async () => {
    mockTmdb({
      '/discover/movie': { results: Array.from({ length: 15 }, (_, i) => movie(i + 1, i)) },
      '/discover/tv': { results: Array.from({ length: 15 }, (_, i) => tv(100 + i, i + 0.5)) },
    });
    const items = await discoverMixed({ providers: [8] });
    expect(items).toHaveLength(20);
    expect(items[0]).toMatchObject({ id: 114, type: 'tv' });
    expect(items[1]).toMatchObject({ id: 15, type: 'movie' });
  });

  it('não busca séries quando tvGenre é null e filtra pelo gênero', async () => {
    const fetchMock = mockTmdb({ '/discover/movie': { results: [movie(1, 1)] } });
    await discoverMixed({ providers: [8, 119], movieGenre: 27, tvGenre: null });
    expect(calledPaths(fetchMock)).toEqual(['/discover/movie']);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('with_genres')).toBe('27');
    expect(url.searchParams.get('with_watch_providers')).toBe('8|119');
  });
});

describe('getHomeData', () => {
  it('omite só a fileira que falhou e monta o destaque com trailer', async () => {
    mockTmdb({
      '/discover/movie': (url) => (url.searchParams.get('with_watch_providers') === '8' ? 500 : { results: [movie(1, 9)] }),
      '/discover/tv': (url) => (url.searchParams.get('with_watch_providers') === '8' ? 500 : { results: [tv(2, 1)] }),
      '/trending/all/week': { results: [
        { id: 1, media_type: 'movie', title: 'Filme 1', backdrop_path: '/b1.jpg' },
        { id: 2, media_type: 'tv', name: 'Série 2', backdrop_path: '/b2.jpg' },
      ] },
      '/movie/1/watch/providers': available,
      '/tv/2/watch/providers': available,
      '/movie/1/videos': { results: [{ key: 'k1', site: 'YouTube', iso_639_1: 'en', type: 'Trailer' }] },
      '/tv/2/videos': { results: [] },
    });
    const { hero, rows } = await getHomeData();
    expect(rows.find((r) => r.key === 'plataforma-8')).toBeUndefined();
    expect(rows.find((r) => r.key === 'plataforma-119')).toMatchObject({ title: 'Em alta na Amazon Prime Video', href: '/explorar?plataforma=119' });
    expect(rows.find((r) => r.key === 'genero-terror')).toMatchObject({ title: 'Terror', href: '/explorar?genero=27' });
    expect(hero[0]).toMatchObject({ id: 1, trailerKey: 'k1', trailerSubtitles: true });
    expect(hero[1]).toMatchObject({ id: 2, trailerKey: null, trailerSubtitles: false });
  });

  it('com Meus streamings mostra só as fileiras dessas plataformas', async () => {
    mockTmdb({ '/discover/movie': { results: [movie(1, 1)] }, '/discover/tv': { results: [] }, '/movie/1/videos': { results: [] } });
    const { rows } = await getHomeData([337]);
    const platformRows = rows.filter((r) => r.key.startsWith('plataforma-'));
    expect(platformRows.map((r) => r.key)).toEqual(['plataforma-337']);
    expect(PROVIDERS.length).toBeGreaterThan(1);
  });
});

describe('searchAvailable', () => {
  it('não chama o TMDB com menos de 2 caracteres', async () => {
    const fetchMock = mockTmdb({});
    await expect(searchAvailable(' a ')).resolves.toEqual({ results: [], totalPages: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mantém só filmes e séries disponíveis em assinatura', async () => {
    mockTmdb({
      '/search/multi': {
        total_pages: 1,
        results: [
          { id: 1, media_type: 'movie', title: 'Disponível' },
          { id: 2, media_type: 'movie', title: 'Só aluguel' },
          { id: 3, media_type: 'person', name: 'Pessoa' },
          { id: 4, media_type: 'tv', name: 'Série disponível' },
        ],
      },
      '/movie/1/watch/providers': available,
      '/movie/2/watch/providers': unavailable,
      '/tv/4/watch/providers': available,
    });
    const { results } = await searchAvailable('Disp');
    expect(results.map((t) => t.title)).toEqual(['Disponível', 'Série disponível']);
  });
});

describe('resolveKeywordIds', () => {
  it('converte nomes exatos em IDs e ignora os não encontrados', async () => {
    mockTmdb({
      '/search/keyword': (url) => ({
        faith: { results: [{ id: 10, name: 'Faith' }, { id: 11, name: 'faith healing' }] },
        bible: { results: [{ id: 20, name: 'bible' }] },
        inexistente: { results: [] },
      })[url.searchParams.get('query')],
    });
    await expect(resolveKeywordIds(['faith', 'bible', 'inexistente'])).resolves.toEqual([10, 20]);
  });
});

describe('discoverPage', () => {
  it('resolve as palavras-chave do humor antes de buscar', async () => {
    const fetchMock = mockTmdb({
      '/search/keyword': { results: [{ id: 10, name: 'faith' }] },
      '/discover/movie': { total_pages: 3, results: [movie(1, 1)] },
    });
    const page = await discoverPage(parseExploreParams(new URLSearchParams('humor=fe')));
    expect(page.totalPages).toBe(3);
    expect(page.results[0]).toMatchObject({ id: 1, type: 'movie' });
    const discoverCall = fetchMock.mock.calls.find(([u]) => u.toString().includes('/discover/movie'));
    expect(new URL(discoverCall[0]).searchParams.get('with_keywords')).toBe('10');
  });

  it('humor só de filmes com tipo série devolve vazio sem chamar o TMDB', async () => {
    const fetchMock = mockTmdb({});
    await expect(discoverPage(parseExploreParams(new URLSearchParams('humor=medo&tipo=serie'))))
      .resolves.toEqual({ results: [], totalPages: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('humor por palavra-chave sem nenhuma encontrada devolve vazio', async () => {
    mockTmdb({ '/search/keyword': { results: [] } });
    await expect(discoverPage(parseExploreParams(new URLSearchParams('humor=fe'))))
      .resolves.toEqual({ results: [], totalPages: 0 });
  });
});

describe('getTitleDetails', () => {
  const details = {
    id: 101, title: 'Aventura Neon', release_date: '2024-05-10', runtime: 128, genres: [{ id: 28, name: 'Ação' }],
    credits: { cast: Array.from({ length: 15 }, (_, i) => ({ id: i, name: `Ator ${i}`, character: `P${i}`, profile_path: null })) },
    videos: { results: [{ key: 'abc', site: 'YouTube', iso_639_1: 'pt', iso_3166_1: 'BR', type: 'Trailer' }] },
    'watch/providers': { results: { BR: { link: 'https://tmdb/watch', flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }] } } },
    release_dates: { results: [{ iso_3166_1: 'BR', release_dates: [{ certification: '12' }] }] },
    recommendations: { results: [{ id: 102, media_type: 'movie', title: 'Rec ok' }, { id: 103, media_type: 'movie', title: 'Rec fora' }] },
  };

  it('monta os detalhes completos de um filme', async () => {
    mockTmdb({ '/movie/101': details, '/movie/102/watch/providers': available, '/movie/103/watch/providers': unavailable });
    const t = await getTitleDetails('movie', '101');
    expect(t).toMatchObject({
      id: 101, type: 'movie', title: 'Aventura Neon', year: 2024, runtime: 128, seasons: null,
      genres: ['Ação'], certification: '12', trailerKey: 'abc', trailerSubtitles: false, watchLink: 'https://tmdb/watch',
      providers: [{ id: 8, name: 'Netflix', logoPath: '/n.png' }],
    });
    expect(t.cast).toHaveLength(12);
    expect(t.recommendations.map((r) => r.title)).toEqual(['Rec ok']);
  });

  it('lista as temporadas sem a de especiais (0)', async () => {
    mockTmdb({ '/tv/301': { ...details, id: 301, name: 'Série', seasons: [{ season_number: 0, episode_count: 3 }, { season_number: 1, episode_count: 10 }, { season_number: 2, episode_count: 0 }] } });
    const t = await getTitleDetails('tv', 301);
    expect(t.seasonList).toEqual([{ number: 1, episodes: 10 }]);
  });

  it('pede os dados extras numa só chamada', async () => {
    const fetchMock = mockTmdb({ '/tv/201': { ...details, id: 201, name: 'Série' } });
    await getTitleDetails('tv', 201);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('append_to_response')).toBe('credits,videos,watch/providers,content_ratings,recommendations');
    expect(url.searchParams.get('include_video_language')).toBe('pt,en');
  });

  it('devolve null para ID inexistente, não numérico ou fora das assinaturas', async () => {
    const fetchMock = mockTmdb({ '/movie/5': { ...details, id: 5, 'watch/providers': unavailable } });
    await expect(getTitleDetails('movie', '999')).resolves.toBeNull();
    await expect(getTitleDetails('movie', 'abc')).resolves.toBeNull();
    await expect(getTitleDetails('movie', '5')).resolves.toBeNull();
    expect(calledPaths(fetchMock)).not.toContain('/movie/abc');
  });
});

describe('getTitleBasics', () => {
  const raw = {
    id: 301, name: 'Série Leve', first_air_date: '2022-01-01', genres: [{ id: 18, name: 'Drama' }],
    seasons: [{ season_number: 0, episode_count: 2 }, { season_number: 1, episode_count: 8 }],
    content_ratings: { results: [{ iso_3166_1: 'BR', rating: '14' }] },
    'watch/providers': { results: { BR: { link: 'https://tmdb/w', flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }] } } },
    recommendations: { results: Array.from({ length: 20 }, (_, i) => ({ id: 400 + i, name: `Rec ${i}` })) },
  };

  it('usa a mesma chamada da página do título e não confere a disponibilidade das recomendações', async () => {
    const fetchMock = mockTmdb({ '/tv/301': raw });
    const t = await getTitleBasics('tv', 301);
    expect(t).toMatchObject({
      id: 301, type: 'tv', title: 'Série Leve', certification: '14', seasonList: [{ number: 1, episodes: 8 }],
      providers: [{ id: 8, name: 'Netflix', logoPath: '/n.png' }], watchLink: 'https://tmdb/w', recommendations: [],
    });
    expect(calledPaths(fetchMock)).toEqual(['/tv/301']);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('append_to_response')).toBe('credits,videos,watch/providers,content_ratings,recommendations');
    expect(url.searchParams.get('include_video_language')).toBe('pt,en');
  });

  it('título fora das assinaturas ainda volta, com a lista de plataformas vazia', async () => {
    mockTmdb({ '/tv/301': { ...raw, 'watch/providers': { results: {} } } });
    const t = await getTitleBasics('tv', 301);
    expect(t.providers).toEqual([]);
    expect(t.watchLink).toBeNull();
  });

  it('null só para ID inexistente ou inválido', async () => {
    const fetchMock = mockTmdb({});
    await expect(getTitleBasics('movie', '999')).resolves.toBeNull();
    await expect(getTitleBasics('movie', 'abc')).resolves.toBeNull();
    expect(calledPaths(fetchMock)).toEqual(['/movie/999']);
  });
});

describe('limite de chamadas simultâneas', () => {
  it('confere a disponibilidade de no máximo 8 títulos ao mesmo tempo', async () => {
    vi.stubEnv('TMDB_READ_TOKEN', 'token-teste');
    vi.stubEnv('TMDB_BASE_URL', 'https://tmdb.teste/3');
    let inFlight = 0;
    let maxInFlight = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return new Response(JSON.stringify(available), { status: 200 });
    }));
    const titles = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, type: 'movie', title: `F${i}` }));
    const result = await filterAvailable(titles);
    expect(result).toHaveLength(20);
    expect(maxInFlight).toBeLessThanOrEqual(8);
  });

  it('a busca mostra erro em vez de esconder títulos quando a conferência falha', async () => {
    mockTmdb({
      '/search/multi': { total_pages: 1, results: [{ id: 1, media_type: 'movie', title: 'A' }, { id: 2, media_type: 'movie', title: 'B' }] },
      '/movie/1/watch/providers': available,
      '/movie/2/watch/providers': 500,
    });
    await expect(searchAvailable('ab')).rejects.toThrow();
  });
});

describe('conteúdo em alta recente', () => {
  const NOW = new Date('2026-10-12T12:00:00Z');
  const trendingRoutes = (extra = {}) => ({
    '/trending/all/week': {
      results: [
        { id: 1, media_type: 'movie', title: 'Clássico em alta', release_date: '2010-01-01', backdrop_path: '/b1.jpg', popularity: 99 },
        { id: 2, media_type: 'tv', name: 'Série nova', first_air_date: '2026-08-01', backdrop_path: '/b2.jpg', popularity: 50 },
        { id: 3, media_type: 'movie', title: 'Filme novo', release_date: '2026-05-01', backdrop_path: '/b3.jpg', popularity: 40 },
        { id: 4, media_type: 'movie', title: 'Fora do streaming', release_date: '2026-09-01', backdrop_path: '/b4.jpg', popularity: 80 },
        { id: 5, media_type: 'person', name: 'Pessoa' },
      ],
    },
    '/movie/1/watch/providers': available,
    '/tv/2/watch/providers': available,
    '/movie/3/watch/providers': available,
    '/movie/4/watch/providers': unavailable,
    '/movie/1/videos': { results: [] },
    '/tv/2/videos': { results: [] },
    '/movie/3/videos': { results: [] },
    '/discover/movie': { results: [] },
    '/discover/tv': { results: [] },
    ...extra,
  });

  it('destaque: tendências da semana disponíveis, lançamentos dos últimos 12 meses primeiro', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    mockTmdb(trendingRoutes());
    const { hero } = await getHomeData();
    vi.useRealTimers();
    expect(hero.map((t) => t.title)).toEqual(['Série nova', 'Filme novo', 'Clássico em alta']);
  });

  it('destaque respeita Meus streamings', async () => {
    mockTmdb(trendingRoutes({ '/tv/2/watch/providers': { results: { BR: { flatrate: [{ provider_id: 119 }] } } } }));
    const { hero } = await getHomeData([119]);
    expect(hero.map((t) => t.title)).toEqual(['Série nova']);
  });

  it('fileiras "Em alta na…" só trazem títulos recentes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const fetchMock = mockTmdb(trendingRoutes());
    await getHomeData([8]);
    vi.useRealTimers();
    const calls = fetchMock.mock.calls.map(([u]) => new URL(u));
    const netflixMovies = calls.find((u) => u.pathname.endsWith('/discover/movie') && u.searchParams.get('with_watch_providers') === '8' && !u.searchParams.has('with_genres') && u.searchParams.get('primary_release_date.gte') === '2024-10-12');
    const netflixTv = calls.find((u) => u.pathname.endsWith('/discover/tv') && u.searchParams.get('with_watch_providers') === '8' && u.searchParams.get('air_date.gte') === '2025-10-12');
    expect(netflixMovies).toBeDefined();
    expect(netflixTv).toBeDefined();
  });

  it('cria a fileira Lançamentos recentes (últimos 90 dias) logo no começo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    mockTmdb(trendingRoutes({
      '/discover/movie': (url) => (url.searchParams.get('primary_release_date.gte') === '2026-07-14'
        ? { results: [{ id: 9, title: 'Estreia', release_date: '2026-09-20', popularity: 5 }] }
        : { results: [] }),
    }));
    const { rows } = await getHomeData();
    vi.useRealTimers();
    expect(rows[0]).toMatchObject({ key: 'lancamentos', title: 'Lançamentos recentes' });
    expect(rows[0].items.map((t) => t.title)).toEqual(['Estreia']);
  });
});

describe('páginas Filmes e Séries', () => {
  it('Filmes: destaque das tendências de filmes e nenhuma busca de séries', async () => {
    const fetchMock = mockTmdb({
      '/trending/movie/week': { results: [{ id: 1, title: 'Filme', backdrop_path: '/b.jpg', release_date: '2026-09-01' }] },
      '/movie/1/watch/providers': available,
      '/movie/1/videos': { results: [] },
      '/discover/movie': { results: [movie(7, 1)] },
    });
    const { hero, rows } = await getHomeData([], 'movie');
    expect(hero.length).toBeGreaterThan(0);
    expect(hero.every((t) => t.type === 'movie')).toBe(true);
    expect(calledPaths(fetchMock)).not.toContain('/discover/tv');
    expect(calledPaths(fetchMock)).not.toContain('/trending/all/week');
    expect(rows.every((r) => r.items.every((t) => t.type === 'movie'))).toBe(true);
  });

  it('Séries: fileiras levam ao Explorar já em séries e pulam gêneros sem equivalente', async () => {
    mockTmdb({
      '/trending/tv/week': { results: [] },
      '/discover/tv': { results: [tv(5, 1)] },
    });
    const { rows } = await getHomeData([], 'tv');
    expect(rows.find((r) => r.key === 'plataforma-8').href).toBe('/explorar?tipo=serie&plataforma=8');
    expect(rows.find((r) => r.key === 'genero-acao').href).toBe('/explorar?tipo=serie&genero=10759');
    expect(rows.find((r) => r.key === 'genero-terror')).toBeUndefined();
  });

  it('busca só de filmes ou só de séries usa o endpoint do tipo', async () => {
    const fetchMock = mockTmdb({
      '/search/tv': { total_pages: 1, results: [{ id: 3, name: 'Série X' }] },
      '/tv/3/watch/providers': available,
    });
    const { results } = await searchAvailable('série', 1, 'tv');
    expect(results).toEqual([expect.objectContaining({ id: 3, type: 'tv', title: 'Série X' })]);
    expect(calledPaths(fetchMock)).toContain('/search/tv');
  });
});

describe('acabamentos visuais', () => {
  it('fileiras "Em alta na…" trazem o logo oficial da plataforma', async () => {
    mockTmdb({
      '/trending/all/week': { results: [] },
      '/watch/providers/movie': { results: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.png' }] },
      '/discover/movie': { results: [movie(1, 1)] },
      '/discover/tv': { results: [] },
    });
    const { rows } = await getHomeData([8]);
    expect(rows.find((r) => r.key === 'plataforma-8')).toMatchObject({ logoPath: '/netflix.png' });
    expect(rows.find((r) => r.key === 'genero-acao').logoPath).toBeUndefined();
  });

  it('humores nunca repetem o mesmo filme, mesmo quando ele está em vários gêneros', async () => {
    mockTmdb({
      '/search/keyword': (url) => ({ results: [{ id: 1, name: url.searchParams.get('query') }] }),
      '/discover/movie': () => ({
        results: [
          { id: 1, title: 'Animação famosa', backdrop_path: '/a.jpg' },
          { id: 2, title: 'Segundo', backdrop_path: '/b.jpg' },
          { id: 3, title: 'Terceiro', backdrop_path: '/c.jpg' },
          { id: 4, title: 'Quarto', backdrop_path: '/d.jpg' },
          { id: 5, title: 'Quinto', backdrop_path: '/e.jpg' },
          { id: 6, title: 'Sexto', backdrop_path: '/f.jpg' },
          { id: 7, title: 'Sétimo', backdrop_path: '/g.jpg' },
          { id: 8, title: 'Oitavo', backdrop_path: '/h.jpg' },
        ],
      }),
    });
    const cards = await getMoodCards();
    const titles = cards.map((c) => c.filmTitle);
    expect(new Set(titles).size).toBe(8);
    expect(cards[0]).toMatchObject({ filmId: 1, filmTitle: 'Animação famosa', backdropPath: '/a.jpg' });
    expect(cards[1]).toMatchObject({ filmTitle: 'Segundo', backdropPath: '/b.jpg' });
  });

  it('cada humor ganha a imagem de fundo de um filme popular daquele humor', async () => {
    mockTmdb({
      '/search/keyword': (url) => ({ results: [{ id: 1, name: url.searchParams.get('query') }] }),
      '/discover/movie': (url) => ({
        results: [
          { id: 1, title: 'Sem imagem', backdrop_path: null },
          { id: Number(url.searchParams.get('with_genres')?.split('|')[0] ?? 99), title: 'Com imagem', backdrop_path: `/m${url.searchParams.get('with_genres') ?? 'kw'}.jpg` },
        ],
      }),
    });
    const cards = await getMoodCards();
    expect(cards).toHaveLength(8);
    expect(cards[0]).toMatchObject({ slug: 'relaxar', label: 'Relaxar', icon: 'Coffee', backdropPath: '/m35|10751|16.jpg' });
    expect(cards.find((c) => c.slug === 'fe').backdropPath).toBe('/mkw.jpg');
  });
});

describe('perfil Kids: só títulos infantis', () => {
  const kidsMovie = (id, popularity, genres) => ({ ...movie(id, popularity), genre_ids: genres });
  const kidsTv = (id, popularity, genres) => ({ ...tv(id, popularity), genre_ids: genres });

  it('fileiras de plataforma pedem ao TMDB só Animação, Família e Infantil', async () => {
    const fetchMock = mockTmdb({ '/discover/movie': { results: [] }, '/discover/tv': { results: [] } });
    const defs = getHomeRowDefs([8], undefined, { maxRating: '10', kids: true });
    await loadHomeRow(defs.find((d) => d.key === 'plataforma-8'));
    const urls = fetchMock.mock.calls.map(([u]) => new URL(u));
    expect(urls.find((u) => u.pathname.endsWith('/discover/movie')).searchParams.get('with_genres')).toBe('16|10751');
    expect(urls.find((u) => u.pathname.endsWith('/discover/tv')).searchParams.get('with_genres')).toBe('10762|16|10751');
  });

  it('sem Terror, Romance e Drama; nas outras fileiras de gênero, só o que é infantil', async () => {
    const defs = getHomeRowDefs([8], undefined, { maxRating: '10', kids: true });
    const keys = defs.map((d) => d.key);
    expect(keys).not.toContain('genero-terror');
    expect(keys).not.toContain('genero-romance');
    expect(keys).not.toContain('genero-drama');
    mockTmdb({
      '/discover/movie': { results: [kidsMovie(1, 9, [35]), kidsMovie(2, 8, [35, 16])] },
      '/discover/tv': { results: [kidsTv(3, 7, [35, 10767]), kidsTv(4, 6, [35, 10762])] },
    });
    const row = await loadHomeRow(defs.find((d) => d.key === 'genero-comedia'));
    expect(row.items.map((t) => `${t.type}-${t.id}`)).toEqual(['movie-2', 'tv-4']);
  });

  it('destaque do Kids: luta livre com classificação 10 não entra (não é infantil)', async () => {
    mockTmdb({
      '/trending/all/week': { results: [
        { id: 4656, media_type: 'tv', name: 'Raw', backdrop_path: '/raw.jpg', genre_ids: [10759, 10767] },
        { id: 2, media_type: 'movie', title: 'Animação', backdrop_path: '/b.jpg', genre_ids: [16, 10751] },
      ] },
      '/tv/4656/watch/providers': available,
      '/movie/2/watch/providers': available,
      '/tv/4656/content_ratings': { results: [{ iso_3166_1: 'BR', rating: '10' }] },
      '/movie/2/release_dates': { results: [{ iso_3166_1: 'BR', release_dates: [{ certification: 'L' }] }] },
      '/movie/2/videos': { results: [] },
      '/discover/movie': { results: [] },
      '/discover/tv': { results: [] },
    });
    const hero = await getHomeHero([], undefined, { maxRating: '10', kids: true });
    expect(hero.map((t) => t.title)).toEqual(['Animação']);
  });

  it('humores do Kids usam só filmes infantis', async () => {
    mockTmdb({
      '/search/keyword': (url) => ({ results: [{ id: 1, name: url.searchParams.get('query') }] }),
      '/discover/movie': { results: [
        { id: 1, title: 'Adulto', backdrop_path: '/a.jpg', genre_ids: [18] },
        { id: 2, title: 'Desenho', backdrop_path: '/d.jpg', genre_ids: [16] },
      ] },
    });
    const cards = await getMoodCards({ maxRating: '10', kids: true });
    expect(cards.filter((c) => c.filmTitle).every((c) => c.filmTitle === 'Desenho')).toBe(true);
  });
});

describe('faixa de classificação (visitante e Kids)', () => {
  const tvRating = (rating) => ({ results: [{ iso_3166_1: 'BR', rating }] });

  it('fileiras: filmes e séries filtrados pelo próprio TMDB, sem consultar título a título', async () => {
    const fetchMock = mockTmdb({
      '/discover/movie': { results: [movie(1, 5)] },
      '/discover/tv': { results: [tv(2, 4)] },
    });
    const [def] = getHomeRowDefs([8], undefined, { maxRating: '14' });
    const row = await loadHomeRow(def);
    expect(row.items.map((t) => `${t.type}-${t.id}`)).toEqual(['movie-1', 'tv-2']);
    const urls = fetchMock.mock.calls.map(([u]) => new URL(u));
    for (const path of ['/discover/movie', '/discover/tv']) {
      const call = urls.find((u) => u.pathname.endsWith(path));
      expect(call.searchParams.get('certification_country')).toBe('BR');
      expect(call.searchParams.get('certification.lte')).toBe('14');
    }
    expect(calledPaths(fetchMock).some((p) => p.includes('content_ratings') || p.includes('release_dates'))).toBe(false);
  });

  it('sem faixa (adulto), nada muda e nenhuma classificação é consultada', async () => {
    const fetchMock = mockTmdb({ '/discover/movie': { results: [movie(1, 5)] }, '/discover/tv': { results: [tv(2, 4)] } });
    const [def] = getHomeRowDefs([8]);
    const row = await loadHomeRow(def);
    expect(row.items).toHaveLength(2);
    expect(calledPaths(fetchMock).some((p) => p.includes('content_ratings'))).toBe(false);
  });

  it('destaque só com títulos da faixa', async () => {
    mockTmdb({
      '/trending/all/week': { results: [
        { id: 1, media_type: 'movie', title: 'Terror', backdrop_path: '/a.jpg' },
        { id: 2, media_type: 'movie', title: 'Animação', backdrop_path: '/b.jpg' },
      ] },
      '/movie/1/watch/providers': available,
      '/movie/2/watch/providers': available,
      '/movie/1/release_dates': { results: [{ iso_3166_1: 'BR', release_dates: [{ certification: '18' }] }] },
      '/movie/2/release_dates': { results: [{ iso_3166_1: 'BR', release_dates: [{ certification: 'L' }] }] },
      '/movie/2/videos': { results: [] },
      '/discover/movie': { results: [] },
      '/discover/tv': { results: [] },
    });
    const hero = await getHomeHero([], undefined, { maxRating: '10' });
    expect(hero.map((t) => t.title)).toEqual(['Animação']);
  });

  it('humores da vitrine usam a faixa no discover de filmes', async () => {
    const fetchMock = mockTmdb({
      '/search/keyword': (url) => ({ results: [{ id: 1, name: url.searchParams.get('query') }] }),
      '/discover/movie': { results: [{ id: 1, title: 'X', backdrop_path: '/x.jpg' }] },
    });
    await getMoodCards({ maxRating: '14' });
    const calls = fetchMock.mock.calls.map(([u]) => new URL(u)).filter((u) => u.pathname.endsWith('/discover/movie'));
    expect(calls.length).toBe(8);
    expect(calls.every((u) => u.searchParams.get('certification.lte') === '14')).toBe(true);
  });
});
