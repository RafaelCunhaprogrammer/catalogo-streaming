// IDs do TMDB para a região BR, conferidos em out/2026. Confira com: node --env-file=.env.local scripts/list-providers.mjs
export const PROVIDERS = [
  { id: 8, name: 'Netflix' },
  { id: 119, name: 'Amazon Prime Video' },
  { id: 337, name: 'Disney+' },
  { id: 1899, name: 'HBO Max' },
  { id: 307, name: 'Globoplay' },
  { id: 350, name: 'Apple TV' },
  { id: 531, name: 'Paramount+' },
  { id: 2302, name: 'Mercado Play' },
];

export const ALL_PROVIDER_IDS = PROVIDERS.map((p) => p.id);

// Busca da própria plataforma pelo nome do título (conferidas em out/2026). O TMDB não dá o link direto
// do filme em cada plataforma; quem não aceita busca pelo endereço (Disney+, HBO Max, Mercado Play)
// cai na página de disponibilidade do TMDB, que tem os links diretos.
const SEARCH_URLS = {
  8: 'https://www.netflix.com/search?q=',
  119: 'https://www.primevideo.com/search?phrase=',
  307: 'https://globoplay.globo.com/busca/?q=',
  350: 'https://tv.apple.com/br/search?term=',
  531: 'https://www.paramountplus.com/br/search/?q=',
};

export function watchUrl(providerId, title, fallback) {
  const search = SEARCH_URLS[providerId];
  return search ? search + encodeURIComponent(title) : fallback;
}
