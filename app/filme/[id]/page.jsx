import { requireProfile } from '@/lib/auth/guards';
import { TitlePage, titleMetadata } from '@/components/TitlePage';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return titleMetadata('movie', id);
}

export default async function MoviePage({ params }) {
  const { id } = await params;
  await requireProfile(`/filme/${id}`);
  return <TitlePage type="movie" id={id} />;
}
