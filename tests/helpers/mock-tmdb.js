import { vi } from 'vitest';

// routes: { '/caminho': corpo | status | (url) => corpo | status }. Caminhos sem rota respondem 404.
export function mockTmdb(routes) {
  vi.stubEnv('TMDB_READ_TOKEN', 'token-teste');
  vi.stubEnv('TMDB_BASE_URL', 'https://tmdb.teste/3');
  const fetchMock = vi.fn(async (input) => {
    const url = new URL(input);
    const route = routes[url.pathname.replace(/^\/3/, '')];
    const body = typeof route === 'function' ? route(url) : route;
    if (body === undefined) return new Response('{}', { status: 404 });
    if (typeof body === 'number') return new Response('{}', { status: body });
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const calledPaths = (fetchMock) => fetchMock.mock.calls.map(([u]) => new URL(u).pathname.replace(/^\/3/, ''));
