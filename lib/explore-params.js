import { ALL_PROVIDER_IDS } from '@/lib/providers';
import { getMood } from '@/lib/moods';

const ORDERS = ['popularidade', 'nota', 'recentes'];
const DURATIONS = { curto: { lte: 90 }, medio: { gte: 90, lte: 120 }, longo: { gte: 120 } };

function getAll(sp, key) {
  if (!sp) return [];
  if (typeof sp.getAll === 'function') return sp.getAll(key);
  const value = sp[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const get = (sp, key) => getAll(sp, key)[0] ?? null;

function intList(sp, key) {
  return getAll(sp, key)
    .flatMap((v) => String(v).split(','))
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

function year(value) {
  const n = Number(value);
  return value && Number.isInteger(n) && n >= 1900 && n <= 2100 ? n : null;
}

export function parseExploreParams(sp) {
  const tipo = get(sp, 'tipo') === 'serie' ? 'serie' : 'filme';
  let anoDe = year(get(sp, 'anoDe'));
  let anoAte = year(get(sp, 'anoAte'));
  if (anoDe && anoAte && anoDe > anoAte) [anoDe, anoAte] = [anoAte, anoDe];

  const notaRaw = get(sp, 'nota');
  const notaNum = Number(notaRaw);
  const nota = notaRaw !== null && notaRaw !== '' && Number.isFinite(notaNum) && notaNum >= 0 && notaNum <= 10
    ? notaNum : null;

  const duracaoRaw = get(sp, 'duracao');
  const idiomaRaw = get(sp, 'idioma') || '';
  const ordemRaw = get(sp, 'ordem');
  const humorRaw = get(sp, 'humor');

  return {
    tipo,
    plataformas: intList(sp, 'plataforma').filter((id) => ALL_PROVIDER_IDS.includes(id)),
    generos: intList(sp, 'genero'),
    anoDe,
    anoAte,
    nota,
    duracao: tipo === 'filme' && DURATIONS[duracaoRaw] ? duracaoRaw : null,
    idioma: /^[a-z]{2}$/.test(idiomaRaw) ? idiomaRaw : null,
    ordem: ORDERS.includes(ordemRaw) ? ordemRaw : 'popularidade',
    humor: getMood(humorRaw) ? humorRaw : null,
    pagina: Math.min(Math.max(parseInt(get(sp, 'pagina'), 10) || 1, 1), 500),
  };
}

export function toExploreQuery(f) {
  const q = new URLSearchParams();
  if (f.tipo === 'serie') q.set('tipo', 'serie');
  if (f.humor) q.set('humor', f.humor);
  if (f.plataformas?.length) q.set('plataforma', f.plataformas.join(','));
  if (f.generos?.length) q.set('genero', f.generos.join(','));
  if (f.anoDe) q.set('anoDe', f.anoDe);
  if (f.anoAte) q.set('anoAte', f.anoAte);
  if (f.nota !== null && f.nota !== undefined) q.set('nota', f.nota);
  if (f.duracao) q.set('duracao', f.duracao);
  if (f.idioma) q.set('idioma', f.idioma);
  if (f.ordem && f.ordem !== 'popularidade') q.set('ordem', f.ordem);
  if (f.pagina > 1) q.set('pagina', f.pagina);
  return q.toString();
}

const today = () => new Date().toISOString().slice(0, 10);

export function toDiscoverRequest(filters, { myProviders = [], keywordIds = [] } = {}) {
  const isMovie = filters.tipo === 'filme';
  const mood = filters.humor ? getMood(filters.humor) : null;
  const moodCfg = mood ? (isMovie ? mood.movie : mood.tv) : null;
  const dateField = isMovie ? 'primary_release_date' : 'first_air_date';

  const providers = filters.plataformas.length ? filters.plataformas
    : myProviders.length ? myProviders : ALL_PROVIDER_IDS;
  const params = { page: filters.pagina, with_watch_providers: providers.join('|') };

  const genres = filters.generos.length ? filters.generos : moodCfg?.genres ?? [];
  if (genres.length) params.with_genres = genres.join('|');
  if (keywordIds.length) params.with_keywords = keywordIds.join('|');

  const minRating = Math.max(filters.nota ?? 0, moodCfg?.minRating ?? 0);
  if (minRating > 0) params['vote_average.gte'] = minRating;

  if (filters.anoDe) params[`${dateField}.gte`] = `${filters.anoDe}-01-01`;
  if (filters.anoAte) params[`${dateField}.lte`] = `${filters.anoAte}-12-31`;

  if (filters.duracao) {
    const d = DURATIONS[filters.duracao];
    if (d.gte) params['with_runtime.gte'] = d.gte;
    if (d.lte) params['with_runtime.lte'] = d.lte;
  }
  if (filters.idioma) params.with_original_language = filters.idioma;

  if (filters.ordem === 'nota') {
    params.sort_by = 'vote_average.desc';
    params['vote_count.gte'] = 200;
  } else if (filters.ordem === 'recentes') {
    params.sort_by = `${dateField}.desc`;
    if (!filters.anoAte) params[`${dateField}.lte`] = today();
  } else {
    params.sort_by = 'popularity.desc';
  }

  return { path: isMovie ? '/discover/movie' : '/discover/tv', params };
}
