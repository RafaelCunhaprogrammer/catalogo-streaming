import { describe, it, expect } from 'vitest';
import { normalizeTitle, titleHref } from '@/lib/tmdb/normalize';
import { imageUrl } from '@/lib/images';

describe('normalizeTitle', () => {
  it('normaliza um filme', () => {
    const t = normalizeTitle({
      id: 101, title: 'Aventura Neon', release_date: '2024-05-10', overview: 'Sinopse',
      poster_path: '/p.jpg', backdrop_path: '/b.jpg', vote_average: 7.84, popularity: 50, genre_ids: [28],
    }, 'movie');
    expect(t).toEqual({
      id: 101, type: 'movie', title: 'Aventura Neon', year: 2024, overview: 'Sinopse',
      posterPath: '/p.jpg', backdropPath: '/b.jpg', rating: 7.8, popularity: 50, genreIds: [28],
    });
  });

  it('normaliza uma série usando name e first_air_date', () => {
    const t = normalizeTitle({ id: 201, name: 'Série Brilhante', first_air_date: '2021-01-01' }, 'tv');
    expect(t.type).toBe('tv');
    expect(t.title).toBe('Série Brilhante');
    expect(t.year).toBe(2021);
  });

  it('media_type tem prioridade sobre o tipo informado', () => {
    expect(normalizeTitle({ id: 1, media_type: 'tv', name: 'X' }, 'movie').type).toBe('tv');
  });

  it('usa valores seguros quando faltam dados', () => {
    const t = normalizeTitle({ id: 5 }, 'movie');
    expect(t).toMatchObject({
      title: 'Sem título', year: null, overview: '', posterPath: null,
      backdropPath: null, rating: null, popularity: 0, genreIds: [],
    });
  });

  it('aceita genres (detalhes) no lugar de genre_ids', () => {
    expect(normalizeTitle({ id: 1, genres: [{ id: 18, name: 'Drama' }] }, 'movie').genreIds).toEqual([18]);
  });
});

describe('titleHref', () => {
  it('monta o endereço da página do título', () => {
    expect(titleHref({ id: 101, type: 'movie' })).toBe('/filme/101');
    expect(titleHref({ id: 201, type: 'tv' })).toBe('/serie/201');
  });
});

describe('imageUrl', () => {
  it('monta o endereço da imagem ou devolve null', () => {
    expect(imageUrl('/p.jpg')).toBe('https://image.tmdb.org/t/p/w342/p.jpg');
    expect(imageUrl('/b.jpg', 'w1280')).toBe('https://image.tmdb.org/t/p/w1280/b.jpg');
    expect(imageUrl(null)).toBeNull();
  });
});
