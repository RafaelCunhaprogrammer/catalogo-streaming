import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata = { title: 'Esqueci minha senha' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Esqueci minha senha" subtitle="Enviamos um link para você criar uma senha nova.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
