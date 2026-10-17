// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createTestAuth, signUp, cookiesFrom } from '../helpers/test-auth';
import { SESSION_SECONDS } from '@/lib/auth/create-auth';

const headersWith = (cookie) => new Headers({ cookie });

describe('login com e-mail e senha', () => {
  it('cria a conta, já entra e a sessão dura 30 dias', async () => {
    const { auth } = await createTestAuth();
    const { response, user, cookie } = await signUp(auth);
    expect(response.status).toBe(200);
    expect(user).toMatchObject({ name: 'Ana', email: 'ana@ex.com' });
    const session = await auth.api.getSession({ headers: headersWith(cookie) });
    expect(session.user.email).toBe('ana@ex.com');
    const daysLeft = (new Date(session.session.expiresAt) - Date.now()) / 86400000;
    expect(daysLeft).toBeGreaterThan(29.9);
    expect(daysLeft).toBeLessThanOrEqual(SESSION_SECONDS / 86400);
  });

  it('não aceita e-mail repetido nem senha curta', async () => {
    const { auth } = await createTestAuth();
    await signUp(auth);
    await expect(auth.api.signUpEmail({ body: { name: 'Outra', email: 'ana@ex.com', password: 'senha-forte-2' } }))
      .rejects.toMatchObject({ status: 'UNPROCESSABLE_ENTITY' });
    await expect(auth.api.signUpEmail({ body: { name: 'Bia', email: 'bia@ex.com', password: '1234567' } }))
      .rejects.toThrow();
  });

  it('entra com a senha certa e recusa a errada', async () => {
    const { auth } = await createTestAuth();
    await signUp(auth);
    const ok = await auth.api.signInEmail({ body: { email: 'ana@ex.com', password: 'senha-forte-1' }, asResponse: true });
    expect(ok.status).toBe(200);
    await expect(auth.api.signInEmail({ body: { email: 'ana@ex.com', password: 'errada-123' } }))
      .rejects.toMatchObject({ status: 'UNAUTHORIZED' });
  });

  it('redefinição: manda o link, troca a senha e encerra as sessões antigas', async () => {
    const { auth, sent } = await createTestAuth();
    const { cookie } = await signUp(auth);
    await auth.api.requestPasswordReset({ body: { email: 'ana@ex.com', redirectTo: '/redefinir-senha' } });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'ana@ex.com', name: 'Ana' });
    const token = new URL(sent[0].url).pathname.split('/').pop();
    await auth.api.resetPassword({ body: { newPassword: 'nova-senha-123', token } });
    expect(await auth.api.getSession({ headers: headersWith(cookie) })).toBeNull();
    const ok = await auth.api.signInEmail({ body: { email: 'ana@ex.com', password: 'nova-senha-123' }, asResponse: true });
    expect(ok.status).toBe(200);
  });

  it('pedir redefinição para e-mail sem conta não envia nada e não dá erro', async () => {
    const { auth, sent } = await createTestAuth();
    await expect(auth.api.requestPasswordReset({ body: { email: 'ninguem@ex.com', redirectTo: '/redefinir-senha' } }))
      .resolves.toBeDefined();
    expect(sent).toHaveLength(0);
  });

  it('o mesmo link de redefinição não vale duas vezes', async () => {
    const { auth, sent } = await createTestAuth();
    await signUp(auth);
    await auth.api.requestPasswordReset({ body: { email: 'ana@ex.com', redirectTo: '/redefinir-senha' } });
    const token = new URL(sent[0].url).pathname.split('/').pop();
    await auth.api.resetPassword({ body: { newPassword: 'nova-senha-123', token } });
    await expect(auth.api.resetPassword({ body: { newPassword: 'outra-senha-123', token } })).rejects.toThrow();
  });

  it('sair encerra a sessão', async () => {
    const { auth } = await createTestAuth();
    const { cookie } = await signUp(auth);
    const out = await auth.api.signOut({ headers: headersWith(cookie), asResponse: true });
    expect(out.status).toBe(200);
    expect(await auth.api.getSession({ headers: headersWith(cookie) })).toBeNull();
    expect(cookiesFrom(out)).toContain('session_token=');
  });
});
