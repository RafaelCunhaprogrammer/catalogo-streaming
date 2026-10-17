import { tmdbFetch } from './client';
import { settledWithLimit } from './limit';
import { brazilCertification } from '@/lib/certification';

export const RATING_ORDER = ['L', '10', '12', '14', '16', '18'];
export const KIDS_RATINGS = ['L', '10', '12', '14'];
const DAY = 60 * 60 * 24;
const MAX_CONCURRENT = 8;

// Sem limite (adulto), tudo passa. Sem classificação conhecida, bloqueia (precaução no Kids e na vitrine).
export function ratingAllowed(cert, maxRating) {
  if (!maxRating) return true;
  const rating = RATING_ORDER.indexOf(cert);
  return rating !== -1 && rating <= RATING_ORDER.indexOf(maxRating);
}

export async function getTitleRating(type, id) {
  if (type === 'movie') {
    const data = await tmdbFetch(`/movie/${id}/release_dates`, {}, { revalidate: DAY });
    return brazilCertification({ release_dates: data }, 'movie');
  }
  const data = await tmdbFetch(`/tv/${id}/content_ratings`, {}, { revalidate: DAY });
  return brazilCertification({ content_ratings: data }, 'tv');
}

export async function annotateRatings(titles, maxRating, unlocked = new Set()) {
  // `certification` (classificação indicativa) não se confunde com `rating` (nota de 0 a 10).
  if (!maxRating) return titles.map((t) => ({ ...t, certification: null, locked: false }));
  const checks = await settledWithLimit(titles, MAX_CONCURRENT, (t) => getTitleRating(t.type, t.id));
  return titles.map((t, i) => {
    const certification = checks[i].status === 'fulfilled' ? checks[i].value : null;
    const locked = !ratingAllowed(certification, maxRating) && !unlocked.has(`${t.type}-${t.id}`);
    return { ...t, certification, locked };
  });
}

export async function filterByRating(titles, maxRating) {
  if (!maxRating) return titles;
  const annotated = await annotateRatings(titles, maxRating);
  return titles.filter((_, i) => !annotated[i].locked);
}

// O discover de filmes do TMDB já filtra pela classificação brasileira (só títulos classificados).
export const movieCertificationParams = (maxRating) =>
  (maxRating ? { certification_country: 'BR', 'certification.lte': maxRating } : {});
