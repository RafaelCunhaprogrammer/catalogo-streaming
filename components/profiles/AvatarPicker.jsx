'use client';

import { avatarGroupsFor } from '@/lib/avatars';
import { AvatarArt } from '@/components/profiles/avatars';

const tile = 'flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-2xl font-black text-white';
const option = 'relative flex shrink-0 snap-start cursor-pointer flex-col items-center gap-1 rounded-2xl p-1 text-xs font-semibold ring-offset-2 ring-offset-[var(--bg)] has-checked:ring-4 has-checked:ring-[var(--accent-2)] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--accent-text)]';

function Option({ value, label, checked, onChange, name, children }) {
  return (
    <label className={option}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      {children}
      <span>{label}</span>
      {checked && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-2)] text-sm font-black text-white">✓</span>
      )}
    </label>
  );
}

// Escolha do avatar (Etapa D): três grupos em fileiras (frutas, bichos e lendas) e "Só a inicial".
// A prévia usa a cor marcada no formulário.
export function AvatarPicker({ kind, color, value, onChange, initial = 'A', name = 'avatar' }) {
  const groups = avatarGroupsFor(kind);
  return (
    <fieldset>
      <legend className="text-sm font-semibold">Avatar</legend>
      <div className="mt-2 space-y-3">
        {groups.map((group) => (
          <fieldset key={group.set}>
            <legend className="text-xs font-semibold text-muted">{group.label}</legend>
            {/* Uma fileira por grupo, que rola de lado (como as fileiras do Início). */}
            <div data-avatar-row={group.set} className="-mx-1 mt-2 flex flex-nowrap gap-3 overflow-x-auto px-1 pb-2 pt-2 snap-x">

              {group.avatars.map((a) => (
                <Option key={a.slug} name={name} value={a.slug} label={a.label} checked={value === a.slug} onChange={onChange}>
                  <span aria-hidden="true" className={tile} style={{ background: color }}>
                    <AvatarArt slug={a.slug} />
                  </span>
                </Option>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="flex">
          <Option name={name} value="" label="Só a inicial" checked={!value} onChange={onChange}>
            <span aria-hidden="true" className={tile} style={{ background: color }}>{initial}</span>
          </Option>
        </div>
      </div>
    </fieldset>
  );
}
