import { describe, it, expect } from 'vitest';
import { PROVIDERS, ALL_PROVIDER_IDS } from '@/lib/providers';
import { GENRE_ROWS } from '@/lib/genres';
import { MOODS, getMood } from '@/lib/moods';

describe('plataformas', () => {
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

  it('getMood devolve undefined para slug desconhecido', () => {
    expect(getMood('xyz')).toBeUndefined();
    expect(getMood(null)).toBeUndefined();
  });
});
