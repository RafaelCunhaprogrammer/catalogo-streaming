'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { ProfileForm } from '@/components/profiles/ProfileForm';
import { PinSetupForm } from '@/components/profiles/PinSetupForm';
import { GenrePicker } from '@/components/lists/GenrePicker';
import { deleteProfileAction, dismissProfileGenresAction, saveProfileGenresAction } from '@/lib/actions/conta';
import { MAX_PROFILES } from '@/lib/profiles';

// editId/voltar: vindo do "Editar perfil" do menu, já abre aquele perfil e, ao salvar, volta para `voltar`.
export function ProfileManager({ profiles, hasPin, editId, voltar }) {
  const router = useRouter();
  const direct = profiles.some((profile) => profile.id === editId) ? editId : null;
  const [editing, setEditing] = useState(direct); // 'novo' | id do perfil
  const [confirming, setConfirming] = useState(null);
  const [needsPin, setNeedsPin] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // { id, kids }: perfil recém-criado, esperando a escolha de gêneros
  const [picked, setPicked] = useState([]);
  const done = useCallback((state) => {
    if (state?.profileId) {
      // Criou um perfil: fecha o formulário e pergunta do que a pessoa gosta (sobre o perfil novo, não o ativo).
      setCreated({ id: state.profileId, kids: Boolean(state.kids) });
      setPicked([]);
      setEditing(null);
      router.refresh();
      return;
    }
    if (direct && editing === direct && voltar) {
      router.push(voltar);
      router.refresh();
      return;
    }
    setEditing(null);
    router.refresh();
  }, [router, direct, editing, voltar]);
  const askPin = useCallback(() => setNeedsPin(true), []);
  const onlyOne = profiles.length <= 1;

  async function finishGenres(action) {
    const result = await action();
    if (result?.ok === false) setError(result.error);
    setCreated(null);
    router.refresh();
  }

  async function remove(profile) {
    const result = await deleteProfileAction(profile.id);
    setConfirming(null);
    if (result.ok) router.refresh();
    else setError(result.error);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Gerenciar perfis</h1>
        <Link href={direct && voltar ? voltar : '/perfis'} className="font-semibold text-accent-text hover:underline">Pronto</Link>
      </div>
      {error && <p role="alert" className="mt-4 font-semibold text-accent-2">{error}</p>}
      <ul className="mt-8 space-y-4">
        {profiles.map((profile) => (
          <li key={profile.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-4">
              <ProfileAvatar profile={profile} size="sm" />
              <span className="flex-1 font-semibold">
                {profile.name}
                {profile.kind === 'kids' && <span className="ml-2 text-sm text-muted">Kids · até {profile.maxRating === 'L' ? 'Livre' : `${profile.maxRating} anos`}</span>}
              </span>
              <button onClick={() => setEditing(profile.id)} className="rounded-full border border-line px-4 py-1.5 text-sm">Editar</button>
              <button
                onClick={() => setConfirming(profile.id)}
                disabled={onlyOne}
                aria-label={`Excluir ${profile.name}`}
                className="rounded-full border border-line px-4 py-1.5 text-sm disabled:opacity-40"
              >
                Excluir
              </button>
            </div>
            {confirming === profile.id && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span>Excluir {profile.name}? Não dá para desfazer.</span>
                <button onClick={() => remove(profile)} className="rounded-full bg-red-600 px-4 py-1.5 font-bold text-white">Sim, excluir {profile.name}</button>
                <button onClick={() => setConfirming(null)} className="underline">Cancelar</button>
              </div>
            )}
            {editing === profile.id && <div className="mt-4"><ProfileForm profile={profile} onDone={done} onNeedsPin={askPin} autoFocus={profile.id === direct} /></div>}
          </li>
        ))}
      </ul>
      {onlyOne && <p className="mt-3 text-sm text-muted">A conta precisa de pelo menos um perfil.</p>}
      {created ? (
        <section aria-labelledby="gen-novo" className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <h2 id="gen-novo" className="text-lg font-bold">Do que você gosta?</h2>
          <div className="mt-4"><GenrePicker kids={created.kids} value={picked} onChange={setPicked} /></div>
          <div className="mt-4 flex items-center gap-4">
            <button type="button" onClick={() => finishGenres(() => saveProfileGenresAction(created.id, picked))} className="neon-gradient rounded-full px-6 py-2 font-bold text-white shadow-glow">Concluir</button>
            <button type="button" onClick={() => finishGenres(() => dismissProfileGenresAction(created.id))} className="underline">Pular</button>
          </div>
        </section>
      ) : profiles.length >= MAX_PROFILES ? (
        <p className="mt-6 text-sm text-muted">Limite de 5 perfis.</p>
      ) : editing === 'novo' ? (
        <div className="mt-6"><ProfileForm onDone={done} onNeedsPin={askPin} /></div>
      ) : (
        <button onClick={() => setEditing('novo')} className="neon-gradient mt-6 rounded-full px-6 py-3 font-bold text-white shadow-glow">
          Adicionar perfil
        </button>
      )}
      {needsPin && !hasPin && (
        <div className="mt-6"><PinSetupForm onDone={() => { setNeedsPin(false); router.refresh(); }} /></div>
      )}
    </div>
  );
}
