'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PosterCard } from '@/components/PosterCard';
import { UndoToast } from '@/components/lists/UndoToast';
import { useLists } from '@/components/lists/ListsProvider';
import { useMarkAction } from '@/components/lists/useMarkAction';
import { titleKey } from '@/lib/lists/rules';

const TABS = [
  { id: 'favoritos', label: 'Favoritos', empty: 'Você ainda não tem favoritos. Toque no ♡ em qualquer título.', qualifies: (m) => m.favorite, remove: { favorite: false }, stamp: 'favoriteAt' },
  { id: 'assistindo', label: 'Assistindo', empty: 'Nada em andamento por aqui. Marque Assistindo na página de uma série ou filme.', qualifies: (m) => m.status === 'assistindo', remove: { status: 'nenhum' }, stamp: 'statusAt' },
  { id: 'ja-assisti', label: 'Já assisti', empty: 'Você ainda não marcou nada como Já assisti.', qualifies: (m) => m.status === 'assistido', remove: { status: 'nenhum' }, stamp: 'statusAt' },
];
const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'movie', label: 'Filmes' },
  { id: 'tv', label: 'Séries' },
];
const ORDERS = [
  { id: 'recentes', label: 'Mais recentes' },
  { id: 'az', label: 'A–Z' },
];

const chip = (on) => `rounded-full border px-3 py-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 ${
  on ? 'border-accent-2 bg-surface-2 text-fg underline decoration-2 underline-offset-4' : 'border-line text-muted hover:text-fg'
}`;

// Executa uma mudança na marcação de um título pela fila compartilhada dele (uma vez, ao montar).
// Some da tela quando o envio termina, a menos que esteja pedindo o PIN.
function Actor({ title, change, message, onDone }) {
  const { run, pending, pinDialog } = useMarkAction(title);
  const done = useRef(false);
  const [started, setStarted] = useState(false);
  const askingPin = pinDialog.props.open;
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    run(change, { message });
    setStarted(true);
  }, [run, change, message]);
  useEffect(() => {
    if (started && !pending && !askingPin) onDone();
  }, [started, pending, askingPin, onDone]);
  return pinDialog;
}

function RemoveButton({ item, onRemove }) {
  return (
    <button
      type="button"
      onClick={() => onRemove(item)}
      aria-label={`Remover ${item.title} desta lista`}
      className="mt-1 w-full rounded-lg border border-line px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2"
    >
      Remover desta lista
    </button>
  );
}

export function MyListView({ items, initialTab = 'favoritos' }) {
  const router = useRouter();
  const { enabled, getMark } = useLists();
  const [tabId, setTabId] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : 'favoritos');
  const [filter, setFilter] = useState('todos');
  const [order, setOrder] = useState('recentes');
  const [removed, setRemoved] = useState(() => new Set()); // sem provedor, só esta tela sabe o que saiu
  const [acts, setActs] = useState([]);
  const [undo, setUndo] = useState(null);
  const tabRefs = useRef({});
  const panelRef = useRef(null);
  const nextKey = useRef(0);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [router]);

  // A marcação compartilhada manda: um ♥ mudado em outro lugar da página também atualiza a grade.
  const marked = useMemo(() => items.map((item) => {
    const mark = enabled ? getMark(item.type, item.id) : { favorite: item.favorite, status: item.status, season: null, episode: null };
    return { item, mark, gone: !enabled && removed.has(titleKey(item.type, item.id)) };
  }), [items, enabled, getMark, removed]);

  const inTab = (tab) => marked.filter((m) => !m.gone && tab.qualifies(m.mark));
  const tab = TABS.find((t) => t.id === tabId);
  const tabItems = inTab(tab);

  const visible = tabItems
    .filter((m) => filter === 'todos' || m.item.type === filter)
    .sort((a, b) => (order === 'az'
      ? a.item.title.localeCompare(b.item.title, 'pt-BR')
      : new Date(b.item[tab.stamp] ?? 0) - new Date(a.item[tab.stamp] ?? 0)));

  const selectTab = (id, focus = false) => {
    setTabId(id);
    router.replace(`/minha-lista?aba=${id}`, { scroll: false });
    if (focus) tabRefs.current[id]?.focus();
  };
  const onTabKey = (e, index) => {
    const last = TABS.length - 1;
    const target = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    selectTab(TABS[target].id, true);
  };

  const act = (title, change, message) => setActs((prev) => [...prev, { key: nextKey.current++, title, change, message }]);
  const dropAct = useCallback((key) => setActs((prev) => (prev.some((a) => a.key === key) ? prev.filter((a) => a.key !== key) : prev)), []);

  const onRemove = ({ item, mark }) => {
    const title = { type: item.type, id: item.id, title: item.title };
    const restore = tab.id === 'favoritos'
      ? { favorite: true }
      : { status: mark.status, season: mark.season, episode: mark.episode };
    if (!enabled) setRemoved((prev) => new Set(prev).add(titleKey(item.type, item.id)));
    act(title, tab.remove, `${item.title} removido da lista`);
    setUndo({ title, restore, key: titleKey(item.type, item.id), n: nextKey.current++ });
    panelRef.current?.focus();
  };
  const onUndo = () => {
    if (!undo) return;
    if (!enabled) {
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(undo.key);
        return next;
      });
    }
    act(undo.title, undo.restore, `${undo.title.title} de volta à lista`);
    setUndo(null);
  };

  return (
    <div data-actors={acts.length}>
      <div role="tablist" aria-label="Minha lista" className="flex flex-wrap gap-2 border-b border-line pb-2">
        {TABS.map((t, i) => {
          const on = t.id === tabId;
          return (
            <button
              key={t.id}
              ref={(el) => { tabRefs.current[t.id] = el; }}
              role="tab"
              id={`aba-${t.id}`}
              type="button"
              aria-selected={on}
              aria-controls="painel-lista"
              tabIndex={on ? 0 : -1}
              onClick={() => selectTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`rounded-lg px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 ${
                on ? 'bg-surface-2 text-fg underline decoration-accent-2 decoration-2 underline-offset-8' : 'text-muted hover:text-fg'
              }`}
            >
              {`${t.label} (${inTab(t).length})`}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar por tipo" className="flex gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)}>{f.label}</button>
          ))}
        </div>
        <div role="group" aria-label="Ordenar" className="flex gap-2">
          {ORDERS.map((o) => (
            <button key={o.id} type="button" aria-pressed={order === o.id} onClick={() => setOrder(o.id)} className={chip(order === o.id)}>{o.label}</button>
          ))}
        </div>
      </div>

      <div ref={panelRef} role="tabpanel" id="painel-lista" aria-labelledby={`aba-${tabId}`} tabIndex={-1} className="mt-6 focus-visible:outline-none">
        {tabItems.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-center">
            <p>{tab.empty}</p>
            <Link href="/explorar" className="mt-3 inline-block font-semibold text-accent-2 underline underline-offset-4">Explorar títulos</Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-muted">Nenhum título neste filtro.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((m) => (
              <li key={titleKey(m.item.type, m.item.id)}>
                <PosterCard title={m.item} fluid />
                <RemoveButton item={m.item} onRemove={() => onRemove(m)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {acts.map((a) => <Actor key={a.key} title={a.title} change={a.change} message={a.message} onDone={() => dropAct(a.key)} />)}
      {undo ? <UndoToast key={undo.n} message="Removido" onUndo={onUndo} onClose={() => setUndo(null)} seconds={6} /> : null}
    </div>
  );
}
