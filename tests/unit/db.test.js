// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../helpers/test-db';
import { createDb } from '@/lib/db';
import { user, profiles, parentalPins } from '@/lib/db/schema';

describe('banco de dados', () => {
  it('cria as tabelas e apaga perfis e PIN junto com a conta', async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
    await db.insert(profiles).values({ id: 'p1', userId: 'u1', name: 'Ana', color: '#8b5cf6', kind: 'adulto', prefs: {} });
    await db.insert(parentalPins).values({ userId: 'u1', pinHash: 'x' });
    await db.delete(user).where(eq(user.id, 'u1'));
    expect(await db.select().from(profiles)).toEqual([]);
    expect(await db.select().from(parentalPins)).toEqual([]);
  });

  it('valores padrão: e-mail não verificado e PIN sem tentativas', async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
    await db.insert(parentalPins).values({ userId: 'u1', pinHash: 'x' });
    const [u] = await db.select().from(user);
    const [p] = await db.select().from(parentalPins);
    expect(u.emailVerified).toBe(false);
    expect(u.createdAt).toBeInstanceOf(Date);
    expect(p.failedAttempts).toBe(0);
    expect(p.lockedUntil).toBeNull();
  });

  it('dá um erro claro sem DATABASE_URL', () => {
    expect(() => createDb('')).toThrow('Defina DATABASE_URL em .env.local');
  });
});
