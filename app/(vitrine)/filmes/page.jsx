import { requireAccess } from '@/lib/auth/guards';
import { HomeView } from '@/components/HomeView';

export const metadata = { title: 'Filmes' };

export default async function MoviesPage() {
  const viewer = await requireAccess('/filmes');
  return <HomeView heading="Filmes" type="movie" viewer={viewer} />;
}
