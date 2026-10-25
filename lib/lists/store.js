// Gravação e consulta das marcações de um perfil. Sem checagem de acesso: quem chama garante que o perfil é da conta.
import { and, count, desc, eq, or, sql } from 'drizzle-orm';
import { profileTitles } from '@/lib/db/schema';
import { MAX_MARKS, applyChange, isEmptyMark, titleKey } from './rules';

const keyOf = (profileId, type, id) => and(
  eq(profileTitles.profileId, profileId), eq(profileTitles.mediaType, type), eq(profileTitles.tmdbId, id),
);

const toMark = (row) => ({ favorite: row.favorite, status: row.status, season: row.season, episode: row.episode, snapshot: row.snapshot });

export async function getMark(db, profileId, type, id) {
  const [row] = await db.select().from(profileTitles).where(keyOf(profileId, type, id));
  return row ? toMark(row) : null;
}

export async function saveMark(db, profileId, type, id, change, snapshot) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(profileTitles).where(keyOf(profileId, type, id));
    if (!row) {
      if (!snapshot) return { ok: false, error: 'sem-dados' };
      const [{ total }] = await tx.select({ total: count() }).from(profileTitles).where(eq(profileTitles.profileId, profileId));
      if (Number(total) >= MAX_MARKS) return { ok: false, error: 'limite' };
    }

    const base = row ? { favorite: row.favorite, status: row.status, season: row.season, episode: row.episode } : null;
    const seasons = (snapshot ?? row?.snapshot)?.seasons ?? [];
    const mark = applyChange(base, change, { type, seasons });

    if (isEmptyMark(mark)) {
      if (row) await tx.delete(profileTitles).where(keyOf(profileId, type, id));
      return { ok: true, mark };
    }

    const now = new Date();
    const values = {
      ...mark,
      snapshot: snapshot ?? row.snapshot,
      favoriteAt: mark.favorite !== (row?.favorite ?? false) ? now : (row?.favoriteAt ?? null),
      statusAt: mark.status !== (row?.status ?? 'nenhum') ? now : (row?.statusAt ?? null),
      updatedAt: now,
    };
    await tx
      .insert(profileTitles)
      .values({ profileId, mediaType: type, tmdbId: id, ...values })
      .onConflictDoUpdate({ target: [profileTitles.profileId, profileTitles.mediaType, profileTitles.tmdbId], set: values });
    return { ok: true, mark };
  });
}

// Atualiza a cópia (cartaz, nome…) só se o título já estiver marcado.
export async function refreshSnapshot(db, profileId, type, id, snapshot) {
  await db.update(profileTitles).set({ snapshot }).where(keyOf(profileId, type, id));
}

export async function listMarks(db, profileId) {
  return db.select().from(profileTitles).where(eq(profileTitles.profileId, profileId));
}

export async function continueWatching(db, profileId, limit = 20) {
  return db
    .select()
    .from(profileTitles)
    .where(and(eq(profileTitles.profileId, profileId), eq(profileTitles.status, 'assistindo')))
    .orderBy(desc(profileTitles.updatedAt))
    .limit(limit);
}

// Títulos que servem de semente para indicações: favoritos ou assistidos, dos mais recentes.
export async function recentSeeds(db, profileId, limit = 5) {
  const rows = await db
    .select({ type: profileTitles.mediaType, id: profileTitles.tmdbId })
    .from(profileTitles)
    .where(and(eq(profileTitles.profileId, profileId), or(eq(profileTitles.favorite, true), eq(profileTitles.status, 'assistido'))))
    .orderBy(desc(sql`greatest(coalesce(${profileTitles.favoriteAt}, ${profileTitles.statusAt}), coalesce(${profileTitles.statusAt}, ${profileTitles.favoriteAt}))`))
    .limit(limit);
  return rows;
}

export function markIndex(rows) {
  return Object.fromEntries(rows.map((r) => [
    titleKey(r.mediaType, r.tmdbId),
    { favorite: r.favorite, status: r.status, season: r.season, episode: r.episode },
  ]));
}
