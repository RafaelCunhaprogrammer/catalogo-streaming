// Marcações do perfil para o layout (corações e situações em todas as páginas).
import { getDb } from '@/lib/db';
import { listMarkIndex, markIndex } from '@/lib/lists/store';

// Falha no banco: null, e a página abre sem as marcações em vez de quebrar.
export async function loadInitialMarks(profileId) {
  try {
    return markIndex(await listMarkIndex(getDb(), profileId));
  } catch {
    return null;
  }
}
