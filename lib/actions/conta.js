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
import { createProfile, deleteProfile, getOwnedProfile, listProfiles, saveProfilePrefs, updateProfile } from '@/lib/profiles';
import { hasPin, pinMessage, setPin, verifyPin } from '@/lib/pin';
import { DEMO_EMAIL, ensureDemoAccount, resetDemoIfNeeded } from '@/lib/demo';
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
});

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
  const result = await createProfile(getDb(), viewer.user.id, input);
  if (result.ok) revalidatePath('/perfis', 'layout');
  return result.ok ? { ok: true } : result;
}

export async function updateProfileAction(_prev, formData) {
  const viewer = await getViewer();
  if (!adultAreaAllowed(viewer)) return { ok: false, errors: { form: 'Peça para um adulto digitar o PIN.' } };
  const input = profileInput(formData);
  if (input.kind === 'kids' && !(await hasPin(getDb(), viewer.user.id))) {
    return { ok: false, errors: { form: 'Crie o PIN dos pais antes de criar um perfil Kids.' }, needsPin: true };
  }
  const result = await updateProfile(getDb(), viewer.user.id, field(formData, 'id'), input);
  if (result.ok) revalidatePath('/perfis', 'layout');
  return result.ok ? { ok: true } : result;
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
  const userId = await ensureDemoAccount(db, auth, demoPassword());
  await resetDemoIfNeeded(db, userId);
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
