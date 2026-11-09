// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createTestAuth, signUp, TEST_SECRET } from '../helpers/test-auth';
import { createTestDb } from '../helpers/test-db';
import { createAuth } from '@/lib/auth/create-auth';
import { getPhotoStorage } from '@/lib/photos/storage';
import { setProfilePhoto } from '@/lib/photos/service';
import { listProfiles, createProfile, updateProfile, PROFILE_COLORS } from '@/lib/profiles';

// A cor da capa viria da imagem no TMDB: aqui, uma cor fixa, sem rede.
const ACCENT = { dark: '#aabbcc', light: '#112233' };
vi.mock('@/lib/cover-accent', () => ({ extractAccent: vi.fn(async () => ACCENT) }));
import { verifyPin } from '@/lib/pin';
import { DEMO_EMAIL, DEMO_PIN, belemDate, ensureDemoAccount, resetDemoIfNeeded } from '@/lib/demo';
import { listMarks, saveMark } from '@/lib/lists/store';
import { DEMO_EMAIL as VIEWER_DEMO_EMAIL } from '@/lib/auth/viewer-core';
import { getSubscription, recordPayment, listPayments } from '@/lib/subscription/store';

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
    expect(profiles.map((p) => p.avatar)).toEqual(['acai', 'ver-o-peso', 'boto']);
    expect(profiles.map((p) => p.cover)).toEqual([null, null, null]); // sem exemplos, sem capa
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
    const [pai] = await listProfiles(db, userId);
    await updateProfile(db, userId, pai.id, { name: 'Pai', color: pai.color, kind: 'adulto', avatar: 'onca' });
    expect(await resetDemoIfNeeded(db, userId, new Date('2026-10-17T23:00:00Z'))).toBe(false);
    expect(await listProfiles(db, userId)).toHaveLength(4);
    expect(await resetDemoIfNeeded(db, userId, new Date('2026-10-18T04:00:00Z'))).toBe(true);
    const depois = await listProfiles(db, userId);
    expect(depois.map((p) => p.name)).toEqual(['Pai', 'Mãe', 'Pequeno']);
    expect(depois[0].avatar).toBe('acai');
  });

  it('a demonstração fica com assinatura anual ativa até amanhã e o reset apaga pagamentos', async () => {
    const { auth, db } = await createTestAuth();
    const now = new Date('2026-10-17T15:00:00Z');
    const userId = await ensureDemoAccount(db, auth, 'demo-paidegua-2026', now);
    const sub = await getSubscription(db, userId);
    expect([sub.status, sub.plan]).toEqual(['ativa', 'anual']);
    expect(sub.periodEnd.getTime()).toBe(now.getTime() + 24 * 3600 * 1000);
    await recordPayment(db, userId, { plan: 'mensal', method: 'pix', approved: true }, now);
    expect(await listPayments(db, userId)).toHaveLength(1);
    const next = new Date('2026-10-18T04:00:00Z');
    expect(await resetDemoIfNeeded(db, userId, next)).toBe(true);
    const after = await getSubscription(db, userId);
    expect([after.status, after.plan]).toEqual(['ativa', 'anual']);
    expect(after.periodEnd.getTime()).toBe(next.getTime() + 24 * 3600 * 1000);
    expect(await listPayments(db, userId)).toHaveLength(0);
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
      expect(pai.cover).toEqual({ type: 'movie', id: 10, title: 'Título 10', backdropPath: '/b.jpg', certification: '12', accent: ACCENT });
      expect(mae.cover).toBeNull();
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

    it('examples que nunca resolve: o reset termina sem marcações e grava o dia', async () => {
      const { auth, db } = await createTestAuth();
      const now = new Date('2026-10-17T15:00:00Z');
      const userId = await ensureDemoAccount(db, auth, PASSWORD, now, { examples: () => new Promise(() => {}), examplesTimeoutMs: 20 });
      const profiles = await listProfiles(db, userId);
      expect(profiles).toHaveLength(3);
      for (const p of profiles) expect(await listMarks(db, p.id)).toHaveLength(0);
      expect(await verifyPin(db, userId, DEMO_PIN)).toEqual({ ok: true });
      expect(await resetDemoIfNeeded(db, userId, new Date('2026-10-17T16:00:00Z'))).toBe(false);
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

describe('excluir a conta', () => {
  it('apaga as fotos dos perfis da conta', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fotos-conta-'));
    try {
      const storage = getPhotoStorage({ env: {}, dir });
      const db = await createTestDb();
      const auth = createAuth({ db, secret: TEST_SECRET, baseURL: 'http://localhost:3000', sendResetEmail: async () => {}, rateLimit: false, withNextCookies: false, photoStorage: storage });
      const { user: u, cookie } = await signUp(auth);
      const { profile } = await createProfile(db, u.id, { name: 'Ana', color: PROFILE_COLORS[0], kind: 'adulto' });
      const buf = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#ffffff' } }).webp().toBuffer();
      const { photoKey } = await setProfilePhoto(db, storage, u.id, profile.id, buf);
      await auth.api.deleteUser({ body: { password: 'senha-forte-1' }, headers: new Headers({ cookie }) });
      await expect(fs.access(path.join(dir, photoKey))).rejects.toThrow();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
