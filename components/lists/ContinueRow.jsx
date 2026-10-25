import { getDb } from '@/lib/db';
import { continueWatching } from '@/lib/lists/store';
import { getTitleDetails } from '@/lib/tmdb/catalog';
import { settledWithLimit } from '@/lib/tmdb/limit';
import { ratingAllowed } from '@/lib/tmdb/ratings';
import { titleKey } from '@/lib/lists/rules';
import { watchUrl } from '@/lib/providers';
import { titleHref } from '@/lib/tmdb/normalize';
import { ContinueCard } from '@/components/lists/ContinueCard';

const MAX_CARDS = 8;

// Converte a linha guardada (e os detalhes do TMDB, se vieram) no que o cartão mostra.
export function toContinueItem(row, details, viewer) {
  const { mediaType: type, tmdbId: id, snapshot } = row;
  const copy = snapshot.seasons ?? [];
  const lastCopy = copy.at(-1);
  const lastSeason = lastCopy ? lastCopy.number : null;
  const fresh = details?.seasonList ?? [];

  const season = type === 'tv' && lastCopy ? Math.min(row.season ?? copy[0].number, lastSeason) : row.season;
  const newEpisodes = type === 'tv' && Boolean(lastCopy)
    && fresh.some((s) => s.number > lastCopy.number)
    && season === lastCopy.number && row.episode === lastCopy.episodes;

  const first = details?.providers?.[0];
  const item = { id, type, title: snapshot.title };
  const provider = first ? { name: first.name, href: watchUrl(first.id, snapshot.title, details.watchLink ?? titleHref(item)) } : null;
  const locked = Boolean(viewer?.kids) && !ratingAllowed(snapshot.certification, viewer.maxRating) && !viewer.unlocked?.has(titleKey(type, id));

  return { ...item, backdropPath: snapshot.backdropPath ?? null, season, episode: row.episode, lastSeason, provider, newEpisodes, locked };
}

export async function ContinueRow({ viewer }) {
  const rows = await continueWatching(getDb(), viewer.profile.id, MAX_CARDS);
  if (!rows.length) return null;
  const results = await settledWithLimit(rows, MAX_CARDS, (r) => getTitleDetails(r.mediaType, r.tmdbId));
  const items = rows.map((r, i) => toContinueItem(r, results[i].status === 'fulfilled' ? results[i].value : null, viewer));
  return (
    <section aria-labelledby="continuar-titulo" className="mt-10">
      <h2 id="continuar-titulo" className="px-4 text-lg font-bold sm:px-8 sm:text-xl">Continuar assistindo</h2>
      <ul className="mt-3 flex gap-4 overflow-x-auto px-4 pb-2 sm:px-8">
        {items.map((item) => <ContinueCard key={`${item.type}-${item.id}`} item={item} />)}
      </ul>
    </section>
  );
}
