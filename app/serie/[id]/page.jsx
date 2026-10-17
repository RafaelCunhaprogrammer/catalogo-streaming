import { requireProfile } from '@/lib/auth/guards';
import { TitlePage, titleMetadata } from '@/components/TitlePage';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return titleMetadata('tv', id);
}

export default async function SeriesPage({ params }) {
  const { id } = await params;
  const viewer = await requireProfile(`/serie/${id}`);
  return <TitlePage type="tv" id={id} viewer={viewer} />;
}
