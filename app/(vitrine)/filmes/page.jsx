import { HomeView } from '@/components/HomeView';

export const metadata = { title: 'Filmes' };

export default function MoviesPage() {
  return <HomeView heading="Filmes" type="movie" />;
}
