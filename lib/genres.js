// IDs de gênero do TMDB. Séries usam IDs próprios; null = não há equivalente para séries.
export const GENRE_ROWS = [
  { slug: 'acao', label: 'Ação', movie: 28, tv: 10759 },
  { slug: 'terror', label: 'Terror', movie: 27, tv: null, kids: false },
  { slug: 'romance', label: 'Romance', movie: 10749, tv: null, kids: false },
  { slug: 'comedia', label: 'Comédia', movie: 35, tv: 35 },
  { slug: 'infantil', label: 'Infantil', movie: 10751, tv: 10762 },
  { slug: 'ficcao', label: 'Ficção científica', movie: 878, tv: 10765 },
  { slug: 'animacao', label: 'Animação', movie: 16, tv: 16 },
  { slug: 'drama', label: 'Drama', movie: 18, tv: 18, kids: false },
];

// Lista de escolha dos gêneros favoritos: os de cima mais seis (Suspense só existe para filmes).
export const FAVORITE_GENRES = [
  ...GENRE_ROWS,
  { slug: 'suspense', label: 'Suspense', movie: 53, tv: null },
  { slug: 'crime', label: 'Crime', movie: 80, tv: 80 },
  { slug: 'documentario', label: 'Documentário', movie: 99, tv: 99 },
  { slug: 'fantasia', label: 'Fantasia', movie: 14, tv: 10765 },
  { slug: 'misterio', label: 'Mistério', movie: 9648, tv: 9648 },
  { slug: 'aventura', label: 'Aventura', movie: 12, tv: 10759 },
];
export const KIDS_FAVORITE_GENRES = ['animacao', 'infantil', 'aventura', 'fantasia'];
export const favoriteGenreOptions = (kids) => (kids ? FAVORITE_GENRES.filter((g) => KIDS_FAVORITE_GENRES.includes(g.slug)) : FAVORITE_GENRES);

// Só slugs válidos, sem repetir, na ordem de FAVORITE_GENRES.
export const cleanGenreSlugs = (slugs) => {
  const wanted = new Set(Array.isArray(slugs) ? slugs : []);
  return FAVORITE_GENRES.filter((g) => wanted.has(g.slug)).map((g) => g.slug);
};

// Perfil Kids: além da classificação, só títulos destes gêneros (Animação, Família e, nas séries, Infantil).
// Assim saem programas que têm classificação baixa mas não são para crianças (luta livre, reality, auditório).
export const KIDS_GENRES = { movie: [16, 10751], tv: [10762, 16, 10751] };
export const kidsGenreParam = (type) => KIDS_GENRES[type].join('|');
export const isKidsTitle = (title) => (title.genreIds ?? []).some((id) => KIDS_GENRES[title.type === 'tv' ? 'tv' : 'movie'].includes(id));
