import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getHomeHero, getHomeRowDefs, getMoodCards, loadHomeRow } from '@/lib/tmdb/catalog';
import { parseProvidersCookie, PROVIDERS_COOKIE } from '@/lib/preferences';
import { Hero } from '@/components/Hero';
import { MoodPicker } from '@/components/MoodPicker';
import { Row } from '@/components/Row';
import { PosterSkeletonRow } from '@/components/PosterSkeleton';

async function HeroSection({ myProviders, type }) {
  return <Hero items={await getHomeHero(myProviders, type)} />;
}

async function MoodSection() {
  let cards;
  try {
    cards = await getMoodCards();
  } catch {
    cards = undefined; // sem imagens, os cartões usam o degradê da marca
  }
  return <MoodPicker cards={cards} />;
}

async function RowSection({ def }) {
  const row = await loadHomeRow(def);
  if (!row.items.length) return null;
  return <Row title={row.title} href={row.href} logoPath={row.logoPath} items={row.items} />;
}

function HeroSkeleton() {
  return <div aria-hidden="true" className="aspect-video max-h-[85vh] w-full animate-pulse bg-surface-2" />;
}

function RowSkeleton({ title }) {
  return (
    <section aria-hidden="true" className="mt-10">
      <p className="px-4 text-lg font-bold text-muted sm:px-8 sm:text-xl">{title}</p>
      <PosterSkeletonRow />
    </section>
  );
}

// Montagem comum do Início, da página Filmes (type 'movie') e da página Séries (type 'tv').
// Cada parte aparece assim que fica pronta: o clique responde na hora, sem esperar a página inteira.
export async function HomeView({ heading, type, showMoods = true }) {
  const cookieStore = await cookies();
  const myProviders = parseProvidersCookie(cookieStore.get(PROVIDERS_COOKIE)?.value);
  const defs = getHomeRowDefs(myProviders, type);

  return (
    <>
      <h1 className="sr-only">{heading}</h1>
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection myProviders={myProviders} type={type} />
      </Suspense>
      {showMoods && (
        <Suspense fallback={<MoodPicker />}>
          <MoodSection />
        </Suspense>
      )}
      {defs.map((def) => (
        <Suspense key={def.key} fallback={<RowSkeleton title={def.title} />}>
          <RowSection def={def} />
        </Suspense>
      ))}
    </>
  );
}
