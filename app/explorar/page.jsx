import { cookies } from 'next/headers';
import { parseExploreParams, exploreResultsKey } from '@/lib/explore-params';
import { discoverPage, getGenreLists } from '@/lib/tmdb/catalog';
import { parseProvidersCookie, PROVIDERS_COOKIE } from '@/lib/preferences';
import { getMood } from '@/lib/moods';
import { ExploreFilters } from '@/components/ExploreFilters';
import { ExploreGrid } from '@/components/ExploreGrid';

export const metadata = { title: 'Explorar' };

export default async function ExplorePage({ searchParams }) {
  const filters = { ...parseExploreParams(await searchParams), pagina: 1 };
  const cookieStore = await cookies();
  const myProviders = parseProvidersCookie(cookieStore.get(PROVIDERS_COOKIE)?.value);
  const [first, genres] = await Promise.all([discoverPage(filters, { myProviders }), getGenreLists()]);
  const mood = filters.humor ? getMood(filters.humor) : null;

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-black sm:text-3xl">{mood ? mood.label : 'Explorar'}</h1>
      <ExploreFilters filters={filters} genres={genres[filters.tipo]} />
      <ExploreGrid key={exploreResultsKey(filters, myProviders)} filters={filters} initial={first} />
    </div>
  );
}
