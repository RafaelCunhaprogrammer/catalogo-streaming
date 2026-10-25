'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { Field, buttonClass } from '@/components/auth/AuthShell';

export function ResetPasswordForm({ token, error: initialError }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(initialError || !token ? 'Este link expirou.' : '');
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não são iguais.');
      return;
    }
    const { error: err } = await authClient.resetPassword({ newPassword: password, token });
    if (err) setError(authErrorMessage({ ...err, code: err.code ?? 'INVALID_TOKEN' }, 'senha'));
    else setDone(true);
  }

  if (done) {
    return <p role="status" className="font-semibold">Senha alterada. <Link href="/entrar" className="text-accent-text underline">Entrar</Link></p>;
  }
  if (error === 'Este link expirou.') {
    return (
      <div role="alert" className="space-y-3">
        <p className="font-semibold">Este link expirou.</p>
        <Link href="/esqueci-senha" className="text-accent-text underline">Pedir outro link</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="nova-senha" label="Nova senha" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field id="nova-confirma" label="Confirme a nova senha" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p role="alert" className="text-sm font-semibold text-accent-2">{error}</p>}
      <button type="submit" className={buttonClass}>Salvar nova senha</button>
    </form>
  );
}
