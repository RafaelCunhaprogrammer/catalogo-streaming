'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getViewer } from '@/lib/auth/viewer';
import { CLEARED_PROFILE_COOKIES, profileCookieEntries } from '@/lib/auth/profile-cookies';
import {
  PARENT_COOKIE, PROFILE_COOKIE, UNLOCKED_COOKIE, PARENT_MODE_MS, encodeParentMode, encodeUnlocked, unlockedScope,
} from '@/lib/auth/viewer-core';
import { adultAreaAllowed, canChangeAccount, profileSwitchAllowed, safeReturnPath } from '@/lib/account-rules';
import { createProfile, deleteProfile, dismissGenresPrompt, getOwnedProfile, listProfiles, saveCover, saveFavoriteGenres, saveProfilePrefs, updateProfile } from '@/lib/profiles';
import { getPhotoStorage } from '@/lib/photos/storage';
import { setProfilePhoto } from '@/lib/photos/service';
import { checkPhoto } from '@/lib/photos/validate';
import { PHOTO_AVATAR } from '@/lib/avatars';
import { buildCover, coverOptions } from '@/lib/cover';
import { extractAccent } from '@/lib/cover-accent';
import { parseTarget } from '@/lib/lists/rules';
import { getMark } from '@/lib/lists/store';
import { KIDS_FAVORITE_GENRES } from '@/lib/genres';
import { hasPin, pinMessage, setPin, verifyPin } from '@/lib/pin';
import { DEMO_EMAIL, ensureDemoAccount, resetDemoIfNeeded } from '@/lib/demo';
import { loadDemoExamples } from '@/lib/lists/demo-examples';
import { PROVIDERS_COOKIE, providersCookieValue } from '@/lib/preferences';

const secret = () => process.env.BETTER_AUTH_SECRET;
const demoPassword = () => process.env.DEMO_PASSWORD || 'demo-paidegua-2026';
// Cookies de sessão do navegador (somem ao fechar), protegidos contra leitura pelo JavaScript da página.
const sessionCookie = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };

async function applyProfileCookies(profile) {
  const jar = await cookies();
  for (const [name, value, options] of profileCookieEntries(profile, secret())) jar.set(name, value, options);
  CLEARED_PROFILE_COOKIES.forEach((name) => jar.delete(name));
}

async function clearProfileCookies() {
  const jar = await cookies();
  [PROFILE_COOKIE, UNLOCKED_COOKIE, PARENT_COOKIE].forEach((name) => jar.delete(name));
}

const field = (formData, name) => String(formData.get(name) ?? '');
const profileInput = (formData) => ({
  name: field(formData, 'name'),
  color: field(formData, 'color'),
  kind: field(formData, 'kind'),
  maxRating: field(formData, 'maxRating') || null,
  // Sem o campo, o avatar atual fica (updateProfile); vazio = só a inicial.
  ...(formData.has('avatar') ? { avatar: field(formData, 'avatar') } : {}),
});

const PHOTO_ERROR = { ok: false, errors: { form: 'Não foi possível usar essa imagem. Tente outra foto.' } };

// Arquivo "photo" do formulário (já recortado em 256 x 256 no navegador), ou null se não veio nenhum.
async function photoBuffer(formData) {
  const file = formData.get('photo');
  if (!file || typeof file === 'string' || !file.size) return null;
  return Buffer.from(await file.arrayBuffer());
}

export async function chooseProfileAction(profileId, voltar = '/') {
  const viewer = await getViewer();
  if (!viewer.user) redirect('/entrar');
  const profile = await getOwnedProfile(getDb(), viewer.user.id, profileId);
  if (!profile) return { ok: false, error: 'Perfil não encontrado.' };
  // Saindo do Kids (ou voltando depois de fechar o navegador no Kids): só um perfil Kids entra sem PIN.
  const backToKids = viewer.kidsLock && profile.kind === 'kids';
  if (!profileSwitchAllowed(viewer) && !backToKids) return { ok: false, error: 'pin' };
  await applyProfileCookies(profile);
  redirect(safeReturnPath(voltar));
}

// Logo depois de criar a conta: o primeiro perfil leva o nome da pessoa e as preferências do navegador.
export async function createFirstProfileAction(localPrefs) {
  const viewer = await getViewer();
  if (!viewer.user) redirect('/entrar');
  // Só vale para a conta recém-criada: com perfis já existentes, nada de ativar um deles por aqui.
  if (viewer.profile) redirect('/');
  const db = getDb();
  if ((await listProfiles(db, viewer.user.id)).length) redirect('/perfis');
  const name = viewer.user.name.trim().slice(0, 20) || 'Eu';
  const { profile } = await createProfile(db, viewer.user.id, { name, color: '#8b5cf6', kind: 'adulto' }, { prefs: localPrefs });
  await applyProfileCookies(profile);
  redirect('/');
}

export async function createProfileAction(_prev, formData) {
  const viewer = await getViewer();
  if (!adultAreaAllowed(viewer)) return { ok: false, errors: { form: 'Peça para um adulto digitar o PIN.' } };
  const input = profileInput(formData);
  if (input.kind === 'kids' && !(await hasPin(getDb(), viewer.user.id))) {
    return { ok: false, errors: { form: 'Crie o PIN dos pais antes de criar um perfil Kids.' }, needsPin: true };
  }
  // A foto é conferida antes de criar o perfil, para uma imagem ruim não deixar um perfil pela metade.
  const buffer = await photoBuffer(formData);
  if (buffer && !(await checkPhoto(buffer)).ok) return PHOTO_ERROR;
  // Sem foto para gravar, "foto" não vale como avatar: o perfil novo fica com o avatar padrão.
  const { avatar, ...semAvatar } = input;
  const result = await createProfile(getDb(), viewer.user.id, avatar === PHOTO_AVATAR ? semAvatar : input);
  if (result.ok && buffer && result.profile.kind === 'adulto') {
    await setProfilePhoto(getDb(), getPhotoStorage(), viewer.user.id, result.profile.id, buffer);
  }
  if (result.ok) revalidatePath('/perfis', 'layout');
  return result.ok ? { ok: true, profileId: result.profile.id, kids: result.profile.kind === 'kids' } : result;
}

export async function updateProfileAction(_prev, formData) {
  const viewer = await getViewer();
  if (!adultAreaAllowed(viewer)) return { ok: false, errors: { form: 'Peça para um adulto digitar o PIN.' } };
  const input = profileInput(formData);
  if (input.kind === 'kids' && !(await hasPin(getDb(), viewer.user.id))) {
    return { ok: false, errors: { form: 'Crie o PIN dos pais antes de criar um perfil Kids.' }, needsPin: true };
  }
  const id = field(formData, 'id');
  const buffer = await photoBuffer(formData);
  if (buffer && !(await checkPhoto(buffer)).ok) return PHOTO_ERROR;
  if (input.avatar === PHOTO_AVATAR && !buffer) {
    // "foto" sem arquivo novo só vale se o perfil já tem foto; senão o avatar atual fica.
    const current = await getOwnedProfile(getDb(), viewer.user.id, id);
    if (!current?.photoKey) delete input.avatar;
  }
  const result = await updateProfile(getDb(), viewer.user.id, id, input);
  if (result.ok && buffer && result.profile.kind === 'adulto') {
    const saved = await setProfilePhoto(getDb(), getPhotoStorage(), viewer.user.id, id, buffer);
    if (!saved.ok) return PHOTO_ERROR;
  }
  if (result.ok) {
    await saveFavoriteGenres(getDb(), viewer.user.id, result.profile.id, kidsFilter(result.profile, formData.getAll('genres').map(String)));
    revalidatePath('/perfis', 'layout');
  }
  return result.ok ? { ok: true } : result;
}

// Perfil Kids só guarda os gêneros infantis.
const kidsFilter = (profile, slugs) => (profile.kind === 'kids' ? slugs.filter((s) => KIDS_FAVORITE_GENRES.includes(s)) : slugs);

// Gêneros do perfil recém-criado em Gerenciar perfis (não é o perfil ativo): área de adultos e dono do perfil.
export async function saveProfileGenresAction(profileId, slugs) {
  const viewer = await getViewer();
  if (!viewer.user || !adultAreaAllowed(viewer)) return { ok: false, error: 'Peça para um adulto digitar o PIN.' };
  const profile = await getOwnedProfile(getDb(), viewer.user.id, profileId);
  if (!profile) return { ok: false, error: 'Perfil não encontrado.' };
  const list = Array.isArray(slugs) ? slugs.filter((s) => typeof s === 'string') : [];
  const genres = await saveFavoriteGenres(getDb(), viewer.user.id, profile.id, kidsFilter(profile, list));
  if (!genres) return { ok: false, error: 'Perfil não encontrado.' };
  revalidatePath('/perfis', 'layout');
  return { ok: true, genres };
}

export async function dismissProfileGenresAction(profileId) {
  const viewer = await getViewer();
  if (!viewer.user || !adultAreaAllowed(viewer)) return { ok: false, error: 'Peça para um adulto digitar o PIN.' };
  const profile = await getOwnedProfile(getDb(), viewer.user.id, profileId);
  if (!profile || !(await dismissGenresPrompt(getDb(), viewer.user.id, profile.id))) return { ok: false, error: 'Perfil não encontrado.' };
  revalidatePath('/perfis', 'layout');
  return { ok: true };
}

export async function deleteProfileAction(profileId) {
  const viewer = await getViewer();
  if (!adultAreaAllowed(viewer)) return { ok: false, error: 'Peça para um adulto digitar o PIN.' };
  const result = await deleteProfile(getDb(), viewer.user.id, profileId);
  if (!result.ok) return { ok: false, error: result.errors.form };
  if (viewer.profile?.id === profileId) await clearProfileCookies();
  revalidatePath('/perfis', 'layout');
  return { ok: true };
}

export async function setPinAction(_prev, formData) {
  const viewer = await getViewer();
  if (!viewer.user || !adultAreaAllowed(viewer)) return { ok: false, error: 'Peça para um adulto digitar o PIN.' };
  const pin = field(formData, 'pin');
  if (pin !== field(formData, 'confirm')) return { ok: false, error: 'Os PINs não são iguais.' };
  const db = getDb();
  // Trocar um PIN que já existe pede a senha da conta (criar o primeiro, não).
  if (await hasPin(db, viewer.user.id)) {
    if (!canChangeAccount(viewer)) return { ok: false, error: 'Indisponível na conta de demonstração.' };
    try {
      await getAuth().api.verifyPassword({ body: { password: field(formData, 'password') }, headers: await headers() });
    } catch {
      return { ok: false, error: 'Senha incorreta.' };
    }
  }
  return setPin(db, viewer.user.id, pin);
}

export async function verifyPinAction({ pin, purpose, titleKey }) {
  const viewer = await getViewer();
  if (!viewer.user) return { ok: false, message: 'Entre na sua conta para continuar.' };
  const result = await verifyPin(getDb(), viewer.user.id, String(pin ?? ''));
  if (!result.ok) return { ok: false, message: pinMessage(result) };
  const jar = await cookies();
  if (purpose === 'titulo' && titleKey) {
    if (!viewer.profile) return { ok: false, message: 'Escolha um perfil para continuar.' };
    const scope = unlockedScope(viewer.user.id, viewer.profile.id);
    jar.set(UNLOCKED_COOKIE, encodeUnlocked([...viewer.unlocked, titleKey], secret(), scope), sessionCookie);
  } else {
    jar.set(PARENT_COOKIE, encodeParentMode(Date.now(), secret(), viewer.user.id), { ...sessionCookie, maxAge: PARENT_MODE_MS / 1000 });
  }
  return { ok: true };
}

export async function savePrefsAction(prefs) {
  const viewer = await getViewer();
  if (!viewer.profile) return { ok: false };
  const saved = await saveProfilePrefs(getDb(), viewer.user.id, viewer.profile.id, prefs);
  if (saved) {
    (await cookies()).set(PROVIDERS_COOKIE, providersCookieValue(saved.myProviders), { path: '/', maxAge: 31536000, sameSite: 'lax' });
  }
  return { ok: Boolean(saved) };
}

export async function signInDemoAction() {
  const db = getDb();
  const auth = getAuth();
  const userId = await ensureDemoAccount(db, auth, demoPassword(), new Date(), { examples: loadDemoExamples });
  await resetDemoIfNeeded(db, userId, new Date(), { examples: loadDemoExamples });
  await auth.api.signInEmail({ body: { email: DEMO_EMAIL, password: demoPassword() }, headers: await headers() });
  redirect('/perfis');
}

export async function signOutAction() {
  const viewer = await getViewer();
  if (viewer.profile && !profileSwitchAllowed(viewer)) return { ok: false, error: 'pin' };
  await getAuth().api.signOut({ headers: await headers() });
  await clearProfileCookies();
  redirect('/');
}

export async function changePasswordAction(_prev, formData) {
  const viewer = await getViewer();
  if (!canChangeAccount(viewer) || !adultAreaAllowed(viewer)) return { ok: false, error: 'Indisponível na conta de demonstração.' };
  const next = field(formData, 'next');
  if (next !== field(formData, 'confirm')) return { ok: false, error: 'As senhas não são iguais.' };
  if (next.length < 8) return { ok: false, error: 'A nova senha precisa ter pelo menos 8 caracteres.' };
  try {
    await getAuth().api.changePassword({
      body: { currentPassword: field(formData, 'current'), newPassword: next, revokeOtherSessions: true },
      headers: await headers(),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'Senha atual incorreta.' };
  }
}

export async function deleteAccountAction(_prev, formData) {
  const viewer = await getViewer();
  if (!canChangeAccount(viewer) || !adultAreaAllowed(viewer)) return { ok: false, error: 'Indisponível na conta de demonstração.' };
  if (field(formData, 'confirm') !== 'EXCLUIR') return { ok: false, error: 'Digite EXCLUIR para confirmar.' };
  try {
    await getAuth().api.deleteUser({ body: { password: field(formData, 'password') }, headers: await headers() });
  } catch {
    return { ok: false, error: 'Senha incorreta.' };
  }
  await clearProfileCookies();
  redirect('/');
}

// Capa da Minha lista do perfil ativo: um favorito com imagem, ou null (página padrão).
// Não pede PIN no Kids: a lista só tem títulos que o perfil já pode ver.
export async function saveCoverAction(target) {
  const viewer = await getViewer();
  if (!viewer?.user || viewer.needsProfile || !viewer.profile) return { ok: false, error: 'perfil' };
  const db = getDb();
  let cover = null;
  if (target !== null) {
    const parsed = target && typeof target === 'object' ? parseTarget(target.type, target.id) : null;
    const mark = parsed ? await getMark(db, viewer.profile.id, parsed.type, parsed.id) : null;
    const [option] = mark ? coverOptions([{ ...mark, mediaType: parsed.type, tmdbId: parsed.id }], { maxRating: viewer.maxRating }) : [];
    if (!option) return { ok: false, error: 'capa' };
    cover = buildCover({ mediaType: parsed.type, tmdbId: parsed.id, snapshot: mark.snapshot }, await extractAccent(option.backdropPath));
  }
  if (!(await saveCover(db, viewer.user.id, viewer.profile.id, cover))) return { ok: false, error: 'perfil' };
  revalidatePath('/minha-lista');
  return { ok: true };
}
