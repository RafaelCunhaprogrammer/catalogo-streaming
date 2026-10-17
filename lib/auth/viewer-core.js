import { signValue, verifySignedValue } from './signed-cookie.js';

export const PROFILE_COOKIE = 'paidegua_perfil';
export const UNLOCKED_COOKIE = 'paidegua_liberados';
export const PARENT_COOKIE = 'paidegua_adulto';
// Trava de longa duração: "o último perfil usado neste navegador foi Kids". Sem ela, fechar o navegador driblaria o PIN.
export const KIDS_LOCK_COOKIE = 'paidegua_trava_kids';
export const VISITOR_MAX_RATING = '14';
export const MAX_UNLOCKED = 50;
export const PARENT_MODE_MS = 10 * 60 * 1000;
export const DEMO_EMAIL = 'demo@paidegua.app';

const KEY_FORMAT = /^(movie|tv)-\d+$/;

export const titleKey = ({ type, id }) => `${type}-${id}`;

// `scope` prende o cookie à conta (e ao perfil): copiado de outro navegador ou de outra conta, não vale.
const scoped = (scope, value) => `${scope}|${value}`;
function unscope(signedValue, scope) {
  if (signedValue === null) return null;
  const prefix = `${scope}|`;
  return signedValue.startsWith(prefix) ? signedValue.slice(prefix.length) : null;
}

export const unlockedScope = (userId, profileId) => `${userId}:${profileId}`;

export function encodeUnlocked(keys, secret, scope = '') {
  const valid = keys.filter((k) => KEY_FORMAT.test(k)).slice(-MAX_UNLOCKED);
  return signValue(scoped(scope, valid.join(',')), secret);
}

export function decodeUnlocked(cookie, secret, scope = '') {
  const value = unscope(verifySignedValue(cookie, secret), scope);
  if (!value) return new Set();
  return new Set(value.split(',').filter((k) => KEY_FORMAT.test(k)).slice(-MAX_UNLOCKED));
}

export const encodeParentMode = (now, secret, scope = '') => signValue(scoped(scope, String(now)), secret);

export function parentModeActive(cookie, secret, now, scope = '') {
  const value = unscope(verifySignedValue(cookie, secret), scope);
  if (!value) return false;
  const since = Number(value);
  return Number.isFinite(since) && since > 0 && now - since <= PARENT_MODE_MS;
}

// Quem está vendo a página. Puro: recebe a sessão, os perfis da conta e os cookies brutos.
export function buildViewer({ session, profiles = [], profileCookie, unlockedCookie, parentCookie, kidsLockCookie, secret, now = Date.now() }) {
  if (!session?.user) {
    return {
      user: null, profile: null, profiles: [], needsProfile: false, isDemo: false,
      kids: false, kidsLock: false, maxRating: VISITOR_MAX_RATING, unlocked: new Set(), parentMode: false,
    };
  }
  const { id, name, email } = session.user;
  const profileId = verifySignedValue(profileCookie, secret);
  const profile = profiles.find((p) => p.id === profileId) ?? null;
  const kids = profile?.kind === 'kids';
  // Sem perfil ativo, mas o último usado aqui foi Kids (e a conta ainda tem um): perfis adultos pedem o PIN.
  const kidsLock = !profile && verifySignedValue(kidsLockCookie, secret) === id && profiles.some((p) => p.kind === 'kids');
  const guarded = kids || kidsLock;
  return {
    user: { id, name, email },
    profile,
    profiles,
    needsProfile: !profile,
    isDemo: email === DEMO_EMAIL,
    kids,
    kidsLock,
    maxRating: kids ? profile.maxRating : null,
    unlocked: kids ? decodeUnlocked(unlockedCookie, secret, unlockedScope(id, profile.id)) : new Set(),
    parentMode: guarded ? parentModeActive(parentCookie, secret, now, id) : true,
  };
}
