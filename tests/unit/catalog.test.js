import { describe, it, expect } from 'vitest';
import { mockTmdb, calledPaths } from '../helpers/mock-tmdb';
import {
  discoverMixed, getHomeData, searchAvailable, discoverPage, getTitleDetails, resolveKeywordIds,
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
      '/movie/1/videos': { results: [{ key: 'k1', site: 'YouTube', iso_639_1: 'pt', type: 'Trailer' }] },
      '/tv/2/videos': { results: [] },
    });
    const { hero, rows } = await getHomeData();
    expect(rows.find((r) => r.key === 'plataforma-8')).toBeUndefined();
    expect(rows.find((r) => r.key === 'plataforma-119')).toMatchObject({ title: 'Em alta na Amazon Prime Video', href: '/explorar?plataforma=119' });
    expect(rows.find((r) => r.key === 'genero-terror')).toMatchObject({ title: 'Terror', href: '/explorar?genero=27' });
    expect(hero[0]).toMatchObject({ id: 1, trailerKey: 'k1' });
    expect(hero[1]).toMatchObject({ id: 2, trailerKey: null });
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
    videos: { results: [{ key: 'abc', site: 'YouTube', iso_639_1: 'pt', type: 'Trailer' }] },
    'watch/providers': { results: { BR: { link: 'https://tmdb/watch', flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }] } } },
    release_dates: { results: [{ iso_3166_1: 'BR', release_dates: [{ certification: '12' }] }] },
    recommendations: { results: [{ id: 102, media_type: 'movie', title: 'Rec ok' }, { id: 103, media_type: 'movie', title: 'Rec fora' }] },
  };

  it('monta os detalhes completos de um filme', async () => {
    mockTmdb({ '/movie/101': details, '/movie/102/watch/providers': available, '/movie/103/watch/providers': unavailable });
    const t = await getTitleDetails('movie', '101');
    expect(t).toMatchObject({
      id: 101, type: 'movie', title: 'Aventura Neon', year: 2024, runtime: 128, seasons: null,
      genres: ['Ação'], certification: '12', trailerKey: 'abc', watchLink: 'https://tmdb/watch',
      providers: [{ id: 8, name: 'Netflix', logoPath: '/n.png' }],
    });
    expect(t.cast).toHaveLength(12);
    expect(t.recommendations.map((r) => r.title)).toEqual(['Rec ok']);
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
