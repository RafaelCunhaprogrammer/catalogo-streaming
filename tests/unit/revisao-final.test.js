// @vitest-environment node
// Casos apontados na revisão final: cada um reproduz um jeito de driblar o PIN ou a conta.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { createTestAuth, signUp, TEST_SECRET } from '../helpers/test-auth';
import { user } from '@/lib/db/schema';
import { createProfile } from '@/lib/profiles';
import { setPin, verifyPin, PIN_MAX_ATTEMPTS } from '@/lib/pin';
import { safeReturnPath } from '@/lib/account-rules';
import { signValue, verifySignedValue } from '@/lib/auth/signed-cookie';
import {
  buildViewer, encodeUnlocked, encodeParentMode, KIDS_LOCK_COOKIE, PROFILE_COOKIE,
} from '@/lib/auth/viewer-core';

const state = { db: null, viewer: null, jar: new Map() };
const jar = {
  get: (name) => (state.jar.has(name) ? { value: state.jar.get(name) } : undefined),
  set: (name, value, options) => (options?.maxAge === 0 ? state.jar.delete(name) : state.jar.set(name, value)),
  delete: (name) => state.jar.delete(name),
};
vi.mock('next/headers', () => ({ cookies: async () => jar, headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({
  redirect: (to) => {
    throw Object.assign(new Error('redirect'), { to });
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/db', () => ({ getDb: () => state.db }));
vi.mock('@/lib/auth/viewer', () => ({ getViewer: async () => state.viewer }));
process.env.BETTER_AUTH_SECRET = TEST_SECRET;
const { chooseProfileAction, createFirstProfileAction } = await import('@/lib/actions/conta');

const redirectOf = (promise) => promise.then(() => null, (e) => {
  if (e.to) return e.to;
  throw e;
});
const session = { user: { id: 'u1', name: 'Ana', email: 'ana@ex.com' } };
let adulto;
let kids;

beforeEach(async () => {
  state.db = await createTestDb();
  state.jar = new Map();
  await state.db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
  ({ profile: adulto } = await createProfile(state.db, 'u1', { name: 'Ana', color: '#8b5cf6', kind: 'adulto' }));
  ({ profile: kids } = await createProfile(state.db, 'u1', { name: 'Pequeno', color: '#ec4899', kind: 'kids', maxRating: '10' }));
});

const viewerFromJar = () => buildViewer({
  session,
  profiles: [adulto, kids],
  profileCookie: jar.get(PROFILE_COOKIE)?.value,
  kidsLockCookie: jar.get(KIDS_LOCK_COOKIE)?.value,
  secret: TEST_SECRET,
});

describe('fechar o navegador no Kids não libera o perfil adulto', () => {
  it('depois de usar o Kids, escolher um perfil adulto pede o PIN; o Kids continua livre', async () => {
    state.viewer = viewerFromJar();
    await redirectOf(chooseProfileAction(kids.id, '/'));
    // "Fechou o navegador": somem os cookies de sessão, fica a trava do Kids.
    state.jar.delete(PROFILE_COOKIE);
    state.viewer = viewerFromJar();
    expect(state.viewer.profile).toBeNull();
    expect(await chooseProfileAction(adulto.id, '/')).toEqual({ ok: false, error: 'pin' });
    expect(await redirectOf(chooseProfileAction(kids.id, '/'))).toBe('/');
  });

  it('com o PIN (modo adulto), escolher o adulto tira a trava', async () => {
    state.viewer = viewerFromJar();
    await redirectOf(chooseProfileAction(kids.id, '/'));
    state.jar.delete(PROFILE_COOKIE);
    state.viewer = { ...viewerFromJar(), parentMode: true };
    expect(await redirectOf(chooseProfileAction(adulto.id, '/'))).toBe('/');
    expect(state.jar.has(KIDS_LOCK_COOKIE)).toBe(false);
  });

  it('trava de outra conta ou adulterada não vale', () => {
    const other = buildViewer({ session, profiles: [adulto, kids], kidsLockCookie: signValue('u2', TEST_SECRET), secret: TEST_SECRET });
    expect(other.kidsLock).toBe(false);
    const forged = buildViewer({ session, profiles: [adulto, kids], kidsLockCookie: 'u1.falso', secret: TEST_SECRET });
    expect(forged.kidsLock).toBe(false);
  });
});

describe('criar o primeiro perfil não vira atalho para o adulto', () => {
  it('no Kids, a ação não troca para o primeiro perfil da conta', async () => {
    state.jar.set(PROFILE_COOKIE, signValue(kids.id, TEST_SECRET));
    state.viewer = viewerFromJar();
    await redirectOf(createFirstProfileAction(undefined));
    expect(verifySignedValue(state.jar.get(PROFILE_COOKIE), TEST_SECRET)).toBe(kids.id);
  });

  it('com perfis já criados e nenhum ativo, manda escolher em vez de ativar um', async () => {
    state.viewer = viewerFromJar();
    expect(await redirectOf(createFirstProfileAction(undefined))).toBe('/perfis');
    expect(state.jar.has(PROFILE_COOKIE)).toBe(false);
  });
});

describe('cookies de modo adulto e de liberados valem só para a conta e o perfil de origem', () => {
  const withCookies = (scopeUser) => buildViewer({
    session,
    profiles: [adulto, kids],
    profileCookie: signValue(kids.id, TEST_SECRET),
    parentCookie: encodeParentMode(1_000_000, TEST_SECRET, scopeUser),
    unlockedCookie: encodeUnlocked(['movie-1'], TEST_SECRET, `${scopeUser}:${kids.id}`),
    secret: TEST_SECRET,
    now: 1_000_001,
  });

  it('copiados de outra conta (ex.: a demonstração) não valem', () => {
    const fromOther = withCookies('u2');
    expect(fromOther.parentMode).toBe(false);
    expect(fromOther.unlocked.size).toBe(0);
    const own = withCookies('u1');
    expect(own.parentMode).toBe(true);
    expect(own.unlocked.has('movie-1')).toBe(true);
  });
});

describe('PIN: tentativas em paralelo contam todas', () => {
  it('uma rajada de PINs errados bloqueia e não testa mais que 5', async () => {
    await setPin(state.db, 'u1', '4321');
    const now = new Date('2026-10-17T12:00:00Z');
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => verifyPin(state.db, 'u1', String(1000 + i), now)));
    expect(results.filter((r) => r.reason === 'incorreto').length).toBeLessThan(PIN_MAX_ATTEMPTS);
    expect(results.some((r) => r.reason === 'bloqueado')).toBe(true);
    expect(await verifyPin(state.db, 'u1', '4321', now)).toMatchObject({ ok: false, reason: 'bloqueado' });
  });
});

describe('voltar depois de entrar', () => {
  it('recusa caracteres de controle que o navegador apagaria (viraria //site)', () => {
    for (const bad of ['/\t/evil.com', '/\n/evil.com', '/\r//evil.com', '/\u0000/evil.com']) {
      expect(safeReturnPath(bad)).toBe('/');
    }
    expect(safeReturnPath('/busca?q=a b')).toBe('/busca?q=a b');
  });
});

describe('rotas brutas do Better Auth', () => {
  it('excluir, trocar senha e editar a conta só passam pelas ações do site', async () => {
    const { auth } = await createTestAuth();
    const { cookie } = await signUp(auth);
    for (const path of ['/delete-user', '/change-password', '/update-user', '/change-email', '/revoke-sessions', '/revoke-other-sessions']) {
      const res = await auth.handler(new Request(`http://localhost:3000/api/auth${path}`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json', origin: 'http://localhost:3000' },
        body: '{}',
      }));
      expect([path, res.status]).toEqual([path, 404]);
    }
    // A API interna (usada pelas ações do servidor) continua funcionando.
    await expect(auth.api.changePassword({
      body: { currentPassword: 'senha-forte-1', newPassword: 'nova-senha-123' },
      headers: new Headers({ cookie }),
    })).resolves.toBeDefined();
  });
});
