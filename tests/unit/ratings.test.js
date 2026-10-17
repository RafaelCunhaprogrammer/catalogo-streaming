// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mockTmdb, calledPaths } from '../helpers/mock-tmdb';
import {
  ratingAllowed, getTitleRating, annotateRatings, filterByRating, movieCertificationParams, KIDS_RATINGS,
} from '@/lib/tmdb/ratings';

const movieRating = (cert) => ({ results: [{ iso_3166_1: 'BR', release_dates: [{ certification: cert }] }] });
const tvRating = (rating) => ({ results: [{ iso_3166_1: 'BR', rating }] });
const t = (type, id) => ({ type, id, title: `${type}-${id}` });

describe('ratingAllowed', () => {
  it('segue a ordem L < 10 < 12 < 14 < 16 < 18', () => {
    expect(ratingAllowed('L', '10')).toBe(true);
    expect(ratingAllowed('10', '10')).toBe(true);
    expect(ratingAllowed('12', '10')).toBe(false);
    expect(ratingAllowed('18', '14')).toBe(false);
    expect(KIDS_RATINGS).toEqual(['L', '10', '12', '14']);
  });

  it('sem limite, tudo passa; sem classificação, bloqueia', () => {
    expect(ratingAllowed('18', null)).toBe(true);
    expect(ratingAllowed(null, '14')).toBe(false);
    expect(ratingAllowed('XYZ', '14')).toBe(false);
  });
});

describe('classificação dos títulos', () => {
  it('busca a classificação brasileira de filmes e séries', async () => {
    mockTmdb({ '/movie/1/release_dates': movieRating('12'), '/tv/2/content_ratings': tvRating('L') });
    await expect(getTitleRating('movie', 1)).resolves.toBe('12');
    await expect(getTitleRating('tv', 2)).resolves.toBe('L');
  });

  it('marca cadeado acima da faixa, sem classificação ou com falha, mas respeita os liberados', async () => {
    mockTmdb({
      '/movie/1/release_dates': movieRating('L'),
      '/movie/2/release_dates': movieRating('16'),
      '/movie/3/release_dates': movieRating(''),
      '/movie/4/release_dates': 500,
      '/movie/5/release_dates': movieRating('18'),
    });
    const out = await annotateRatings([t('movie', 1), t('movie', 2), t('movie', 3), t('movie', 4), t('movie', 5)], '10', new Set(['movie-5']));
    expect(out.map((x) => [x.id, x.certification, x.locked])).toEqual([
      [1, 'L', false], [2, '16', true], [3, null, true], [4, null, true], [5, '18', false],
    ]);
  });

  it('sem faixa (adulto), não consulta nada', async () => {
    const fetchMock = mockTmdb({});
    const out = await annotateRatings([t('movie', 1)], null);
    expect(out[0].locked).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('filterByRating tira os bloqueados e mantém o formato do título', async () => {
    mockTmdb({ '/movie/1/release_dates': movieRating('L'), '/tv/2/content_ratings': tvRating('16') });
    const out = await filterByRating([t('movie', 1), t('tv', 2)], '14');
    expect(out).toEqual([t('movie', 1)]);
  });

  it('parâmetros de classificação para o discover de filmes', () => {
    expect(movieCertificationParams('14')).toEqual({ certification_country: 'BR', 'certification.lte': '14' });
    expect(movieCertificationParams(null)).toEqual({});
  });

  it('confere no máximo 8 títulos ao mesmo tempo (reaproveita o limite do catálogo)', async () => {
    const fetchMock = mockTmdb({});
    await annotateRatings(Array.from({ length: 3 }, (_, i) => t('movie', i)), '10');
    expect(calledPaths(fetchMock)).toEqual(['/movie/0/release_dates', '/movie/1/release_dates', '/movie/2/release_dates']);
  });
});
