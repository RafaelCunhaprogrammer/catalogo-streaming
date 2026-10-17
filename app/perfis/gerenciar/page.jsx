import { requireUser } from '@/lib/auth/guards';
import { adultAreaAllowed } from '@/lib/account-rules';
import { getDb } from '@/lib/db';
import { hasPin } from '@/lib/pin';
import { ProfileManager } from '@/components/profiles/ProfileManager';
import { PinGate } from '@/components/kids/PinGate';

export const metadata = { title: 'Gerenciar perfis' };

export default async function ManageProfilesPage() {
  const viewer = await requireUser('/perfis/gerenciar');
  if (!adultAreaAllowed(viewer)) {
    return <PinGate title="Área de adultos" description="Para gerenciar os perfis, peça para um adulto digitar o PIN." purpose="adulto" />;
  }
  return <ProfileManager profiles={viewer.profiles} hasPin={await hasPin(getDb(), viewer.user.id)} />;
}
