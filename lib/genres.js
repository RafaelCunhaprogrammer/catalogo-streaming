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

// Perfil Kids: além da classificação, só títulos destes gêneros (Animação, Família e, nas séries, Infantil).
// Assim saem programas que têm classificação baixa mas não são para crianças (luta livre, reality, auditório).
export const KIDS_GENRES = { movie: [16, 10751], tv: [10762, 16, 10751] };
export const kidsGenreParam = (type) => KIDS_GENRES[type].join('|');
export const isKidsTitle = (title) => (title.genreIds ?? []).some((id) => KIDS_GENRES[title.type === 'tv' ? 'tv' : 'movie'].includes(id));
