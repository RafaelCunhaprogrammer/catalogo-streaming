import { cache } from 'react';
import { getViewer } from '@/lib/auth/viewer';
import { getDb } from '@/lib/db/index';
import { ensureSubscription } from './store.js';
import { accessState } from './rules.js';

// Situação de acesso de quem está vendo: null para visitante; a demonstração é sempre "ativa".
export const getAccess = cache(async () => {
  const viewer = await getViewer();
  if (!viewer.user) return null;
  if (viewer.isDemo) return { kind: 'ativa', until: null, canceled: false };
  const now = new Date();
  try {
    return accessState(await ensureSubscription(getDb(), viewer.user.id, now), now);
  } catch (error) {
    // Assinatura simulada: se o banco falhar, o site segue aberto (acesso desconhecido, sem faixa nem redirecionamento).
    console.error('Falha ao ler a assinatura', error);
    return null;
  }
});
