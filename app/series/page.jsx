import { HomeView } from '@/components/HomeView';

export const metadata = { title: 'Séries' };

// Os humores são montados a partir de filmes, então ficam só no Início e em Filmes.
export default function SeriesPage() {
  return <HomeView heading="Séries" type="tv" showMoods={false} />;
}
