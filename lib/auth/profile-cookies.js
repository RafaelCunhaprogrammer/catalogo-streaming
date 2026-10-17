import { signValue } from './signed-cookie.js';
import { PARENT_COOKIE, PROFILE_COOKIE, UNLOCKED_COOKIE } from './viewer-core.js';
import { PROVIDERS_COOKIE, providersCookieValue } from '../preferences.js';

export const CLEARED_PROFILE_COOKIES = [UNLOCKED_COOKIE, PARENT_COOKIE];

// Cookies de perfil ativo: o id assinado (até fechar o navegador) e "Meus streamings" do perfil.
export function profileCookieEntries(profile, secret, { production = process.env.NODE_ENV === 'production' } = {}) {
  return [
    [PROFILE_COOKIE, signValue(profile.id, secret), { httpOnly: true, sameSite: 'lax', secure: production, path: '/' }],
    [PROVIDERS_COOKIE, providersCookieValue(profile.prefs?.myProviders ?? []), { path: '/', maxAge: 31536000, sameSite: 'lax' }],
  ];
}
