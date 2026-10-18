'use client';

import { useEffect, useRef, useState } from 'react';

// Caixa "Todos": marca ou desmarca de uma vez as caixas `name` do mesmo formulário,
// e acompanha quando a pessoa marca uma a uma (fica marcada só com todas marcadas).
export function SelectAll({ name, label = 'Todos', ariaLabel }) {
  const ref = useRef(null);
  const [checked, setChecked] = useState(false);
  const boxes = () => [...(ref.current?.form?.querySelectorAll(`input[type="checkbox"][name="${name}"]`) ?? [])];

  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return undefined;
    const sync = () => {
      const all = boxes();
      setChecked(all.length > 0 && all.every((b) => b.checked));
    };
    sync();
    form.addEventListener('change', sync);
    return () => form.removeEventListener('change', sync);
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps -- boxes lê o formulário na hora

  function toggle(e) {
    const next = e.target.checked;
    boxes().forEach((b) => {
      b.checked = next;
    });
    setChecked(next);
  }

  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <input ref={ref} type="checkbox" checked={checked} onChange={toggle} aria-label={ariaLabel} className="h-4 w-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}
