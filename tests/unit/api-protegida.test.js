// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

const viewer = vi.fn();
vi.mock('@/lib/auth/viewer', () => ({ getViewer: () => viewer() }));

const { GET: explorar } = await import('@/app/api/explorar/route');
const { GET: buscar } = await import('@/app/api/buscar/route');

describe('rotas internas exigem perfil', () => {
  it('visitante recebe 401 com mensagem', async () => {
    viewer.mockResolvedValue({ user: null, profile: null });
    for (const [GET, url] of [[explorar, 'http://localhost/api/explorar'], [buscar, 'http://localhost/api/buscar?q=matrix']]) {
      const res = await GET(new NextRequest(url));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Entre na sua conta para continuar.' });
    }
  });

  it('logado sem perfil escolhido também recebe 401', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' }, profile: null, needsProfile: true });
    expect((await explorar(new NextRequest('http://localhost/api/explorar'))).status).toBe(401);
  });
});
