import { requireProfile } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { listMarks } from '@/lib/lists/store';
import { ratingAllowed } from '@/lib/tmdb/ratings';
import { MyListView } from '@/components/lists/MyListView';

export const metadata = { title: 'Minha lista' };

const TABS = ['favoritos', 'assistindo', 'ja-assisti'];

export default async function MyListPage({ searchParams }) {
  const viewer = await requireProfile('/minha-lista');
  const { aba } = await searchParams;
  const raw = Array.isArray(aba) ? aba[0] : aba;
  const initialTab = TABS.includes(raw) ? raw : 'favoritos';

  const rows = await listMarks(getDb(), viewer.profile.id);
  const items = rows
    .filter((r) => r.favorite || r.status !== 'nenhum')
    .map((r) => {
      const s = r.snapshot ?? {};
      const locked = Boolean(viewer.kids)
        && !ratingAllowed(s.certification, viewer.maxRating)
        && !viewer.unlocked.has(`${r.mediaType}-${r.tmdbId}`);
      return {
        id: r.tmdbId,
        type: r.mediaType,
        title: s.title ?? '',
        posterPath: s.posterPath ?? null,
        year: s.year ?? null,
        favorite: r.favorite,
        status: r.status,
        favoriteAt: r.favoriteAt ? new Date(r.favoriteAt).toISOString() : null,
        statusAt: r.statusAt ? new Date(r.statusAt).toISOString() : null,
        locked,
      };
    });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-extrabold">Minha lista</h1>
      <MyListView items={items} initialTab={initialTab} />
    </div>
  );
}
