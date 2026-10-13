import { cookies } from 'next/headers';
import { getHomeData } from '@/lib/tmdb/catalog';
import { parseProvidersCookie, PROVIDERS_COOKIE } from '@/lib/preferences';
import { Hero } from '@/components/Hero';
import { MoodPicker } from '@/components/MoodPicker';
import { Row } from '@/components/Row';
import { LoadError } from '@/components/LoadError';

// Montagem comum do Início, da página Filmes (type 'movie') e da página Séries (type 'tv').
export async function HomeView({ heading, type, showMoods = true }) {
  const cookieStore = await cookies();
  const myProviders = parseProvidersCookie(cookieStore.get(PROVIDERS_COOKIE)?.value);
  const { hero, rows } = await getHomeData(myProviders, type);

  return (
    <>
      <h1 className="sr-only">{heading}</h1>
      <Hero items={hero} />
      {showMoods && <MoodPicker />}
      {rows.map((row) => (
        <Row key={row.key} title={row.title} href={row.href} items={row.items} />
      ))}
      {rows.length === 0 && <LoadError message="Não foi possível carregar os títulos agora." />}
    </>
  );
}
