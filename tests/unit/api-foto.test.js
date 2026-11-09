// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/foto/[id]/route';

const viewer = vi.hoisted(() => ({ atual: null }));
const storage = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/auth/viewer', () => ({ getViewer: async () => viewer.atual }));
vi.mock('@/lib/photos/storage', () => ({ getPhotoStorage: () => storage }));

const chamar = (id) => GET(new Request('http://localhost/api/foto/' + id), { params: Promise.resolve({ id }) });
const conta = (profiles) => ({ user: { id: 'u1' }, profiles });

describe('GET /api/foto/[id]', () => {
  beforeEach(() => {
    storage.get.mockReset();
    viewer.atual = conta([{ id: 'p1', userId: 'u1', photoKey: 'fotos/p1/abcd1234abcd1234.webp' }, { id: 'p2', userId: 'u1', photoKey: null }]);
  });

  it('dono da conta recebe a imagem com cache privado', async () => {
    storage.get.mockResolvedValue({ body: Buffer.from([1, 2, 3]), contentType: 'image/webp' });
    const r = await chamar('p1');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/webp');
    expect(r.headers.get('cache-control')).toBe('private, max-age=3600');
    expect([...Buffer.from(await r.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(storage.get).toHaveBeenCalledWith('fotos/p1/abcd1234abcd1234.webp');
  });

  it('sem sessão: 404', async () => {
    viewer.atual = { user: null, profiles: [{ id: 'p1', userId: 'u1', photoKey: 'fotos/p1/abcd1234abcd1234.webp' }] };
    expect((await chamar('p1')).status).toBe(404);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('perfil de outra conta: 404', async () => {
    viewer.atual = conta([{ id: 'p9', userId: 'outra-conta', photoKey: 'fotos/p9/abcd1234abcd1234.webp' }]);
    expect((await chamar('p9')).status).toBe(404);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('perfil sem foto: 404', async () => {
    expect((await chamar('p2')).status).toBe(404);
  });

  it('arquivo ausente no armazenamento: 404', async () => {
    storage.get.mockResolvedValue(null);
    expect((await chamar('p1')).status).toBe(404);
  });
});
