// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const viewer = vi.fn();
vi.mock('@/lib/auth/viewer', () => ({ getViewer: () => viewer() }));
vi.mock('next/navigation', () => ({
  redirect: (url) => { throw Object.assign(new Error('NEXT_REDIRECT'), { url }); },
}));

const { requireUser, requireProfile } = await import('@/lib/auth/guards');

beforeEach(() => viewer.mockReset());

describe('guardas das páginas', () => {
  it('visitante vai para a entrada e depois volta ao destino', async () => {
    viewer.mockResolvedValue({ user: null });
    await expect(requireProfile('/filme/1')).rejects.toMatchObject({ url: '/entrar?voltar=%2Ffilme%2F1' });
    await expect(requireUser('/conta')).rejects.toMatchObject({ url: '/entrar?voltar=%2Fconta' });
  });

  it('logado sem perfil escolhido vai para "Quem está assistindo?"', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' }, needsProfile: true });
    await expect(requireProfile('/explorar')).rejects.toMatchObject({ url: '/perfis?voltar=%2Fexplorar' });
  });

  it('com perfil, segue e devolve o viewer', async () => {
    const v = { user: { id: 'u1' }, needsProfile: false, profile: { id: 'p1' } };
    viewer.mockResolvedValue(v);
    await expect(requireProfile('/explorar')).resolves.toBe(v);
  });
});
