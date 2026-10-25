'use client';

import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PinDialog } from '@/components/kids/PinDialog';
import { markTitleAction } from '@/lib/actions/listas';
import { useLists } from '@/components/lists/ListsProvider';

export const SAVE_ERROR = 'Não foi possível salvar. Tente de novo.';
export const LIMIT_ERROR = 'Sua lista chegou ao limite de 500 títulos. Remova alguns para adicionar novos.';

// Marca o título com atualização otimista. Enquanto um envio está em andamento, só o último pedido espera na fila.
export function useMarkAction(title) {
  const router = useRouter();
  const { getMark, setLocalMark, announce, notify } = useLists();
  const mark = getMark(title.type, title.id);
  const [pending, setPending] = useState(false);
  const [pinChange, setPinChange] = useState(null);

  const busy = useRef(false);
  const latest = useRef(mark); // o que a tela mostra agora (otimista)
  const confirmed = useRef(mark); // o último estado aceito pelo servidor
  const current = useRef(mark); // a marcação que a tela tem quando nada está em andamento
  useEffect(() => {
    current.current = mark;
  }, [mark]);
  const queued = useRef(null);

  const revert = useCallback(() => {
    latest.current = confirmed.current;
    setLocalMark(title.type, title.id, confirmed.current);
  }, [setLocalMark, title.type, title.id]);

  const send = useCallback(async (change, message) => {
    busy.current = true;
    setPending(true);
    let next = { change, message };
    while (next) {
      queued.current = null;
      let result;
      try {
        result = await markTitleAction(title.type, title.id, next.change);
      } catch {
        result = { ok: false, error: 'erro' };
      }
      if (result.ok) {
        confirmed.current = result.mark;
        if (next.message) announce(next.message);
        if (queued.current) {
          next = queued.current;
          continue;
        }
        latest.current = result.mark;
        setLocalMark(title.type, title.id, result.mark);
        break;
      }
      queued.current = null;
      revert();
      if (result.error === 'pin') setPinChange({ change: next.change, message: next.message });
      else if (result.error === 'perfil') router.push('/perfis');
      else notify(result.error === 'limite' ? LIMIT_ERROR : SAVE_ERROR);
      break;
    }
    busy.current = false;
    setPending(false);
  }, [title.type, title.id, announce, notify, revert, setLocalMark, router]);

  const run = useCallback((change, { message } = {}) => {
    if (!busy.current) {
      latest.current = current.current;
      confirmed.current = current.current;
    }
    latest.current = { ...latest.current, ...change };
    setLocalMark(title.type, title.id, latest.current);
    if (busy.current) {
      queued.current = { change: { ...queued.current?.change, ...change }, message };
      return;
    }
    send(change, message);
  }, [send, setLocalMark, title.type, title.id]);

  const onPinSuccess = useCallback(() => {
    setPinChange(null);
    if (pinChange) run(pinChange.change, { message: pinChange.message });
  }, [pinChange, run]);

  // eslint-disable-next-line react-hooks/refs -- onPinSuccess só lê as refs quando o PIN é aceito, não durante a renderização
  const pinDialog = createElement(PinDialog, {
    open: Boolean(pinChange),
    title: 'Área de adultos',
    description: 'Peça para um adulto digitar o PIN dos pais.',
    purpose: 'titulo',
    titleKey: `${title.type}-${title.id}`,
    onClose: () => setPinChange(null),
    onSuccess: onPinSuccess,
  });

  return { mark, pending, run, pinDialog };
}
