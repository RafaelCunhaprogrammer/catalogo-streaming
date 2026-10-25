import { getDb } from '@/lib/db';
import { belemDate } from '@/lib/demo';
import { FAVORITE_GENRES, isKidsTitle, KIDS_GENRES } from '@/lib/genres';
import { ALL_PROVIDER_IDS } from '@/lib/providers';
import { listMarks, recentSeeds } from '@/lib/lists/store';
import { tmdbFetch } from '@/lib/tmdb/client';
import { CACHE, filterAvailable } from '@/lib/tmdb/catalog';
import { normalizeTitle } from '@/lib/tmdb/normalize';
import { certificationParams, filterByRating } from '@/lib/tmdb/ratings';

const CANDIDATES = 40;
const RESULT_SIZE = 20;
const MAX_SEEDS = 5;
const MAX_GENRES = 3;

const keyOf = (t) => `${t.type}-${t.id}`;

// Gerador pseudoaleatório determinístico a partir de um texto (FNV-1a + mulberry32).
function seededRandom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sorteia até n gêneros por dia: o mesmo perfil vê os mesmos gêneros o dia todo.
export function pickDailyGenres(slugs, profileId, date, n = MAX_GENRES) {
  const pool = [...new Set(slugs ?? [])];
  const random = seededRandom(`${profileId}|${date}`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// Alterna os itens das listas, sem repetir o mesmo título.
export function interleave(...lists) {
  const seen = new Set();
  const out = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const item = list[i];
      if (item && !seen.has(keyOf(item))) {
        seen.add(keyOf(item));
        out.push(item);
      }
    }
  }
  return out;
}

const normalizeAll = (data, type) => (data.results ?? []).map((r) => normalizeTitle(r, type));

const fromSeed = (seed) => tmdbFetch(`/${seed.type}/${seed.id}/recommendations`, {}, { revalidate: CACHE.rows })
  .then((data) => normalizeAll(data, seed.type));

function fromGenre(genre, providers, maxRating, kids) {
  const params = {
    sort_by: 'vote_average.desc',
    'vote_average.gte': 7,
    'vote_count.gte': 200,
    with_watch_providers: providers.join('|'),
    ...certificationParams(maxRating),
  };
  const queries = [];
  for (const [type, id] of [['movie', genre.movie], ['tv', genre.tv]]) {
    if (!id) continue;
    // No TMDB, "," em with_genres é E e "|" é OU, mas os dois não se misturam num valor só
    // ("12,16|10751" não vale). Por isso, no Kids, um gênero que não é infantil vira uma busca
    // "gênero E gênero infantil" para cada gênero infantil; um gênero infantil vai sozinho.
    const kidsIds = KIDS_GENRES[type];
    const withGenres = !kids || kidsIds.includes(id) ? [String(id)] : kidsIds.map((k) => `${id},${k}`);
    for (const g of withGenres) queries.push([type, g]);
  }
  return queries.map(([type, g]) => tmdbFetch(`/discover/${type}`, { ...params, with_genres: g }, { revalidate: CACHE.rows })
    .then((data) => normalizeAll(data, type)));
}

// Uma fonte que falha só deixa de contribuir.
const settled = async (promises) => (await Promise.allSettled(promises)).flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));

export async function getRecommendations({ profile, myProviders = [], viewer = {}, now = new Date() }) {
  const db = getDb();
  const [seeds, marks] = await Promise.all([recentSeeds(db, profile.id, MAX_SEEDS), listMarks(db, profile.id)]);
  const slugs = pickDailyGenres(profile.favoriteGenres ?? [], profile.id, belemDate(now));
  const genres = slugs.map((s) => FAVORITE_GENRES.find((g) => g.slug === s)).filter(Boolean);
  if (!seeds.length && !genres.length) return [];

  const providers = myProviders.length ? myProviders : ALL_PROVIDER_IDS;
  const maxRating = viewer?.maxRating ?? null;
  const [seedLists, genreLists] = await Promise.all([
    settled(seeds.map(fromSeed)),
    settled(genres.flatMap((g) => fromGenre(g, providers, maxRating, Boolean(viewer?.kids)))),
  ]);

  const marked = new Set(marks.map((m) => `${m.mediaType}-${m.tmdbId}`));
  let candidates = interleave(interleave(...seedLists), interleave(...genreLists))
    .filter((t) => !marked.has(keyOf(t)))
    .slice(0, CANDIDATES);
  if (viewer?.kids) candidates = candidates.filter(isKidsTitle);

  if (!candidates.length) return [];

  const available = await filterAvailable(candidates, myProviders.length ? myProviders : null);
  const allowed = await filterByRating(available, maxRating);
  return allowed.slice(0, RESULT_SIZE);
}
