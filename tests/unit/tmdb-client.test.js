import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTmdbUrl, tmdbFetch, TmdbError } from '@/lib/tmdb/client';

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

beforeEach(() => {
  vi.stubEnv('TMDB_READ_TOKEN', 'token-teste');
  vi.stubEnv('TMDB_BASE_URL', 'https://tmdb.teste/3');
});

describe('buildTmdbUrl', () => {
  it('aplica as regras fixas em toda chamada', () => {
    const url = buildTmdbUrl('/discover/movie', { with_genres: '28' });
    expect(url.origin + url.pathname).toBe('https://tmdb.teste/3/discover/movie');
    expect(url.searchParams.get('language')).toBe('pt-BR');
    expect(url.searchParams.get('region')).toBe('BR');
    expect(url.searchParams.get('watch_region')).toBe('BR');
    expect(url.searchParams.get('include_adult')).toBe('false');
    expect(url.searchParams.get('with_watch_monetization_types')).toBe('flatrate');
    expect(url.searchParams.get('with_genres')).toBe('28');
  });

  it('não deixa quem chama sobrescrever as regras fixas', () => {
    const url = buildTmdbUrl('/search/multi', {
      include_adult: 'true',
      language: 'en-US',
      with_watch_monetization_types: 'rent',
    });
    expect(url.searchParams.get('include_adult')).toBe('false');
    expect(url.searchParams.get('language')).toBe('pt-BR');
    expect(url.searchParams.get('with_watch_monetization_types')).toBe('flatrate');
  });

  it('mantém intacto texto com acentos e símbolos', () => {
    const url = buildTmdbUrl('/search/multi', { query: 'ação & aventura' });
    expect(url.searchParams.get('query')).toBe('ação & aventura');
    expect(url.search).toContain('query=a%C3%A7%C3%A3o+%26+aventura');
  });

  it('ignora parâmetros vazios', () => {
    const url = buildTmdbUrl('/discover/movie', { a: '', b: null, c: undefined, d: 0 });
    expect(url.searchParams.has('a')).toBe(false);
    expect(url.searchParams.has('b')).toBe(false);
    expect(url.searchParams.has('c')).toBe(false);
    expect(url.searchParams.get('d')).toBe('0');
  });
});

describe('tmdbFetch', () => {
  it('envia o token no cabeçalho, repassa o cache e devolve o JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/1', {}, { revalidate: 60 })).resolves.toEqual({ ok: 1 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer token-teste');
    expect(init.next).toEqual({ revalidate: 60 });
  });

  it('sem revalidate não usa cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    await tmdbFetch('/search/multi', { query: 'x' });
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
  });

  it('dá um erro claro quando falta o token', async () => {
    vi.stubEnv('TMDB_READ_TOKEN', '');
    await expect(tmdbFetch('/movie/1')).rejects.toThrow('Defina TMDB_READ_TOKEN em .env.local');
  });

  it('tenta de novo uma vez após falha de rede', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/1')).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('desiste após a segunda falha de rede', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/1')).rejects.toBeInstanceOf(TmdbError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('tenta de novo uma vez após erro 500', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/1')).resolves.toEqual({ ok: 1 });
  });

  it('não tenta de novo em 404 e informa o status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tmdbFetch('/movie/999')).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('em 429 espera o Retry-After (no máximo 2 s) e tenta de novo', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 429, { 'Retry-After': '10' }))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const promise = tmdbFetch('/movie/1');
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
