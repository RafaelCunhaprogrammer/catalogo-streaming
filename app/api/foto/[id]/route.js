import { getViewer } from '@/lib/auth/viewer';
import { getPhotoStorage } from '@/lib/photos/storage';

const naoEncontrada = () => new Response(null, { status: 404 });

// Foto privada do perfil: só a conta dona vê. Tudo o mais é 404 (não revela se existe).
export async function GET(_request, ctx) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer.user) return naoEncontrada();
  const perfil = (viewer.profiles ?? []).find((p) => p.id === id && p.userId === viewer.user.id);
  if (!perfil?.photoKey) return naoEncontrada();
  let arquivo;
  try {
    arquivo = await getPhotoStorage().get(perfil.photoKey);
  } catch (e) {
    console.error('Foto não lida:', e);
    return naoEncontrada();
  }
  if (!arquivo) return naoEncontrada();
  return new Response(arquivo.body, {
    headers: { 'Content-Type': arquivo.contentType, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
  });
}
