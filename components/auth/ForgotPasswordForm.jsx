'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { Field, buttonClass } from '@/components/auth/AuthShell';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | enviado | erro

  async function submit(e) {
    e.preventDefault();
    try {
      const { error } = await authClient.requestPasswordReset({ email, redirectTo: '/redefinir-senha' });
      setState(error && error.status >= 500 ? 'erro' : 'enviado');
    } catch {
      setState('erro');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="esqueci-email" label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      {state === 'enviado' && <p role="status" className="text-sm font-semibold">Se houver uma conta com este e-mail, enviamos um link.</p>}
      {state === 'erro' && <p role="alert" className="text-sm font-semibold text-accent-2">Não foi possível enviar o e-mail agora. Tente de novo.</p>}
      <button type="submit" className={buttonClass}>Enviar link</button>
    </form>
  );
}
