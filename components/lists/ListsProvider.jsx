'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_MARK, titleKey } from '@/lib/lists/rules';

const OFF = { enabled: false, getMark: () => EMPTY_MARK, setLocalMark: () => {}, announce: () => {}, notify: () => {} };
const ListsContext = createContext(OFF);

export const useLists = () => useContext(ListsContext);

// Guarda as marcações do perfil ativo para os botões da página darem resposta na hora.
export function ListsProvider({ initialMarks = {}, children }) {
  const [marks, setMarks] = useState(initialMarks);
  const [announcement, setAnnouncement] = useState('');
  const [toast, setToast] = useState('');
  const timer = useRef(null);

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

  const value = useMemo(() => ({ enabled: true, getMark, setLocalMark, announce, notify }), [getMark, setLocalMark, announce, notify]);

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
