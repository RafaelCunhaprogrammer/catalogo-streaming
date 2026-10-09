'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]):not([data-focus-guard])';

// Foco de janelas modais (WCAG 2.4.3): foca o primeiro elemento, mantém o Tab dentro da janela,
// fecha com Esc e, ao fechar, devolve o foco a quem abriu.
// Os "guardas" são dois pontos de foco invisíveis nas bordas da janela: quando o Tab chega a um deles
// (inclusive saindo de dentro do vídeo do YouTube, onde a página não vê as teclas), o foco volta para o outro lado.
export function useDialogFocus(containerRef, active, onClose) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const focusables = () => [...(containerRef.current?.querySelectorAll(FOCUSABLE) ?? [])];

  useEffect(() => {
    if (!active) return undefined;
    const opener = document.activeElement;
    focusables()[0]?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
    // focusables lê o ref na hora; não precisa ser dependência
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, containerRef]);

  const guard = (position) => (
    <span
      data-focus-guard={position}
      tabIndex={active ? 0 : -1}
      style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', outline: 'none' }}
      onFocus={() => {
        const items = focusables();
        (position === 'start' ? items[items.length - 1] : items[0])?.focus();
      }}
    />
  );

  return { start: guard('start'), end: guard('end') };
}
