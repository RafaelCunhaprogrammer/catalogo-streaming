import { redirect } from 'next/navigation';
import { HomeView } from '@/components/HomeView';
import { getViewerOrVisitor } from '@/lib/auth/viewer';

export default async function HomePage() {
  const viewer = await getViewerOrVisitor();
  // Logado sem perfil escolhido nesta visita: primeiro "Quem está assistindo?" (ou entra direto, se só houver um).
  if (viewer.user && viewer.needsProfile) redirect('/perfil-unico');
  return <HomeView heading="Início" viewer={viewer} />;
}
