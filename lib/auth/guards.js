import { redirect } from 'next/navigation';
import { getViewer } from './viewer';
import { getAccess } from '../subscription/access.js';

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

// Catálogo só para quem está no teste ou assina; sem acesso, vai para a página de assinatura.
export async function requireAccess(returnTo) {
  const viewer = await requireProfile(returnTo);
  const access = await getAccess();
  if (access?.kind === 'sem-acesso') redirect('/assinar?motivo=expirou');
  return viewer;
}
