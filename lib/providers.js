// IDs do TMDB para a região BR. Confira com: node --env-file=.env.local scripts/list-providers.mjs
export const PROVIDERS = [
  { id: 8, name: 'Netflix' },
  { id: 119, name: 'Amazon Prime Video' },
  { id: 337, name: 'Disney+' },
  { id: 1899, name: 'Max' },
  { id: 307, name: 'Globoplay' },
  { id: 350, name: 'Apple TV+' },
  { id: 531, name: 'Paramount+' },
];

export const ALL_PROVIDER_IDS = PROVIDERS.map((p) => p.id);
