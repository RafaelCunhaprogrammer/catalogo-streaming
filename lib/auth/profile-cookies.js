import { signValue } from './signed-cookie.js';
import { KIDS_LOCK_COOKIE, PARENT_COOKIE, PROFILE_COOKIE, UNLOCKED_COOKIE } from './viewer-core.js';
import { PROVIDERS_COOKIE, providersCookieValue } from '../preferences.js';

export const CLEARED_PROFILE_COOKIES = [UNLOCKED_COOKIE, PARENT_COOKIE];

const YEAR_SECONDS = 31536000;

// Cookies de perfil ativo: o id assinado (até fechar o navegador), "Meus streamings" do perfil
// e a trava do Kids (ligada ao entrar num Kids, desligada ao entrar num adulto).
export function profileCookieEntries(profile, secret, { production = process.env.NODE_ENV === 'production' } = {}) {
  const secure = { httpOnly: true, sameSite: 'lax', secure: production, path: '/' };
  return [
    [PROFILE_COOKIE, signValue(profile.id, secret), secure],
    [PROVIDERS_COOKIE, providersCookieValue(profile.prefs?.myProviders ?? []), { path: '/', maxAge: YEAR_SECONDS, sameSite: 'lax' }],
    profile.kind === 'kids'
      ? [KIDS_LOCK_COOKIE, signValue(profile.userId, secret), { ...secure, maxAge: YEAR_SECONDS }]
      : [KIDS_LOCK_COOKIE, '', { ...secure, maxAge: 0 }],
  ];
}
