// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createTestDb } from '../helpers/test-db';
import { user } from '@/lib/db/schema';
import { getPhotoStorage } from '@/lib/photos/storage';
import { setProfilePhoto, removeProfilePhoto, deletePhotosOf } from '@/lib/photos/service';
import { PROFILE_COLORS, createProfile, deleteProfile, getOwnedProfile, listProfiles, updateProfile } from '@/lib/profiles';
import { resetDemo, DEMO_PROFILES } from '@/lib/demo';

let db;
let dir;
let storage;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values([
    { id: 'u1', name: 'Ana', email: 'ana@ex.com' },
    { id: 'u2', name: 'Bia', email: 'bia@ex.com' },
  ]);
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fotos-'));
  storage = getPhotoStorage({ env: {}, dir });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(dir, { recursive: true, force: true });
});

const foto = (lado = 256) => sharp({ create: { width: lado, height: lado, channels: 3, background: '#8b5cf6' } }).webp().toBuffer();
const existe = (key) => fs.access(path.join(dir, key)).then(() => true, () => false);
const novo = async (userId, input = {}) => (await createProfile(db, userId, { name: 'Ana', color: PROFILE_COLORS[0], kind: 'adulto', ...input })).profile;

describe('setProfilePhoto', () => {
  it('grava o arquivo e aponta o banco para ele', async () => {
    const p = await novo('u1');
    const r = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    expect(r.ok).toBe(true);
    expect(await existe(r.photoKey)).toBe(true);
    const salvo = await getOwnedProfile(db, 'u1', p.id);
    expect(salvo).toMatchObject({ avatar: 'foto', photoKey: r.photoKey });
  });

  it('trocar apaga o arquivo antigo depois de gravar o novo', async () => {
    const p = await novo('u1');
    const a = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    const b = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    expect(b.photoKey).not.toBe(a.photoKey);
    expect(await existe(a.photoKey)).toBe(false);
    expect(await existe(b.photoKey)).toBe(true);
    expect((await getOwnedProfile(db, 'u1', p.id)).photoKey).toBe(b.photoKey);
  });

  it('se o put falha, o antigo continua e o banco não muda', async () => {
    const p = await novo('u1');
    const a = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    const quebrado = { ...storage, put: async () => { throw new Error('falhou'); } };
    await expect(setProfilePhoto(db, quebrado, 'u1', p.id, await foto())).rejects.toThrow('falhou');
    expect(await existe(a.photoKey)).toBe(true);
    expect((await getOwnedProfile(db, 'u1', p.id)).photoKey).toBe(a.photoKey);
  });

  it('perfil de outra conta ou Kids: "perfil", nada muda', async () => {
    const dela = await novo('u2', { name: 'Bia' });
    const kids = await novo('u1', { name: 'Zé', kind: 'kids', maxRating: '10' });
    expect(await setProfilePhoto(db, storage, 'u1', dela.id, await foto())).toEqual({ ok: false, error: 'perfil' });
    expect(await setProfilePhoto(db, storage, 'u1', kids.id, await foto())).toEqual({ ok: false, error: 'perfil' });
    expect(await setProfilePhoto(db, storage, 'u1', 'nao-existe', await foto())).toEqual({ ok: false, error: 'perfil' });
    expect((await getOwnedProfile(db, 'u2', dela.id)).photoKey).toBeNull();
    expect(await fs.readdir(dir)).toEqual([]);
  });

  it('imagem inválida: "imagem"', async () => {
    const p = await novo('u1');
    expect(await setProfilePhoto(db, storage, 'u1', p.id, Buffer.from('não sou imagem'))).toEqual({ ok: false, error: 'imagem' });
    expect(await setProfilePhoto(db, storage, 'u1', p.id, await foto(100))).toEqual({ ok: false, error: 'imagem' });
    expect((await getOwnedProfile(db, 'u1', p.id)).photoKey).toBeNull();
  });

  it('del que lança não bloqueia a troca (e registra o erro)', async () => {
    const p = await novo('u1');
    const a = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const semDel = { ...storage, del: async () => { throw new Error('x'); } };
    const b = await setProfilePhoto(db, semDel, 'u1', p.id, await foto());
    expect(b.ok).toBe(true);
    expect(erro).toHaveBeenCalledWith('Foto não apagada:', a.photoKey);
  });
});

describe('removeProfilePhoto e deletePhotosOf', () => {
  it('apaga o arquivo e zera photoKey', async () => {
    const p = await novo('u1');
    const a = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    await removeProfilePhoto(db, storage, 'u1', p.id);
    expect(await existe(a.photoKey)).toBe(false);
    expect((await getOwnedProfile(db, 'u1', p.id)).photoKey).toBeNull();
  });

  it('deletePhotosOf ignora perfis sem foto', async () => {
    await expect(deletePhotosOf(storage, [{ photoKey: null }, {}])).resolves.toBeUndefined();
  });
});

describe('updateProfile e a foto', () => {
  const dados = (p, extra) => ({ name: p.name, color: p.color, kind: p.kind, ...extra });

  it('voltar para um avatar apaga a foto', async () => {
    const p = await novo('u1');
    const a = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    const r = await updateProfile(db, 'u1', p.id, dados(p, { avatar: 'acai' }), storage);
    expect(r.profile).toMatchObject({ avatar: 'acai', photoKey: null });
    expect(await existe(a.photoKey)).toBe(false);
  });

  it('manter a foto não apaga nada', async () => {
    const p = await novo('u1');
    const a = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    await updateProfile(db, 'u1', p.id, dados(p, { name: 'Ana 2', avatar: 'foto' }), storage);
    await updateProfile(db, 'u1', p.id, dados(p, { name: 'Ana 3' }), storage);
    expect(await existe(a.photoKey)).toBe(true);
    expect((await getOwnedProfile(db, 'u1', p.id)).photoKey).toBe(a.photoKey);
  });

  it('virar Kids apaga a foto e o avatar vira "boto"', async () => {
    const p = await novo('u1');
    const a = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    const r = await updateProfile(db, 'u1', p.id, { name: 'Ana', color: p.color, kind: 'kids', maxRating: '10' }, storage);
    expect(r.profile).toMatchObject({ kind: 'kids', avatar: 'boto', photoKey: null });
    expect(await existe(a.photoKey)).toBe(false);
  });
});

describe('exclusão', () => {
  it('deleteProfile apaga a foto, e um del que lança não impede a exclusão', async () => {
    await novo('u1', { name: 'Um' });
    const p = await novo('u1', { name: 'Dois' });
    const a = await setProfilePhoto(db, storage, 'u1', p.id, await foto());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const semDel = { ...storage, del: async () => { throw new Error('x'); } };
    expect((await deleteProfile(db, 'u1', p.id, semDel)).ok).toBe(true);
    expect(await getOwnedProfile(db, 'u1', p.id)).toBeNull();
    expect(await existe(a.photoKey)).toBe(true);
    const p2 = await novo('u1', { name: 'Três' });
    const b = await setProfilePhoto(db, storage, 'u1', p2.id, await foto());
    await deleteProfile(db, 'u1', p2.id, storage);
    expect(await existe(b.photoKey)).toBe(false);
  });

  it('resetDemo apaga as fotos dos perfis da demonstração', async () => {
    await resetDemo(db, 'u1', new Date(), { storage });
    const [pai] = await listProfiles(db, 'u1');
    const a = await setProfilePhoto(db, storage, 'u1', pai.id, await foto());
    expect(await existe(a.photoKey)).toBe(true);
    await resetDemo(db, 'u1', new Date(), { storage });
    expect(await existe(a.photoKey)).toBe(false);
    expect(await listProfiles(db, 'u1')).toHaveLength(DEMO_PROFILES.length);
  });
});
