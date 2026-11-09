// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createTestDb } from '../helpers/test-db';
import { user, profiles } from '@/lib/db/schema';

const state = { db: null, viewer: null, storage: null };
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({ redirect: (to) => { throw new Error(`redirect ${to}`); } }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/photos/storage', async (orig) => ({ ...(await orig()), getPhotoStorage: () => state.storage }));
vi.mock('@/lib/db', () => ({ getDb: () => state.db }));
vi.mock('@/lib/auth/viewer', () => ({ getViewer: async () => state.viewer }));

const { saveProfileGenresAction, dismissProfileGenresAction, updateProfileAction, createProfileAction } = await import('@/lib/actions/conta');
const { setPin } = await import('@/lib/pin');

const row = async (id) => (await state.db.select().from(profiles).where(eq(profiles.id, id)))[0];
const adult = { user: { id: 'u1' }, kids: false, kidsLock: false, parentMode: false };
const kidsLocked = { user: { id: 'u1' }, kids: true, kidsLock: true, parentMode: false };
const form = (obj, genres) => {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => fd.set(k, v));
  genres.forEach((g) => fd.append('genres', g));
  return fd;
};

beforeEach(async () => {
  state.db = await createTestDb();
  await state.db.insert(user).values([
    { id: 'u1', name: 'U', email: 'u@x.com', emailVerified: true },
    { id: 'u2', name: 'V', email: 'v@x.com', emailVerified: true },
  ]);
  await state.db.insert(profiles).values([
    { id: 'pa', userId: 'u1', name: 'Adulto', color: '#000', kind: 'adulto' },
    { id: 'pk', userId: 'u1', name: 'Kids', color: '#000', kind: 'kids', maxRating: '10' },
    { id: 'po', userId: 'u2', name: 'Outro', color: '#000', kind: 'adulto', favoriteGenres: ['drama'] },
  ]);
  state.viewer = adult;
});

describe('gêneros do perfil: ações de Gerenciar perfis', () => {
  it('perfil de outra conta é rejeitado e nada muda', async () => {
    expect(await saveProfileGenresAction('po', ['acao'])).toEqual({ ok: false, error: 'Perfil não encontrado.' });
    expect(await dismissProfileGenresAction('po')).toEqual({ ok: false, error: 'Perfil não encontrado.' });
    const other = await row('po');
    expect(other.favoriteGenres).toEqual(['drama']);
    expect(other.genresPromptDone).toBe(false);
  });

  it('editar perfil de outra conta (com gêneros) é rejeitado e nada muda', async () => {
    const res = await updateProfileAction(null, form({ id: 'po', name: 'Invadido', color: '#8b5cf6', kind: 'adulto' }, ['acao']));
    expect(res).toEqual({ ok: false, errors: { form: 'Perfil não encontrado.' } });
    const other = await row('po');
    expect(other.name).toBe('Outro');
    expect(other.favoriteGenres).toEqual(['drama']);
    expect(other.genresPromptDone).toBe(false);
  });

  it('Kids sem modo adulto é rejeitado nas duas ações e na edição', async () => {
    state.viewer = kidsLocked;
    const pinError = { ok: false, error: 'Peça para um adulto digitar o PIN.' };
    expect(await saveProfileGenresAction('pa', ['acao'])).toEqual(pinError);
    expect(await dismissProfileGenresAction('pa')).toEqual(pinError);
    const res = await updateProfileAction(null, form({ id: 'pa', name: 'Novo', color: '#8b5cf6', kind: 'adulto' }, ['acao']));
    expect(res).toEqual({ ok: false, errors: { form: 'Peça para um adulto digitar o PIN.' } });
    const p = await row('pa');
    expect(p.favoriteGenres).toEqual([]);
    expect(p.genresPromptDone).toBe(false);
    expect(p.name).toBe('Adulto');
  });

  it('perfil Kids guarda só gêneros infantis e descarta desconhecidos', async () => {
    const res = await saveProfileGenresAction('pk', ['acao', 'animacao', 'xyz']);
    expect(res).toEqual({ ok: true, genres: ['animacao'] });
    expect((await row('pk')).favoriteGenres).toEqual(['animacao']);
  });

  it('adulto: descarta desconhecidos e repetidos e encerra o convite', async () => {
    const res = await saveProfileGenresAction('pa', ['drama', 'xyz', 'acao', 'drama']);
    expect(res.ok).toBe(true);
    const p = await row('pa');
    expect(p.favoriteGenres).toEqual(['acao', 'drama']);
    expect(p.genresPromptDone).toBe(true);
  });

  it('dispensar encerra o convite sem mexer nos gêneros', async () => {
    await state.db.update(profiles).set({ favoriteGenres: ['crime'] }).where(eq(profiles.id, 'pa'));
    expect(await dismissProfileGenresAction('pa')).toEqual({ ok: true });
    const p = await row('pa');
    expect(p.genresPromptDone).toBe(true);
    expect(p.favoriteGenres).toEqual(['crime']);
  });

  it('editar salva o avatar do formulário; avatar desconhecido é recusado', async () => {
    const base = { id: 'pa', name: 'Adulto', color: '#8b5cf6', kind: 'adulto' };
    expect((await updateProfileAction(null, form({ ...base, avatar: 'jambu' }, []))).ok).toBe(true);
    expect((await row('pa')).avatar).toBe('jambu');
    const res = await updateProfileAction(null, form({ ...base, avatar: 'mickey' }, []));
    expect(res.errors.avatar).toBe('Escolha um dos avatares.');
    expect((await row('pa')).avatar).toBe('jambu');
    expect((await updateProfileAction(null, form({ ...base, avatar: '' }, []))).ok).toBe(true);
    expect((await row('pa')).avatar).toBeNull();
  });

  it('editar salva os gêneros do formulário (adulto limpo, Kids filtrado)', async () => {
    await setPin(state.db, 'u1', '1234'); // atualizar para Kids exige que a conta já tenha PIN
    expect((await updateProfileAction(null, form({ id: 'pa', name: 'Adulto', color: '#8b5cf6', kind: 'adulto' }, ['acao', 'xyz']))).ok).toBe(true);
    expect((await row('pa')).favoriteGenres).toEqual(['acao']);
    const res = await updateProfileAction(null, form({ id: 'pk', name: 'Kids', color: '#8b5cf6', kind: 'kids', maxRating: '10' }, ['acao', 'fantasia']));
    expect(res.ok).toBe(true);
    expect((await row('pk')).favoriteGenres).toEqual(['fantasia']);
  });
});

describe('foto do perfil nas ações', () => {
  const foto = () => sharp({ create: { width: 256, height: 256, channels: 3, background: '#8b5cf6' } }).webp().toBuffer();
  const comFoto = async (obj, bytes) => {
    const fd = form(obj, []);
    fd.set('photo', new File([bytes ?? (await foto())], 'foto.webp', { type: 'image/webp' }));
    return fd;
  };
  const base = { id: 'pa', name: 'Adulto', color: '#8b5cf6', kind: 'adulto', avatar: 'foto' };
  let dir;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fotos-conta-'));
    state.storage = (await vi.importActual('@/lib/photos/storage')).getPhotoStorage({ env: {}, dir });
  });
  afterEach(() => fs.rm(dir, { recursive: true, force: true }));

  it('editar com photo válido grava a foto e deixa o avatar "foto"', async () => {
    const res = await updateProfileAction(null, await comFoto(base));
    expect(res.ok).toBe(true);
    const p = await row('pa');
    expect(p.avatar).toBe('foto');
    expect(p.photoKey).toMatch(/^fotos\/pa\//);
    await expect(fs.access(path.join(dir, p.photoKey))).resolves.toBeUndefined();
  });

  it('photo inválido devolve o erro da imagem e não muda nada', async () => {
    const res = await updateProfileAction(null, await comFoto({ ...base, name: 'Outro nome' }, Buffer.from('não sou imagem')));
    expect(res).toEqual({ ok: false, errors: { form: 'Não foi possível usar essa imagem. Tente outra foto.' } });
    const p = await row('pa');
    expect(p.name).toBe('Adulto');
    expect(p.photoKey).toBeNull();
  });

  it('avatar "foto" sem foto salva e sem arquivo mantém o avatar atual', async () => {
    await state.db.update(profiles).set({ avatar: 'jambu' }).where(eq(profiles.id, 'pa'));
    const res = await updateProfileAction(null, form(base, []));
    expect(res.ok).toBe(true);
    expect((await row('pa')).avatar).toBe('jambu');
  });

  it('avatar "foto" com foto já salva e sem arquivo continua sendo a foto', async () => {
    await updateProfileAction(null, await comFoto(base));
    const antes = (await row('pa')).photoKey;
    expect((await updateProfileAction(null, form({ ...base, name: 'Novo nome' }, []))).ok).toBe(true);
    const p = await row('pa');
    expect(p.avatar).toBe('foto');
    expect(p.photoKey).toBe(antes);
  });

  it('criar com photo grava a foto no perfil novo', async () => {
    const res = await createProfileAction(null, await comFoto({ name: 'Nova', color: '#8b5cf6', kind: 'adulto', avatar: 'foto' }));
    expect(res.ok).toBe(true);
    const p = await row(res.profileId);
    expect(p.avatar).toBe('foto');
    expect(p.photoKey).toBeTruthy();
  });

  it('criar com photo inválido não cria o perfil', async () => {
    const res = await createProfileAction(null, await comFoto({ name: 'Nova', color: '#8b5cf6', kind: 'adulto', avatar: 'foto' }, Buffer.from('x')));
    expect(res.ok).toBe(false);
    expect(res.errors.form).toBe('Não foi possível usar essa imagem. Tente outra foto.');
    expect((await state.db.select().from(profiles).where(eq(profiles.name, 'Nova'))).length).toBe(0);
  });

  const SALVAR = 'Não foi possível salvar. Tente de novo.';
  const quebrado = { put: async () => { throw new Error('disco cheio'); }, del: async () => {} };

  it('criar com falha ao guardar a foto não deixa perfil e devolve o erro de salvar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.storage = quebrado;
    const res = await createProfileAction(null, await comFoto({ name: 'Nova', color: '#8b5cf6', kind: 'adulto', avatar: 'foto' }));
    expect(res).toEqual({ ok: false, errors: { form: SALVAR } });
    expect((await state.db.select().from(profiles).where(eq(profiles.name, 'Nova'))).length).toBe(0);
  });

  it('editar com falha ao guardar a foto não muda nome nem cor', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.storage = quebrado;
    const res = await updateProfileAction(null, await comFoto({ ...base, name: 'Mudou', color: '#ec4899' }));
    expect(res).toEqual({ ok: false, errors: { form: SALVAR } });
    const p = await row('pa');
    expect(p.name).toBe('Adulto');
    expect(p.color).toBe('#000');
  });

  it('erro "perfil" do serviço da foto mostra o erro de salvar e não muda nada', async () => {
    // perfil de outra conta: o serviço da foto responde 'perfil'
    const res = await updateProfileAction(null, await comFoto({ ...base, id: 'po', name: 'Invadido' }));
    expect(res).toEqual({ ok: false, errors: { form: SALVAR } });
    const o = await row('po');
    expect(o.name).toBe('Outro');
    expect(o.photoKey).toBeNull();
  });
});
