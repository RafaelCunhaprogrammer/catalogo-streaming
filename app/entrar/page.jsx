import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignInForm } from '@/components/auth/SignInForm';
import { getViewerOrVisitor } from '@/lib/auth/viewer';
import { safeReturnPath } from '@/lib/account-rules';

export const metadata = { title: 'Entrar' };

export default async function SignInPage({ searchParams }) {
  const { voltar } = await searchParams;
  const back = safeReturnPath(Array.isArray(voltar) ? voltar[0] : voltar);
  if ((await getViewerOrVisitor()).user) redirect(back);
  const subtitle = voltar ? 'Entre ou crie sua conta para continuar.' : 'Que bom ter você de volta.';
  return (
    <AuthShell title="Entrar" subtitle={subtitle}>
      <SignInForm voltar={back} />
    </AuthShell>
  );
}
