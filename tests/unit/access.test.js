// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const viewer = vi.fn();
const ensure = vi.fn();
vi.mock('@/lib/auth/viewer', () => ({ getViewer: () => viewer() }));
vi.mock('@/lib/db/index', () => ({ getDb: () => ({}) }));
vi.mock('@/lib/subscription/store', () => ({ ensureSubscription: (...a) => ensure(...a) }));
vi.mock('next/navigation', () => ({
  redirect: (url) => { throw Object.assign(new Error('NEXT_REDIRECT'), { url }); },
}));

const { getAccess } = await import('@/lib/subscription/access');
const { requireAccess } = await import('@/lib/auth/guards');

const future = (h) => new Date(Date.now() + h * 3600 * 1000);
const past = (h) => new Date(Date.now() - h * 3600 * 1000);

beforeEach(() => { viewer.mockReset(); ensure.mockReset(); });

describe('getAccess', () => {
  it('visitante: null', async () => {
    viewer.mockResolvedValue({ user: null });
    expect(await getAccess()).toBeNull();
  });
  it('demonstração: sempre ativa, sem tocar no banco', async () => {
    viewer.mockResolvedValue({ user: { id: 'd' }, isDemo: true });
    expect((await getAccess()).kind).toBe('ativa');
    expect(ensure).not.toHaveBeenCalled();
  });
  it('conta no teste', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' } });
    ensure.mockResolvedValue({ status: 'teste', trialEndsAt: future(2), periodEnd: null });
    expect((await getAccess()).kind).toBe('teste');
  });
  it('conta ativa', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' } });
    ensure.mockResolvedValue({ status: 'ativa', trialEndsAt: past(9), periodEnd: future(100) });
    expect((await getAccess()).kind).toBe('ativa');
  });
  it('conta sem linha ganha o teste (ensureSubscription)', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' } });
    ensure.mockResolvedValue({ status: 'teste', trialEndsAt: future(6), periodEnd: null });
    await getAccess();
    expect(ensure).toHaveBeenCalledWith(expect.anything(), 'u1', expect.any(Date));
  });
  it('falha no banco: resolve null e registra o erro', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = new Error('db fora');
    viewer.mockResolvedValue({ user: { id: 'u1' } });
    ensure.mockRejectedValue(boom);
    expect(await getAccess()).toBeNull();
    expect(spy).toHaveBeenCalledWith('Falha ao ler a assinatura', boom);
    spy.mockRestore();
  });
  it('teste vencido: sem acesso', async () => {
    viewer.mockResolvedValue({ user: { id: 'u1' } });
    ensure.mockResolvedValue({ status: 'teste', trialEndsAt: past(1), periodEnd: null });
    expect((await getAccess()).kind).toBe('sem-acesso');
  });
});

describe('requireAccess', () => {
  const ok = { user: { id: 'u1' }, needsProfile: false, profile: { id: 'p1' } };
  it('em teste, segue e devolve o viewer', async () => {
    viewer.mockResolvedValue(ok);
    ensure.mockResolvedValue({ status: 'teste', trialEndsAt: future(2), periodEnd: null });
    await expect(requireAccess('/filmes')).resolves.toBe(ok);
  });
  it('sem acesso vai para /assinar?motivo=expirou', async () => {
    viewer.mockResolvedValue(ok);
    ensure.mockResolvedValue({ status: 'teste', trialEndsAt: past(1), periodEnd: null });
    await expect(requireAccess('/filmes')).rejects.toMatchObject({ url: '/assinar?motivo=expirou' });
  });
  it('falha no banco deixa passar (fail-open)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    viewer.mockResolvedValue(ok);
    ensure.mockRejectedValue(new Error('db fora'));
    await expect(requireAccess('/filmes')).resolves.toBe(ok);
    spy.mockRestore();
  });
  it('visitante vai para a entrada', async () => {
    viewer.mockResolvedValue({ user: null });
    await expect(requireAccess('/filmes')).rejects.toMatchObject({ url: '/entrar?voltar=%2Ffilmes' });
  });
  it('demonstração passa', async () => {
    const d = { ...ok, isDemo: true };
    viewer.mockResolvedValue(d);
    await expect(requireAccess('/filmes')).resolves.toBe(d);
  });
});
