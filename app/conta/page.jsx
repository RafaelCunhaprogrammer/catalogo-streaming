import { requireUser } from '@/lib/auth/guards';
import { adultAreaAllowed } from '@/lib/account-rules';
import { getDb } from '@/lib/db';
import { hasPin } from '@/lib/pin';
import { AccountSettings } from '@/components/account/AccountSettings';
import { getAccess } from '@/lib/subscription/access';
import { getSubscription, listPayments } from '@/lib/subscription/store';
import { SubscriptionPanel } from '@/components/subscription/SubscriptionPanel';
import { PinGate } from '@/components/kids/PinGate';

export const metadata = { title: 'Minha conta' };

export default async function AccountPage() {
  const viewer = await requireUser('/conta');
  if (!adultAreaAllowed(viewer)) {
    return <PinGate title="Área de adultos" description="Para abrir Minha conta, peça para um adulto digitar o PIN." purpose="adulto" />;
  }
  const db = getDb();
  const access = (await getAccess()) ?? { kind: 'sem-acesso', until: null, canceled: false };
  const [sub, payments] = viewer.isDemo ? [null, []] : await Promise.all([getSubscription(db, viewer.user.id), listPayments(db, viewer.user.id)]);
  const subscription = <SubscriptionPanel access={access} plan={sub?.plan ?? null} payments={payments} isDemo={viewer.isDemo} />;
  return <AccountSettings email={viewer.user.email} isDemo={viewer.isDemo} hasPin={await hasPin(db, viewer.user.id)} subscription={subscription} />;
}
