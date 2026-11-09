'use client';

import { useState } from 'react';
import { avatarGroupsFor, PHOTO_AVATAR } from '@/lib/avatars';
import { PhotoCropper } from '@/components/profiles/PhotoCropper';
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

// Escolha do avatar (Etapa D): um grupo por fileira (frutas, bichos, lendas, sabores) e "Só a inicial".
// A prévia usa a cor marcada no formulário.
// min-w-0 nos fieldsets: por padrão eles não encolhem abaixo do conteúdo, e as fileiras empurrariam a página.
// Só perfis adultos têm a fileira "Sua foto": photoSrc é a foto atual (ou a recém-recortada) e onPhoto recebe o recorte novo.
// allowPhoto={false} (conta de demonstração) esconde a fileira.
export function AvatarPicker({ kind, color, value, onChange, initial = 'A', name = 'avatar', photoSrc = null, onPhoto, allowPhoto = true }) {
  const groups = avatarGroupsFor(kind);
  const [file, setFile] = useState(null);
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold">Avatar</legend>
      <div className="mt-2 space-y-3">
        {kind === 'adulto' && allowPhoto && (
          <fieldset className="min-w-0">
            <legend className="text-xs font-semibold text-muted">Sua foto</legend>
            <div data-avatar-row="foto" className="-mx-1 mt-2 flex flex-nowrap items-start gap-3 overflow-x-auto px-1 pb-2 pt-2 snap-x">
              {photoSrc && (
                <Option name={name} value={PHOTO_AVATAR} label="Sua foto" checked={value === PHOTO_AVATAR} onChange={onChange}>
                  <span aria-hidden="true" className={tile} style={{ background: color }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                  </span>
                </Option>
              )}
              <label className="flex h-16 shrink-0 cursor-pointer items-center rounded-2xl border border-dashed border-line px-4 text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--accent-text)]">
                Escolher foto
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {file && (
              <PhotoCropper
                file={file}
                onCancel={() => setFile(null)}
                onDone={(blob) => {
                  setFile(null);
                  onPhoto?.(blob);
                }}
              />
            )}
          </fieldset>
        )}
        {groups.map((group) => (
          <fieldset key={group.set} className="min-w-0">
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
