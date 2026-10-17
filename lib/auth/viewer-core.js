import { signValue, verifySignedValue } from './signed-cookie.js';

export const PROFILE_COOKIE = 'paidegua_perfil';
export const UNLOCKED_COOKIE = 'paidegua_liberados';
export const PARENT_COOKIE = 'paidegua_adulto';
export const VISITOR_MAX_RATING = '14';
export const MAX_UNLOCKED = 50;
export const PARENT_MODE_MS = 10 * 60 * 1000;
export const DEMO_EMAIL = 'demo@paidegua.app';

const KEY_FORMAT = /^(movie|tv)-\d+$/;

export const titleKey = ({ type, id }) => `${type}-${id}`;

export function encodeUnlocked(keys, secret) {
  const valid = keys.filter((k) => KEY_FORMAT.test(k)).slice(-MAX_UNLOCKED);
  return signValue(valid.join(','), secret);
}

export function decodeUnlocked(cookie, secret) {
  const value = verifySignedValue(cookie, secret);
  if (!value) return new Set();
  return new Set(value.split(',').filter((k) => KEY_FORMAT.test(k)).slice(-MAX_UNLOCKED));
}

export const encodeParentMode = (now, secret) => signValue(String(now), secret);

export function parentModeActive(cookie, secret, now) {
  const since = Number(verifySignedValue(cookie, secret));
  return Number.isFinite(since) && since > 0 && now - since <= PARENT_MODE_MS;
}

// Quem está vendo a página. Puro: recebe a sessão, os perfis da conta e os cookies brutos.
export function buildViewer({ session, profiles = [], profileCookie, unlockedCookie, parentCookie, secret, now = Date.now() }) {
  if (!session?.user) {
    return {
      user: null, profile: null, profiles: [], needsProfile: false, isDemo: false,
      kids: false, maxRating: VISITOR_MAX_RATING, unlocked: new Set(), parentMode: false,
    };
  }
  const { id, name, email } = session.user;
  const profileId = verifySignedValue(profileCookie, secret);
  const profile = profiles.find((p) => p.id === profileId) ?? null;
  const kids = profile?.kind === 'kids';
  return {
    user: { id, name, email },
    profile,
    profiles,
    needsProfile: !profile,
    isDemo: email === DEMO_EMAIL,
    kids,
    maxRating: kids ? profile.maxRating : null,
    unlocked: kids ? decodeUnlocked(unlockedCookie, secret) : new Set(),
    parentMode: kids ? parentModeActive(parentCookie, secret, now) : true,
  };
}
