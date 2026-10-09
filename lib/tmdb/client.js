const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3';
const TIMEOUT_MS = 8000;
const MAX_RETRY_AFTER_MS = 2000;

// Regras fixas do catálogo. São aplicadas por último, então ninguém consegue sobrescrevê-las.
export const FIXED_PARAMS = Object.freeze({
  language: 'pt-BR',
  region: 'BR',
  watch_region: 'BR',
  include_adult: 'false',
  with_watch_monetization_types: 'flatrate',
});

export class TmdbError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'TmdbError';
    this.status = status;
  }
}

export function buildTmdbUrl(path, params = {}) {
  const base = (process.env.TMDB_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = new URL(base + path);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  for (const [key, value] of Object.entries(FIXED_PARAMS)) url.searchParams.set(key, value);
  return url;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function tmdbFetch(path, params = {}, { revalidate } = {}) {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error('Defina TMDB_READ_TOKEN em .env.local');
  const url = buildTmdbUrl(path, params);
  const init = {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    ...(revalidate === undefined ? { cache: 'no-store' } : { next: { revalidate } }),
  };
  return attempt(url, init, true);
}

async function attempt(url, init, canRetry) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    if (canRetry) return attempt(url, init, false);
    throw new TmdbError(`Falha de rede ao chamar o TMDB: ${error.message}`, 0);
  }

  if (response.status === 429 && canRetry) {
    const seconds = Number(response.headers.get('retry-after'));
    const wait = Number.isFinite(seconds) && seconds > 0
      ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS)
      : MAX_RETRY_AFTER_MS;
    await sleep(wait);
    return attempt(url, init, false);
  }
  if (response.status >= 500 && canRetry) return attempt(url, init, false);
  if (!response.ok) {
    throw new TmdbError(`TMDB respondeu ${response.status} para ${url.pathname}`, response.status);
  }
  return response.json();
}
