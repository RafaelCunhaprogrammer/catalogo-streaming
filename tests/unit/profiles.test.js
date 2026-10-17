// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/test-db';
import { user } from '@/lib/db/schema';
import {
  MAX_PROFILES, PROFILE_COLORS, validateProfileInput, listProfiles, getOwnedProfile,
  createProfile, updateProfile, deleteProfile, saveProfilePrefs,
} from '@/lib/profiles';

let db;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values([
    { id: 'u1', name: 'Ana', email: 'ana@ex.com' },
    { id: 'u2', name: 'Bia', email: 'bia@ex.com' },
  ]);
});

const adulto = (name = 'Ana') => ({ name, color: PROFILE_COLORS[0], kind: 'adulto' });

describe('validação', () => {
  it('aceita adulto e Kids com faixa', () => {
    expect(validateProfileInput(adulto())).toEqual({ ok: true, value: { name: 'Ana', color: PROFILE_COLORS[0], kind: 'adulto', maxRating: null } });
    expect(validateProfileInput({ name: ' Pequeno ', color: PROFILE_COLORS[1], kind: 'kids', maxRating: '10' }).value)
      .toMatchObject({ name: 'Pequeno', kind: 'kids', maxRating: '10' });
  });

  it('recusa nome vazio ou longo, cor fora da paleta, tipo desconhecido e faixa errada', () => {
    const r = validateProfileInput({ name: '   ', color: '#00ff00', kind: 'robô', maxRating: '18' });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors).sort()).toEqual(['color', 'kind', 'name']);
    expect(validateProfileInput({ ...adulto('x'.repeat(21)) }).errors.name).toBe('Use de 1 a 20 caracteres.');
    expect(validateProfileInput({ ...adulto(), kind: 'kids', maxRating: '16' }).errors.maxRating).toBe('Escolha Livre, 10, 12 ou 14 anos.');
  });

  it('adulto nunca guarda faixa', () => {
    expect(validateProfileInput({ ...adulto(), maxRating: '10' }).value.maxRating).toBeNull();
  });

  it('não tem verde nem amarelo na paleta', () => {
    expect(PROFILE_COLORS).toHaveLength(8);
    expect(PROFILE_COLORS).not.toContain('#22c55e');
    expect(PROFILE_COLORS).not.toContain('#eab308');
  });
});

describe('perfis no banco', () => {
  it('cria, lista em ordem e guarda as preferências iniciais', async () => {
    const a = await createProfile(db, 'u1', adulto('Ana'), { prefs: { version: 1, theme: 'claro' } });
    await createProfile(db, 'u1', { ...adulto('Pequeno'), kind: 'kids', maxRating: 'L' });
    expect(a.ok).toBe(true);
    expect(a.profile.prefs.theme).toBe('claro');
    const list = await listProfiles(db, 'u1');
    expect(list.map((p) => p.name)).toEqual(['Ana', 'Pequeno']);
    expect(list[1]).toMatchObject({ kind: 'kids', maxRating: 'L' });
    expect(list[1].prefs.theme).toBe('sistema');
  });

  it('no máximo 5 perfis', async () => {
    for (let i = 0; i < MAX_PROFILES; i += 1) await createProfile(db, 'u1', adulto(`P${i}`));
    const sexto = await createProfile(db, 'u1', adulto('Sexto'));
    expect(sexto).toEqual({ ok: false, errors: { form: 'Limite de 5 perfis.' } });
  });

  it('ninguém lê, edita ou exclui perfil de outra conta', async () => {
    const { profile } = await createProfile(db, 'u1', adulto());
    await createProfile(db, 'u1', adulto('Outro'));
    expect(await getOwnedProfile(db, 'u2', profile.id)).toBeNull();
    expect((await updateProfile(db, 'u2', profile.id, adulto('Invasor'))).ok).toBe(false);
    expect((await deleteProfile(db, 'u2', profile.id)).ok).toBe(false);
    expect(await saveProfilePrefs(db, 'u2', profile.id, { version: 1, theme: 'claro' })).toBeNull();
    expect((await getOwnedProfile(db, 'u1', profile.id)).name).toBe('Ana');
  });

  it('edita nome, tipo e faixa', async () => {
    const { profile } = await createProfile(db, 'u1', adulto());
    const r = await updateProfile(db, 'u1', profile.id, { name: 'Ana Kids', color: PROFILE_COLORS[2], kind: 'kids', maxRating: '12' });
    expect(r.profile).toMatchObject({ name: 'Ana Kids', kind: 'kids', maxRating: '12' });
  });

  it('não exclui o último perfil', async () => {
    const { profile } = await createProfile(db, 'u1', adulto());
    expect(await deleteProfile(db, 'u1', profile.id)).toEqual({ ok: false, errors: { form: 'A conta precisa de pelo menos um perfil.' } });
    const outro = await createProfile(db, 'u1', adulto('Outro'));
    expect(await deleteProfile(db, 'u1', outro.profile.id)).toEqual({ ok: true });
  });

  it('preferências gravadas passam pela validação', async () => {
    const { profile } = await createProfile(db, 'u1', adulto());
    const saved = await saveProfilePrefs(db, 'u1', profile.id, { version: 1, theme: 'noturno', brightness: 500 });
    expect(saved).toMatchObject({ theme: 'noturno', brightness: 100 });
    expect((await getOwnedProfile(db, 'u1', profile.id)).prefs.brightness).toBe(100);
  });
});
