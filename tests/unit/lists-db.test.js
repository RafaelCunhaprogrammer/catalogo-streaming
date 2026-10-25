// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../helpers/test-db';
import { user, profiles, profileTitles } from '@/lib/db/schema';

let db;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values({ id: 'u1', name: 'Ana', email: 'ana@ex.com' });
  await db.insert(profiles).values({ id: 'p1', userId: 'u1', name: 'Ana', color: '#8b5cf6', kind: 'adulto' });
});

const marca = { profileId: 'p1', mediaType: 'movie', tmdbId: 550 };

describe('profile_titles', () => {
  it('excluir o perfil apaga as marcações dele', async () => {
    await db.insert(profileTitles).values({ ...marca, favorite: true });
    expect(await db.select().from(profileTitles)).toHaveLength(1);
    await db.delete(profiles).where(eq(profiles.id, 'p1'));
    expect(await db.select().from(profileTitles)).toEqual([]);
  });

  it('não aceita o mesmo perfil + tipo + id duas vezes', async () => {
    await db.insert(profileTitles).values(marca);
    await expect(db.insert(profileTitles).values(marca)).rejects.toThrow();
  });

  it('valores padrão: sem favorito e situação "nenhum"', async () => {
    await db.insert(profileTitles).values(marca);
    const [t] = await db.select().from(profileTitles);
    expect(t.favorite).toBe(false);
    expect(t.status).toBe('nenhum');
    expect(t.updatedAt).toBeInstanceOf(Date);
  });
});

describe('colunas novas em profiles', () => {
  it('perfil novo não tem gêneros e ainda não viu o convite', async () => {
    const [p] = await db.select().from(profiles);
    expect(p.favoriteGenres).toEqual([]);
    expect(p.genresPromptDone).toBe(false);
  });
});
