import { redirect } from 'next/navigation';
import { HomeView } from '@/components/HomeView';
import { getViewerOrVisitor } from '@/lib/auth/viewer';
import { getAccess } from '@/lib/subscription/access';

export default async function HomePage() {
  const viewer = await getViewerOrVisitor();
  // Logado sem perfil escolhido nesta visita: primeiro "Quem está assistindo?" (ou entra direto, se só houver um).
  if (viewer.user && viewer.needsProfile) redirect('/perfil-unico');
  // Conta sem acesso vê a mesma vitrine de visitante (sem linhas personalizadas do perfil).
  let shown = viewer;
  if (viewer.user) {
    try {
      if ((await getAccess())?.kind === 'sem-acesso') shown = { ...viewer, profile: null };
    } catch {}
  }
  return <HomeView heading="Início" viewer={shown} />;
}
