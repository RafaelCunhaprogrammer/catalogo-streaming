'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GenrePicker } from '@/components/lists/GenrePicker';
import { dismissGenresPromptAction, saveGenresAction } from '@/lib/actions/listas';

// Convite no Início (perfil ativo): escolher gêneros ou dispensar. Some na hora e atualiza a página.
export function GenresInvite({ kids = false }) {
  const router = useRouter();
  const [value, setValue] = useState([]);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function finish(action) {
    setHidden(true);
    Promise.resolve(action()).catch(() => {}).finally(() => router.refresh());
  }

  return (
    <section aria-labelledby="convite-generos" className="mx-4 mt-10 rounded-2xl border border-line bg-surface p-5 sm:mx-8">
      <h2 id="convite-generos" className="text-lg font-bold sm:text-xl">Do que você gosta?</h2>
      <p className="mt-1 text-sm text-muted">Escolha os gêneros e a gente indica títulos para você.</p>
      <div className="mt-4"><GenrePicker kids={kids} value={value} onChange={setValue} /></div>
      <div className="mt-4 flex items-center gap-4">
        <button type="button" onClick={() => finish(() => saveGenresAction(value))} className="neon-gradient rounded-full px-6 py-2 font-bold text-white shadow-glow">Salvar</button>
        <button type="button" onClick={() => finish(() => dismissGenresPromptAction())} className="underline">Agora não</button>
      </div>
    </section>
  );
}
