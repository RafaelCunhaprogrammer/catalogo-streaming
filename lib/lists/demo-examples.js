// Títulos de exemplo para a conta de demonstração: os primeiros da tendência da semana com plataforma no Brasil.
import { tmdbFetch } from '@/lib/tmdb/client';
import { CACHE, getTitleBasics } from '@/lib/tmdb/catalog';

const MAX_CANDIDATES = 5;

async function firstAvailable(type) {
  const data = await tmdbFetch(`/trending/${type}/week`, {}, { revalidate: CACHE.rows });
  const candidates = (data.results ?? []).slice(0, MAX_CANDIDATES);
  // Dados leves (sem conferir recomendações); o exemplo precisa ter ao menos uma plataforma no Brasil.
  const settled = await Promise.allSettled(candidates.map((row) => getTitleBasics(type, row.id)));
  const hit = settled.find((r) => r.status === 'fulfilled' && r.value?.providers?.length);
  return hit ? hit.value : null;
}

export async function loadDemoExamples() {
  const [movie, tv] = await Promise.all([firstAvailable('movie'), firstAvailable('tv')]);
  return { movie, tv };
}
