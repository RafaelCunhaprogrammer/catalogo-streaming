// Títulos de exemplo para a conta de demonstração: os primeiros da tendência da semana com plataforma no Brasil.
import { tmdbFetch } from '@/lib/tmdb/client';
import { CACHE, getTitleDetails } from '@/lib/tmdb/catalog';

const MAX_CANDIDATES = 5;

async function firstAvailable(type) {
  const data = await tmdbFetch(`/trending/${type}/week`, {}, { revalidate: CACHE.rows });
  for (const row of (data.results ?? []).slice(0, MAX_CANDIDATES)) {
    try {
      const details = await getTitleDetails(type, row.id);
      if (details) return details;
    } catch {
      // tenta o próximo candidato
    }
  }
  return null;
}

export async function loadDemoExamples() {
  const [movie, tv] = await Promise.all([firstAvailable('movie'), firstAvailable('tv')]);
  return { movie, tv };
}
