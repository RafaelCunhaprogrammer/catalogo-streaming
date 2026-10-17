'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { chooseProfileAction } from '@/lib/actions/conta';
import { playOpeningSound } from '@/lib/opening-sound';
import { parsePrefs, resolveTheme, shouldPlayOpeningSound } from '@/lib/preferences';

const systemDark = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true);

export function ProfilePicker({ profiles, voltar = '/' }) {
  const [error, setError] = useState('');

  async function choose(profile) {
    // O clique é o momento em que o navegador deixa tocar som: aqui entra o som de abertura.
    const prefs = parsePrefs(profile.prefs);
    if (shouldPlayOpeningSound(prefs, resolveTheme(prefs, systemDark()))) playOpeningSound();
    const result = await chooseProfileAction(profile.id, voltar);
    if (result && !result.ok) setError(result.error === 'pin' ? 'Peça para um adulto digitar o PIN.' : result.error);
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12">
      <h1 className="text-3xl font-black sm:text-5xl">Quem está assistindo?</h1>
      <ul className="mt-10 flex flex-wrap justify-center gap-6 sm:gap-10">
        {profiles.map((profile) => (
          <li key={profile.id}>
            {/* O nome acessível é só o nome; o selo Kids vai como descrição. */}
            <button
              onClick={() => choose(profile)}
              aria-describedby={profile.kind === 'kids' ? `kids-${profile.id}` : undefined}
              className="group flex flex-col items-center gap-3 rounded-2xl p-2 focus-visible:outline-3"
            >
              <span className="transition group-hover:scale-105 group-hover:drop-shadow-[0_0_14px_rgba(236,72,153,.6)] calm:group-hover:scale-100">
                <ProfileAvatar profile={profile} />
              </span>
              <span className="text-lg font-semibold text-muted group-hover:text-fg">{profile.name}</span>
            </button>
            {profile.kind === 'kids' && <span id={`kids-${profile.id}`} className="sr-only">Perfil infantil</span>}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-6 font-semibold text-accent-2">{error}</p>}
      <Link href="/perfis/gerenciar" className="mt-12 rounded-full border border-line px-6 py-2 font-semibold text-muted hover:text-fg">
        Gerenciar perfis
      </Link>
    </div>
  );
}
