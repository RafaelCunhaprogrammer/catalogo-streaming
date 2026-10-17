'use client';

import { useActionState } from 'react';
import { changePasswordAction, deleteAccountAction } from '@/lib/actions/conta';
import { PinSetupForm } from '@/components/profiles/PinSetupForm';
import { Field, buttonClass } from '@/components/auth/AuthShell';

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Result({ state, success }) {
  if (!state) return null;
  return state.ok
    ? <p role="status" className="text-sm font-semibold">{success}</p>
    : <p role="alert" className="text-sm font-semibold text-accent-2">{state.error}</p>;
}

export function AccountSettings({ email, isDemo, hasPin }) {
  const [pwState, pwAction, pwPending] = useActionState(changePasswordAction, null);
  const [delState, delAction, delPending] = useActionState(deleteAccountAction, null);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-black">Minha conta</h1>
      <p className="text-muted">Conta: <span className="font-semibold text-fg">{email}</span></p>
      {isDemo ? (
        <p className="rounded-xl border border-line p-4 text-sm">Indisponível na conta de demonstração.</p>
      ) : (
        <>
          <Section title="Trocar senha">
            <form action={pwAction} aria-label="Trocar senha" className="space-y-4">
              <Field id="conta-atual" name="current" label="Senha atual" type="password" required autoComplete="current-password" />
              <Field id="conta-nova" name="next" label="Nova senha" type="password" required minLength={8} autoComplete="new-password" />
              <Field id="conta-confirma" name="confirm" label="Confirme a nova senha" type="password" required autoComplete="new-password" />
              <Result state={pwState} success="Senha alterada. As outras sessões foram encerradas." />
              <button type="submit" disabled={pwPending} className={buttonClass}>Salvar nova senha</button>
            </form>
          </Section>
          <Section title="PIN dos pais">
            <PinSetupForm needsPassword={hasPin} />
          </Section>
          <Section title="Excluir conta">
            <form action={delAction} aria-label="Excluir conta" className="space-y-4">
              <p className="text-sm text-muted">Apaga a conta, todos os perfis e o PIN. Não dá para desfazer.</p>
              <Field id="excluir-senha" name="password" label="Senha para confirmar a exclusão" type="password" required autoComplete="current-password" />
              <Field id="excluir-confirma" name="confirm" label='Digite "EXCLUIR" para confirmar' required />
              <Result state={delState} success="" />
              <button type="submit" disabled={delPending} className="w-full rounded-full bg-red-600 px-6 py-3 font-bold text-white disabled:opacity-50">
                Excluir minha conta
              </button>
            </form>
          </Section>
        </>
      )}
    </div>
  );
}
