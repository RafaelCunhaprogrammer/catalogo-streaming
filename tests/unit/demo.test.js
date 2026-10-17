// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createTestAuth } from '../helpers/test-auth';
import { listProfiles, createProfile, PROFILE_COLORS } from '@/lib/profiles';
import { verifyPin } from '@/lib/pin';
import { DEMO_EMAIL, DEMO_PIN, belemDate, ensureDemoAccount, resetDemoIfNeeded } from '@/lib/demo';
import { DEMO_EMAIL as VIEWER_DEMO_EMAIL } from '@/lib/auth/viewer-core';

describe('conta de demonstração', () => {
  it('data de Belém é UTC−3', () => {
    expect(belemDate(new Date('2026-10-18T02:59:00Z'))).toBe('2026-10-17');
    expect(belemDate(new Date('2026-10-18T03:00:00Z'))).toBe('2026-10-18');
    expect(DEMO_EMAIL).toBe(VIEWER_DEMO_EMAIL);
  });

  it('cria a conta com Pai, Mãe e Pequeno (Kids 10) e PIN 1234', async () => {
    const { auth, db } = await createTestAuth();
    const userId = await ensureDemoAccount(db, auth, 'demo-paidegua-2026');
    const profiles = await listProfiles(db, userId);
    expect(profiles.map((p) => [p.name, p.kind, p.maxRating])).toEqual([
      ['Pai', 'adulto', null], ['Mãe', 'adulto', null], ['Pequeno', 'kids', '10'],
    ]);
    expect(await verifyPin(db, userId, DEMO_PIN)).toEqual({ ok: true });
    const login = await auth.api.signInEmail({ body: { email: DEMO_EMAIL, password: 'demo-paidegua-2026' }, asResponse: true });
    expect(login.status).toBe(200);
  });

  it('rodar de novo não duplica a conta', async () => {
    const { auth, db } = await createTestAuth();
    const a = await ensureDemoAccount(db, auth, 'demo-paidegua-2026');
    const b = await ensureDemoAccount(db, auth, 'demo-paidegua-2026');
    expect(b).toBe(a);
    expect(await listProfiles(db, a)).toHaveLength(3);
  });

  it('reseta uma vez por dia (horário de Belém), desfazendo o que visitantes mudaram', async () => {
    const { auth, db } = await createTestAuth();
    const day1 = new Date('2026-10-17T15:00:00Z');
    const userId = await ensureDemoAccount(db, auth, 'demo-paidegua-2026', day1);
    await createProfile(db, userId, { name: 'Bagunça', color: PROFILE_COLORS[0], kind: 'adulto' });
    expect(await resetDemoIfNeeded(db, userId, new Date('2026-10-17T23:00:00Z'))).toBe(false);
    expect(await listProfiles(db, userId)).toHaveLength(4);
    expect(await resetDemoIfNeeded(db, userId, new Date('2026-10-18T04:00:00Z'))).toBe(true);
    expect((await listProfiles(db, userId)).map((p) => p.name)).toEqual(['Pai', 'Mãe', 'Pequeno']);
  });
});
