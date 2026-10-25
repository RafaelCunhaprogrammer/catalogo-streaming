import { describe, it, expect } from 'vitest';
import { FAVORITE_GENRES, KIDS_FAVORITE_GENRES, favoriteGenreOptions, cleanGenreSlugs } from '@/lib/genres';

describe('gêneros favoritos', () => {
  it('amplia a lista de gêneros com os 6 novos, no fim', () => {
    expect(FAVORITE_GENRES.map((g) => g.slug).slice(-6)).toEqual(['suspense', 'crime', 'documentario', 'fantasia', 'misterio', 'aventura']);
    expect(FAVORITE_GENRES.find((g) => g.slug === 'suspense').tv).toBeNull();
    expect(FAVORITE_GENRES.find((g) => g.slug === 'fantasia').tv).toBe(10765);
  });

  it('Kids só vê Animação, Infantil, Aventura e Fantasia', () => {
    expect(KIDS_FAVORITE_GENRES).toEqual(['animacao', 'infantil', 'aventura', 'fantasia']);
    expect(favoriteGenreOptions(true).map((g) => g.slug)).toEqual(['infantil', 'animacao', 'fantasia', 'aventura']);
    expect(favoriteGenreOptions(false)).toEqual(FAVORITE_GENRES);
  });

  it('cleanGenreSlugs fica só com slugs válidos, sem repetir, na ordem da lista', () => {
    expect(cleanGenreSlugs(['drama', 'x', 'drama', 3])).toEqual(['drama']);
    expect(cleanGenreSlugs(['drama', 'acao'])).toEqual(['acao', 'drama']);
    expect(cleanGenreSlugs('drama')).toEqual([]);
    expect(cleanGenreSlugs(undefined)).toEqual([]);
  });
});
