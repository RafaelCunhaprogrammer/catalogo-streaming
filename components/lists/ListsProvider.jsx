'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_MARK, titleKey } from '@/lib/lists/rules';

const NO_MARKS = {};
const OFF = { enabled: false, getQueue: () => ({}), setBusy: () => {}, isPending: () => false, getMark: () => EMPTY_MARK, setLocalMark: () => {}, announce: () => {}, notify: () => {} };
const ListsContext = createContext(OFF);

export const useLists = () => useContext(ListsContext);

// Guarda as marcações do perfil ativo para os botões da página darem resposta na hora.
export function ListsProvider({ initialMarks = NO_MARKS, children }) {
  const [marks, setMarks] = useState(initialMarks);
  const [announcement, setAnnouncement] = useState('');
  const [toast, setToast] = useState('');
  const timer = useRef(null);
  const queues = useRef(new Map()); // fila de envio compartilhada por título
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  const seen = useRef(initialMarks);

  // Quando o servidor manda marcações novas (ex.: após revalidar), os títulos sem envio em andamento adotam os valores novos.
  useEffect(() => {
    if (seen.current === initialMarks) return;
    seen.current = initialMarks;
    setMarks((prev) => {
      const next = { ...initialMarks };
      for (const [key, q] of queues.current) if (q.busy && key in prev) next[key] = prev[key];
      return next;
    });
  }, [initialMarks]);

  const getQueue = useCallback((type, id) => {
    const key = titleKey(type, id);
    if (!queues.current.has(key)) queues.current.set(key, { busy: false, queued: null, confirmed: null, latest: null });
    return queues.current.get(key);
  }, []);
  const setBusy = useCallback((type, id, busy) => {
    getQueue(type, id).busy = busy;
    const key = titleKey(type, id);
    setPendingKeys((prev) => {
      if (prev.has(key) === busy) return prev;
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  }, [getQueue]);
  const isPending = useCallback((type, id) => pendingKeys.has(titleKey(type, id)), [pendingKeys]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const getMark = useCallback((type, id) => marks[titleKey(type, id)] ?? EMPTY_MARK, [marks]);
  const setLocalMark = useCallback((type, id, mark) => setMarks((prev) => ({ ...prev, [titleKey(type, id)]: mark })), []);
  const announce = useCallback((text) => {
    // Alterna um espaço invisível para repetir o mesmo aviso mesmo sendo igual ao anterior.
    setAnnouncement((prev) => (prev === text ? `${text}\u00a0` : text));
  }, []);
  const notify = useCallback((text) => {
    setToast(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 6000);
  }, []);

  const value = useMemo(
    () => ({ enabled: true, getMark, setLocalMark, announce, notify, getQueue, setBusy, isPending }),
    [getMark, setLocalMark, announce, notify, getQueue, setBusy, isPending],
  );

  return (
    <ListsContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="sr-only">{announcement}</div>
      {toast ? (
        <div role="alert" className="fixed bottom-4 left-1/2 z-[90] max-w-[90vw] -translate-x-1/2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-fg shadow-glow">
          {toast}
        </div>
      ) : null}
    </ListsContext.Provider>
  );
}
