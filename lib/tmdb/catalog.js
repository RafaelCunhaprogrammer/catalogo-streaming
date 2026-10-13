import { tmdbFetch } from './client';
import { normalizeTitle } from './normalize';
import { ALL_PROVIDER_IDS, PROVIDERS } from '@/lib/providers';
import { GENRE_ROWS } from '@/lib/genres';
import { getMood } from '@/lib/moods';
import { toDiscoverRequest } from '@/lib/explore-params';
import { pickTrailer } from '@/lib/trailer';
import { brazilCertification } from '@/lib/certification';

const HOUR = 3600;
export const CACHE = { rows: 6 * HOUR, details: 24 * HOUR, lists: 24 * HOUR, keywords: 7 * 24 * HOUR };
const ROW_SIZE = 20;
const HERO_SIZE = 5;

async function discover(type, params) {
  const data = await tmdbFetch(`/discover/${type}`, params, { revalidate: CACHE.rows });
  return (data.results ?? []).map((r) => normalizeTitle(r, type));
}

export async function discoverMixed({ providers, movieGenre, tvGenre }) {
  const base = { with_watch_providers: providers.join('|'), sort_by: 'popularity.desc' };
  const requests = [];
  if (movieGenre !== null) requests.push(discover('movie', movieGenre ? { ...base, with_genres: movieGenre } : base));
  if (tvGenre !== null) requests.push(discover('tv', tvGenre ? { ...base, with_genres: tvGenre } : base));
  const lists = await Promise.all(requests);
  return lists.flat().sort((a, b) => b.popularity - a.popularity).slice(0, ROW_SIZE);
}

// Trailer sem dublagem brasileira toca com legendas em português.
function trailerFields(videos) {
  const trailer = pickTrailer(videos);
  return { trailerKey: trailer?.key ?? null, trailerSubtitles: Boolean(trailer && trailer.lang !== 'pt-BR') };
}

async function getHeroItems(providers) {
  const top = (await discoverMixed({ providers })).filter((t) => t.backdropPath).slice(0, HERO_SIZE);
  const videos = await Promise.allSettled(
    top.map((t) => tmdbFetch(`/${t.type}/${t.id}/videos`, { include_video_language: 'pt,en' }, { revalidate: CACHE.details })),
  );
  return top.map((t, i) => ({
    ...t,
    ...trailerFields(videos[i].status === 'fulfilled' ? videos[i].value.results : []),
  }));
}

export async function getHomeData(myProviders = []) {
  const providers = myProviders.length ? myProviders : ALL_PROVIDER_IDS;
  const rowDefs = [
    ...PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => ({
      key: `plataforma-${p.id}`,
      title: `Em alta na ${p.name}`,
      href: `/explorar?plataforma=${p.id}`,
      load: () => discoverMixed({ providers: [p.id] }),
    })),
    ...GENRE_ROWS.map((g) => ({
      key: `genero-${g.slug}`,
      title: g.label,
      href: `/explorar?genero=${g.movie}`,
      load: () => discoverMixed({ providers, movieGenre: g.movie, tvGenre: g.tv }),
    })),
  ];

  const [heroResult, ...rowResults] = await Promise.allSettled([getHeroItems(providers), ...rowDefs.map((d) => d.load())]);
  const rows = rowDefs
    .map((d, i) => ({ key: d.key, title: d.title, href: d.href, items: rowResults[i].status === 'fulfilled' ? rowResults[i].value : [] }))
    .filter((r) => r.items.length > 0);
  return { hero: heroResult.status === 'fulfilled' ? heroResult.value : [], rows };
}

async function getBrazilFlatrate(type, id) {
  const data = await tmdbFetch(`/${type}/${id}/watch/providers`, {}, { revalidate: CACHE.details });
  return data.results?.BR?.flatrate ?? [];
}

const MAX_CONCURRENT_CHECKS = 8;

// Como Promise.allSettled, mas com no máximo `limit` chamadas ao mesmo tempo (evita o limite de taxa do TMDB).
async function settledWithLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await task(items[i]) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function checkAvailability(titles) {
  return settledWithLimit(titles, MAX_CONCURRENT_CHECKS, (t) => getBrazilFlatrate(t.type, t.id));
}

// Para recomendações: um título cuja conferência falhou simplesmente não aparece.
export async function filterAvailable(titles) {
  const checks = await checkAvailability(titles);
  return titles.filter((_, i) => checks[i].status === 'fulfilled' && checks[i].value.length > 0);
}

export async function searchAvailable(query, page = 1) {
  const q = (query ?? '').trim();
  if (q.length < 2) return { results: [], totalPages: 0 };
  const data = await tmdbFetch('/search/multi', { query: q, page });
  const titles = (data.results ?? [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => normalizeTitle(r));
  // Na busca, esconder títulos por falha de rede daria um resultado errado em silêncio: melhor mostrar o erro.
  const checks = await checkAvailability(titles);
  const failed = checks.find((c) => c.status === 'rejected');
  if (failed) throw failed.reason;
  return {
    results: titles.filter((_, i) => checks[i].value.length > 0),
    totalPages: data.total_pages ?? 1,
  };
}

export async function resolveKeywordIds(names = []) {
  const responses = await Promise.allSettled(
    names.map((name) => tmdbFetch('/search/keyword', { query: name }, { revalidate: CACHE.keywords })),
  );
  return responses.flatMap((r, i) => {
    if (r.status !== 'fulfilled') return [];
    const match = (r.value.results ?? []).find((k) => k.name.toLowerCase() === names[i].toLowerCase());
    return match ? [match.id] : [];
  });
}

export async function discoverPage(filters, { myProviders = [] } = {}) {
  const type = filters.tipo === 'filme' ? 'movie' : 'tv';
  const mood = filters.humor ? getMood(filters.humor) : null;
  const moodCfg = mood ? mood[type] : null;
  if (mood && !moodCfg) return { results: [], totalPages: 0 };

  let keywordIds = [];
  if (moodCfg?.keywords?.length) {
    keywordIds = await resolveKeywordIds(moodCfg.keywords);
    if (!keywordIds.length) return { results: [], totalPages: 0 };
  }

  const { path, params } = toDiscoverRequest(filters, { myProviders, keywordIds });
  const data = await tmdbFetch(path, params, { revalidate: CACHE.rows });
  return {
    results: (data.results ?? []).map((r) => normalizeTitle(r, type)),
    totalPages: Math.min(data.total_pages ?? 1, 500),
  };
}

const APPEND = {
  movie: 'credits,videos,watch/providers,release_dates,recommendations',
  tv: 'credits,videos,watch/providers,content_ratings,recommendations',
};

export async function getTitleDetails(type, id) {
  if (!/^\d+$/.test(String(id))) return null;
  let raw;
  try {
    raw = await tmdbFetch(`/${type}/${id}`, { append_to_response: APPEND[type], include_video_language: 'pt,en' }, { revalidate: CACHE.details });
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }

  const br = raw['watch/providers']?.results?.BR;
  const providers = (br?.flatrate ?? []).map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path || null }));
  if (!providers.length) return null;

  const recommendations = (raw.recommendations?.results ?? []).slice(0, 20).map((r) => normalizeTitle(r, type));
  return {
    ...normalizeTitle(raw, type),
    genres: (raw.genres ?? []).map((g) => g.name),
    runtime: type === 'movie' ? raw.runtime || null : null,
    seasons: type === 'tv' ? raw.number_of_seasons || null : null,
    certification: brazilCertification(raw, type),
    cast: (raw.credits?.cast ?? []).slice(0, 12).map((c) => ({
      id: c.id, name: c.name, character: c.character || '', profilePath: c.profile_path || null,
    })),
    ...trailerFields(raw.videos?.results),
    providers,
    watchLink: br?.link ?? null,
    recommendations: await filterAvailable(recommendations),
  };
}

export async function getGenreLists() {
  const [movie, tv] = await Promise.all([
    tmdbFetch('/genre/movie/list', {}, { revalidate: CACHE.lists }),
    tmdbFetch('/genre/tv/list', {}, { revalidate: CACHE.lists }),
  ]);
  return { filme: movie.genres ?? [], serie: tv.genres ?? [] };
}
