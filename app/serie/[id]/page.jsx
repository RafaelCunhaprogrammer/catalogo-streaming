import { TitlePage, titleMetadata } from '@/components/TitlePage';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return titleMetadata('tv', id);
}

export default async function SeriesPage({ params }) {
  const { id } = await params;
  return <TitlePage type="tv" id={id} />;
}
