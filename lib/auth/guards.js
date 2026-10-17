import { redirect } from 'next/navigation';
import { getViewer } from './viewer';

const back = (path) => encodeURIComponent(path || '/');

export async function requireUser(returnTo) {
  const viewer = await getViewer();
  if (!viewer.user) redirect(`/entrar?voltar=${back(returnTo)}`);
  return viewer;
}

export async function requireProfile(returnTo) {
  const viewer = await requireUser(returnTo);
  if (viewer.needsProfile) redirect(`/perfis?voltar=${back(returnTo)}`);
  return viewer;
}
