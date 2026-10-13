export function normalizeTitle(raw, fallbackType) {
  const type = raw.media_type === 'movie' || raw.media_type === 'tv' ? raw.media_type : fallbackType;
  const isMovie = type === 'movie';
  const date = (isMovie ? raw.release_date : raw.first_air_date) || '';
  return {
    id: raw.id,
    type,
    title: (isMovie ? raw.title : raw.name) || raw.original_title || raw.original_name || 'Sem título',
    year: date ? Number(date.slice(0, 4)) : null,
    releaseDate: date || null,
    overview: raw.overview || '',
    posterPath: raw.poster_path || null,
    backdropPath: raw.backdrop_path || null,
    rating: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : null,
    popularity: raw.popularity ?? 0,
    genreIds: raw.genre_ids ?? (raw.genres ? raw.genres.map((g) => g.id) : []),
  };
}

export function titleHref(title) {
  return `/${title.type === 'movie' ? 'filme' : 'serie'}/${title.id}`;
}
