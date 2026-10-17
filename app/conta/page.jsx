import { requireUser } from '@/lib/auth/guards';
import { adultAreaAllowed } from '@/lib/account-rules';
import { getDb } from '@/lib/db';
import { hasPin } from '@/lib/pin';
import { AccountSettings } from '@/components/account/AccountSettings';
import { PinGate } from '@/components/kids/PinGate';

export const metadata = { title: 'Minha conta' };

export default async function AccountPage() {
  const viewer = await requireUser('/conta');
  if (!adultAreaAllowed(viewer)) {
    return <PinGate title="Área de adultos" description="Para abrir Minha conta, peça para um adulto digitar o PIN." purpose="adulto" />;
  }
  return <AccountSettings email={viewer.user.email} isDemo={viewer.isDemo} hasPin={await hasPin(getDb(), viewer.user.id)} />;
}
