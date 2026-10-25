'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { createFirstProfileAction } from '@/lib/actions/conta';
import { loadPrefs } from '@/lib/preferences';
import { Field, buttonClass } from '@/components/auth/AuthShell';

export function SignUpForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('As senhas não são iguais.');
      return;
    }
    setBusy(true);
    const { error: err } = await authClient.signUp.email({ name: form.name.trim(), email: form.email, password: form.password });
    if (err) {
      setBusy(false);
      setError(authErrorMessage(err, 'criar'));
      return;
    }
    // Primeiro perfil com o nome da pessoa e o que ela já tinha escolhido no navegador.
    let prefs;
    try {
      prefs = loadPrefs(window.localStorage);
    } catch {
      prefs = undefined;
    }
    await createFirstProfileAction(prefs);
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <Field id="criar-nome" label="Nome" autoComplete="name" required maxLength={40} value={form.name} onChange={set('name')} />
        <Field id="criar-email" label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Field id="criar-senha" label="Senha" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={set('password')} />
        <Field id="criar-confirma" label="Confirme a senha" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
        <p className="text-xs text-muted">Use pelo menos 8 caracteres.</p>
        {error && <p role="alert" className="text-sm font-semibold text-accent-2">{error}{error.startsWith('Já existe') && <> <Link href="/esqueci-senha" className="underline">Esqueci minha senha</Link></>}</p>}
        <button type="submit" disabled={busy} className={buttonClass}>Criar conta</button>
      </form>
      <p className="mt-4 text-center text-sm">Já tem conta? <Link href="/entrar" className="text-accent-text underline">Entrar</Link></p>
    </>
  );
}
