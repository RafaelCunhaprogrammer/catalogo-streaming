import { requireUser } from '@/lib/auth/guards';
import { adultAreaAllowed, safeReturnPath } from '@/lib/account-rules';
import { ProfilePicker } from '@/components/profiles/ProfilePicker';
import { PinGate } from '@/components/kids/PinGate';

export const metadata = { title: 'Quem está assistindo?' };

export default async function ProfilesPage({ searchParams }) {
  const viewer = await requireUser('/perfis');
  const { voltar } = await searchParams;
  // No Kids, trocar de perfil pede o PIN.
  if (viewer.profile && !adultAreaAllowed(viewer)) {
    return <PinGate title="Área de adultos" description="Para trocar de perfil, peça para um adulto digitar o PIN." purpose="adulto" />;
  }
  return <ProfilePicker profiles={viewer.profiles} voltar={safeReturnPath(Array.isArray(voltar) ? voltar[0] : voltar)} />;
}
