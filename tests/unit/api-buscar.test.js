// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/buscar/route';
import { mockTmdb } from '../helpers/mock-tmdb';

vi.mock('@/lib/auth/viewer', () => ({
  getViewer: async () => ({ user: { id: 'u1' }, profile: { id: 'p1' }, kids: false, maxRating: null, unlocked: new Set() }),
}));

const available = { results: { BR: { flatrate: [{ provider_id: 8 }] } } };

describe('GET /api/buscar', () => {
  it('devolve até 8 resultados disponíveis', async () => {
    const results = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, media_type: 'movie', title: `Filme ${i + 1}` }));
    const routes = { '/search/multi': { total_pages: 1, results } };
    for (const r of results) routes[`/movie/${r.id}/watch/providers`] = available;
    const fetchMock = mockTmdb(routes);
    const response = await GET(new NextRequest('http://localhost/api/buscar?q=a%C3%A7%C3%A3o'));
    const body = await response.json();
    expect(body.results).toHaveLength(8);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('query')).toBe('ação');
  });

  it('com menos de 2 caracteres responde vazio sem chamar o TMDB', async () => {
    const fetchMock = mockTmdb({});
    const response = await GET(new NextRequest('http://localhost/api/buscar?q=a'));
    expect(await response.json()).toEqual({ results: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tipo=serie busca só séries', async () => {
    const fetchMock = mockTmdb({ '/search/tv': { total_pages: 1, results: [{ id: 3, name: 'Série' }] }, '/tv/3/watch/providers': available });
    const response = await GET(new NextRequest('http://localhost/api/buscar?q=s%C3%A9rie&tipo=serie'));
    expect((await response.json()).results[0]).toMatchObject({ id: 3, type: 'tv' });
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/3/search/tv');
  });

  it('responde 502 quando o TMDB falha', async () => {
    mockTmdb({ '/search/multi': 500 });
    const response = await GET(new NextRequest('http://localhost/api/buscar?q=matrix'));
    expect(response.status).toBe(502);
  });
});
