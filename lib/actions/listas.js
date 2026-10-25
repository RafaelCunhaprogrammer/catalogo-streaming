'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { getViewer } from '@/lib/auth/viewer';
import { KIDS_FAVORITE_GENRES } from '@/lib/genres';
import { dismissGenresPrompt, saveFavoriteGenres } from '@/lib/profiles';
import { CACHE, getTitleDetails } from '@/lib/tmdb/catalog';
import { tmdbFetch } from '@/lib/tmdb/client';
import { ratingAllowed } from '@/lib/tmdb/ratings';
import { STATUSES, nextEpisode, parseTarget, titleKey } from '@/lib/lists/rules';
import { buildSnapshot } from '@/lib/lists/snapshot';
import { getMark, saveMark } from '@/lib/lists/store';

const fail = (error) => ({ ok: false, error });
const KEYS = ['favorite', 'status', 'season', 'episode'];
const positiveInt = (n) => Number.isSafeInteger(n) && n >= 1;

// Só aceita as chaves conhecidas, com valores do tipo certo.
function validChange(change) {
  if (!change || typeof change !== 'object' || Array.isArray(change)) return false;
  const keys = Object.keys(change);
  if (!keys.length || keys.some((k) => !KEYS.includes(k))) return false;
  if ('favorite' in change && typeof change.favorite !== 'boolean') return false;
  if ('status' in change && !STATUSES.includes(change.status)) return false;
  if ('season' in change && !positiveInt(change.season)) return false;
  if ('episode' in change && !positiveInt(change.episode)) return false;
  return true;
}

// Viewer com perfil ativo, ou null.
async function activeViewer() {
  const viewer = await getViewer();
  return viewer.user && !viewer.needsProfile && viewer.profile ? viewer : null;
}

// No Kids, título acima da faixa só passa se já foi liberado com o PIN.
const pinNeeded = (viewer, type, id, certification) =>
  Boolean(viewer.maxRating) && !ratingAllowed(certification, viewer.maxRating) && !viewer.unlocked.has(titleKey(type, id));

async function fetchDetails(type, id) {
  try {
    return await getTitleDetails(type, id);
  } catch {
    return null;
  }
}

function done() {
  revalidatePath('/minha-lista');
  revalidatePath('/');
}

export async function markTitleAction(type, id, change) {
  const viewer = await activeViewer();
  if (!viewer) return fail('perfil');
  const target = parseTarget(type, id);
  if (!target || !validChange(change)) return fail('invalido');

  const db = getDb();
  const existing = await getMark(db, viewer.profile.id, target.type, target.id);
  let snapshot = existing?.snapshot ?? null;

  const needsSeasons = target.type === 'tv' && (change.status === 'assistindo' || 'season' in change || 'episode' in change);
  if (!existing || (needsSeasons && !snapshot?.seasons?.length)) {
    const details = await fetchDetails(target.type, target.id);
    if (details) snapshot = buildSnapshot(details);
    else if (!existing) return fail('erro');
  }

  if (pinNeeded(viewer, target.type, target.id, snapshot?.certification)) return fail('pin');

  // Só manda a cópia quando ela é nova ou foi atualizada agora.
  const result = await saveMark(db, viewer.profile.id, target.type, target.id, change, snapshot !== existing?.snapshot ? snapshot : undefined);
  if (!result.ok) return fail(result.error === 'limite' ? 'limite' : 'erro');
  done();
  return { ok: true, mark: result.mark };
}

export async function nextEpisodeAction(id) {
  const viewer = await activeViewer();
  if (!viewer) return fail('perfil');
  const target = parseTarget('tv', id);
  if (!target) return fail('invalido');

  const db = getDb();
  const mark = await getMark(db, viewer.profile.id, 'tv', target.id);
  if (!mark || mark.status !== 'assistindo') return fail('invalido');
  if (pinNeeded(viewer, 'tv', target.id, mark.snapshot?.certification)) return fail('pin');

  let seasons = mark.snapshot?.seasons ?? [];
  if (!seasons.length) {
    const details = await fetchDetails('tv', target.id);
    seasons = details?.seasonList ?? [];
  }
  if (!seasons.length) return fail('erro');

  const next = nextEpisode({ season: mark.season ?? seasons[0].number, episode: mark.episode ?? 1 }, seasons);
  const result = await saveMark(db, viewer.profile.id, 'tv', target.id, { season: next.season, episode: next.episode });
  if (!result.ok) return fail('erro');
  done();
  return { ok: true, mark: result.mark, finished: next.finished };
}

export async function seasonEpisodesAction(id, season) {
  const viewer = await activeViewer();
  if (!viewer) return fail('perfil');
  const target = parseTarget('tv', id);
  if (!target || !positiveInt(season)) return fail('invalido');

  // No Kids, vale a mesma regra de faixa: usa a cópia guardada ou, sem ela, os detalhes (sem classificação, bloqueia).
  if (viewer.maxRating) {
    const mark = await getMark(getDb(), viewer.profile.id, 'tv', target.id);
    const certification = mark ? mark.snapshot?.certification : (await fetchDetails('tv', target.id))?.certification;
    if (pinNeeded(viewer, 'tv', target.id, certification)) return fail('pin');
  }
  try {
    const data = await tmdbFetch(`/tv/${target.id}/season/${season}`, {}, { revalidate: CACHE.details });
    const episodes = (data.episodes ?? []).map((e) => ({ number: e.episode_number, name: e.name ?? '' }));
    return { ok: true, episodes };
  } catch {
    return fail('erro');
  }
}

export async function saveGenresAction(slugs) {
  const viewer = await activeViewer();
  if (!viewer) return fail('perfil');
  const list = Array.isArray(slugs) ? slugs.filter((s) => typeof s === 'string') : [];
  const allowed = viewer.kids ? list.filter((s) => KIDS_FAVORITE_GENRES.includes(s)) : list;
  const genres = await saveFavoriteGenres(getDb(), viewer.user.id, viewer.profile.id, allowed);
  if (!genres) return fail('erro');
  revalidatePath('/');
  return { ok: true, genres };
}

export async function dismissGenresPromptAction() {
  const viewer = await activeViewer();
  if (!viewer) return fail('perfil');
  const ok = await dismissGenresPrompt(getDb(), viewer.user.id, viewer.profile.id);
  if (!ok) return fail('erro');
  revalidatePath('/');
  return { ok: true };
}
