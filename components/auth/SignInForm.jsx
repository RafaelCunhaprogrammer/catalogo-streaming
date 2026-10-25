'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { signInDemoAction } from '@/lib/actions/conta';
import { Field, buttonClass } from '@/components/auth/AuthShell';

export function SignInForm({ voltar = '/' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { error: err } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err, 'entrar'));
      return;
    }
    router.push(voltar);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4" aria-describedby={error ? 'entrar-erro' : undefined}>
        <Field id="entrar-email" label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="entrar-senha" label="Senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p id="entrar-erro" role="alert" className="text-sm font-semibold text-accent-2">{error}</p>}
        <button type="submit" disabled={busy} className={buttonClass}>Entrar</button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/esqueci-senha" className="text-accent-text hover:underline">Esqueci minha senha</Link>
        <Link href="/criar-conta" className="text-accent-text hover:underline">Criar conta</Link>
      </div>
      <form action={signInDemoAction} className="mt-8 border-t border-line pt-6 text-center">
        <button type="submit" className="w-full rounded-full border border-line px-6 py-3 font-bold hover:bg-surface-2">
          Experimentar sem cadastro
        </button>
        <p className="mt-2 text-xs text-muted">Conta de demonstração · PIN de teste: 1234</p>
      </form>
    </>
  );
}
