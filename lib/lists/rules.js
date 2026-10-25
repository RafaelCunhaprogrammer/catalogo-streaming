// Regras puras das marcações (favorito, situação, temporada e episódio). Sem banco, sem React.
export const STATUSES = ['nenhum', 'assistindo', 'assistido'];
export const MAX_MARKS = 500;
export const EMPTY_MARK = { favorite: false, status: 'nenhum', season: null, episode: null };

const TYPES = ['movie', 'tv'];

export const titleKey = (type, id) => `${type}-${id}`;

export function parseTarget(type, id) {
  if (!TYPES.includes(type)) return null;
  const text = String(id);
  if (!/^[1-9]\d*$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? { type, id: n } : null;
}

// Clicar na situação já marcada volta a "nenhum".
export const nextStatus = (current, clicked) => (current === clicked ? 'nenhum' : clicked);

export const isEmptyMark = (mark) => !mark.favorite && mark.status === 'nenhum';

export function seasonsWithoutSpecials(rawSeasons) {
  return (rawSeasons ?? [])
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .map((s) => ({ number: s.season_number, episodes: s.episode_count }));
}

// Ajusta a posição para uma temporada existente e um episódio dentro do total dela.
function clampPosition(season, episode, seasons) {
  if (!seasons.length) return { season: null, episode: null };
  const found = seasons.find((s) => s.number === season) ?? seasons[seasons.length - 1];
  const wanted = Number.isInteger(episode) && episode >= 1 ? episode : 1;
  return { season: found.number, episode: Math.min(wanted, found.episodes) };
}

export function applyChange(mark, change, { type, seasons }) {
  const next = { ...EMPTY_MARK, ...(mark ?? {}) };
  if (change.favorite !== undefined) next.favorite = Boolean(change.favorite);
  if (change.status !== undefined) next.status = change.status;

  // Só série "assistindo" guarda posição (filme, assistido e nenhum limpam).
  if (type !== 'tv' || next.status !== 'assistindo') {
    return { ...next, season: null, episode: null };
  }
  const season = change.season !== undefined ? change.season : (next.season ?? seasons[0]?.number ?? null);
  const episode = change.episode !== undefined ? change.episode : change.season !== undefined || next.episode == null ? 1 : next.episode;
  return { ...next, ...clampPosition(season, episode, seasons) };
}

export function nextEpisode({ season, episode }, seasons) {
  const index = seasons.findIndex((s) => s.number === season);
  const current = seasons[index];
  if (current && episode < current.episodes) return { season, episode: episode + 1, finished: false };
  const following = seasons[index + 1];
  if (following) return { season: following.number, episode: 1, finished: false };
  return { season, episode, finished: true };
}
