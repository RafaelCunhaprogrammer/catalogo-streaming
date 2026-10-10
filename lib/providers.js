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
