'use client';

import { useState } from 'react';
import { useLists } from '@/components/lists/ListsProvider';
import { nextEpisodeAction } from '@/lib/actions/listas';

export const btn = 'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2';

// "+1 episódio" na fila do título; ao passar do último episódio, oferece marcar como Já assisti.
export function useAdvanceEpisode(title, exclusive) {
  const { announce } = useLists();
  const [finishAsk, setFinishAsk] = useState(false);
  async function advance() {
    setFinishAsk(false);
    const r = await exclusive(() => nextEpisodeAction(title.id));
    if (!r?.ok) return;
    announce(`${title.title}: temporada ${r.mark.season}, episódio ${r.mark.episode}`);
    if (r.finished) setFinishAsk(true);
  }
  return { advance, finishAsk, dismissAsk: () => setFinishAsk(false) };
}

export function FinishAsk({ title, run, onDone }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <p className="text-sm font-semibold">Marcar como Já assisti?</p>
      <button
        type="button"
        className={`${btn} border-accent bg-accent/15`}
        onClick={() => { onDone(); run({ status: 'assistido' }, { message: `${title.title} marcado como Já assisti` }); }}
      >
        Sim
      </button>
      <button type="button" className={`${btn} border-line bg-surface hover:bg-surface-2`} onClick={onDone}>
        Agora não
      </button>
    </div>
  );
}
