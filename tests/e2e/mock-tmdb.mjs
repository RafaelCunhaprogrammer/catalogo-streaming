// TMDB simulado para os testes de ponta a ponta. Uso: node tests/e2e/mock-tmdb.mjs
import http from 'node:http';
import { readFileSync } from 'node:fs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));

const routes = [
  [/^\/3\/trending\/all\/week$/, () => fixture('trending-week')],
  [/^\/3\/discover\/movie$/, () => fixture('discover-movie')],
  [/^\/3\/discover\/tv$/, () => fixture('discover-tv')],
  [/^\/3\/genre\/movie\/list$/, () => fixture('genres-movie')],
  [/^\/3\/genre\/tv\/list$/, () => fixture('genres-tv')],
  [/^\/3\/search\/multi$/, () => fixture('search-multi')],
  [/^\/3\/search\/movie$/, () => ({ ...fixture('search-multi'), results: fixture('search-multi').results.filter((r) => r.media_type === 'movie') })],
  [/^\/3\/search\/tv$/, () => ({ ...fixture('search-multi'), results: fixture('search-multi').results.filter((r) => r.media_type === 'tv') })],
  [/^\/3\/search\/keyword$/, (url) => ({ results: [{ id: 1, name: url.searchParams.get('query') }] })],
  [/^\/3\/(movie|tv)\/\d+\/videos$/, () => fixture('videos')],
  [/^\/3\/(movie|tv)\/(\d+)\/watch\/providers$/, (url, match) => (match[2] === '777' ? { results: {} } : fixture('providers'))],
  [/^\/3\/movie\/(\d+)\/release_dates$/, (url, match) => ({
    results: [{ iso_3166_1: 'BR', release_dates: [{ certification: { 101: '12', 102: 'L' }[match[1]] ?? '16' }] }],
  })],
  [/^\/3\/tv\/(\d+)\/content_ratings$/, () => ({ results: [{ iso_3166_1: 'BR', rating: '14' }] })],
  [/^\/3\/movie\/101$/, () => fixture('movie-101')],
  [/^\/3\/tv\/201$/, () => fixture('tv-201')],
];

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    for (const [pattern, handler] of routes) {
      const match = url.pathname.match(pattern);
      if (match) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(handler(url, match)));
        return;
      }
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status_message: 'não encontrado' }));
  })
  .listen(4010, () => console.log('TMDB simulado em http://localhost:4010'));
