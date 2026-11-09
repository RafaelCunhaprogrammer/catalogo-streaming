'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createProfileAction, updateProfileAction } from '@/lib/actions/conta';
import { PROFILE_COLORS } from '@/lib/profiles';
import { GenrePicker } from '@/components/lists/GenrePicker';
import { AvatarPicker } from '@/components/profiles/AvatarPicker';
import { defaultAvatar, PHOTO_AVATAR } from '@/lib/avatars';
import { photoUrl } from '@/lib/photos/url';
import { Field, buttonClass, inputClass } from '@/components/auth/AuthShell';

const RATINGS = [['L', 'Livre'], ['10', '10 anos'], ['12', '12 anos'], ['14', '14 anos']];

// Criar ou editar um perfil: nome, cor, tipo (adulto ou Kids) e, no Kids, a classificação máxima.
export function ProfileForm({ profile, onDone, onNeedsPin, autoFocus = false }) {
  // A foto recortada fica aqui (blob + endereço da prévia) e entra no FormData como o arquivo "photo" ao enviar.
  const [photo, setPhoto] = useState(null);
  const photoRef = useRef(null);
  useEffect(() => { photoRef.current = photo; }, [photo]);
  const submit = profile ? updateProfileAction : createProfileAction;
  const [state, action, pending] = useActionState((prev, formData) => {
    const novo = photoRef.current;
    if (novo && formData.get('avatar') === PHOTO_AVATAR) formData.set('photo', new File([novo.blob], 'foto', { type: novo.blob.type }));
    return submit(prev, formData);
  }, null);
  const [kind, setKind] = useState(profile?.kind ?? 'adulto');
  // Gêneros só são perguntados na edição; na criação vem o passo "Do que você gosta?" depois.
  const [genres, setGenres] = useState(profile?.favoriteGenres ?? []);
  const [color, setColor] = useState(profile?.color ?? PROFILE_COLORS[0]);
  // Na criação, o avatar acompanha o tipo (Açaí ou Boto) até a pessoa escolher outro.
  const [avatar, setAvatar] = useState(profile ? (profile.avatar ?? '') : defaultAvatar('adulto'));
  const [avatarChosen, setAvatarChosen] = useState(Boolean(profile));
  const changeKind = (value) => {
    setKind(value);
    // Kids não tem foto: quem escolheu a foto e muda para Kids volta ao avatar padrão.
    if (!avatarChosen || (value === 'kids' && avatar === PHOTO_AVATAR)) setAvatar(defaultAvatar(value));
  };
  const choosePhoto = (blob) => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ blob, url: URL.createObjectURL(blob) });
    chooseAvatar(PHOTO_AVATAR);
  };
  useEffect(() => () => { if (photoRef.current) URL.revokeObjectURL(photoRef.current.url); }, []);
  const chooseAvatar = (value) => {
    setAvatar(value);
    setAvatarChosen(true);
  };
  useEffect(() => {
    if (state?.ok) onDone?.(state);
    if (state?.needsPin) onNeedsPin?.();
  }, [state, onDone, onNeedsPin]);
  const errors = state?.errors ?? {};
  return (
    <form action={action} aria-label={profile ? `Editar ${profile.name}` : 'Novo perfil'} className="space-y-4 rounded-xl border border-line p-4">
      {profile && <input type="hidden" name="id" value={profile.id} />}
      <Field id={`nome-${profile?.id ?? 'novo'}`} name="name" label="Nome" maxLength={20} required defaultValue={profile?.name ?? ''} autoFocus={autoFocus} />
      {errors.name && <p role="alert" className="text-sm text-accent-2">{errors.name}</p>}
      <AvatarPicker kind={kind} color={color} value={avatar} onChange={chooseAvatar} onPhoto={choosePhoto} photoSrc={photo?.url ?? (profile?.photoKey ? photoUrl(profile) : null)} initial={profile?.name?.trim().charAt(0).toUpperCase() || 'A'} />
      {errors.avatar && <p role="alert" className="text-sm text-accent-2">{errors.avatar}</p>}
      <fieldset>
        <legend className="text-sm font-semibold">Cor</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROFILE_COLORS.map((c, i) => (
            <label key={c} className="cursor-pointer rounded-full p-0.5 has-checked:ring-3 has-checked:ring-accent-2">
              <input type="radio" name="color" value={c} defaultChecked={(profile?.color ?? PROFILE_COLORS[0]) === c} onChange={() => setColor(c)} className="sr-only" aria-label={`Cor ${i + 1}`} />
              <span aria-hidden="true" className="block h-8 w-8 rounded-full" style={{ background: c }} />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Tipo de perfil</legend>
        <div className="mt-2 flex gap-4">
          {[['adulto', 'Adulto'], ['kids', 'Kids']].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => changeKind(value)} className="h-5 w-5 accent-[var(--accent)]" />
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
      {profile && (
        <fieldset>
          <legend className="text-sm font-semibold">Gêneros favoritos</legend>
          <div className="mt-2"><GenrePicker kids={kind === 'kids'} value={genres} onChange={setGenres} name="genres" /></div>
        </fieldset>
      )}
      {errors.form && <p role="alert" className="text-sm font-semibold text-accent-2">{errors.form}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>{pending && photo && avatar === PHOTO_AVATAR ? 'Enviando foto…' : 'Salvar'}</button>
    </form>
  );
}
