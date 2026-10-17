import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = { title: 'Redefinir senha' };

export default async function ResetPasswordPage({ searchParams }) {
  const { token, error } = await searchParams;
  return (
    <AuthShell title="Criar uma nova senha">
      <ResetPasswordForm token={token ?? null} error={error ?? null} />
    </AuthShell>
  );
}
