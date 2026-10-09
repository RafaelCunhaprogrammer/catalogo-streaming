import { searchAvailable } from '@/lib/tmdb/catalog';
import { PosterCard } from '@/components/PosterCard';

const MAX_PAGES = 3;

const queryOf = (q = '') => (Array.isArray(q) ? q[0] : q).trim();

export async function generateMetadata({ searchParams }) {
  const query = queryOf((await searchParams).q);
  return { title: query ? `Busca: ${query}` : 'Buscar' };
}

export default async function SearchPage({ searchParams }) {
  const query = queryOf((await searchParams).q);

  const first = await searchAvailable(query, 1);
  const extraPages = Math.min(first.totalPages, MAX_PAGES) - 1;
  const rest = await Promise.all(Array.from({ length: Math.max(0, extraPages) }, (_, i) => searchAvailable(query, i + 2)));
  const seen = new Set();
  const results = [first, ...rest].flatMap((page) => page.results).filter((t) => {
    const key = `${t.type}-${t.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-black sm:text-3xl">{query ? `Resultados para “${query}”` : 'Buscar'}</h1>
      {results.length ? (
        <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
          {results.map((t) => (
            <li key={`${t.type}-${t.id}`}>
              <PosterCard title={t} fluid />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-muted">
          {query.length < 2 ? 'Digite pelo menos 2 letras para buscar.' : 'Nenhum título disponível em streaming encontrado.'}
        </p>
      )}
    </div>
  );
}
