'use client';

import { useEffect, useState } from 'react';
import { Check, Eye } from 'lucide-react';
import { FavoriteButton } from '@/components/lists/FavoriteButton';
import { useLists } from '@/components/lists/ListsProvider';
import { useMarkAction } from '@/components/lists/useMarkAction';
import { nextStatus } from '@/lib/lists/rules';
import { nextEpisodeAction, seasonEpisodesAction } from '@/lib/actions/listas';

const btn = 'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2';
const select = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2';

function StatusButton({ title, mark, status, label, Icon, run }) {
  const on = mark.status === status;
  const message = `${title.title} marcado como ${label}`;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${label} ${title.title}`}
      onClick={() => run({ status: nextStatus(mark.status, status) }, { message: on ? `${title.title} sem marcação de situação` : message })}
      className={`${btn} ${on ? 'border-accent bg-accent/15 text-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span aria-hidden="true">{label}</span>
      {on ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
    </button>
  );
}

function WhereYouStopped({ title, mark, seasons, run, exclusive, pending }) {
  const { announce } = useLists();
  const [loaded, setLoaded] = useState(null); // { season, episodes }
  const [finishAsk, setFinishAsk] = useState(false);
    const season = mark.season ?? seasons[0].number;
  const episode = mark.episode ?? 1;

  useEffect(() => {
    let cancelled = false;
    seasonEpisodesAction(title.id, season)
      .then((r) => { if (!cancelled) setLoaded({ season, episodes: r.ok ? r.episodes : null }); })
      .catch(() => { if (!cancelled) setLoaded({ season, episodes: null }); });
    return () => { cancelled = true; };
  }, [title.id, season]);

  const count = seasons.find((s) => s.number === season)?.episodes ?? episode;
  const fromServer = loaded?.season === season ? loaded.episodes : null;
  const options = fromServer?.length
    ? fromServer
    : Array.from({ length: Math.max(count, episode) }, (_, i) => ({ number: i + 1, name: '' }));

  async function advance() {
    setFinishAsk(false);
    const r = await exclusive(() => nextEpisodeAction(title.id));
    if (!r?.ok) return;
    announce(`${title.title}: temporada ${r.mark.season}, episódio ${r.mark.episode}`);
    if (r.finished) setFinishAsk(true);
  }

  return (
    <div role="group" aria-label="Onde você parou" className="mt-4 rounded-xl border border-line bg-surface p-4">
      <p className="text-sm font-bold">Onde você parou</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Temporada
          <select className={select} value={String(season)} aria-busy={pending} onChange={(e) => run({ season: Number(e.target.value) })}>
            {seasons.map((s) => <option key={s.number} value={s.number}>{s.number}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Episódio
          <select className={select} value={String(episode)} aria-busy={pending} onChange={(e) => run({ episode: Number(e.target.value) })}>
            {options.map((o) => <option key={o.number} value={o.number}>{o.name ? `${o.number} – ${o.name}` : String(o.number)}</option>)}
          </select>
        </label>
        <button type="button" disabled={pending} onClick={advance} className={`${btn} border-line bg-surface hover:bg-surface-2 disabled:opacity-60`}>
          +1 episódio
        </button>
      </div>
      {finishAsk ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold">Marcar como Já assisti?</p>
          <button
            type="button"
            className={`${btn} border-accent bg-accent/15`}
            onClick={() => { setFinishAsk(false); run({ status: 'assistido' }, { message: `${title.title} marcado como Já assisti` }); }}
          >
            Sim
          </button>
          <button type="button" className={`${btn} border-line bg-surface hover:bg-surface-2`} onClick={() => setFinishAsk(false)}>
            Agora não
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Actions({ title, seasons }) {
  const { mark, pending, run, exclusive, pinDialog } = useMarkAction(title);
  const showPosition = title.type === 'tv' && mark.status === 'assistindo' && seasons.length > 0;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-3">
        <FavoriteButton title={title} variant="page" />
        <StatusButton title={title} mark={mark} status="assistindo" label="Assistindo" Icon={Eye} run={run} />
        <StatusButton title={title} mark={mark} status="assistido" label="Já assisti" Icon={Check} run={run} />
      </div>
      {showPosition ? <WhereYouStopped title={title} mark={mark} seasons={seasons} run={run} exclusive={exclusive} pending={pending} /> : null}
      {pinDialog}
    </div>
  );
}

// Botões de lista da página do título. Sem perfil ativo (fora do provedor), não aparecem.
export function TitleActions({ title, seasons = [] }) {
  const { enabled } = useLists();
  return enabled ? <Actions title={title} seasons={seasons} /> : null;
}
