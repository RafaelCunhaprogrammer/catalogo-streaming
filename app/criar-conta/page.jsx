import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { getViewerOrVisitor } from '@/lib/auth/viewer';

export const metadata = { title: 'Criar conta' };

export default async function SignUpPage() {
  if ((await getViewerOrVisitor()).user) redirect('/');
  return (
    <AuthShell title="Criar conta" subtitle="Uma conta para a família toda, com até 5 perfis.">
      <SignUpForm />
    </AuthShell>
  );
}
