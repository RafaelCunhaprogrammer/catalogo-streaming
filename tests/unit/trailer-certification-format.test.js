import { describe, it, expect } from 'vitest';
import { pickTrailer, trailerEmbedUrl } from '@/lib/trailer';
import { brazilCertification } from '@/lib/certification';
import { formatRuntime, formatSeasons, certificationLabel } from '@/lib/format';

const v = (key, iso_639_1, type, extra = {}) => ({ key, site: 'YouTube', iso_639_1, type, official: true, ...extra });

describe('pickTrailer', () => {
  it('prefere trailer em português', () => {
    expect(pickTrailer([v('en1', 'en', 'Trailer'), v('pt1', 'pt', 'Trailer')])).toBe('pt1');
  });
  it('prefere o português do Brasil ao de Portugal', () => {
    expect(pickTrailer([
      v('ptpt', 'pt', 'Trailer', { iso_3166_1: 'PT' }),
      v('ptbr', 'pt', 'Trailer', { iso_3166_1: 'BR' }),
    ])).toBe('ptbr');
  });
  it('usa teaser em português antes de trailer em inglês', () => {
    expect(pickTrailer([v('en1', 'en', 'Trailer'), v('pt-teaser', 'pt', 'Teaser')])).toBe('pt-teaser');
  });
  it('cai para inglês e ignora vídeos fora do YouTube', () => {
    expect(pickTrailer([{ ...v('vimeo', 'pt', 'Trailer'), site: 'Vimeo' }, v('en1', 'en', 'Trailer')])).toBe('en1');
  });
  it('devolve null sem vídeos adequados', () => {
    expect(pickTrailer([v('x', 'pt', 'Featurette')])).toBeNull();
    expect(pickTrailer(undefined)).toBeNull();
  });
});

describe('trailerEmbedUrl', () => {
  it('usa o domínio sem cookies e as opções pedidas', () => {
    const url = new URL(trailerEmbedUrl('abc', { autoplay: true, muted: true, loop: true }));
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/abc');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('mute')).toBe('1');
    expect(url.searchParams.get('playlist')).toBe('abc');
    expect(url.searchParams.get('enablejsapi')).toBe('1');
  });
  it('sem opções não toca sozinho nem fica mudo', () => {
    const url = new URL(trailerEmbedUrl('abc'));
    expect(url.searchParams.has('autoplay')).toBe(false);
    expect(url.searchParams.has('mute')).toBe(false);
  });
});

describe('brazilCertification', () => {
  it('lê a classificação brasileira de um filme', () => {
    const details = { release_dates: { results: [
      { iso_3166_1: 'US', release_dates: [{ certification: 'PG-13' }] },
      { iso_3166_1: 'BR', release_dates: [{ certification: '' }, { certification: '14' }] },
    ] } };
    expect(brazilCertification(details, 'movie')).toBe('14');
  });
  it('lê a classificação brasileira de uma série', () => {
    expect(brazilCertification({ content_ratings: { results: [{ iso_3166_1: 'BR', rating: 'L' }] } }, 'tv')).toBe('L');
  });
  it('devolve null quando não há classificação para o Brasil', () => {
    expect(brazilCertification({ release_dates: { results: [] } }, 'movie')).toBeNull();
    expect(brazilCertification({}, 'tv')).toBeNull();
  });
});

describe('formatação', () => {
  it('formata a duração', () => {
    expect(formatRuntime(128)).toBe('2h 8min');
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(45)).toBe('45min');
    expect(formatRuntime(null)).toBeNull();
  });
  it('formata temporadas', () => {
    expect(formatSeasons(1)).toBe('1 temporada');
    expect(formatSeasons(3)).toBe('3 temporadas');
    expect(formatSeasons(null)).toBeNull();
  });
  it('descreve a classificação por extenso', () => {
    expect(certificationLabel('L')).toBe('Classificação indicativa: livre');
    expect(certificationLabel('12')).toBe('Classificação indicativa: 12 anos');
  });
});
