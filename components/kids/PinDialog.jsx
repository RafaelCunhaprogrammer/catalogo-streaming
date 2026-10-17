'use client';

import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, X } from 'lucide-react';
import { useDialogFocus } from '@/components/useDialogFocus';
import { verifyPinAction } from '@/lib/actions/conta';

// Janela "Peça para um adulto digitar o PIN". O servidor confere o PIN e conta as tentativas.
export function PinDialog({ open, title, description = 'Peça para um adulto digitar o PIN dos pais.', purpose, titleKey, onClose, onSuccess }) {
  const ref = useRef(null);
  const id = useId();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const guards = useDialogFocus(ref, open, onClose);
  if (!open || typeof document === 'undefined') return null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const result = await verifyPinAction({ pin, purpose, titleKey });
    setBusy(false);
    if (result.ok) {
      setPin('');
      setMessage('');
      onSuccess();
    } else {
      setPin('');
      setMessage(result.message);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-desc`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-fg shadow-glow"
      >
        {guards.start}
        <div className="flex items-start justify-between gap-4">
          <h2 id={`${id}-titulo`} className="flex items-center gap-2 text-xl font-black">
            <Lock aria-hidden="true" className="h-5 w-5" /> {title}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-1 hover:bg-surface-2">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p id={`${id}-desc`} className="mt-2 text-sm text-muted">{description}</p>
        <form onSubmit={submit} className="mt-5">
          <label htmlFor={`${id}-pin`} className="block text-sm font-semibold">PIN dos pais</label>
          <input
            id={`${id}-pin`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            aria-describedby={message ? `${id}-erro` : undefined}
            className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-center text-2xl tracking-[0.6em]"
          />
          {message && <p id={`${id}-erro`} role="alert" className="mt-2 text-sm font-semibold text-accent-2">{message}</p>}
          <button
            type="submit"
            disabled={busy || pin.length !== 4}
            className="neon-gradient mt-5 w-full rounded-full px-6 py-3 font-bold text-white shadow-glow disabled:opacity-50"
          >
            Confirmar
          </button>
        </form>
        {guards.end}
      </div>
    </div>,
    document.body,
  );
}
