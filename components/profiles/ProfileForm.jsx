'use client';

import { useActionState, useEffect, useState } from 'react';
import { createProfileAction, updateProfileAction } from '@/lib/actions/conta';
import { PROFILE_COLORS } from '@/lib/profiles';
import { Field, buttonClass, inputClass } from '@/components/auth/AuthShell';

const RATINGS = [['L', 'Livre'], ['10', '10 anos'], ['12', '12 anos'], ['14', '14 anos']];

// Criar ou editar um perfil: nome, cor, tipo (adulto ou Kids) e, no Kids, a classificação máxima.
export function ProfileForm({ profile, onDone, onNeedsPin }) {
  const [state, action, pending] = useActionState(profile ? updateProfileAction : createProfileAction, null);
  const [kind, setKind] = useState(profile?.kind ?? 'adulto');
  useEffect(() => {
    if (state?.ok) onDone?.();
    if (state?.needsPin) onNeedsPin?.();
  }, [state, onDone, onNeedsPin]);
  const errors = state?.errors ?? {};
  return (
    <form action={action} aria-label={profile ? `Editar ${profile.name}` : 'Novo perfil'} className="space-y-4 rounded-xl border border-line p-4">
      {profile && <input type="hidden" name="id" value={profile.id} />}
      <Field id={`nome-${profile?.id ?? 'novo'}`} name="name" label="Nome" maxLength={20} required defaultValue={profile?.name ?? ''} />
      {errors.name && <p role="alert" className="text-sm text-accent-2">{errors.name}</p>}
      <fieldset>
        <legend className="text-sm font-semibold">Cor</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROFILE_COLORS.map((color, i) => (
            <label key={color} className="cursor-pointer rounded-full p-0.5 has-checked:ring-3 has-checked:ring-accent-2">
              <input type="radio" name="color" value={color} defaultChecked={(profile?.color ?? PROFILE_COLORS[0]) === color} className="sr-only" aria-label={`Cor ${i + 1}`} />
              <span aria-hidden="true" className="block h-8 w-8 rounded-full" style={{ background: color }} />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Tipo de perfil</legend>
        <div className="mt-2 flex gap-4">
          {[['adulto', 'Adulto'], ['kids', 'Kids']].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="h-5 w-5 accent-[var(--accent)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {kind === 'kids' && (
        <label htmlFor={`faixa-${profile?.id ?? 'novo'}`} className="block text-sm font-semibold">
          Classificação máxima
          <select id={`faixa-${profile?.id ?? 'novo'}`} name="maxRating" defaultValue={profile?.maxRating ?? '10'} className={inputClass}>
            {RATINGS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      )}
      {errors.form && <p role="alert" className="text-sm font-semibold text-accent-2">{errors.form}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>Salvar</button>
    </form>
  );
}
