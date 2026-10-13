import { describe, it, expect } from 'vitest';
import { PROVIDERS, ALL_PROVIDER_IDS } from '@/lib/providers';
import { GENRE_ROWS } from '@/lib/genres';
import { MOODS, getMood } from '@/lib/moods';

describe('plataformas', () => {
  it('usam os nomes e IDs conferidos no TMDB (região BR, out/2026)', () => {
    expect(PROVIDERS.map((p) => `${p.id} ${p.name}`)).toEqual([
      '8 Netflix', '119 Amazon Prime Video', '337 Disney+', '1899 HBO Max',
      '307 Globoplay', '350 Apple TV', '531 Paramount+', '2302 Mercado Play',
    ]);
  });

  it('têm IDs inteiros e únicos, na ordem definida', () => {
    expect(PROVIDERS[0].name).toBe('Netflix');
    expect(new Set(ALL_PROVIDER_IDS).size).toBe(PROVIDERS.length);
    expect(ALL_PROVIDER_IDS.every(Number.isInteger)).toBe(true);
  });
});

describe('fileiras de gênero', () => {
  it('cobrem os 8 gêneros do Início', () => {
    expect(GENRE_ROWS.map((g) => g.label)).toEqual([
      'Ação', 'Terror', 'Romance', 'Comédia', 'Infantil', 'Ficção científica', 'Animação', 'Drama',
    ]);
  });
});

describe('humores', () => {
  it('são os 8 combinados, com slugs únicos', () => {
    expect(MOODS.map((m) => m.label)).toEqual([
      'Relaxar', 'Rir', 'Histórias de superação', 'Me emocionar',
      'Adrenalina', 'Sentir medo', 'Me apaixonar', 'Fé e espiritualidade',
    ]);
    expect(new Set(MOODS.map((m) => m.slug)).size).toBe(8);
  });

  it('humores usam ícones, não emojis', () => {
    for (const mood of MOODS) {
      expect(mood.emoji).toBeUndefined();
      expect(mood.icon).toMatch(/^[A-Z][A-Za-z]+$/);
    }
  });

  it('todo humor tem configuração para filmes', () => {
    for (const mood of MOODS) {
      expect(mood.movie.genres?.length || mood.movie.keywords?.length).toBeTruthy();
    }
  });

  it('Fé e espiritualidade usa palavras-chave de várias crenças', () => {
    expect(getMood('fe').movie.keywords).toEqual(
      expect.arrayContaining(['faith', 'christianity', 'spirituality', 'judaism']),
    );
  });

  it('Fé e espiritualidade exclui terror e suspense (o TMDB marca filmes de possessão com "religion")', () => {
    expect(getMood('fe').movie.excludeGenres).toEqual([27, 53]);
    expect(getMood('fe').tv.excludeGenres).toEqual([9648]);
  });

  it('Fé não usa "religion", que traz filmes de máfia e drama com cenas de igreja', () => {
    expect(getMood('fe').movie.keywords).not.toContain('religion');
  });

  it('Superação não usa "based on true story", que é amplo demais', () => {
    expect(getMood('superacao').movie.keywords).not.toContain('based on true story');
    expect(getMood('superacao').movie.keywords).toEqual(['sports', 'overcoming adversity', 'underdog']);
  });

  it('getMood devolve undefined para slug desconhecido', () => {
    expect(getMood('xyz')).toBeUndefined();
    expect(getMood(null)).toBeUndefined();
  });
});
