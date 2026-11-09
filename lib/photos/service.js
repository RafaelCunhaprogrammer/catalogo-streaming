import { and, eq } from 'drizzle-orm';
import { profiles } from '../db/schema.js';
import { PHOTO_AVATAR } from '../avatars.js';
import { checkPhoto, newPhotoKey } from './validate.js';

// Apagar arquivo nunca bloqueia o fluxo: se falhar, só registra.
async function deleteQuietly(storage, key) {
  if (!key) return;
  try {
    await storage.del(key);
  } catch {
    console.error('Foto não apagada:', key);
  }
}

// Apaga os arquivos de foto dos perfis dados (perfis sem foto são ignorados).
export async function deletePhotosOf(storage, list) {
  await Promise.all(list.map((p) => deleteQuietly(storage, p?.photoKey)));
}

// Grava o arquivo novo, depois aponta o banco para ele, e só então apaga o antigo.
export async function setProfilePhoto(db, storage, userId, profileId, buffer) {
  const [profile] = await db.select().from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  if (!profile || profile.kind !== 'adulto') return { ok: false, error: 'perfil' };
  const checked = await checkPhoto(buffer);
  if (!checked.ok) return { ok: false, error: 'imagem' };
  const photoKey = newPhotoKey(profile.id, checked.ext);
  await storage.put(photoKey, buffer, checked.contentType);
  try {
    await db.update(profiles).set({ avatar: PHOTO_AVATAR, photoKey }).where(eq(profiles.id, profile.id));
  } catch (e) {
    await deleteQuietly(storage, photoKey);
    throw e;
  }
  if (profile.photoKey && profile.photoKey !== photoKey) await deleteQuietly(storage, profile.photoKey);
  return { ok: true, photoKey };
}

// Apaga o arquivo e zera photoKey; o avatar fica como o chamador decidir.
export async function removeProfilePhoto(db, storage, userId, profileId) {
  const [profile] = await db.select().from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  if (!profile) return;
  await db.update(profiles).set({ photoKey: null }).where(eq(profiles.id, profile.id));
  await deleteQuietly(storage, profile.photoKey);
}
