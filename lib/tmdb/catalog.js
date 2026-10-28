import { tmdbFetch } from './client';
import { settledWithLimit } from './limit';
import { certificationParams, filterByRating } from './ratings';
import { normalizeTitle } from './normalize';
import { ALL_PROVIDER_IDS, PROVIDERS } from '@/lib/providers';
import { GENRE_ROWS, isKidsTitle, kidsGenreParam } from '@/lib/genres';
import { getMood, MOODS } from '@/lib/moods';
import { parseExploreParams, toDiscoverRequest } from '@/lib/explore-params';
import { pickTrailer } from '@/lib/trailer';
import { brazilCertification } from '@/lib/certification';
import { seasonsWithoutSpecials } from '@/lib/lists/rules';

const HOUR = 3600;
export const CACHE = { rows: 6 * HOUR, details: 24 * HOUR, lists: 24 * HOUR, keywords: 7 * 24 * HOUR };
const ROW_SIZE = 20;
const HERO_SIZE = 5;
const MOOD_CANDIDATES = MOODS.length + 4;

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

export async function discoverMixed({ providers, movieGenre, tvGenre, movieParams = {}, tvParams = {}, limit = ROW_SIZE }) {
  const base = { with_watch_providers: providers.join('|'), sort_by: 'popularity.desc' };
  const requests = [];
  if (movieGenre !== null) requests.push(discover('movie', { ...base, ...(movieGenre ? { with_genres: movieGenre } : {}), ...movieParams }));
  if (tvGenre !== null) requests.push(discover('tv', { ...base, ...(tvGenre ? { with_genres: tvGenre } : {}), ...tvParams }));
  const lists = await Promise.all(requests);
  return lists.flat().sort((a, b) => b.popularity - a.popularity).slice(0, limit);
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

async function getHeroItems(providers, onlyThese, type, maxRating = null, kids = false) {
  const data = await tmdbFetch(`/trending/${type ?? 'all'}/week`, {}, { revalidate: CACHE.rows });
  const trending = (data.results ?? [])
    .filter((r) => (type ? true : r.media_type === 'movie' || r.media_type === 'tv'))
    .map((r) => normalizeTitle(r, type))
    .filter((t) => t.backdropPath);
  const candidates = kids ? trending.filter(isKidsTitle) : trending;
  const available = await filterAvailable(candidates, onlyThese ? providers : null);
  const allowed = await filterByRating(available, maxRating);
  const cutoff = daysAgo(HERO_RECENT_DAYS);
  const isRecent = (t) => Boolean(t.releaseDate && t.releaseDate >= cutoff);
  let top = [...allowed.filter(isRecent), ...allowed.filter((t) => !isRecent(t))].slice(0, HERO_SIZE);
  if (top.length < HERO_SIZE) {
    const seen = new Set(top.map((t) => `${t.type}-${t.id}`));
    const { movie, tv } = recentParams();
    const limits = rowLimits(maxRating, kids);
    const more = await discoverMixed({
      providers, movieParams: { ...movie, ...limits.movie }, tvParams: { ...tv, ...limits.tv }, ...onlyType(type),
    });
    const extra = more.filter((t) => t.backdropPath && !seen.has(`${t.type}-${t.id}`));
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
export async function getMoodCards({ maxRating = null, kids = false } = {}) {
  const pages = await Promise.allSettled(
    MOODS.map((m) => discoverPage(parseExploreParams(new URLSearchParams(`humor=${m.slug}`)), {
      extraParams: certificationParams(maxRating),
    })),
  );
  // Um filme popular costuma estar em vários gêneros: cada humor pega o primeiro ainda não usado.
  // Com faixa, os candidatos de cada humor são conferidos título a título (o discover deixa passar
  // títulos com mais de uma classificação brasileira).
  const candidates = await Promise.all(MOODS.map(async (m, i) => {
    const results = pages[i].status === 'fulfilled' ? pages[i].value.results : [];
    const usable = results.filter((t) => t.backdropPath && (!kids || isKidsTitle(t)));
    // Com faixa, confere só os primeiros (cada conferência é uma consulta), mas o bastante para os humores não se repetirem.
    return maxRating ? filterByRating(usable.slice(0, MOOD_CANDIDATES), maxRating) : usable;
  }));
  const used = new Set();
  return MOODS.map((m, i) => {
    const film = candidates[i].find((t) => !used.has(t.id));
    if (film) used.add(film.id);
    return {
      slug: m.slug, label: m.label, icon: m.icon,
      backdropPath: film?.backdropPath ?? null, filmId: film?.id ?? null, filmTitle: film?.title ?? null,
    };
  });
}

// Limites de cada tipo para o discover: classificação e, no Kids, os gêneros infantis.
function rowLimits(maxRating, kids) {
  const cert = certificationParams(maxRating);
  return {
    cert,
    movie: { ...cert, ...(kids ? { with_genres: kidsGenreParam('movie') } : {}) },
    tv: { ...cert, ...(kids ? { with_genres: kidsGenreParam('tv') } : {}) },
  };
}

// Fileira de gênero no Kids ("Comédia" infantil etc.): o TMDB não combina "este gênero E um dos infantis"
// numa busca só, então busca o gênero em duas páginas e fica com os títulos infantis.
async function kidsGenreRow({ providers, movieGenre, tvGenre, cert, only }) {
  const pages = await Promise.all([1, 2].map((page) => discoverMixed({
    providers, movieGenre, tvGenre, movieParams: { ...cert, page }, tvParams: { ...cert, page }, ...only, limit: Infinity,
  })));
  const seen = new Set();
  return pages.flat()
    .filter((t) => isKidsTitle(t) && !seen.has(`${t.type}-${t.id}`) && seen.add(`${t.type}-${t.id}`))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, ROW_SIZE);
}

// Fileiras do Início (type indefinido), da página Filmes (type 'movie') e da página Séries (type 'tv').
// Cada definição carrega sozinha (loadHomeRow), para a página aparecer em partes, fileira por fileira.
export function getHomeRowDefs(myProviders = [], type, { maxRating = null, kids = false } = {}) {
  const providers = myProviders.length ? myProviders : ALL_PROVIDER_IDS;
  // Visitante e Kids: o TMDB filtra pela classificação (e, no Kids, pelos gêneros infantis); depois, conferência.
  const limits = rowLimits(maxRating, kids);
  const recent = recentParams();
  const only = onlyType(type);
  const tipo = type === 'tv' ? 'tipo=serie&' : '';
  const genreRows = GENRE_ROWS.filter((g) => (type === 'tv' ? g.tv : true) && (!kids || g.kids !== false));
  // Com faixa, cada título que o discover devolve é conferido (vale a classificação mais restritiva).
  const checked = (load) => (maxRating ? async () => filterByRating(await load(), maxRating) : load);
  const defs = [
    {
      key: 'lancamentos',
      title: 'Lançamentos recentes',
      href: `/explorar?${tipo}ordem=recentes`,
      load: checked(() => discoverMixed({
        providers,
        movieParams: { 'primary_release_date.gte': daysAgo(RELEASES_DAYS), 'primary_release_date.lte': daysAgo(0), ...limits.movie },
        tvParams: { 'first_air_date.gte': daysAgo(RELEASES_DAYS), 'first_air_date.lte': daysAgo(0), ...limits.tv },
        ...only,
      })),
    },
    ...PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => ({
      key: `plataforma-${p.id}`,
      providerId: p.id,
      title: `Em alta na ${p.name}`,
      href: `/explorar?${tipo}plataforma=${p.id}`,
      load: checked(() => discoverMixed({ providers: [p.id], movieParams: { ...recent.movie, ...limits.movie }, tvParams: { ...recent.tv, ...limits.tv }, ...only })),
    })),
    ...genreRows.map((g) => ({
      key: `genero-${g.slug}`,
      title: g.label,
      href: `/explorar?${tipo}genero=${type === 'tv' ? g.tv : g.movie}`,
      load: checked(() => (kids
        ? kidsGenreRow({ providers, movieGenre: g.movie, tvGenre: g.tv, cert: limits.cert, only })
        : discoverMixed({ providers, movieGenre: g.movie, tvGenre: g.tv, movieParams: limits.cert, tvParams: limits.cert, ...only }))),
    })),
  ];
  return defs;
}

// Carrega uma fileira. Falha ou fileira vazia → items vazio (a página simplesmente não a mostra).
export async function loadHomeRow(def) {
  const [items, logos] = await Promise.allSettled([
    def.load(),
    def.providerId ? getProviderLogos() : Promise.resolve(new Map()),
  ]);
  const logoPath = logos.status === 'fulfilled' ? logos.value.get(def.providerId) : undefined;
  const list = items.status === 'fulfilled' ? items.value : [];
  return {
    key: def.key,
    title: def.title,
    href: def.href,
    ...(logoPath ? { logoPath } : {}),
    items: list,
  };
}

export async function getHomeHero(myProviders = [], type, { maxRating = null, kids = false } = {}) {
  const providers = myProviders.length ? myProviders : ALL_PROVIDER_IDS;
  try {
    return await getHeroItems(providers, myProviders.length > 0, type, maxRating, kids);
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

export async function discoverPage(filters, { myProviders = [], extraParams = {} } = {}) {
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
  const data = await tmdbFetch(path, { ...params, ...extraParams }, { revalidate: CACHE.rows });
  return {
    results: (data.results ?? []).map((r) => normalizeTitle(r, type)),
    totalPages: Math.min(data.total_pages ?? 1, 500),
  };
}

const APPEND = {
  movie: 'credits,videos,watch/providers,release_dates,recommendations',
  tv: 'credits,videos,watch/providers,content_ratings,recommendations',
};

// Detalhes de um título numa só chamada ao TMDB, sem conferir as recomendações e sem exigir plataforma no Brasil
// (providers pode vir vazio). Usa a mesma chamada de getTitleDetails, então o cache do fetch é o mesmo.
// Para listas, "Continuar assistindo" e ações: barato. Devolve null só para ID inválido ou inexistente.
async function fetchTitle(type, id) {
  if (!/^\d+$/.test(String(id))) return null;
  try {
    return await tmdbFetch(`/${type}/${id}`, { append_to_response: APPEND[type], include_video_language: 'pt,en' }, { revalidate: CACHE.details });
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

function basicsFrom(raw, type) {
  const br = raw['watch/providers']?.results?.BR;
  return {
    ...normalizeTitle(raw, type),
    genres: (raw.genres ?? []).map((g) => g.name),
    runtime: type === 'movie' ? raw.runtime || null : null,
    seasons: type === 'tv' ? raw.number_of_seasons || null : null,
    seasonList: type === 'tv' ? seasonsWithoutSpecials(raw.seasons ?? []) : [],
    certification: brazilCertification(raw, type),
    cast: (raw.credits?.cast ?? []).slice(0, 12).map((c) => ({
      id: c.id, name: c.name, character: c.character || '', profilePath: c.profile_path || null,
    })),
    ...trailerFields(raw.videos?.results),
    providers: (br?.flatrate ?? []).map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path || null })),
    watchLink: br?.link ?? null,
    recommendations: [],
  };
}

export async function getTitleBasics(type, id) {
  const raw = await fetchTitle(type, id);
  return raw ? basicsFrom(raw, type) : null;
}

// Página do título: só títulos com plataforma no Brasil, com as recomendações também disponíveis.
export async function getTitleDetails(type, id) {
  const raw = await fetchTitle(type, id);
  if (!raw) return null;
  const title = basicsFrom(raw, type);
  if (!title.providers.length) return null;
  const recommendations = (raw.recommendations?.results ?? []).slice(0, 20).map((r) => normalizeTitle(r, type));
  return { ...title, recommendations: await filterAvailable(recommendations) };
}

export async function getGenreLists() {
  const [movie, tv] = await Promise.all([
    tmdbFetch('/genre/movie/list', {}, { revalidate: CACHE.lists }),
    tmdbFetch('/genre/tv/list', {}, { revalidate: CACHE.lists }),
  ]);
  return { filme: movie.genres ?? [], serie: tv.genres ?? [] };
}
