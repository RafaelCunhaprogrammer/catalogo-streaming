// Capa do perfil (Etapa D): a imagem de um favorito no alto da Minha lista.
// Regras puras: quem chama já conferiu que as marcações são do perfil ativo.
import { ratingAllowed } from '@/lib/tmdb/ratings';

const time = (d) => (d ? new Date(d).getTime() : 0);

// Favoritos com imagem de fundo; no Kids, só os que cabem na faixa (sem as liberações do PIN).
export function coverOptions(marks, { maxRating = null } = {}) {
  return marks
    .filter((m) => m.favorite && m.snapshot?.backdropPath && ratingAllowed(m.snapshot.certification ?? null, maxRating))
    .sort((a, b) => time(b.favoriteAt) - time(a.favoriteAt))
    .map((m) => ({ type: m.mediaType, id: m.tmdbId, title: m.snapshot.title ?? '', backdropPath: m.snapshot.backdropPath }));
}

// Cópia guardada no perfil: a capa não depende da marcação continuar existindo.
export function buildCover(mark, accent) {
  const s = mark.snapshot;
  return {
    type: mark.mediaType,
    id: mark.tmdbId,
    title: s.title ?? '',
    backdropPath: s.backdropPath,
    certification: s.certification ?? null,
    accent: accent ?? null,
  };
}

// Capa de Kids acima da faixa (a faixa mudou depois da escolha) não aparece.
export function visibleCover(cover, { maxRating = null } = {}) {
  if (!cover) return null;
  return ratingAllowed(cover.certification ?? null, maxRating) ? cover : null;
}
