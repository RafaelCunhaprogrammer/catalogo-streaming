'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCoverAction } from '@/lib/actions/conta';
import { useDialogFocus } from '@/components/useDialogFocus';
import { buttonClass, inputClass } from '@/components/auth/AuthShell';

const keyOf = (o) => `${o.type}-${o.id}`;
const box = 'flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-checked:border-2 has-checked:border-[var(--cover-accent,var(--accent-2))] has-checked:bg-surface-2 has-disabled:cursor-not-allowed has-disabled:opacity-70';

// Painel "Capa do perfil": um favorito com imagem ou a página padrão.
export function CoverEditor({ onClose, cover, options }) {
  const router = useRouter();
  const titleId = useId();
  const ref = useRef(null);
  const { start, end } = useDialogFocus(ref, true, onClose);
  const current = cover && options.some((o) => keyOf(o) === keyOf(cover)) ? keyOf(cover) : null;
  const [mode, setMode] = useState(current || (cover && options.length) ? 'favorito' : 'padrao');
  const [choice, setChoice] = useState(current ?? (options[0] ? keyOf(options[0]) : ''));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    const option = options.find((o) => keyOf(o) === choice);
    const target = mode === 'favorito' && option ? { type: option.type, id: option.id } : null;
    setPending(true);
    setError(null);
    const result = await saveCoverAction(target).catch(() => ({ ok: false, error: 'salvar' }));
    setPending(false);
    if (result.ok) {
      onClose();
      router.refresh();
    } else if (result.error === 'perfil') {
      router.push('/perfis');
    } else {
      setError('Não foi possível salvar. Tente de novo.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      {start}
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md space-y-5 rounded-2xl border border-line bg-surface p-6 text-fg">
        <h2 id={titleId} className="text-2xl font-extrabold">Capa do perfil</h2>
        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm text-muted">O que aparece no alto da Minha lista</legend>
          <label className={`${box} border-line`}>
            <input type="radio" name="capa" value="favorito" checked={mode === 'favorito'} disabled={!options.length} onChange={() => setMode('favorito')} aria-labelledby={`${titleId}-fav`} aria-describedby={`${titleId}-fav-d`} className="mt-1 h-5 w-5 accent-[var(--accent)]" />
            <span>
              <span id={`${titleId}-fav`} className="block font-bold">Filme ou série favorito</span>
              <span id={`${titleId}-fav-d`} className="block text-sm text-muted">
                {options.length ? 'A imagem oficial do TMDB, escolhida entre os seus favoritos.' : 'Favorite um filme ou série para usá-lo como capa.'}
              </span>
            </span>
          </label>
          <label className={`${box} border-line`}>
            <input type="radio" name="capa" value="padrao" checked={mode === 'padrao'} onChange={() => setMode('padrao')} aria-labelledby={`${titleId}-pad`} aria-describedby={`${titleId}-pad-d`} className="mt-1 h-5 w-5 accent-[var(--accent)]" />
            <span>
              <span id={`${titleId}-pad`} className="block font-bold">Usar página padrão</span>
              <span id={`${titleId}-pad-d`} className="block text-sm text-muted">Sem imagem, nas cores do Pai d&apos;Égua.</span>
            </span>
          </label>
        </fieldset>
        {mode === 'favorito' && options.length > 0 && (
          <label className="block text-sm font-semibold">
            Favorito da capa
            <select value={choice} onChange={(e) => setChoice(e.target.value)} className={inputClass}>
              {options.map((o) => <option key={keyOf(o)} value={keyOf(o)}>{o.title}</option>)}
            </select>
          </label>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-accent-2">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={save} disabled={pending} className={buttonClass}>Salvar</button>
          <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2 font-semibold hover:bg-surface-2">Cancelar</button>
        </div>
      </div>
      {end}
    </div>
  );
}
