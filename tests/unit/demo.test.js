// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createTestAuth } from '../helpers/test-auth';
import { listProfiles, createProfile, PROFILE_COLORS } from '@/lib/profiles';
import { verifyPin } from '@/lib/pin';
import { DEMO_EMAIL, DEMO_PIN, belemDate, ensureDemoAccount, resetDemoIfNeeded } from '@/lib/demo';
import { listMarks, saveMark } from '@/lib/lists/store';
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

  describe('exemplos', () => {
    const season = (n, episodes) => ({ number: n, episodes });
    const fake = (id, type, extra = {}) => ({
      id, type, title: `Título ${id}`, posterPath: '/p.jpg', backdropPath: '/b.jpg', year: 2025, genreIds: [28], certification: '12', seasonList: [], ...extra,
    });
    const examples = async () => ({ movie: fake(10, 'movie'), tv: fake(20, 'tv', { seasonList: [season(1, 8), season(2, 8)] }) });
    const PASSWORD = 'demo-paidegua-2026';

    it('o Pai vem com filme favorito, série em T1 E3 e três gêneros; Mãe e Pequeno sem marcações', async () => {
      const { auth, db } = await createTestAuth();
      const userId = await ensureDemoAccount(db, auth, PASSWORD, new Date(), { examples });
      const [pai, mae, pequeno] = await listProfiles(db, userId);
      const marks = await listMarks(db, pai.id);
      expect(marks).toHaveLength(2);
      expect(marks.filter((m) => m.favorite).map((m) => [m.mediaType, m.tmdbId])).toEqual([['movie', 10]]);
      const tv = marks.find((m) => m.mediaType === 'tv');
      expect([tv.status, tv.season, tv.episode]).toEqual(['assistindo', 1, 3]);
      expect(pai.favoriteGenres).toEqual(['acao', 'comedia', 'ficcao']);
      expect(await listMarks(db, mae.id)).toHaveLength(0);
      expect(await listMarks(db, pequeno.id)).toHaveLength(0);
    });

    it('examples que lança erro: demonstração criada normalmente, sem marcações', async () => {
      const { auth, db } = await createTestAuth();
      const userId = await ensureDemoAccount(db, auth, PASSWORD, new Date(), { examples: async () => { throw new Error('TMDB fora do ar'); } });
      const profiles = await listProfiles(db, userId);
      expect(profiles.map((p) => p.name)).toEqual(['Pai', 'Mãe', 'Pequeno']);
      for (const p of profiles) expect(await listMarks(db, p.id)).toHaveLength(0);
    });

    it('o reset do dia seguinte apaga marcações feitas por visitantes', async () => {
      const { auth, db } = await createTestAuth();
      const userId = await ensureDemoAccount(db, auth, PASSWORD, new Date('2026-10-17T15:00:00Z'), { examples });
      const [pai] = await listProfiles(db, userId);
      await saveMark(db, pai.id, 'movie', 99, { favorite: true }, { title: 'Visitante', seasons: [] });
      expect(await listMarks(db, pai.id)).toHaveLength(3);
      expect(await resetDemoIfNeeded(db, userId, new Date('2026-10-18T04:00:00Z'), { examples })).toBe(true);
      const [novoPai] = await listProfiles(db, userId);
      const marks = await listMarks(db, novoPai.id);
      expect(marks.map((m) => m.tmdbId).sort()).toEqual([10, 20]);
    });
  });
});
