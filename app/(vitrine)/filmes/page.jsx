import { requireProfile } from '@/lib/auth/guards';
import { HomeView } from '@/components/HomeView';

export const metadata = { title: 'Filmes' };

export default async function MoviesPage() {
  await requireProfile('/filmes');
  return <HomeView heading="Filmes" type="movie" />;
}
