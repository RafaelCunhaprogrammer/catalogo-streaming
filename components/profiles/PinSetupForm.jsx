'use client';

import { useActionState, useEffect } from 'react';
import { setPinAction } from '@/lib/actions/conta';
import { Field, buttonClass } from '@/components/auth/AuthShell';

// Criar (ou trocar) o PIN dos pais. Trocar um PIN existente pede a senha da conta.
export function PinSetupForm({ needsPassword = false, onDone }) {
  const [state, action, pending] = useActionState(setPinAction, null);
  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);
  const digits = { type: 'password', inputMode: 'numeric', maxLength: 4, pattern: '\\d{4}', required: true, autoComplete: 'off' };
  return (
    <form action={action} aria-label={needsPassword ? 'Trocar o PIN dos pais' : 'Criar o PIN dos pais'} className="space-y-4 rounded-xl border border-line p-4">
      <p className="text-sm text-muted">O PIN dos pais tem 4 números. Ele libera títulos bloqueados e permite sair do perfil Kids.</p>
      <Field id="pin-novo" name="pin" label="Novo PIN" {...digits} />
      <Field id="pin-confirma" name="confirm" label="Repita o PIN" {...digits} />
      {needsPassword && <Field id="pin-senha" name="password" label="Senha da conta" type="password" required autoComplete="current-password" />}
      {state && !state.ok && <p role="alert" className="text-sm font-semibold text-accent-2">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-semibold">PIN salvo.</p>}
      <button type="submit" disabled={pending} className={buttonClass}>Salvar PIN</button>
    </form>
  );
}
