'use client';

import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PinDialog } from '@/components/kids/PinDialog';
import { markTitleAction } from '@/lib/actions/listas';
import { useLists } from '@/components/lists/ListsProvider';

export const SAVE_ERROR = 'Não foi possível salvar. Tente de novo.';
export const LIMIT_ERROR = 'Sua lista chegou ao limite de 500 títulos. Remova alguns para adicionar novos.';

// Marca o título com atualização otimista. A fila de envio é do título (no provedor): todos os cartazes
// do mesmo título compartilham uma só fila, e enquanto um envio está em andamento só o último pedido espera.
export function useMarkAction(title) {
  const router = useRouter();
  const { getMark, setLocalMark, announce, notify, getQueue, setBusy, isPending } = useLists();
  const mark = getMark(title.type, title.id);
  const pending = isPending(title.type, title.id);
  const [pinChange, setPinChange] = useState(null);

  const current = useRef(mark); // a marcação que a tela tem quando nada está em andamento
  useEffect(() => {
    current.current = mark;
  }, [mark]);

  const send = useCallback(async (first) => {
    const q = getQueue(title.type, title.id);
    setBusy(title.type, title.id, true);
    let next = first;
    while (next) {
      q.queued = null;
      let result;
      try {
        result = await markTitleAction(title.type, title.id, next.change);
      } catch {
        result = { ok: false, error: 'erro' };
      }
      if (result.ok) {
        q.confirmed = result.mark;
        if (next.message) announce(next.message);
        if (q.queued) {
          next = q.queued;
          continue;
        }
        q.latest = result.mark;
        setLocalMark(title.type, title.id, result.mark);
        break;
      }
      q.queued = null;
      q.latest = q.confirmed;
      setLocalMark(title.type, title.id, q.confirmed);
      if (result.error === 'pin') next.onPin?.(next);
      else if (result.error === 'perfil') router.push('/perfis');
      else notify(result.error === 'limite' ? LIMIT_ERROR : SAVE_ERROR);
      break;
    }
    setBusy(title.type, title.id, false);
  }, [title.type, title.id, announce, notify, setBusy, getQueue, setLocalMark, router]);

  const run = useCallback((change, { message } = {}) => {
    const q = getQueue(title.type, title.id);
    if (!q.busy) {
      q.latest = current.current;
      q.confirmed = current.current;
    }
    q.latest = { ...q.latest, ...change };
    setLocalMark(title.type, title.id, q.latest);
    const item = { change, message, onPin: setPinChange };
    if (q.busy) {
      q.queued = { ...item, change: { ...q.queued?.change, ...change } };
      return;
    }
    send(item);
  }, [send, getQueue, setLocalMark, title.type, title.id]);

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
