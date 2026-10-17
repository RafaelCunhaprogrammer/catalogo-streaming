import { ALL_PROVIDER_IDS } from './providers.js';

export const STORAGE_KEY = 'catalogo:prefs';
export const PROVIDERS_COOKIE = 'catalogo_streamings';
export const PREFS_VERSION = 1;
const THEMES = ['escuro', 'claro', 'noturno'];
const TEXT_SIZES = ['normal', 'grande', 'muito-grande'];

export function defaultPrefs() {
  return {
    version: PREFS_VERSION, theme: 'sistema', brightness: 60, textSize: 'normal',
    calm: false, highContrast: false, openingSound: true, myProviders: [],
  };
}

export function parsePrefs(raw) {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return defaultPrefs();
  }
  if (!data || typeof data !== 'object' || data.version !== PREFS_VERSION) return defaultPrefs();

  const brightness = Number(data.brightness);
  return {
    version: PREFS_VERSION,
    theme: THEMES.includes(data.theme) ? data.theme : 'sistema',
    brightness: Number.isFinite(brightness) ? Math.min(100, Math.max(20, Math.round(brightness))) : 60,
    textSize: TEXT_SIZES.includes(data.textSize) ? data.textSize : 'normal',
    calm: data.calm === true,
    highContrast: data.highContrast === true,
    openingSound: data.openingSound !== false,
    myProviders: Array.isArray(data.myProviders) ? data.myProviders.filter((id) => ALL_PROVIDER_IDS.includes(id)) : [],
  };
}

export function loadPrefs(storage) {
  try {
    return parsePrefs(storage ? storage.getItem(STORAGE_KEY) : null);
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(storage, prefs) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export function resolveTheme(prefs, systemPrefersDark) {
  if (prefs.theme !== 'sistema') return prefs.theme;
  return systemPrefersDark ? 'escuro' : 'claro';
}

export function rootAttributes(prefs, resolvedTheme) {
  return {
    'data-theme': resolvedTheme,
    'data-text': prefs.textSize,
    'data-calm': String(prefs.calm),
    'data-contrast': String(prefs.highContrast),
  };
}

export function nightOverlayOpacity(prefs, resolvedTheme) {
  return resolvedTheme === 'noturno' ? (100 - prefs.brightness) / 100 : 0;
}

export const shouldAutoplayTrailer = (prefs) => !prefs.calm;
export const shouldRotateHero = (prefs) => !prefs.calm;
export const shouldPlayOpeningSound = (prefs, resolvedTheme) =>
  prefs.openingSound && !prefs.calm && resolvedTheme !== 'noturno';

export function providersCookieValue(ids) {
  return ids.join('.');
}

export function parseProvidersCookie(value) {
  return (value || '').split('.').map(Number).filter((id) => ALL_PROVIDER_IDS.includes(id));
}

export function writeProvidersCookie(ids) {
  if (typeof document === 'undefined') return;
  document.cookie = `${PROVIDERS_COOKIE}=${providersCookieValue(ids)}; path=/; max-age=31536000; SameSite=Lax`;
}
