// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { user, profiles } from '@/lib/db/schema';
import { saveMark } from '@/lib/lists/store';

let db;
vi.mock('@/lib/db', () => ({ getDb: () => db }));

const { loadInitialMarks } = await import('@/lib/lists/initial-marks');

beforeEach(async () => {
  db = await createTestDb();
});

describe('loadInitialMarks (marcações do layout)', () => {
  it('monta o índice do perfil', async () => {
    await db.insert(user).values({ id: 'u1', name: 'U', email: 'u@x.com', emailVerified: true });
    await db.insert(profiles).values({ id: 'p1', userId: 'u1', name: 'P', color: '#000', kind: 'adulto' });
    await saveMark(db, 'p1', 'movie', 3, { favorite: true }, { title: 'F', seasons: [] });
    expect(await loadInitialMarks('p1')).toEqual({ 'movie-3': { favorite: true, status: 'nenhum', season: null, episode: null } });
  });

  it('falha no banco: devolve null (a página abre sem as marcações)', async () => {
    db = { select: () => ({ from: () => ({ where: async () => { throw new Error('db fora'); } }) }) };
    expect(await loadInitialMarks('p1')).toBeNull();
  });
});
