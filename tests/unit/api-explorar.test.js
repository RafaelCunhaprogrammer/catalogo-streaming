// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/explorar/route';
import { mockTmdb } from '../helpers/mock-tmdb';

vi.mock('@/lib/auth/viewer', () => ({
  getViewer: async () => ({ user: { id: 'u1' }, profile: { id: 'p1' }, kids: false, maxRating: null, unlocked: new Set() }),
}));

describe('GET /api/explorar', () => {
  it('devolve a página pedida usando os filtros e o cookie de Meus streamings', async () => {
    const fetchMock = mockTmdb({ '/discover/tv': { total_pages: 4, results: [{ id: 7, name: 'Série 7', popularity: 1 }] } });
    const request = new NextRequest('http://localhost/api/explorar?tipo=serie&pagina=2', {
      headers: { cookie: 'catalogo_streamings=8.119' },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalPages).toBe(4);
    expect(body.results[0]).toMatchObject({ id: 7, type: 'tv' });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('with_watch_providers')).toBe('8|119');
  });

  it('responde 502 quando o TMDB falha', async () => {
    mockTmdb({ '/discover/movie': 500 });
    const response = await GET(new NextRequest('http://localhost/api/explorar'));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Não foi possível carregar agora.' });
  });
});
