import { randomUUID } from 'node:crypto';
import { and, asc, count, eq } from 'drizzle-orm';
import { profiles } from './db/schema.js';
import { defaultPrefs, parsePrefs } from './preferences.js';
import { cleanGenreSlugs } from './genres.js';

export const MAX_PROFILES = 5;
// Paleta do site, sem verde nem amarelo.
export const PROFILE_COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#0ea5e9', '#06b6d4', '#a855f7', '#ef4444', '#6366f1'];
export const PROFILE_KINDS = ['adulto', 'kids'];
const KIDS_RATINGS = ['L', '10', '12', '14'];

export function validateProfileInput(input = {}) {
  const errors = {};
  const name = String(input.name ?? '').trim();
  if (name.length < 1 || name.length > 20) errors.name = 'Use de 1 a 20 caracteres.';
  if (!PROFILE_COLORS.includes(input.color)) errors.color = 'Escolha uma das cores.';
  if (!PROFILE_KINDS.includes(input.kind)) errors.kind = 'Escolha adulto ou Kids.';
  const kids = input.kind === 'kids';
  if (kids && !KIDS_RATINGS.includes(input.maxRating)) errors.maxRating = 'Escolha Livre, 10, 12 ou 14 anos.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, color: input.color, kind: input.kind, maxRating: kids ? input.maxRating : null } };
}

export async function listProfiles(db, userId) {
  return db.select().from(profiles).where(eq(profiles.userId, userId)).orderBy(asc(profiles.createdAt), asc(profiles.id));
}

export async function getOwnedProfile(db, userId, profileId) {
  if (!profileId) return null;
  const [row] = await db.select().from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  return row ?? null;
}

async function countProfiles(db, userId) {
  const [{ total }] = await db.select({ total: count() }).from(profiles).where(eq(profiles.userId, userId));
  return Number(total);
}

export async function createProfile(db, userId, input, { prefs } = {}) {
  const valid = validateProfileInput(input);
  if (!valid.ok) return valid;
  if ((await countProfiles(db, userId)) >= MAX_PROFILES) return { ok: false, errors: { form: 'Limite de 5 perfis.' } };
  const [profile] = await db
    .insert(profiles)
    .values({ id: randomUUID(), userId, ...valid.value, prefs: prefs ? parsePrefs(prefs) : defaultPrefs() })
    .returning();
  return { ok: true, profile };
}

export async function updateProfile(db, userId, profileId, input) {
  const valid = validateProfileInput(input);
  if (!valid.ok) return valid;
  const [profile] = await db
    .update(profiles)
    .set(valid.value)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning();
  return profile ? { ok: true, profile } : { ok: false, errors: { form: 'Perfil não encontrado.' } };
}

export async function deleteProfile(db, userId, profileId) {
  if (!(await getOwnedProfile(db, userId, profileId))) return { ok: false, errors: { form: 'Perfil não encontrado.' } };
  if ((await countProfiles(db, userId)) <= 1) return { ok: false, errors: { form: 'A conta precisa de pelo menos um perfil.' } };
  await db.delete(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  return { ok: true };
}

export async function saveProfilePrefs(db, userId, profileId, prefs) {
  const clean = parsePrefs(prefs);
  const [row] = await db
    .update(profiles)
    .set({ prefs: clean })
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning();
  return row ? clean : null;
}

// Gêneros favoritos do perfil; salvar (mesmo vazio) encerra o convite para escolher.
export async function saveFavoriteGenres(db, userId, profileId, slugs) {
  const clean = cleanGenreSlugs(slugs);
  const [row] = await db
    .update(profiles)
    .set({ favoriteGenres: clean, genresPromptDone: true })
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning();
  return row ? clean : null;
}

export async function dismissGenresPrompt(db, userId, profileId) {
  const rows = await db
    .update(profiles)
    .set({ genresPromptDone: true })
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning({ id: profiles.id });
  return rows.length > 0;
}
