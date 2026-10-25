import { getDb } from '@/lib/db';
import { continueWatching } from '@/lib/lists/store';
import { getTitleBasics } from '@/lib/tmdb/catalog';
import { settledWithLimit } from '@/lib/tmdb/limit';
import { ratingAllowed } from '@/lib/tmdb/ratings';
import { titleKey } from '@/lib/lists/rules';
import { watchUrl } from '@/lib/providers';
import { titleHref } from '@/lib/tmdb/normalize';
import { ContinueCard } from '@/components/lists/ContinueCard';

const MAX_CARDS = 20;
const MAX_CONCURRENT = 8;

const isLocked = (row, viewer) => Boolean(viewer?.kids)
  && !ratingAllowed(row.snapshot.certification, viewer.maxRating) && !viewer.unlocked?.has(titleKey(row.mediaType, row.tmdbId));

// Converte a linha guardada (e os detalhes do TMDB, se vieram) no que o cartão mostra.
export function toContinueItem(row, details, viewer) {
  const { mediaType: type, tmdbId: id, snapshot } = row;
  const copy = snapshot.seasons ?? [];
  const lastCopy = copy.at(-1);
  const fresh = details?.seasonList ?? [];
  // Com temporada nova no TMDB, o "+1 episódio" pode levar além da cópia: o limite é a maior das duas.
  const lastSeason = lastCopy ? Math.max(lastCopy.number, fresh.at(-1)?.number ?? 0) : null;

  const season = type === 'tv' && lastCopy ? Math.min(row.season ?? copy[0].number, lastSeason) : row.season;
  const newEpisodes = type === 'tv' && Boolean(lastCopy)
    && fresh.some((s) => s.number > lastCopy.number)
    && season === lastCopy.number && row.episode === lastCopy.episodes;

  const first = details?.providers?.[0];
  const item = { id, type, title: snapshot.title };
  const provider = first ? { name: first.name, href: watchUrl(first.id, snapshot.title, details.watchLink ?? titleHref(item)) } : null;
  const locked = isLocked(row, viewer);
  // Título bloqueado: nada além do necessário para o cartão de cadeado vai para o navegador.
  if (locked) {
    return { id, type, title: snapshot.title, backdropPath: null, season: null, episode: null, lastSeason: null, provider: null, newEpisodes: false, locked: true };
  }

  return { ...item, backdropPath: snapshot.backdropPath ?? null, season, episode: row.episode, lastSeason, provider, newEpisodes, locked };
}

export async function ContinueRow({ viewer }) {
  let items;
  try {
    const rows = await continueWatching(getDb(), viewer.profile.id, MAX_CARDS);
    const results = await settledWithLimit(rows, MAX_CONCURRENT, (r) => (isLocked(r, viewer) ? null : getTitleBasics(r.mediaType, r.tmdbId)));
    items = rows.map((r, i) => toContinueItem(r, results[i].status === 'fulfilled' ? results[i].value : null, viewer));
  } catch {
    return null; // sem a fileira, o resto do Início segue normal
  }
  if (!items.length) return null;
  return (
    <section aria-labelledby="continuar-titulo" className="mt-10">
      <h2 id="continuar-titulo" className="px-4 text-lg font-bold sm:px-8 sm:text-xl">Continuar assistindo</h2>
      <ul className="mt-3 flex gap-4 overflow-x-auto px-4 pb-2 sm:px-8">
        {items.map((item) => <ContinueCard key={`${item.type}-${item.id}`} item={item} />)}
      </ul>
    </section>
  );
}
