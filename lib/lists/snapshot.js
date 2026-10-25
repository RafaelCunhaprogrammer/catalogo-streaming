// Cópia leve do título guardada junto da marcação (cartaz, nome e temporadas), para listar sem chamar o TMDB.
export function buildSnapshot(details) {
  return {
    title: details.title,
    posterPath: details.posterPath ?? null,
    backdropPath: details.backdropPath ?? null,
    year: details.year ?? null,
    genreIds: details.genreIds ?? [],
    certification: details.certification ?? null,
    seasons: details.seasonList ?? [],
  };
}
