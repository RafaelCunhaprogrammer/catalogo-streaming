// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { verifySignedValue } from '@/lib/auth/signed-cookie';

const viewer = vi.fn();
vi.mock('@/lib/auth/viewer', () => ({ getViewer: () => viewer() }));
process.env.BETTER_AUTH_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!';
const { GET } = await import('@/app/perfil-unico/route');

const req = () => new NextRequest('http://localhost:3000/perfil-unico');
const profile = (id) => ({ id, name: id, prefs: { myProviders: [8] } });

describe('/perfil-unico', () => {
  it('um só perfil: ativa e vai direto ao Início', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' }, profiles: [profile('p1')] });
    const res = await GET(req());
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
    const cookie = res.cookies.get('paidegua_perfil');
    expect(verifySignedValue(cookie.value, process.env.BETTER_AUTH_SECRET)).toBe('p1');
    expect(cookie.httpOnly).toBe(true);
    expect(res.cookies.get('catalogo_streamings').value).toBe('8');
  });

  it('vários perfis: "Quem está assistindo?"', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' }, profiles: [profile('p1'), profile('p2')] });
    expect((await GET(req())).headers.get('location')).toBe('http://localhost:3000/perfis');
  });

  it('sem conta: Início', async () => {
    viewer.mockResolvedValue({ user: null, profiles: [] });
    expect((await GET(req())).headers.get('location')).toBe('http://localhost:3000/');
  });
});
