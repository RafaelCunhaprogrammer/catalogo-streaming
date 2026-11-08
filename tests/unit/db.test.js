// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb } from '../helpers/test-db';
import { createDb, pgConfig } from '@/lib/db';
import { user, profiles, parentalPins } from '@/lib/db/schema';

describe('pgConfig', () => {
  const url = 'postgresql://postgres.ref:se%23nha@pooler.exemplo.com:6543/postgres?sslmode=require';

  it('sem certificado, usa o endereço como veio', () => {
    expect(pgConfig(url).connectionString).toBe(url);
    expect(pgConfig(url).ssl).toBeUndefined();
  });

  it('com certificado, confere o servidor e tira o sslmode, que anularia o certificado', () => {
    const config = pgConfig(url, 'PEM');
    expect(config.ssl).toEqual({ ca: 'PEM' });
    expect(config.connectionString).toBe('postgresql://postgres.ref:se%23nha@pooler.exemplo.com:6543/postgres');
  });

  it('aceita certificado com as quebras de linha escritas como \\n', () => {
    expect(pgConfig(url, 'linha1\\nlinha2').ssl.ca).toBe('linha1\nlinha2');
  });
});

describe('banco de dados', () => {
  it('toda tabela tem RLS ligada: nada fica aberto pela Data API do Supabase', async () => {
    const db = await createTestDb();
    const { rows } = await db.execute(sql`
      select c.relname, c.relrowsecurity from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((t) => !t.relrowsecurity).map((t) => t.relname)).toEqual([]);
  });

  it('cria as tabelas e apaga perfis e PIN junto com a conta', async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
    await db.insert(profiles).values({ id: 'p1', userId: 'u1', name: 'Ana', color: '#8b5cf6', kind: 'adulto', prefs: {} });
    await db.insert(parentalPins).values({ userId: 'u1', pinHash: 'x' });
    await db.delete(user).where(eq(user.id, 'u1'));
    expect(await db.select().from(profiles)).toEqual([]);
    expect(await db.select().from(parentalPins)).toEqual([]);
  });

  it('perfil guarda avatar e capa; perfil antigo fica com os dois nulos', async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
    await db.insert(profiles).values({ id: 'p1', userId: 'u1', name: 'Ana', color: '#8b5cf6', kind: 'adulto', prefs: {} });
    const [antigo] = await db.select().from(profiles);
    expect(antigo.avatar).toBeNull();
    expect(antigo.cover).toBeNull();
    const cover = { type: 'movie', id: 1, title: 'X', backdropPath: '/x.jpg', certification: '12', accent: null };
    await db.update(profiles).set({ avatar: 'acai', cover }).where(eq(profiles.id, 'p1'));
    const [novo] = await db.select().from(profiles);
    expect(novo.avatar).toBe('acai');
    expect(novo.cover).toEqual(cover);
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
