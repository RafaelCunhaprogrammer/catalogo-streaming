import { TitlePage } from '@/components/TitlePage';

export default async function MoviePage({ params }) {
  const { id } = await params;
  return <TitlePage type="movie" id={id} />;
}
