import { tmdbFetch } from './client';
import { normalizeTitle } from './normalize';
import { ALL_PROVIDER_IDS, PROVIDERS } from '@/lib/providers';
import { GENRE_ROWS } from '@/lib/genres';
import { getMood, MOODS } from '@/lib/moods';
import { parseExploreParams, toDiscoverRequest } from '@/lib/explore-params';
import { pickTrailer } from '@/lib/trailer';
import { brazilCertification } from '@/lib/certification';

const HOUR = 3600;
export const CACHE = { rows: 6 * HOUR, details: 24 * HOUR, lists: 24 * HOUR, keywords: 7 * 24 * HOUR };
const ROW_SIZE = 20;
const HERO_SIZE = 5;

// Data (AAAA-MM-DD) de n dias atrás.
function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// "Em alta" = recente: filmes dos últimos 2 anos e séries com episódio no último ano.
const recentParams = () => ({
  movie: { 'primary_release_date.gte': daysAgo(730) },
  tv: { 'air_date.gte': daysAgo(365) },
});
const RELEASES_DAYS = 90;
const HERO_RECENT_DAYS = 365;

async function discover(type, params) {
  const data = await tmdbFetch(`/discover/${type}`, params, { revalidate: CACHE.rows });
  return (data.results ?? []).map((r) => normalizeTitle(r, type));
}

export async function discoverMixed({ providers, movieGenre, tvGenre, movieParams = {}, tvParams = {} }) {
  const base = { with_watch_providers: providers.join('|'), sort_by: 'popularity.desc' };
  const requests = [];
  if (movieGenre !== null) requests.push(discover('movie', { ...base, ...(movieGenre ? { with_genres: movieGenre } : {}), ...movieParams }));
  if (tvGenre !== null) requests.push(discover('tv', { ...base, ...(tvGenre ? { with_genres: tvGenre } : {}), ...tvParams }));
  const lists = await Promise.all(requests);
  return lists.flat().sort((a, b) => b.popularity - a.popularity).slice(0, ROW_SIZE);
}

// Trailer sem dublagem brasileira toca com legendas em português.
function trailerFields(videos) {
  const trailer = pickTrailer(videos);
  return { trailerKey: trailer?.key ?? null, trailerSubtitles: Boolean(trailer && trailer.lang !== 'pt-BR') };
}

// Destaque: tendências da semana no TMDB que estão nos streamings (ou em "Meus streamings"),
// com os lançamentos dos últimos 12 meses na frente. Completa com os recentes em alta, se faltar.
// type: 'movie' | 'tv' | undefined (os dois). Para o discoverMixed, null num gênero = não buscar aquele tipo.
const onlyType = (type) => (type === 'movie' ? { tvGenre: null } : type === 'tv' ? { movieGenre: null } : {});

async function getHeroItems(providers, onlyThese, type) {
  const data = await tmdbFetch(`/trending/${type ?? 'all'}/week`, {}, { revalidate: CACHE.rows });
  const trending = (data.results ?? [])
    .filter((r) => (type ? true : r.media_type === 'movie' || r.media_type === 'tv'))
    .map((r) => normalizeTitle(r, type))
    .filter((t) => t.backdropPath);
  const available = await filterAvailable(trending, onlyThese ? providers : null);
  const cutoff = daysAgo(HERO_RECENT_DAYS);
  const isRecent = (t) => Boolean(t.releaseDate && t.releaseDate >= cutoff);
  let top = [...available.filter(isRecent), ...available.filter((t) => !isRecent(t))].slice(0, HERO_SIZE);
  if (top.length < HERO_SIZE) {
    const seen = new Set(top.map((t) => `${t.type}-${t.id}`));
    const { movie, tv } = recentParams();
    const extra = (await discoverMixed({ providers, movieParams: movie, tvParams: tv, ...onlyType(type) }))
      .filter((t) => t.backdropPath && !seen.has(`${t.type}-${t.id}`));
    top = [...top, ...extra].slice(0, HERO_SIZE);
  }
  const videos = await Promise.allSettled(
    top.map((t) => tmdbFetch(`/${t.type}/${t.id}/videos`, { include_video_language: 'pt,en' }, { revalidate: CACHE.details })),
  );
  return top.map((t, i) => ({
    ...t,
    ...trailerFields(videos[i].status === 'fulfilled' ? videos[i].value.results : []),
  }));
}

// Logos oficiais das plataformas (id → caminho da imagem no TMDB).
async function getProviderLogos() {
  const data = await tmdbFetch('/watch/providers/movie', {}, { revalidate: CACHE.lists });
  return new Map((data.results ?? []).map((p) => [p.provider_id, p.logo_path]));
}

// Cartões de "Como você quer se sentir hoje?": a imagem de fundo de um filme popular de cada humor.
export async function getMoodCards() {
  const pages = await Promise.allSettled(
    MOODS.map((m) => discoverPage(parseExploreParams(new URLSearchParams(`humor=${m.slug}`)))),
  );
  // Um filme popular costuma estar em vários gêneros: cada humor pega o primeiro ainda não usado.
  const used = new Set();
  return MOODS.map((m, i) => {
    const results = pages[i].status === 'fulfilled' ? pages[i].value.results : [];
    const film = results.find((t) => t.backdropPath && !used.has(t.id));
    if (film) used.add(film.id);
    return { slug: m.slug, label: m.label, icon: m.icon, backdropPath: film?.backdropPath ?? null, filmTitle: film?.title ?? null };
  });
}

// Fileiras do Início (type indefinido), da página Filmes (type 'movie') e da página Séries (type 'tv').
// Cada definição carrega sozinha (loadHomeRow), para a página aparecer em partes, fileira por fileira.
export function getHomeRowDefs(myProviders = [], type) {
  const providers = myProviders.length ? myProviders : ALL_PROVIDER_IDS;
  const recent = recentParams();
  const only = onlyType(type);
  const tipo = type === 'tv' ? 'tipo=serie&' : '';
  const genreRows = GENRE_ROWS.filter((g) => (type === 'tv' ? g.tv : true));
  return [
    {
      key: 'lancamentos',
      title: 'Lançamentos recentes',
      href: `/explorar?${tipo}ordem=recentes`,
      load: () => discoverMixed({
        providers,
        movieParams: { 'primary_release_date.gte': daysAgo(RELEASES_DAYS), 'primary_release_date.lte': daysAgo(0) },
        tvParams: { 'first_air_date.gte': daysAgo(RELEASES_DAYS), 'first_air_date.lte': daysAgo(0) },
        ...only,
      }),
    },
    ...PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => ({
      key: `plataforma-${p.id}`,
      providerId: p.id,
      title: `Em alta na ${p.name}`,
      href: `/explorar?${tipo}plataforma=${p.id}`,
      load: () => discoverMixed({ providers: [p.id], movieParams: recent.movie, tvParams: recent.tv, ...only }),
    })),
    ...genreRows.map((g) => ({
      key: `genero-${g.slug}`,
      title: g.label,
      href: `/explorar?${tipo}genero=${type === 'tv' ? g.tv : g.movie}`,
      load: () => discoverMixed({ providers, movieGenre: g.movie, tvGenre: g.tv, ...only }),
    })),
  ];
}

// Carrega uma fileira. Falha ou fileira vazia → items vazio (a página simplesmente não a mostra).
export async function loadHomeRow(def) {
  const [items, logos] = await Promise.allSettled([
    def.load(),
    def.providerId ? getProviderLogos() : Promise.resolve(new Map()),
  ]);
  const logoPath = logos.status === 'fulfilled' ? logos.value.get(def.providerId) : undefined;
  return {
    key: def.key,
    title: def.title,
    href: def.href,
    ...(logoPath ? { logoPath } : {}),
    items: items.status === 'fulfilled' ? items.value : [],
  };
}

export async function getHomeHero(myProviders = [], type) {
  const providers = myProviders.length ? myProviders : ALL_PROVIDER_IDS;
  try {
    return await getHeroItems(providers, myProviders.length > 0, type);
  } catch {
    return [];
  }
}

// Tudo de uma vez (destaque + fileiras com conteúdo).
export async function getHomeData(myProviders = [], type) {
  const [hero, rows] = await Promise.all([
    getHomeHero(myProviders, type),
    Promise.all(getHomeRowDefs(myProviders, type).map(loadHomeRow)),
  ]);
  return { hero, rows: rows.filter((r) => r.items.length > 0) };
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

// Para recomendações e destaque: um título cuja conferência falhou simplesmente não aparece.
// Com `providerIds`, só vale se estiver em uma dessas plataformas.
export async function filterAvailable(titles, providerIds = null) {
  const checks = await checkAvailability(titles);
  const matches = (flatrate) => flatrate.length > 0
    && (!providerIds || flatrate.some((p) => providerIds.includes(p.provider_id)));
  return titles.filter((_, i) => checks[i].status === 'fulfilled' && matches(checks[i].value));
}

// type: 'movie' | 'tv' | undefined (os dois).
export async function searchAvailable(query, page = 1, type) {
  const q = (query ?? '').trim();
  if (q.length < 2) return { results: [], totalPages: 0 };
  const data = await tmdbFetch(`/search/${type ?? 'multi'}`, { query: q, page });
  const titles = (data.results ?? [])
    .filter((r) => (type ? true : r.media_type === 'movie' || r.media_type === 'tv'))
    .map((r) => normalizeTitle(r, type));
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
